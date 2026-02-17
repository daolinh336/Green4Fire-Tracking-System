import random
from datetime import date
from typing import Dict, Any, List, Optional

import requests 
import httpx
import pandas as pd

import xarray as xr # Import bên trong hàm
from xclim.indices.fire import cffwis_indices # THƯ VIỆN CỰC NẶNG
import asyncio
import numpy as np

if not hasattr(np, "NaN"):
    np.NaN = np.nan 


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

DEFAULT_PAST_DAYS = 7       # số ngày quá khứ dùng để chạy fwi
DEFAULT_FORECAST_DAYS = 1   # số ngày forecast (để lấy hôm nay / ngày tới)
DEFAULT_N_SAMPLES = 5       # 1 điểm tâm + 4 điểm random trong bbox

async def fetch_open_meteo_daily_async(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    past_days: int = DEFAULT_PAST_DAYS,
    forecast_days: int = DEFAULT_FORECAST_DAYS,
    timezone: str = "auto",
) -> Dict[str, Any]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ",".join(
            [
                "temperature_2m_max",
                "relative_humidity_2m_min",
                "wind_speed_10m_max",
                "precipitation_sum",
            ]
        ),
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": timezone,
    }

    resp = await client.get(OPEN_METEO_URL, params=params, timeout=6)
    resp.raise_for_status()
    return resp.json()

def response_to_dataframe(data: Dict[str, Any]) -> pd.DataFrame:

    import pandas as pd # Import bên trong hàm

    if "daily" not in data:
        raise RuntimeError(f"Open-Meteo response missing 'daily' section: {data}")

    daily = data["daily"]
    times = pd.to_datetime(daily["time"])
    df = pd.DataFrame(index=times)
    df["tas"] = daily["temperature_2m_max"]         
    df["hurs"] = daily["relative_humidity_2m_min"]   
    df["sfcWind"] = daily["wind_speed_10m_max"]     
    df["pr"] = daily["precipitation_sum"]           
    df = df.astype(float)
    return df

def classify_fwi(fwi_value: float) -> Dict[str, Any]:
    if fwi_value < 5:
        danger_class = 0
        label = "Very Low"
    elif fwi_value < 12:
        danger_class = 1
        label = "Low"
    elif fwi_value < 22:
        danger_class = 2
        label = "Moderate"
    elif fwi_value < 32:
        danger_class = 3
        label = "High"
    elif fwi_value < 50:
        danger_class = 4
        label = "Very High"
    else:
        danger_class = 5
        label = "Extreme"
    return {"danger_class": danger_class, "danger_label": label}


async def compute_cell_fwi_async(
    cell: Dict[str, Any],
    past_days: int = DEFAULT_PAST_DAYS,
    forecast_days: int = DEFAULT_FORECAST_DAYS,
    n_samples_total: int = DEFAULT_N_SAMPLES
) -> Optional[Dict[str, Any]]:

    today_str = date.today().isoformat()
    seed = f"{cell['cell_id']}-{today_str}"
    points = sample_points_for_cell(cell, n_samples_total=n_samples_total, seed=seed)

    async with httpx.AsyncClient() as client:
        tasks = []
        for p in points:
            print(f"Chạy task lay data cho điểm {p} trong cell {cell['cell_id']}")
            tasks.append(fetch_open_meteo_daily_async(
                client, p["lat"], p["lon"], past_days, forecast_days
            ))
        
        print(f"--- Đang gửi {len(tasks)} request song song tới Open-Meteo ---")
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    valid_results = []
    for res in responses:
        if not isinstance(res, Exception) and res is not None:
            valid_results.append(res)

    if not valid_results:
        print(f"[ERROR] Tất cả request cho cell {cell['cell_id']} đều thất bại.")

    fwi_values: List[float] = []
    for i, resp_data in enumerate(responses):
        p = points[i]
        try:
            if isinstance(resp_data, Exception) or resp_data is None:
                print(f"[INFO] Điểm {p} lỗi, đang lấy data của điểm thành công khác để thay thế...")
                resp_data = valid_results[0]
            df = response_to_dataframe(resp_data)
            
            DC, DMC, FFMC, ISI, BUI, fwi_series = compute_fwi_timeseries(df, lat=p["lat"])
            fwi_today = float(fwi_series.isel(time=-1).values)
            fwi_values.append(fwi_today)
            print(f"Lay xong và tính FWI cho điểm {p}")

        except Exception as exc:
            print(f"[WARN] Không tính được FWI cho điểm {p} trong cell {cell['cell_id']}: {exc}")

    if not fwi_values:
        return None

    DC_mean = float(np.mean(DC))
    DMC_mean = float(np.mean(DMC))
    FFMC_mean = float(np.mean(FFMC))
    ISI_mean = float(np.mean(ISI))
    BUI_mean = float(np.mean(BUI))
    fwi_mean = float(np.mean(fwi_values))
    fwi_max = float(np.max(fwi_values))
    danger_info = classify_fwi(fwi_mean)

    return {
        "cell_id": cell["cell_id"],
        "lat": float(cell["lat"]),
        "lon": float(cell["lon"]),
        "forest_frac": float(cell.get("forest_frac", 1.0)),
        "fwi_mean": fwi_mean,
        "fwi_max": fwi_max,
        "DC_mean": DC_mean,
        "DMC_mean": DMC_mean,
        "ffmc_mean": FFMC_mean,
        "isi_mean": ISI_mean,
        "bui_mean": BUI_mean,
        **danger_info,
    }

