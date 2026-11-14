# Hệ Thống Đặt Đồ Ăn - Nhóm 2

Dự án Hệ thống đặt đồ ăn theo ngày với đầy đủ Frontend & Backend API.

---

## 📌 1. Danh Sách Nhiệm Vụ (Tasks)

| Mã Task | Phân Hệ | Mô Tả | Nhánh Git |
| :--- | :--- | :--- | :--- |
| **`TF1A5C3`** | Frontend (FE) | Dựng trang tĩnh thực đơn theo ngày (chọn ngày, thẻ món, giá, số suất còn lại) | `feature/tf1a5c3-ngan` |
| **`TF1A638`** | Backend (BE) | Viết API trả thực đơn theo ngày kèm số suất còn lại của từng món | `feature/tf1a638-ngan` |

---

## 🚀 2. Hướng Dẫn Chạy & Kiểm Thử

### Cách 1: Chạy Server Python (Backend API + Web Frontend)
Chạy trực tiếp file `app.py` bằng Python:
```bash
python app.py
```
> [!NOTE]
> `app.py` được thiết kế thông minh hỗ trợ 2 chế độ:
> - **Chế độ Flask**: Tự động kích hoạt nếu máy đã cài `Flask` và `Flask-Cors`.
> - **Chế độ Standalone (Zero-Dependency)**: Tự động chạy bằng thư viện chuẩn của Python mà **không cần cài thêm bất kỳ thư viện nào** (không sợ lỗi thiếu thư viện).
> - **Tự động chuyển cổng**: Nếu cổng `5000` bị ứng dụng khác chiếm dụng trên Windows, server sẽ tự động chuyển sang `5001`, `8000`, `8080` mà không bị crash.

Sau khi chạy lệnh, bạn có thể mở các đường dẫn sau trên trình duyệt:
- 🌐 **Giao diện Web đầy đủ**: [http://127.0.0.1:5000](http://127.0.0.1:5000)
- 📡 **API thực đơn hôm nay**: [http://127.0.0.1:5000/api/menu](http://127.0.0.1:5000/api/menu)
- 📡 **API thực đơn theo ngày bất kỳ**: [http://127.0.0.1:5000/api/menu?date=2026-11-20](http://127.0.0.1:5000/api/menu?date=2026-11-20)

### Cách 2: Chạy kiểm thử tự động (Unit Test)
Chạy script kiểm tra logic API mà không cần mở trình duyệt:
```bash
python test_api.py
```

### Cách 3: Mở trực tiếp Frontend (Offline / Không cần bật server)
Nhấp đúp chuột vào file `daily-menu.html` hoặc `index.html` để mở ngay trên trình duyệt Chrome/Edge. Hệ thống có sẵn cơ chế dự phòng tự sinh dữ liệu mẫu mượt mà.

---

## 📡 3. Tài Liệu Chi Tiết API (Task TF1A638)

### Endpoint: `GET /api/menu`
* **Query Parameters**:
  * `date` (tùy chọn): Chuỗi ngày dạng `YYYY-MM-DD` (mặc định là `today`).
* **Ví dụ Request**: `GET http://127.0.0.1:5000/api/menu?date=2026-11-14`
* **Cấu trúc JSON phản hồi**:
```json
{
  "success": true,
  "task_id": "TF1A638",
  "date": "2026-11-14",
  "day_of_week": "Thứ Bảy",
  "total_dishes": 12,
  "available_dishes": 11,
  "out_of_stock_dishes": 1,
  "data": [
    {
      "id": "dish-1",
      "name": "Cơm Tấm Sườn Bì Chả Đặc Biệt",
      "category": "mon-chinh",
      "category_name": "Món chính",
      "price": 52000,
      "price_formatted": "52.000 ₫",
      "stock": 15,
      "initial_stock": 25,
      "stock_status": "available",
      "stock_label": "Còn 15 suất",
      "is_available": true
    }
  ]
}
```

---

## 📤 4. Hướng Dẫn Đẩy Nhánh Lên GitHub (Nộp Task TF1A638)

Chạy lần lượt các lệnh sau trong PowerShell hoặc Git Bash:

```powershell
# 1. Tạo và chuyển sang nhánh mới cho task BE
git checkout -b feature/tf1a638-ngan

# 2. Thêm file và commit đúng mã task
git add .
git commit -m "TF1A638: viết API trả thực đơn theo ngày kèm số suất còn lại"

# 3. Đẩy nhánh lên GitHub
git push -u origin feature/tf1a638-ngan
```

Sau khi push thành công, bạn lấy link nhánh:
`https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/tree/feature/tf1a638-ngan`
hoặc tạo Pull Request với tiêu đề `TF1A638: API xem thực đơn theo ngày kèm số suất còn lại` để nộp minh chứng.
