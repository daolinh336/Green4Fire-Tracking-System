import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fwi import (
    compute_cell_fwi,
    DEFAULT_N_SAMPLES,
    DEFAULT_PAST_DAYS,
    DEFAULT_FORECAST_DAYS
)

SITES_PATH = Path("/data/sites.json")
OUTPUT_GEOJSON_PATH = Path("/data/fwi_latest_v2.geojson")
OUTPUT_GEOJSON_PATH_p1 = Path("/data/fwi_latest1.geojson")
OUTPUT_GEOJSON_PATH_p2 = Path("/data/fwi_latest2.geojson")
OUTPUT_GEOJSON_PATH_p3 = Path("/data/fwi_latest3.geojson")
OUTPUT_GEOJSON_PATH_p4 = Path("/data/fwi_latest4.geojson")

def load_sites(path: Path = SITES_PATH) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    return data

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
                "danger_class": res["danger_class"],
                "danger_label": res["danger_label"],
                "n_samples": res["n_samples"],
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
    print(f"[INFO] Đã ghi GeoJSON FWI ra: {path}")



def merge_final() -> None:
    all_features = []
    part_files = [
        Path("/data/fwi_latest1.geojson"),
        Path("/data/fwi_latest2.geojson"),
        Path("/data/fwi_latest3.geojson"),
        Path("/data/fwi_latest4.geojson")
    ]
    
    print("[INFO] Bắt đầu gộp các file GeoJSON...")
    
    for p in part_files:
        if p.exists():
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                features = data.get("features", [])
                all_features.extend(features)
                print(f"  - Đã đọc {len(features)} features từ {p.name}")
            except Exception as e:
                print(f"  - [LỖI] Không thể đọc file {p.name}: {e}")
        else:
            print(f"  - [CẢNH BÁO] File {p.name} không tồn tại.")

    final_geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }

    save_geojson(final_geojson, OUTPUT_GEOJSON_PATH)
    print(f"[SUCCESS] Đã gộp tổng cộng {len(all_features)} features vào {OUTPUT_GEOJSON_PATH}")


# Lambda handler (dùng cho cả local & AWS)
def lambda_handler(event: Any = None, context: Any = None) -> Dict[str, Any]:

    cells = load_sites(SITES_PATH)
    total_cells = len(cells)

    if event is None:
        slot = '3:00'
    else:
        slot = event.get('slot', '3:00')
    step = total_cells // 4
    
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
        start_idx, end_idx = step * 3, total_cells
        output_file = OUTPUT_GEOJSON_PATH_p4
    else:
        merge_final()
        return

    target_cells = cells[start_idx:end_idx-520]
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

    geojson_obj = build_geojson(cells, results)
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

if __name__ == "__main__":
    response = lambda_handler()
    print("[INFO] Lambda A (local) finished:")
    print(response)