# tính fwi bằng xclim
def compute_fwi_timeseries(df_daily: pd.DataFrame, lat: float) -> xr.DataArray:
    if df_daily.empty:
        raise ValueError("Empty daily weather data.")

    time_coord = df_daily.index

    tas = xr.DataArray(
        df_daily["tas"].to_numpy(),
        coords={"time": time_coord},
        dims=("time",),
        attrs={"units": "degC"},
    )

    hurs = xr.DataArray(
        df_daily["hurs"].to_numpy(),
        coords={"time": time_coord},
        dims=("time",),
        attrs={"units": "%"},
    )

    sfc_wind = xr.DataArray(
        df_daily["sfcWind"].to_numpy(),
        coords={"time": time_coord},
        dims=("time",),
        attrs={"units": "km/h"},
    )

    pr = xr.DataArray(
        df_daily["pr"].to_numpy(),
        coords={"time": time_coord},
        dims=("time",),
        attrs={"units": "mm/day"},
    )

    lat_da = xr.DataArray(lat, attrs={"units": "degrees_north"})

    # gọi xclim return: DC, DMC, FFMC, ISI, BUI, FWI
    DC, DMC, FFMC, ISI, BUI, FWI = cffwis_indices(
        tas=tas,
        pr=pr,
        sfcWind=sfc_wind,
        hurs=hurs,
        lat=lat_da,
        season_method=None,     
        overwintering=False,
        initial_start_up=True,
    )

    return DC, DMC, FFMC, ISI, BUI, FWI


# lấy mẫu điểm trong 1 cell
def sample_points_for_cell(
    cell: Dict[str, Any],
    n_samples_total: int = DEFAULT_N_SAMPLES,
    seed: Optional[str] = None,
) -> List[Dict[str, float]]:
    rng = random.Random(seed)
    points = [{"lat": float(cell["lat"]), "lon": float(cell["lon"])}]
    bbox = cell["bbox"]
    for _ in range(n_samples_total - 1):
        lat = rng.uniform(bbox["min_lat"], bbox["max_lat"])
        lon = rng.uniform(bbox["min_lon"], bbox["max_lon"])
        points.append({"lat": lat, "lon": lon})

    return points

def compute_cell_fwi(
    cell: Dict[str, Any],
    past_days: int = DEFAULT_PAST_DAYS,
    forecast_days: int = DEFAULT_FORECAST_DAYS,
    n_samples_total: int = DEFAULT_N_SAMPLES
) -> Optional[Dict[str, Any]]:
    return asyncio.run(compute_cell_fwi_async(cell, past_days, forecast_days, n_samples_total))