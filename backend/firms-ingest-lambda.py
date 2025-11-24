import json
import os
import gzip
import urllib.parse
import urllib.request
from decimal import Decimal
from datetime import datetime
import xml.etree.ElementTree as ET

import boto3

# ======== ENV ========
SECRET_NAME = os.getenv("SECRET_NAME", "FIRMS_MAP_KEY")
FIRMS_REGION = os.getenv("REGION", "SouthEast_Asia")   # region
WINDOW = os.getenv("WINDOW", "24hrs")                  # 24hrs | 7days
SENSOR = os.getenv("SENSOR", "viirs").lower()          # viirs | modis | landsat
DDB_TABLE = os.getenv("DDB_TABLE", "FIRMSFires")
PRIMARY_KEY_NAME = os.getenv("PRIMARY_KEY_NAME", "ID") 
BBOX = os.getenv("BBOX", "").strip()                   # "minLon,minLat,maxLon,maxLat" 
SOURCE_TAG = os.getenv("SOURCE_TAG", f"{SENSOR}_{WINDOW}")
MIN_CONF = int(os.getenv("MIN_CONF", "0"))
MAX_ITEMS = int(os.getenv("MAX_ITEMS", "500000"))
HTTP_TIMEOUT = int(os.getenv("TIMEOUT", "60"))

# ======== AWS clients ========
secrets = boto3.client("secretsmanager")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DDB_TABLE)

# ======== HTTP helpers ========
def http_get_text(url: str, timeout: int = HTTP_TIMEOUT, accept: str | None = None) -> tuple[int, str, str]:
    """
    Gửi HTTP GET và trả về nội dung dạng text, có hỗ trợ gzip.
        - Gửi request HTTP GET tới URL cho trước.
        - Tự thêm header Accept-Encoding (gzip) và User-Agent.
        - Nếu response bị gzip thì tự giải nén.
        - Trả về bộ 3: (status_code, content_type, text_body).
    Args:
        url (str): Địa chỉ URL cần gọi.
        timeout (int): Thời gian timeout (giây).
        accept (str | None): Giá trị header "Accept" (ví dụ "application/json",
            "application/xml"). Nếu None thì không set.
    Returns:
        tuple[int, str, str]: (HTTP status code, Content-Type, response text).
    """
    headers = {
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "lambda-firms-ingest/1.3"
    }
    if accept:
        headers["Accept"] = accept
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        status = getattr(resp, "status", None) or 200
        ctype = resp.headers.get("Content-Type", "")
        raw = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip":
            try:
                raw = gzip.decompress(raw)
            except Exception:
                pass
        text = raw.decode("utf-8", errors="replace").strip()
    return status, ctype, text

def http_get_json(url: str, timeout: int = HTTP_TIMEOUT) -> dict:
    """
    Gửi HTTP GET và parse JSON response.
        - Gọi http_get_text với Accept = "application/json".
        - Nếu status != 200 thì raise lỗi RuntimeError kèm snippet nội dung.
        - Parse JSON và trả về dict.
        - Nếu không parse được JSON cũng raise RuntimeError.
    """
    status, ctype, text = http_get_text(url, timeout=timeout, accept="application/json")
    if status != 200:
        snippet = text[:200].replace("\n", " ")
        raise RuntimeError(f"HTTP {status} ({ctype}). Snippet: {snippet}")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        snippet = text[:300].replace("\n", " ")
        raise RuntimeError(f"Response is not JSON. Content-Type={ctype}. First 300 chars: {snippet}") from e

# ======== Secrets MAP KEY ========
def get_map_key() -> str:
    resp = secrets.get_secret_value(SecretId=SECRET_NAME)
    if "SecretString" in resp:
        payload = resp["SecretString"]
    else:
        payload = gzip.decompress(resp["SecretBinary"]).decode("utf-8")
    data = json.loads(payload)
    mk = data.get("MAP_KEY")
    if not mk:
        raise RuntimeError("MAP_KEY not found in secret.")
    return mk

