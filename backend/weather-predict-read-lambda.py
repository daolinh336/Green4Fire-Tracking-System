import os
import json
import boto3
from datetime import datetime
from email.utils import format_datetime, parsedate_to_datetime
from botocore.exceptions import ClientError

s3 = boto3.client("s3")

BUCKET = os.getenv("BUCKET", "firms-fwi-data")
KEY = os.getenv("KEY", "data/fwi_latest.geojson")
CACHE_SECONDS = int(os.getenv("CACHE_SECONDS", "300"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")

def _cors_headers():
    # CORS cho truy cập cổng frontend
    return {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,If-None-Match,If-Modified-Since",
        "Access-Control-Max-Age": "86400",
    }

def _http(date_hdr: str | None, etag: str | None, status: int, body: str | None):
    # Tạo HTTP response chuẩn (cho API Gateway HTTP API) với CORS + cache.
    headers = {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Cache-Control": f"public, max-age={CACHE_SECONDS}",
        **_cors_headers()
    }
    if etag:
        headers["ETag"] = etag
    if date_hdr:
        headers["Last-Modified"] = date_hdr

    return {
        "statusCode": status,
        "headers": headers,
        "body": (body if body is not None else "")
    }

def lambda_handler(event, context):
    """
    Lambda handler đọc file FWI GeoJSON từ S3 và trả về cho frontend, hỗ trợ cache (ETag/Last-Modified).
    Chức năng:
        - Đây là Lambda đóng vai trò API đọc file 'fwi_latest.geojson' từ S3 và trả ra dạng GeoJSON.
        - Hỗ trợ:
            + CORS đầy đủ cho frontend gọi trực tiếp từ trình duyệt.
            + Preflight OPTIONS (trả 204).
            + Conditional request:
                * If-None-Match (ETag) → trả 304 nếu dữ liệu không thay đổi.
                * If-Modified-Since → trả 304 nếu file trên S3 không mới hơn thời điểm client đang có.
        - Giúp giảm băng thông, tăng hiệu năng và tận dụng cache phía client/CDN.
    """
    # Preflight CORS
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": _cors_headers(),
            "body": ""
        }

    # Support conditional request từ frontend:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}

    # B1: lấy metadata object trước (HEAD) để đọc ETag/Last-Modified
    try:
        head = s3.head_object(Bucket=BUCKET, Key=KEY)
    except ClientError as e:
        code = e.response["Error"].get("Code")
        if code in ("404", "NoSuchKey"):
            return _http(None, None, 404, json.dumps({"error":"not_found"}))
        raise

    etag = head.get("ETag", "").strip('"')
    last_modified_dt = head.get("LastModified")  # datetime
    last_modified_http = format_datetime(last_modified_dt) if last_modified_dt else None

    # B2: kiểm tra điều kiện 304
    # If-None-Match
    inm = headers.get("if-none-match")
    if inm and inm.strip('"') == etag:
        return _http(last_modified_http, f'"{etag}"', 304, None)

    # If-Modified-Since
    ims = headers.get("if-modified-since")
    if ims and last_modified_dt:
        try:
            ims_dt = parsedate_to_datetime(ims)
            # nếu object không mới hơn thời điểm client có → 304
            if last_modified_dt.replace(microsecond=0, tzinfo=ims_dt.tzinfo) <= ims_dt:
                return _http(last_modified_http, f'"{etag}"', 304, None)
        except Exception:
            pass

    # B3: get_object & trả nội dung
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=KEY)
        raw = obj["Body"].read()
        body = raw.decode("utf-8")
    except ClientError as e:
        code = e.response["Error"].get("Code")
        if code in ("404", "NoSuchKey"):
            return _http(None, None, 404, json.dumps({"error":"not_found"}))
        raise

    return _http(last_modified_http, f'"{etag}"', 200, body)
