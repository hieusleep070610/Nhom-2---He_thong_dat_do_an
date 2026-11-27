from datetime import datetime, timezone
from json import loads

from fastapi import Request
from fastapi.responses import JSONResponse


def api_response(request: Request, data, message: str = "Thành công", status_code: int | None = None) -> dict:
    code = status_code or 200
    return {
        "statusCode": code,
        "error": None,
        "message": message,
        "data": data,
        "path": request.url.path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def normalize_api_response(path: str, payload, status_code: int = 200) -> dict:
    required_fields = {"statusCode", "error", "message", "data", "path", "timestamp"}
    if isinstance(payload, dict) and required_fields.issubset(payload):
        return payload

    message = payload.get("message", "Thành công") if isinstance(payload, dict) else "Thành công"
    if isinstance(payload, dict) and payload.get("status") == "success":
        payload = payload.get("data", payload)
    data = payload.get("data", payload) if isinstance(payload, dict) else payload
    return {
        "statusCode": status_code,
        "error": None,
        "message": message,
        "data": data,
        "path": path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def wrap_api_response(request: Request, call_next):
    response = await call_next(request)
    if not request.url.path.startswith("/api/") or response.status_code >= 400:
        return response
    if "application/json" not in response.headers.get("content-type", ""):
        return response

    if hasattr(response, "body"):
        body = response.body
    else:
        body = b"".join([chunk async for chunk in response.body_iterator])
    payload = loads(body) if body else None
    normalized = normalize_api_response(request.url.path, payload, response.status_code)
    return JSONResponse(status_code=response.status_code, content=normalized)