# ======== WFS capability discovery ========
def list_wfs_layers(map_key: str) -> list[tuple[str, str]]:
    """
    Lấy danh sách các Layer (FeatureType) từ WFS GetCapabilities của FIRMS.
        - Gọi WFS GetCapabilities cho các version ứng viên (2.0.0, 1.1.0).
        - Parse XML để tìm các tên FeatureType/Name.
        - Trả về danh sách (version, typename).
    """
    base = f"https://firms.modaps.eosdis.nasa.gov/mapserver/wfs/{FIRMS_REGION}/{map_key}/"
    candidates = [
        ("2.0.0", {"SERVICE": "WFS", "REQUEST": "GetCapabilities", "VERSION": "2.0.0"}),
        ("1.1.0", {"SERVICE": "WFS", "REQUEST": "GetCapabilities", "VERSION": "1.1.0"}),
    ]
    found: list[tuple[str, str]] = []
    ns = {
        "wfs": "http://www.opengis.net/wfs/2.0",
        "wfs1": "http://www.opengis.net/wfs",
    }

    for ver, qs in candidates:
        url = base + "?" + urllib.parse.urlencode(qs)
        print(f"[CAPABILITIES TRY] {url}")
        status, ctype, text = http_get_text(url, accept="application/xml")
        if status != 200:
            print(f"[WARN] Capabilities HTTP {status} ({ctype}).")
            continue
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            print("[WARN] Cannot parse capabilities XML.")
            continue

        names: list[str] = []
        # WFS 2.0.0
        for ft in root.findall(".//wfs:FeatureType", ns):
            ne = ft.find("./wfs:Name", ns)
            if ne is not None and ne.text:
                names.append(ne.text.strip())
        # WFS 1.1.0
        for ft in root.findall(".//wfs1:FeatureType", ns):
            ne = ft.find("./wfs1:Name", ns)
            if ne is not None and ne.text:
                names.append(ne.text.strip())
        # Fallback
        if not names:
            for ft in root.findall(".//FeatureType"):
                ne = ft.find("./Name")
                if ne is not None and ne.text:
                    names.append(ne.text.strip())

        for n in names:
            found.append((ver, n))

    print(f"[CAPABILITIES] Found {len(found)} layer names")
    for ver, n in found[:20]:
        print(f"  - ({ver}) {n}")
    return found

def pick_typename_from_capabilities(found: list[tuple[str, str]]) -> tuple[str, str]:
    """
    Chọn typename khớp SENSOR + WINDOW.
    Hỗ trợ alias cho VIIRS: ['viirs','snpp','noaa20','noaa21'].
    """
    if not found:
        raise RuntimeError("No layers in WFS capabilities.")

    sensor_aliases = {
        "viirs":  ["viirs", "snpp", "noaa20", "noaa21"],
        "modis":  ["modis"],
        "landsat":["landsat"]
    }
    candidates = sensor_aliases.get(SENSOR, [SENSOR])
    want_windows = ["24hrs", "24hr", "24h", "24"] if WINDOW == "24hrs" else ["7days", "7day", "7d", "7"]

    # Priority 2.0.0
    for ver_priority in ("2.0.0", "1.1.0"):
        # Match data
        for ver, name in found:
            if ver != ver_priority:
                continue
            nlow = name.lower()
            if "fires" in nlow and any(a in nlow for a in candidates) and any(w in nlow for w in want_windows):
                return ver, name
        # Match data but fewer 
        for ver, name in found:
            if ver != ver_priority:
                continue
            nlow = name.lower()
            if "fires" in nlow and any(a in nlow for a in candidates):
                return ver, name

    # Fallback first
    return found[0]

def build_getfeature_url(version: str, typename: str, map_key: str) -> str:
    """
    Xây dựng URL WFS GetFeature để lấy dữ liệu điểm cháy dưới dạng GeoJSON.
        - Dựa trên version WFS (2.0.0 hoặc 1.1.0) và tên layer (typename).
        - Set các tham số chuẩn: SERVICE, VERSION, REQUEST, (TYPENAME/TYPENAMES),
          OUTPUTFORMAT kiểu GeoJSON, SRSNAME = EPSG:4326.
        - Nếu có BBOX (minLon,minLat,maxLon,maxLat) thì thêm vào query.
    """
    base = f"https://firms.modaps.eosdis.nasa.gov/mapserver/wfs/{FIRMS_REGION}/{map_key}/"
    params = {
        "SERVICE": "WFS",
        "VERSION": version,
        "REQUEST": "GetFeature",
        ("TYPENAMES" if version == "2.0.0" else "TYPENAME"): typename,
        "OUTPUTFORMAT": "application/json; subtype=geojson",
        "SRSNAME": ("urn:ogc:def:crs:EPSG::4326" if version == "2.0.0" else "EPSG:4326"),
    }
    if BBOX:
        params["BBOX"] = BBOX
    return base + "?" + urllib.parse.urlencode(params)

def fetch_wfs_featurecollection(map_key: str) -> dict:
    """
    Gọi WFS để lấy FeatureCollection GeoJSON từ FIRMS.
        - Gọi list_wfs_layers() để lấy danh sách layer.
        - Dùng pick_typename_from_capabilities() để chọn layer phù hợp.
        - Gọi GetFeature, kỳ vọng GeoJSON (application/json; subtype=geojson).
        - Nếu gọi lần đầu lỗi thì thử lại với OUTPUTFORMAT=application/json.
    """
    found = list_wfs_layers(map_key)
    version, typename = pick_typename_from_capabilities(found)
    print(f"[PICK] Using version={version}, typename={typename}")

    url = build_getfeature_url(version, typename, map_key)
    print(f"[GETFEATURE TRY] {url}")
    try:
        return http_get_json(url)
    except Exception as e1:
        print(f"[WARN] First GetFeature failed: {e1}")
        # Fallback: OUTPUTFORMAT application/json 
        base = f"https://firms.modaps.eosdis.nasa.gov/mapserver/wfs/{FIRMS_REGION}/{map_key}/"
        params = {
            "SERVICE": "WFS",
            "VERSION": version,
            "REQUEST": "GetFeature",
            ("TYPENAMES" if version == "2.0.0" else "TYPENAME"): typename,
            "OUTPUTFORMAT": "application/json",
            "SRSNAME": ("urn:ogc:def:crs:EPSG::4326" if version == "2.0.0" else "EPSG:4326"),
        }
        if BBOX:
            params["BBOX"] = BBOX
        url2 = base + "?" + urllib.parse.urlencode(params)
        print(f"[GETFEATURE RETRY] {url2}")
        return http_get_json(url2)

# ======== Data normalize ========
def pad_hhmm(acq_time) -> str:
    try:
        t = int(float(acq_time))
    except Exception:
        return "0000"
    return str(t).rjust(4, "0")

def to_iso_utc(acq_date: str, acq_time) -> str:
    hhmm = pad_hhmm(acq_time)
    hh = int(hhmm[:2]); mm = int(hhmm[2:])
    try:
        dt = datetime.strptime(acq_date, "%Y-%m-%d").replace(hour=hh, minute=mm)
    except ValueError:
        dt = datetime.fromisoformat(acq_date).replace(hour=hh, minute=mm)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def to_decimal(n):
    if n is None:
        return None
    try:
        return Decimal(str(n))
    except Exception:
        return None

def parse_confidence(conf):
    """
    Trả về tuple (conf_num, conf_text)
    - Nếu là số → (int, None)
    - Nếu là chuỗi (vd 'low'/'nominal'/'high') → (map số nếu có, 'low'|...)
    - Nếu không parse được → (None, nguyên_giá_trị_text)
    """
    if conf is None:
        return None, None
    # Test trường hợp sô hoặc chữ
    try:
        num = int(float(conf))
        return num, None
    except Exception:
        pass
    return None, str(conf).strip().lower()

