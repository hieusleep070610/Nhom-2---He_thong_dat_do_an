# QuickBite / Foodie

Ứng dụng đặt món gồm frontend HTML/CSS/JavaScript và backend FastAPI/MySQL.

## Chạy dự án

1. Xem [hướng dẫn backend](backend/README.md) để cấu hình môi trường, MySQL và API.
2. Mở `frontend/index.html` qua VS Code Live Server hoặc HTTP server cục bộ. Địa chỉ backend được cấu hình tại `frontend/js/config/config.js`.
3. Mở `http://127.0.0.1:8000/docs` để xem API và `/api/health` để kiểm tra kết nối database.

Luồng khách hàng đã nối với API cho đăng nhập, xem menu, đặt hàng bằng ví và xem lịch sử. Giao diện quản trị và bếp hiện chỉ là mẫu.

Xem [hướng dẫn frontend](frontend/README.md). Kiểm thử backend: cài `backend/requirements-dev.txt`, sau đó chạy `python -m pytest -q` trong thư mục `backend`.
