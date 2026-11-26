from copy import deepcopy

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from starlette.exceptions import HTTPException as StarletteHTTPException


ERROR_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "status": {
            "type": "string",
            "enum": ["error"],
            "description": "Trạng thái của phản hồi.",
        },
        "code": {
            "type": "integer",
            "description": "Mã trạng thái HTTP.",
        },
        "message": {
            "type": "string",
            "description": "Mô tả lỗi.",
        },
        "details": {
            "description": "Thông tin lỗi bổ sung; có thể là object, danh sách hoặc null.",
            "oneOf": [
                {"type": "object"},
                {"type": "array"},
                {"type": "string"},
                {"type": "number"},
                {"type": "boolean"},
                {"type": "null"},
            ],
        },
    },
    "required": ["status", "code", "message", "details"],
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
            "status": "error",
            "code": 400,
            "message": "Dữ liệu không hợp lệ",
            "details": None,
        },
    ),
    "401": _error_response(
        "Chưa xác thực hoặc thông tin xác thực không hợp lệ.",
        {
            "status": "error",
            "code": 401,
            "message": "Token không hợp lệ",
            "details": None,
        },
    ),
    "403": _error_response(
        "Người dùng không có quyền thực hiện thao tác.",
        {
            "status": "error",
            "code": 403,
            "message": "Bạn không có quyền thực hiện hành động này",
            "details": None,
        },
    ),
    "404": _error_response(
        "Không tìm thấy tài nguyên được yêu cầu.",
        {
            "status": "error",
            "code": 404,
            "message": "Không tìm thấy tài nguyên",
            "details": None,
        },
    ),
    "409": _error_response(
        "Yêu cầu xung đột với trạng thái hoặc dữ liệu hiện tại.",
        {
            "status": "error",
            "code": 409,
            "message": "Trạng thái đơn hàng không hợp lệ",
            "details": {"code": "INVALID_ORDER_STATE"},
        },
    ),
    "413": _error_response(
        "Nội dung gửi lên vượt quá giới hạn cho phép.",
        {
            "status": "error",
            "code": 413,
            "message": "Kích thước tệp vượt quá giới hạn cho phép",
            "details": None,
        },
    ),
    "415": _error_response(
        "Định dạng nội dung gửi lên không được hỗ trợ.",
        {
            "status": "error",
            "code": 415,
            "message": "Định dạng tệp không được hỗ trợ",
            "details": None,
        },
    ),
    "422": _error_response(
        "Dữ liệu đầu vào không đúng định dạng hoặc không vượt qua kiểm tra.",
        {
            "status": "error",
            "code": 422,
            "message": "Dữ liệu đầu vào không đúng định dạng",
            "details": [{"field": "quantity", "msg": "Input should be greater than 0"}],
        },
    ),
    "500": _error_response(
        "Đã xảy ra lỗi không mong muốn trên máy chủ.",
        {
            "status": "error",
            "code": 500,
            "message": "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
            "details": None,
        },
    ),
    "502": _error_response(
        "Dịch vụ bên thứ ba trả về phản hồi không hợp lệ.",
        {
            "status": "error",
            "code": 502,
            "message": "Không thể tải ảnh lên dịch vụ lưu trữ",
            "details": None,
        },
    ),
    "503": _error_response(
        "Dịch vụ hiện không khả dụng; vui lòng thử lại sau.",
        {
            "status": "error",
            "code": 503,
            "message": "Dịch vụ tạm thời không khả dụng",
            "details": None,
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
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "code": status_code,
            "message": message,
            "details": details
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
            details=exc.details
        )

    # Xử lý lỗi validation của Pydantic (422)
    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = [{"field": err["loc"][-1], "msg": err["msg"]} for err in exc.errors()]
        return unified_error_response(
            status_code=422,
            message="Dữ liệu đầu vào không đúng định dạng",
            details=errors
        )

    # Xử lý các HTTP Exception mặc định của FastAPI/Starlette
    @app.exception_handler(StarletteHTTPException)
    def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return unified_error_response(
            status_code=exc.status_code,
            message=exc.detail
        )

    # Xử lý lỗi 500 (Catch-all cho các lỗi code/logic chưa được bắt)
    @app.exception_handler(Exception)
    def general_exception_handler(request: Request, exc: Exception):
        print(f"Bugs: {exc}")
        return unified_error_response(
            status_code=500,
            message="Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
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