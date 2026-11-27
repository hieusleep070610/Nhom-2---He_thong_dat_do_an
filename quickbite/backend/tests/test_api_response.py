import json

from fastapi import Request

from app.core.api_response import normalize_api_response
from app.core.exceptions import unified_error_response


def make_request(path):
    return Request({
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "GET", "scheme": "http", "path": path, "raw_path": path.encode(),
        "query_string": b"", "root_path": "", "headers": [],
        "server": ("testserver", 80), "client": ("testclient", 50000),
    })


def assert_envelope(payload, *, status_code, path):
    assert set(payload) == {"statusCode", "error", "message", "data", "path", "timestamp"}
    assert payload["statusCode"] == status_code
    assert payload["path"] == path
    assert payload["timestamp"].endswith("+00:00")


def test_successful_list_response_uses_standard_envelope():
    payload = normalize_api_response("/api/list", [{"id": 1}, {"id": 2}])

    assert_envelope(payload, status_code=200, path="/api/list")
    assert payload["data"] == [{"id": 1}, {"id": 2}]


def test_legacy_success_response_keeps_message_and_unwraps_data():
    payload = normalize_api_response("/api/legacy", {
        "status": "success", "message": "Đã cập nhật", "data": {"id": 3},
    })

    assert_envelope(payload, status_code=200, path="/api/legacy")
    assert payload["message"] == "Đã cập nhật"
    assert payload["data"] == {"id": 3}


def test_existing_envelope_is_not_double_wrapped():
    existing = {
        "statusCode": 201, "error": None, "message": "Tạo xong", "data": {"id": 7},
        "path": "/api/items", "timestamp": "2026-01-01T00:00:00+00:00",
    }

    assert normalize_api_response("/api/ignored", existing, 201) == existing


def test_http_error_uses_same_envelope_and_preserves_http_status():
    request = make_request("/api/fail")
    response = unified_error_response(409, "Đơn đã bắt đầu chuẩn bị.", {"_request": request})
    payload = json.loads(response.body)

    assert response.status_code == 409
    assert_envelope(payload, status_code=409, path="/api/fail")
    assert payload["error"] == "Đơn đã bắt đầu chuẩn bị."
    assert payload["data"] is None
