import json
import boto3
import os
from pathlib import Path
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

s3_client = boto3.client("s3")
SITES_BUCKET = os.getenv("BUCKET", "firms-fwi-data") 
SITES_KEY = "data/sites.json"


OUTPUT_GEOJSON_PATH = Path("/tmp/fwi_latest_v2.geojson")
OUTPUT_GEOJSON_PATH_p1 = Path("/tmp/fwi_latest1.geojson")
OUTPUT_GEOJSON_PATH_p2 = Path("/tmp/fwi_latest2.geojson")
OUTPUT_GEOJSON_PATH_p3 = Path("/tmp/fwi_latest3.geojson")
OUTPUT_GEOJSON_PATH_p4 = Path("/tmp/fwi_latest4.geojson")
OUTPUT_GEOJSON_PATH_p5 = Path("/tmp/fwi_latest5.geojson")


def load_sites(bucket: str, key: str) -> List[Dict[str, Any]]:
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read().decode('utf-8')
    return json.loads(content)

# từ bbox sang tọa độ polygon
def bbox_to_polygon_coords(bbox: Dict[str, float]) -> List[List[float]]:
    min_lat = float(bbox["min_lat"])
    max_lat = float(bbox["max_lat"])
    min_lon = float(bbox["min_lon"])
    max_lon = float(bbox["max_lon"])
    return [
        [min_lon, min_lat],
        [max_lon, min_lat],
        [max_lon, max_lat],
        [min_lon, max_lat],
        [min_lon, min_lat], 
    ]

# tạo geojson từ cells và fwi
def build_geojson(
    cells: List[Dict[str, Any]],
    results: List[Optional[Dict[str, Any]]],
) -> Dict[str, Any]:
    timestamp = datetime.now(timezone.utc).isoformat()
    features: List[Dict[str, Any]] = []

    for cell, res in zip(cells, results):
        if res is None:
            continue
        geom_coords = bbox_to_polygon_coords(cell["bbox"])
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [geom_coords],
            },
            "properties": {
                "cell_id": res["cell_id"],
                "lat": res["lat"],
                "lon": res["lon"],
                "forest_frac": res["forest_frac"],
                "fwi_mean": res["fwi_mean"],
                "fwi_max": res["fwi_max"],
                "dc_mean": res["DC_mean"],
                "dmc_mean": res["DMC_mean"],
                "ffmc_mean": res["ffmc_mean"],
                "isi_mean": res["isi_mean"],
                "bui_mean": res["bui_mean"],
                "danger_class": res["danger_class"],
                "danger_label": res["danger_label"],
                "updated_at": timestamp,
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }

def save_geojson(obj: Dict[str, Any], path: Path) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[INFO] Đã ghi tạm ra: {path}")

    s3_key = f"data/{path.name}"
    try:
        s3_client.upload_file(str(path), SITES_BUCKET, s3_key, ExtraArgs={'ContentType': 'application/json'})
        print(f"[SUCCESS] Đã upload lên S3: s3://{SITES_BUCKET}/{s3_key}")
    except Exception as e:
        print(f"[ERROR] Không thể upload lên S3: {e}")


def merge_final() -> None:
    all_features = []
    part_filenames = [
        "fwi_latest1.geojson", 
        "fwi_latest2.geojson", 
        "fwi_latest3.geojson", 
        "fwi_latest4.geojson",
        "fwi_latest5.geojson"
    ]
    
    for filename in part_filenames:
        s3_key = f"data/{filename}"
        try:
            response = s3_client.get_object(Bucket=SITES_BUCKET, Key=s3_key)
            data = json.loads(response['Body'].read().decode('utf-8'))
            
            features = data.get("features", [])
            all_features.extend(features)
            print(f"  - Đã lấy {len(features)} features từ {filename}")
            
        except Exception as e:
            print(f"  - [CẢNH BÁO] Không tìm thấy hoặc lỗi khi đọc {filename}: {e}")

    final_geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }

    save_geojson(final_geojson, OUTPUT_GEOJSON_PATH)
    
    print(f"[SUCCESS] Đã gộp tổng cộng {len(all_features)} features.")

# Lambda handler (dùng cho cả local & AWS)
def lambda_handler(event: Any = None, context: Any = None) -> Dict[str, Any]:
    from fwi import compute_cell_fwi, DEFAULT_N_SAMPLES, DEFAULT_PAST_DAYS, DEFAULT_FORECAST_DAYS
    cells = load_sites(SITES_BUCKET, SITES_KEY)
    total_cells = len(cells)

    if event is None:
        slot = '1:00'
    else:
        slot = event.get('slot', 'merge')
    step = total_cells // 5
    
    if slot == "1:00":
        start_idx, end_idx = 0, step
        output_file = OUTPUT_GEOJSON_PATH_p1
    elif slot == "1:30":
        start_idx, end_idx = step, step * 2
        output_file = OUTPUT_GEOJSON_PATH_p2
    elif slot == "2:00":
        start_idx, end_idx = step * 2, step * 3
        output_file = OUTPUT_GEOJSON_PATH_p3
    elif slot == "2:30":
        start_idx, end_idx = step * 3, step * 4
        output_file = OUTPUT_GEOJSON_PATH_p4
    elif slot == "3:00":
        start_idx, end_idx = step * 4, total_cells
        output_file = OUTPUT_GEOJSON_PATH_p5
    else:
        merge_final()
        return {
        "statusCode": 200,
        "body": json.dumps({"message": "Merged"})
        }

    target_cells = cells[start_idx:end_idx]
    results: List[Optional[Dict[str, Any]]] = []
    print(f"[SYSTEM] Slot {slot}: Xử lý từ index {start_idx} đến {end_idx} (Tổng: {len(target_cells)} cells)")

    for i, cell in enumerate(target_cells, start=1):
        print(f"[INFO] Đang xử lý cell {i}/{len(cells)}: {cell['cell_id']}")
        res = compute_cell_fwi(
            cell,
            past_days=DEFAULT_PAST_DAYS,
            forecast_days=DEFAULT_FORECAST_DAYS,
            n_samples_total=DEFAULT_N_SAMPLES
        )
        results.append(res)

    geojson_obj = build_geojson(target_cells, results)
    save_geojson(geojson_obj, output_file)

    processed = sum(1 for r in results if r is not None)

    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "message": "FWI updated",
                "cells_total": len(cells),
                "cells_processed": processed,
            },
            ensure_ascii=False,
        ),
    }