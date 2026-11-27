from fastapi import FastAPI
from pydantic import BaseModel

from app.core.exceptions import ERROR_RESPONSES, setup_exception_handlers


class ItemRequest(BaseModel):
    name: str


def test_openapi_documents_error_responses_and_preserves_request_schema():
    app = FastAPI()
    setup_exception_handlers(app)

    @app.post("/items")
    def create_item(payload: ItemRequest):
        return payload

    operation = app.openapi()["paths"]["/items"]["post"]

    assert set(ERROR_RESPONSES).issubset(operation["responses"])
    assert operation["responses"]["422"]["description"] == ERROR_RESPONSES["422"]["description"]
    example = operation["responses"]["409"]["content"]["application/json"]["examples"]["error"]["value"]
    assert example["statusCode"] == 409
    assert set(example) == {"statusCode", "error", "message", "data", "path", "timestamp"}
    assert operation["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/ItemRequest"
    )
