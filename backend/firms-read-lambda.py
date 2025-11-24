import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

import boto3
from boto3.dynamodb.conditions import Key

# ==== ENV ====
DDB_TABLE = os.getenv("DDB_TABLE", "FIRMSFires")
PRIMARY_KEY_NAME = os.getenv("PRIMARY_KEY_NAME", "ID")
GSI_NAME = os.getenv("GSI_NAME", "FIRMSFires_ByDate")   # PK: gsi_date (S), SK: acq_datetime_utc (S)
DEFAULT_DAYS = int(os.getenv("DEFAULT_DAYS", "30"))
MAX_ITEMS = int(os.getenv("MAX_ITEMS", "20000"))
ALLOW_ORIGIN = os.getenv("ALLOW_ORIGIN", "*")           # CORS

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DDB_TABLE)

# ==== Helpers to use data ====
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            return float(o)
        return super().default(o)

def parse_int(value, default):
    # Chuyển giá trị int
    try:
        return int(value)
    except Exception:
        return default

def parse_bbox(s: Optional[str]):
    # Parse chuỗi BBOX thành tuple
    if not s:
        return None
    try:
        a = [float(x) for x in s.split(",")]
        if len(a) != 4:
            return None
        min_lon, min_lat, max_lon, max_lat = a
        if min_lon > max_lon or min_lat > max_lat:
            return None
        return (min_lon, min_lat, max_lon, max_lat)
    except Exception:
        return None

def in_bbox(lon: float, lat: float, bbox) -> bool:
    # Kiểm tra các điểm có thuộc giới hạn phạm vi ko
    if not bbox:
        return True
    min_lon, min_lat, max_lon, max_lat = bbox
    return (min_lon <= lon <= max_lon) and (min_lat <= lat <= max_lat)

def date_list(days: int) -> List[str]:
    # UTC day list (tối đa 60 ngày)
    today = datetime.now(timezone.utc).date()
    return [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

def to_feature(item: Dict[str, Any]) -> Dict[str, Any]:
    # Chuyển item DynamoDB thành GeoJSON Feature.
    lon = float(item["longitude"])
    lat = float(item["latitude"])
    # Lấy dữ liệu từ dynamoDB
    props_keys = [
        "acq_date","acq_time","acq_datetime_utc","satellite","instrument",
        "confidence_text","frp","brightness","brightness_2","scan","track","source","region"
    ]
    props = {k: item[k] for k in props_keys if k in item}
    return {
        "type": "Feature",
        "id": item.get(PRIMARY_KEY_NAME),
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": props
    }

def resp(status: int, body_obj: Any, content_type="application/geo+json"):
    # Tạo HTTP response chuẩn cho API Gateway (proxy integration).
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": ALLOW_ORIGIN,
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Credentials": "true",
        },
        "body": json.dumps(body_obj, cls=DecimalEncoder)
    }

# ==== Handler ====
def lambda_handler(event, context):
    """
    Lambda handler trả về GeoJSON FeatureCollection các điểm cháy từ DynamoDB.
    Luồng xử lý:
        1) Đọc query parameters từ event:
           - days: số ngày lùi lại (mặc định DEFAULT_DAYS, clamp [1, 60]).
           - sensor: lọc theo instrument (viirs, modis, ...).
           - region: lọc theo vùng (string).
           - bbox: filter theo bounding box "minLon,minLat,maxLon,maxLat".
        2) Với mỗi ngày trong date_list(days), query GSI (GSI_NAME) theo gsi_date.
        3) Áp dụng lọc:
           - sensor (nếu có).
           - region (nếu có).
           - bbox (nếu có).
           - tránh trùng ID bằng set 'seen'.
        4) Chuyển từng item thành GeoJSON Feature bằng to_feature().
        5) Dừng khi số feature đạt MAX_ITEMS hoặc hết dữ liệu.
        6) Trả về FeatureCollection (GeoJSON) thông qua resp().
    """
    # 1) Query params
    qp = event.get("queryStringParameters") or {}
    days = parse_int(qp.get("days"), DEFAULT_DAYS)
    days = 1 if days < 1 else (60 if days > 60 else days) 
    sensor = (qp.get("sensor") or "").strip().lower()      
    region = (qp.get("region") or "").strip()              
    bbox = parse_bbox(qp.get("bbox"))

    # 2) Query GSI theo từng ngày, gộp kết quả
    features: List[Dict[str, Any]] = []
    seen = set()

    # Alias tên cột để tránh reserved keywords (scan, track, ...)
    expr_attr_names = {
        "#pk": PRIMARY_KEY_NAME,
        "#lat": "latitude",
        "#lon": "longitude",
        "#ad": "acq_date",
        "#at": "acq_time",
        "#adt": "acq_datetime_utc",
        "#sat": "satellite",
        "#ins": "instrument",
        "#conf": "confidence_text",  # chỉ lấy chữ
        "#frp": "frp",
        "#b1": "brightness",
        "#b2": "brightness_2",
        "#sc": "scan",
        "#tr": "track",
        "#src": "source",
        "#reg": "region",
    }
    # Định dạng data đưa cho frontend
    projection = "#pk, #lat, #lon, #ad, #at, #adt, #sat, #ins, #conf, #frp, #b1, #b2, #sc, #tr, #src, #reg"

    for d in date_list(days):
        last = None
        while True:
            params = {
                "IndexName": GSI_NAME,
                "KeyConditionExpression": Key("gsi_date").eq(d),
                "ProjectionExpression": projection,
                "ExpressionAttributeNames": expr_attr_names
            }
            if last:
                params["ExclusiveStartKey"] = last

            r = table.query(**params)

            for it in r.get("Items", []):
                if sensor and str(it.get("instrument") or "").lower() != sensor:
                    continue
                if region and str(it.get("region") or "") != region:
                    continue

                try:
                    lon = float(it["longitude"]); lat = float(it["latitude"])
                except Exception:
                    continue
                if not in_bbox(lon, lat, bbox):
                    continue

                fid = str(it.get(PRIMARY_KEY_NAME))
                if fid in seen:
                    continue
                seen.add(fid)

                features.append(to_feature(it))
                if len(features) >= MAX_ITEMS:
                    break
            if len(features) >= MAX_ITEMS:
                break

            last = r.get("LastEvaluatedKey")
            if not last:
                break
        if len(features) >= MAX_ITEMS:
            break

    # 3) Trả GeoJSON
    return resp(200, {"type": "FeatureCollection", "features": features})
