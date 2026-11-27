from copy import deepcopy
from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from starlette.exceptions import HTTPException as StarletteHTTPException


ERROR_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "statusCode": {"type": "integer", "description": "Mã trạng thái HTTP."},
        "error": {"type": "string", "nullable": True},
        "message": {"type": "string", "description": "Mô tả lỗi."},
        "data": {"type": "null"},
        "path": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
    },
    "required": ["statusCode", "error", "message", "data", "path", "timestamp"],
}


def _error_response(description: str, example: dict) -> dict:
    return {
        "description": description,
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/APIErrorResponse"},
                "examples": {
                    "error": {
                        "summary": description,
                        "value": example,
                    }
                },
            }
        },
    }


ERROR_RESPONSES = {
    "400": _error_response(
        "Yêu cầu không hợp lệ hoặc vi phạm quy tắc nghiệp vụ.",
        {
            "statusCode": 400,
            "error": "Dữ liệu không hợp lệ",
            "message": "Dữ liệu không hợp lệ",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "401": _error_response(
        "Chưa xác thực hoặc thông tin xác thực không hợp lệ.",
        {
            "statusCode": 401,
            "error": "Token không hợp lệ",
            "message": "Token không hợp lệ",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "403": _error_response(
        "Người dùng không có quyền thực hiện thao tác.",
        {
            "statusCode": 403,
            "error": "Bạn không có quyền thực hiện hành động này",
            "message": "Bạn không có quyền thực hiện hành động này",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "404": _error_response(
        "Không tìm thấy tài nguyên được yêu cầu.",
        {
            "statusCode": 404,
            "error": "Không tìm thấy tài nguyên",
            "message": "Không tìm thấy tài nguyên",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "409": _error_response(
        "Yêu cầu xung đột với trạng thái hoặc dữ liệu hiện tại.",
        {
            "statusCode": 409,
            "error": "Trạng thái đơn hàng không hợp lệ",
            "message": "Trạng thái đơn hàng không hợp lệ",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "413": _error_response(
        "Nội dung gửi lên vượt quá giới hạn cho phép.",
        {
            "statusCode": 413,
            "error": "Kích thước tệp vượt quá giới hạn cho phép",
            "message": "Kích thước tệp vượt quá giới hạn cho phép",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "415": _error_response(
        "Định dạng nội dung gửi lên không được hỗ trợ.",
        {
            "statusCode": 415,
            "error": "Định dạng tệp không được hỗ trợ",
            "message": "Định dạng tệp không được hỗ trợ",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "422": _error_response(
        "Dữ liệu đầu vào không đúng định dạng hoặc không vượt qua kiểm tra.",
        {
            "statusCode": 422,
            "error": "Dữ liệu đầu vào không đúng định dạng",
            "message": "Dữ liệu đầu vào không đúng định dạng",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "500": _error_response(
        "Đã xảy ra lỗi không mong muốn trên máy chủ.",
        {
            "statusCode": 500,
            "error": "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
            "message": "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "502": _error_response(
        "Dịch vụ bên thứ ba trả về phản hồi không hợp lệ.",
        {
            "statusCode": 502,
            "error": "Không thể tải ảnh lên dịch vụ lưu trữ",
            "message": "Không thể tải ảnh lên dịch vụ lưu trữ",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
    "503": _error_response(
        "Dịch vụ hiện không khả dụng; vui lòng thử lại sau.",
        {
            "statusCode": 503,
            "error": "Dịch vụ tạm thời không khả dụng",
            "message": "Dịch vụ tạm thời không khả dụng",
            "data": None, "path": "/api/example", "timestamp": "2026-01-01T00:00:00Z",
        },
    ),
}


# 1. Định nghĩa các Custom Exceptions
class BaseAPIException(Exception):
    """Lớp base cho mọi custom exception trong hệ thống"""
    def __init__(self, message: str, status_code: int, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details

class BadRequestException(BaseAPIException):
    def __init__(self, message: str = "Dữ liệu không hợp lệ", details: dict = None):
        super().__init__(message=message, status_code=400, details=details)

class ForbiddenException(BaseAPIException):
    def __init__(self, message: str = "Bạn không có quyền thực hiện hành động này", details: dict = None):
        super().__init__(message=message, status_code=403, details=details)

class NotFoundException(BaseAPIException):
    def __init__(self, message: str = "Không tìm thấy tài nguyên", details: dict = None):
        super().__init__(message=message, status_code=404, details=details)

class ConflictException(BaseAPIException):
    def __init__(self, message: str, code: str = "INVALID_ORDER_STATE", details: dict = None):
        payload = {"code": code}
        if details:
            payload.update(details)
        super().__init__(message=message, status_code=409, details=payload)


# 2. Hàm Format Response Lỗi Thống Nhất
def unified_error_response(status_code: int, message: str, details: any = None) -> JSONResponse:
    from fastapi import Request
    request = details.get("_request") if isinstance(details, dict) else None
    error = message
    return JSONResponse(
        status_code=status_code,
        content={
            "statusCode": status_code,
            "error": error,
            "message": message,
            "data": None,
            "path": str(request.url.path) if isinstance(request, Request) else "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

# 3. Đăng ký các Exception Handlers
def setup_exception_handlers(app):
    
    # Xử lý các Custom Exception(400, 403, 404)
    @app.exception_handler(BaseAPIException)
    def custom_api_exception_handler(request: Request, exc: BaseAPIException):
        return unified_error_response(
            status_code=exc.status_code,
            message=exc.message,
            details={"_request": request, "details": exc.details}
        )

    # Xử lý lỗi validation của Pydantic (422)
    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = [{"field": err["loc"][-1], "msg": err["msg"]} for err in exc.errors()]
        return unified_error_response(
            status_code=422,
            message="Dữ liệu đầu vào không đúng định dạng",
            details={"_request": request, "details": errors}
        )

    # Xử lý các HTTP Exception mặc định của FastAPI/Starlette
    @app.exception_handler(StarletteHTTPException)
    def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return unified_error_response(
            status_code=exc.status_code,
            message=str(exc.detail), details={"_request": request}
        )

    # Xử lý lỗi 500 (Catch-all cho các lỗi code/logic chưa được bắt)
    @app.exception_handler(Exception)
    def general_exception_handler(request: Request, exc: Exception):
        print(f"Bugs: {exc}")
        return unified_error_response(
            status_code=500,
            message="Lỗi máy chủ nội bộ. Vui lòng thử lại sau.", details={"_request": request},
        )

    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            openapi_version=app.openapi_version,
            routes=app.routes,
            tags=app.openapi_tags,
            servers=app.servers,
        )
        schemas = openapi_schema.setdefault("components", {}).setdefault("schemas", {})
        schemas["APIErrorResponse"] = deepcopy(ERROR_RESPONSE_SCHEMA)

        for path_item in openapi_schema["paths"].values():
            for operation in path_item.values():
                if not isinstance(operation, dict) or "responses" not in operation:
                    continue
                for status_code, response in ERROR_RESPONSES.items():
                    existing = operation["responses"].get(status_code, {})
                    operation["responses"][status_code] = {
                        **existing,
                        **deepcopy(response),
                    }

        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi
