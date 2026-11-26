# QuickBite / Foodie

Ứng dụng đặt món gồm frontend HTML/CSS/JavaScript và backend FastAPI/MySQL.

```text
quickbite/
├── backend/   # FastAPI, SQLAlchemy, MySQL và tests
└── frontend/  # Trang khách hàng và các trang admin/bếp mẫu
```

## Chạy dự án

1. Làm theo [hướng dẫn backend](quickbite/backend/README.md) để cấu hình `.env`, chuẩn bị MySQL và chạy API.
2. Mở `quickbite/frontend/index.html` qua VS Code Live Server hoặc một HTTP server cục bộ. Cấu hình API ở `quickbite/frontend/js/config/config.js`.
3. Tài liệu API có tại `http://127.0.0.1:8000/docs`; trạng thái DB tại `http://127.0.0.1:8000/api/health`.

Khách hàng có thể đăng nhập, xem món, quản lý giỏ, thanh toán bằng ví đã có số dư và xem lịch sử đơn. Trang admin/bếp hiện vẫn là giao diện mẫu, chưa có luồng quản lý trực tiếp.

Xem thêm [hướng dẫn frontend](quickbite/frontend/README.md). Backend tests chạy bằng `python -m pytest -q` trong thư mục `quickbite/backend` sau khi cài `requirements-dev.txt`.