def normalize_feature(feat: dict) -> dict | None:
    geom = feat.get("geometry") or {}
    if geom.get("type") != "Point":
        return None
    coords = geom.get("coordinates") or []
    if len(coords) < 2:
        return None
    lon, lat = coords[0], coords[1]

    props = feat.get("properties") or {}
    acq_date = props.get("acq_date")
    acq_time = props.get("acq_time")
    if not acq_date:
        return None

    conf_raw = props.get("confidence")
    conf_num, conf_text = parse_confidence(conf_raw)

    iso_utc = to_iso_utc(acq_date, acq_time)
    gsi_date = acq_date

    satellite = props.get("satellite")
    instrument = props.get("instrument", SENSOR.upper())

    # ID là duy nhất
    try:
        lon4 = f"{float(lon):.4f}"
        lat4 = f"{float(lat):.4f}"
    except Exception:
        return None
    acq_time_str = pad_hhmm(acq_time)
    uid = f"{satellite}-{instrument}-{acq_date}-{acq_time_str}-{lon4}-{lat4}"

    item = {
        PRIMARY_KEY_NAME: uid,  # Khóa chính
        "latitude": to_decimal(lat),
        "longitude": to_decimal(lon),
        "acq_date": acq_date,
        "acq_time": acq_time_str,
        "acq_datetime_utc": iso_utc,
        "satellite": satellite or "",
        "instrument": instrument or "",
        # Confidence text and decimal
        **({"confidence": to_decimal(conf_num)} if conf_num is not None else {}),
        **({"confidence_text": conf_text} if conf_text is not None else {}),
        "frp": to_decimal(props.get("frp")),
        "brightness": to_decimal(props.get("brightness")),
        "brightness_2": to_decimal(props.get("brightness_2") or props.get("bright_ti5")),
        "scan": to_decimal(props.get("scan")),
        "track": to_decimal(props.get("track")),
        "source": SOURCE_TAG,
        "region": FIRMS_REGION,
        "gsi_date": gsi_date,
    }
    # Loại bỏ các key None để tránh ValidationException
    return {k: v for k, v in item.items() if v is not None}

# ======== Log ========
def batch_write_items(items: list):
    """
    Ghi một danh sách item vào DynamoDB bằng batch_writer.
        - In ra thông tin KeySchema của bảng (nếu describe_table thành công).
        - Sử dụng table.batch_writer(overwrite_by_pkeys=[PRIMARY_KEY_NAME])
          để ghi tuần tự từng item.
        - Trả về số lượng item đã ghi.
    """
    # Log check data
    try:
        desc = table.meta.client.describe_table(TableName=DDB_TABLE)
        print("[DDB] KeySchema:", desc["Table"]["KeySchema"])
    except Exception as e:
        print("[DDB] describe_table failed:", e)

    count = 0
    with table.batch_writer(overwrite_by_pkeys=[PRIMARY_KEY_NAME]) as batch:
        for it in items:
            batch.put_item(Item=it)
            count += 1
    return count

# ======== Handler ========
def lambda_handler(event, context):
    # 1) MAP_KEY
    map_key = get_map_key()

    # 2) Lấy FeatureCollection
    gj = fetch_wfs_featurecollection(map_key)
    if not isinstance(gj, dict) or gj.get("type") != "FeatureCollection":
        raise RuntimeError("Not a GeoJSON FeatureCollection.")
    feats = gj.get("features") or []
    print(f"[INFO] FeatureCollection OK, features={len(feats)}")

    # 3) Normalize + limit
    items = []
    for f in feats:
        it = normalize_feature(f)
        if it:
            items.append(it)
            if len(items) >= MAX_ITEMS:
                break
    print(f"[INFO] Items normalized: {len(items)} (NO CONFIDENCE FILTER, MAX_ITEMS={MAX_ITEMS})")

    if not items:
        return {"statusCode": 200, "body": json.dumps({"received": len(feats), "written": 0})}

    # 4) Ghi DynamoDB
    print("[DDB] Using primary key:", PRIMARY_KEY_NAME)
    print("[DDB] Sample item keys:", list(items[0].keys()))
    written = batch_write_items(items)
    print(f"[INFO] Items written to DynamoDB: {written}")

    return {
        "statusCode": 200,
        "body": json.dumps({"received": len(feats), "normalized": len(items), "written": written})
    }
