"""Cloudinary operations for dish images."""

from io import BytesIO

from app.core.config import settings


class CloudinaryNotConfigured(RuntimeError):
    pass


def _client():
    if not all((settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET)):
        raise CloudinaryNotConfigured("Cloudinary chưa được cấu hình.")

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    return cloudinary.uploader


def upload_dish_image(content: bytes, filename: str = "dish-image.jpg") -> dict:
    uploader = _client()
    image_stream = BytesIO(content)
    image_stream.name = filename
    return uploader.upload(
        image_stream,
        folder=settings.CLOUDINARY_FOLDER,
        resource_type="image",
        allowed_formats=["jpg", "jpeg", "png", "webp"],
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )


def delete_dish_image(public_id: str) -> None:
    if not public_id:
        return
    uploader = _client()
    uploader.destroy(public_id, resource_type="image", invalidate=True)
