import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fwi import (
    compute_cell_fwi,
    DEFAULT_N_SAMPLES,
    DEFAULT_PAST_DAYS,
    DEFAULT_FORECAST_DAYS,
)
SITES_PATH = Path("D:\\FireTracking\\frontend\\my-map-app\\public\\data\\sites.json")
OUTPUT_GEOJSON_PATH = Path("D:\\FireTracking\\frontend\\my-map-app\\public\\data\\fwi_latest.geojson")

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

def save_geojson(obj: Dict[str, Any], path: Path = OUTPUT_GEOJSON_PATH) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[INFO] Đã ghi GeoJSON FWI ra: {path}")

# Lambda handler (dùng cho cả local & AWS)
def lambda_handler(event: Any = None, context: Any = None) -> Dict[str, Any]:
    cells = load_sites(SITES_PATH)
    results: List[Optional[Dict[str, Any]]] = []

    for i, cell in enumerate(cells, start=1):
        print(f"[INFO] Đang xử lý cell {i}/{len(cells)}: {cell['cell_id']}")
        res = compute_cell_fwi(
            cell,
            past_days=DEFAULT_PAST_DAYS,
            forecast_days=DEFAULT_FORECAST_DAYS,
            n_samples_total=DEFAULT_N_SAMPLES,
        )
        results.append(res)

    geojson_obj = build_geojson(cells, results)
    save_geojson(geojson_obj, OUTPUT_GEOJSON_PATH)

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