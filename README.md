# Hệ Thống Đặt Đồ Ăn - Nhóm 2

Dự án Hệ thống đặt đồ ăn theo ngày với đầy đủ Frontend & Backend API.

---

## 📌 1. Danh Sách Nhiệm Vụ (Tasks)

| Mã Task | Phân Hệ | Mô Tả | Nhánh Git |
| :--- | :--- | :--- | :--- |
| **`TF1A5C3`** | Frontend (FE) | Dựng trang tĩnh thực đơn theo ngày (chọn ngày, thẻ món, giá, số suất còn lại) | `feature/tf1a5c3-ngan` |
| **`TF1A638`** | Backend (BE) | Viết API trả thực đơn theo ngày kèm số suất còn lại của từng món | `feature/tf1a638-ngan` |
| **`TF1A6E9`** | Frontend (FE) | Trang xem thực đơn theo ngày nối API (chọn ngày, trạng thái hết món, đang tải và rỗng) | `feature/tf1a6e9-ngan` |
| **`TF1A785`** | Backend (BE) | Viết API chi tiết món ăn (ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng) | `feature/tf1a785-ngan` |
| **`TF1A86F`** | Frontend (FE) | Trang chi tiết món với ảnh, mô tả, giá, nguyên liệu và nút thêm vào đơn | `feature/tf1a86f-ngan` |
| **`TF1A8D7`** | Backend (BE) | Viết API tìm món theo tên, có phân trang và xử lý từ khóa rỗng | `feature/tf1a8d7-ngan` |
| **`TF1A94A`** | Frontend (FE) | Thêm ô tìm kiếm với gợi ý khi gõ, trang kết quả và thông báo không tìm thấy | `feature/tf1a94a-ngan` |
| **`TF1B44A`** | Frontend (FE) | Lọc món theo loại trên trang thực đơn (món chính, canh, tráng miệng...) | `feature/tf1b44a-ngan` |

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
- 🌐 **Giao diện Web Thực Đơn Ngày**: [http://127.0.0.1:5000](http://127.0.0.1:5000)
- 🍲 **Trang Chi Tiết Món Ăn (Task TF1A86F)**: [http://127.0.0.1:5000/dish-detail.html?id=dish-1](http://127.0.0.1:5000/dish-detail.html?id=dish-1)
- 🔍 **API tìm kiếm món ăn (Task TF1A8D7)**: [http://127.0.0.1:5000/api/dishes/search?q=cơm&page=1&limit=4](http://127.0.0.1:5000/api/dishes/search?q=cơm&page=1&limit=4)
- 📡 **API thực đơn hôm nay**: [http://127.0.0.1:5000/api/menu](http://127.0.0.1:5000/api/menu)
- 📡 **API thực đơn theo ngày bất kỳ**: [http://127.0.0.1:5000/api/menu?date=2026-11-20](http://127.0.0.1:5000/api/menu?date=2026-11-20)
- 📡 **API chi tiết món ăn (Task TF1A785)**: [http://127.0.0.1:5000/api/dishes/dish-1](http://127.0.0.1:5000/api/dishes/dish-1)

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

## 💻 4. Tài Liệu Chi Tiết Chức Năng [FE] Nối API (Task TF1A6E9)

Chức năng Frontend **Trang xem thực đơn theo ngày nối API** (`daily-menu.html` & `js/daily-menu.js`) đáp ứng trọn vẹn 4 yêu cầu nghiệp vụ cốt lõi:

### 1. Nối Trang Thực Đơn Với API & Chọn Ngày
- **Cơ chế gọi API**: Mỗi khi người dùng chọn ngày qua thanh 7 ngày kế tiếp (Date Tabs Carousel), nút Ngày trước / Ngày sau (Prev/Next), hoặc ô chọn ngày tùy ý (`<input type="date">`), frontend tự động thực hiện request `GET /api/menu?date=YYYY-MM-DD`.
- **Đồng bộ trạng thái**: Dữ liệu phản hồi từ backend API (tổng số món, số món còn suất, số món hết suất, khung giờ phục vụ) được cập nhật đồng bộ lên thanh trạng thái ngày và các bộ lọc danh mục.
- **Dự phòng thông minh (Offline Fallback)**: Nếu chưa khởi động server backend, ứng dụng tự động kích hoạt cơ chế giả lập Offline Demo với đầy đủ dữ liệu món ăn và trạng thái mà không gây crash trang.

### 2. Trạng Thái Đang Tải (Loading State)
- Khi bắt đầu gọi API lấy thực đơn theo ngày mới, hệ thống kích hoạt giao diện **Skeleton Loading Cards** với hiệu ứng ánh sáng lướt qua (Shimmer Animation) và thanh hiển thị tiến trình xoay (Spinner).
- Thông báo rõ ràng: `"Đang kết nối API và tải thực đơn ngày DD/MM/YYYY..."`.
- Ngăn chặn thao tác trùng lặp trong lúc dữ liệu đang tải.

### 3. Trạng Thái Hết Món (Out Of Stock State)
- Các món ăn có số suất `stock === 0` hoặc `is_available === false`:
  - **Dải nhãn nổi bật**: Hiển thị nhãn đỏ `ĐÃ HẾT MÓN` phủ trên ảnh món ăn và huy hiệu `Hết món`.
  - **Thanh số suất**: Hiển thị nhãn đỏ `Hết suất hôm nay`, thanh tiến độ 0%.
  - **Khóa đặt món**: Nút `"Chọn món"` tự động chuyển thành `<i class="fa-solid fa-ban"></i> Hết suất`, đổi màu xám và vô hiệu hóa (`disabled`), ngăn không cho thêm vào giỏ.
  - **Modal chi tiết**: Khi xem chi tiết món ăn hết suất, hiển thị hộp cảnh báo màu đỏ thông báo món đã hết suất cho ngày đã chọn.
  - **Bộ lọc nhanh**: Hỗ trợ nút lọc riêng cho danh mục `"Còn món"` và `"Hết món"` để người dùng và giảng viên dễ dàng kiểm tra.

### 4. Trạng Thái Rỗng (Empty State)
Hệ thống xử lý phân tách 2 tình huống giao diện rỗng độc lập, trực quan:
- **Tình huống 1: Ngày được chọn không có thực đơn** (API trả về `data: []`):
  - Hiển thị biểu tượng lịch rỗng kèm thông điệp: `"Chưa có thực đơn cho [Ngày, DD/MM/YYYY] - Nhà hàng hiện chưa cập nhật thực đơn hoặc tạm ngưng phục vụ trong ngày đã chọn."`
  - Cung cấp nút điều hướng nhanh: `"Xem thực đơn hôm nay"` hoặc `"Xem ngày mai"`.
  - Có nút `"Thử ngày rỗng"` trên thanh trạng thái để kiểm thử nhanh tình huống này.
- **Tình huống 2: Không tìm thấy kết quả khi tìm kiếm hoặc lọc danh mục**:
  - Hiển thị biểu tượng tìm kiếm rỗng kèm thông điệp: `"Không tìm thấy món ăn phù hợp với từ khóa..."`
  - Cung cấp nút `"Xem tất cả món của ngày này"` để reset bộ lọc ngay lập tức.

---

## 📤 5. Hướng Dẫn Đẩy Nhánh Lên GitHub (Nộp Task TF1A6E9)

Chạy lần lượt các lệnh sau trong PowerShell hoặc Git Bash để nộp minh chứng:

```powershell
# 1. Tạo và chuyển sang nhánh mới cho task FE
git checkout -b feature/tf1a6e9-ngan

# 2. Thêm file và commit đúng mã task TF1A6E9
git add .
git commit -m "TF1A6E9: [FE] Trang xem thực đơn theo ngày nối API (chọn ngày, trạng thái hết món, đang tải và rỗng)"

# 3. Đẩy nhánh lên GitHub
git push -u origin feature/tf1a6e9-ngan
```

### 🔗 Minh Chứng Nộp Bài (Task TF1A6E9):
- **Link Nhánh GitHub**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/tree/feature/tf1a6e9-ngan`
- **Link Tạo / Nộp Pull Request**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/pull/new/feature/tf1a6e9-ngan`
  *(Tiêu đề PR: `TF1A6E9: [FE] Trang xem thực đơn theo ngày nối API`)*

---

## 🍲 5. Tài Liệu Chi Tiết API Chi Tiết Món Ăn (Task TF1A785)

### Endpoint: `GET /api/dishes/<dish_id>` (hoặc `GET /api/dish/<dish_id>`)
* **Mô tả**: Trả về thông tin chi tiết đầy đủ của một món ăn bao gồm hình ảnh, mô tả, đơn giá, danh sách nguyên liệu, thông tin dị ứng và bảng dinh dưỡng.
* **Ví dụ Request**: `GET http://127.0.0.1:5000/api/dishes/dish-1`
* **Cấu trúc JSON phản hồi thành công (200 OK)**:
```json
{
  "success": true,
  "task_id": "TF1A785",
  "data": {
    "id": "dish-1",
    "name": "Cơm Tấm Sườn Bì Chả Đặc Biệt",
    "category": "mon-chinh",
    "category_name": "Món chính",
    "meal_time": "Trưa & Tối",
    "price": 52000,
    "price_formatted": "52.000 ₫",
    "original_price": 60000,
    "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    "description": "Sườn cốt lết ướp mật ong nướng than hồng thơm lừng, bì dai giòn cùng chả trứng hấp béo ngậy kèm đồ chua và nước mắm kẹo đậm đà.",
    "ingredients": [
      "Gạo tấm thơm ST25",
      "Sườn cốt lết heo tươi ướp mật ong",
      "Bì heo thái chỉ sợi thính gạo rang",
      "Chả trứng hấp mộc nhĩ nấm mèo",
      "Mỡ hành lá phi thơm tóp mỡ giòn",
      "Nước mắm chua ngọt pha kẹo",
      "Đồ chua (củ cải trắng, cà rốt ngâm giấm)"
    ],
    "allergy_info": [
      "Có chứa trứng gà (trong chả trứng)",
      "Có chứa đậu nành (trong nước sốt ướp sườn)",
      "Không chứa đậu phộng",
      "Không chứa sữa động vật"
    ],
    "allergens": [
      "Trứng",
      "Đậu nành"
    ],
    "nutrition": {
      "calories": "650 kcal",
      "protein": "32g",
      "carbs": "68g",
      "fat": "24g"
    },
    "preparation_time": "10 - 15 phút"
  }
}
```
* **Cấu trúc JSON phản hồi khi không tìm thấy món (404 Not Found)**:
```json
{
  "success": false,
  "task_id": "TF1A785",
  "error": "Không tìm thấy món ăn với ID 'dish-xyz'",
  "code": "DISH_NOT_FOUND"
}
```

---

## 📤 6. Hướng Dẫn Đẩy Nhánh Lên GitHub (Nộp Task TF1A785)

Chạy lần lượt các lệnh sau trong PowerShell hoặc Git Bash để nộp minh chứng:

```powershell
# 1. Tạo và chuyển sang nhánh mới cho task BE TF1A785
git checkout -b feature/tf1a785-ngan

# 2. Thêm file và commit đúng mã task TF1A785
git add .
git commit -m "TF1A785: [BE] API chi tiết món ăn (ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng)"

# 3. Đẩy nhánh lên GitHub
git push -u origin feature/tf1a785-ngan
```

### 🔗 Minh Chứng Nộp Bài (Task TF1A785):
- **Link Nhánh GitHub**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/tree/feature/tf1a785-ngan`
- **Link Tạo / Nộp Pull Request**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/pull/new/feature/tf1a785-ngan`
  *(Tiêu đề PR: `TF1A785: [BE] API chi tiết món ăn (ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng)`)*

---

---

## 🍽️ 7. Tài Liệu Chi Tiết Chức Năng [FE] Trang Chi Tiết Món Ăn (Task TF1A86F)

Chức năng Frontend **Trang chi tiết món ăn** (`dish-detail.html`, `css/dish-detail.css`, `js/dish-detail.js`) đáp ứng trọn vẹn 5 yêu cầu nghiệp vụ cốt lõi theo đề bài:

### 1. Hình Ảnh Món Ăn Sắc Nét (Image Showcase)
- **Hiển thị chất lượng cao**: Khung ảnh tỉ lệ vàng với hiệu ứng phóng to nhẹ (Hover Zoom) khi di chuột.
- **Huy hiệu trực quan (Badges)**: Gắn nhãn danh mục món (`Món chính`, `Món nước`, `Món chay`, `Đồ uống`), khung giờ phục vụ (`Trưa & Tối`), và nhãn đặc biệt (`Bán chạy`, `Bếp trưởng đề xuất`, `Hot trend`).
- **Lớp phủ hết món (Out of Stock Overlay)**: Tự động phủ màn tối kèm thông báo đỏ `ĐÃ HẾT SUẤT HÔM NAY` nếu số suất còn lại bằng 0.
- **Thanh thông số nhanh (Quick Specs)**: Thời gian chế biến (`10 - 15 phút`), Lượng calo (`650 kcal`), Tiêu chuẩn an toàn (`VietGAP 100%`).

### 2. Mô Tả Chi Tiết Món Ăn (Description)
- Phần mô tả món ăn chi tiết, giới thiệu hương vị, cách chế biến và cảm nhận ẩm thực đặc trưng của món.
- Tích hợp thêm các tab hướng dẫn thưởng thức và quy trình bảo quản giữ nhiệt an toàn bằng hộp bã mía sinh học thân thiện môi trường.

### 3. Giá Cả & Tính Toán Tự Động (Price & Subtotal Calculation)
- **Hiển thị giá chuẩn**: Định dạng tiền tệ Việt Nam (`52.000 ₫`).
- **Khuyến mãi & Giá gốc**: Hiển thị giá gốc gạch ngang (`60.000 ₫`) kèm nhãn phần trăm giảm giá (`-13%`).
- **Tạm tính động (Real-time Subtotal)**: Tự động nhân đơn giá với số lượng đang chọn trong bộ điều khiển số lượng.
- **Ghi chú minh bạch**: Đã bao gồm thuế VAT và hộp đựng giữ nhiệt chuyên dụng.

### 4. Danh Sách Nguyên Liệu Tự Nhiên (Ingredients - Task TF1A785 & TF1A86F)
- **Dạng thẻ chip hiện đại**: Từng nguyên liệu được trình bày trực quan dạng thẻ chip với biểu tượng hạt mầm xanh (`fa-seedling`).
- **Cam kết xuất xứ**: Banner cam kết 100% nguyên liệu sạch đạt chuẩn VietGAP nhập mới mỗi ngày.
- **Tích hợp cảnh báo dị ứng**: Liệt kê các chất dị ứng chính (`Trứng`, `Đậu nành`, `Gluten`, `Hải sản`, `Lactose`) và lưu ý cảnh báo cho thực khách có cơ địa mẫn cảm.
- **Bảng giá trị dinh dưỡng**: 4 chỉ số khoa học gồm Năng lượng (Calories), Đạm (Protein), Tinh bột (Carbohydrate), và Chất béo (Fat).

### 5. Nút "Thêm Vào Đơn" & Điều Khiển Số Lượng (Add To Order)
- **Bộ đếm số lượng (Quantity Stepper)**: Cho phép tăng/giảm số suất đặt với giới hạn chặn dưới (`min = 1`) và chặn trên (`max = stock` số suất còn lại trong ngày).
- **Nút "Thêm vào đơn" (`#btnAddToCart`)**: 
  - Thêm số lượng suất ăn đã chọn vào giỏ hàng chung (`foodiehub_cart`).
  - Đồng bộ tự động qua `localStorage` với giỏ hàng của trang thực đơn theo ngày (`daily-menu.html`).
  - Phản hồi thị giác tức thì: Nút đổi sang trạng thái `Đã thêm vào đơn!` kèm hiệu ứng thông báo Toast nổi.
  - Vô hiệu hóa (`disabled`) khi món ăn hết suất trong ngày.
- **Nút "Đặt món ngay" (`#btnQuickOrder`)**: Hỗ trợ cửa sổ Pop-up xác nhận nhanh thông tin giao hàng và gửi đơn về backend `POST /api/order`.
- **Thanh hành động đáy trên di động (Mobile Sticky Action Bar)**: Khi cuộn trang trên điện thoại, thanh đặt món ghim cố định ở đáy màn hình giúp thao tác cực kỳ tiện lợi.

---

## 📤 8. Hướng Dẫn Đẩy Nhánh Lên GitHub (Nộp Task TF1A86F)

Chạy lần lượt các lệnh sau trong PowerShell hoặc Git Bash:

```powershell
# 1. Tạo và chuyển sang nhánh mới cho task FE TF1A86F
git checkout -b feature/tf1a86f-ngan

# 2. Thêm file và commit đúng mã task TF1A86F
git add .
git commit -m "TF1A86F: [FE] Trang chi tiết món với ảnh, mô tả, giá, nguyên liệu và nút thêm vào đơn"

# 3. Đẩy nhánh lên GitHub
git push -u origin feature/tf1a86f-ngan
```

### 🔗 Minh Chứng Nộp Bài (Task TF1A86F):
- **Link Nhánh GitHub**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/tree/feature/tf1a86f-ngan`
- **Link Tạo / Nộp Pull Request**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/pull/new/feature/tf1a86f-ngan`
  *(Tiêu đề PR: `TF1A86F: [FE] Trang chi tiết món với ảnh, mô tả, giá, nguyên liệu và nút thêm vào đơn`)*

---

## 📤 9. Danh Sách Các Nhánh & Pull Request Khác
* **Task BE TF1A8D7**: Nhánh `feature/tf1a8d7-ngan` | PR: `TF1A8D7: [BE] API tìm kiếm món ăn theo tên, có phân trang và xử lý từ khóa rỗng`
* **Task FE TF1A86F**: Nhánh `feature/tf1a86f-ngan` | PR: `TF1A86F: [FE] Trang chi tiết món với ảnh, mô tả, giá, nguyên liệu và nút thêm vào đơn`
* **Task BE TF1A785**: Nhánh `feature/tf1a785-ngan` | PR: `TF1A785: [BE] API chi tiết món ăn (ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng)`
* **Task FE TF1A6E9**: Nhánh `feature/tf1a6e9-ngan` | PR: `TF1A6E9: [FE] Trang xem thực đơn theo ngày nối API`
* **Task BE TF1A638**: Nhánh `feature/tf1a638-ngan` | PR: `TF1A638: API xem thực đơn theo ngày kèm số suất còn lại`

---

## 🔍 10. Tài Liệu Chi Tiết API Tìm Kiếm Món Ăn (Task TF1A8D7)

API Backend **Tìm kiếm món ăn theo tên** đáp ứng đầy đủ các yêu cầu nghiệp vụ:
1. **Tìm kiếm món theo tên**: Tìm kiếm linh hoạt không phân biệt hoa thường (case-insensitive), hỗ trợ cả tiếng Việt có dấu (`cơm`, `phở`) và không dấu (`com`, `pho bo`, `ga`).
2. **Phân trang (Pagination)**: Tham số `page` (trang hiện tại, mặc định 1) và `limit` (số món mỗi trang, mặc định 6). Trả về metadata đầy đủ gồm `page`, `limit`, `total_items`, `total_pages`, `has_next`, `has_prev`.
3. **Xử lý từ khóa rỗng (Empty Keyword Handling)**: Khi từ khóa rỗng, chỉ gồm khoảng trắng hoặc không truyền, API tự động trả về toàn bộ danh sách món ăn được phân trang kèm cờ `is_empty_keyword: true` và thông điệp giải thích rõ ràng. Hỗ trợ thêm cờ `strict_empty=true` nếu cần bắt lỗi 400.

### Endpoint: `GET /api/dishes/search` hoặc `GET /api/search`

#### Query Parameters:
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `q` / `keyword` / `name` | string | `""` | Từ khóa tìm kiếm theo tên món (có dấu hoặc không dấu) |
| `page` | integer | `1` | Số thứ tự trang cần lấy (bắt đầu từ 1) |
| `limit` / `page_size` | integer | `6` | Số lượng món ăn tối đa trên một trang (tối đa 50) |
| `date` | string (YYYY-MM-DD) | `None` | (Tùy chọn) Ngày phục vụ để lấy số suất còn lại theo ngày |
| `strict_empty` | boolean | `false` | Nếu `true`, trả về lỗi HTTP 400 khi từ khóa rỗng |

#### Ví Dụ 1: Tìm kiếm theo tên có dấu
- **Request**: `GET http://127.0.0.1:5000/api/dishes/search?q=Cơm&page=1&limit=4`
- **Response**:
```json
{
  "success": true,
  "task_id": "TF1A8D7",
  "keyword": "Cơm",
  "is_empty_keyword": false,
  "page": 1,
  "limit": 4,
  "total_items": 4,
  "total_pages": 1,
  "has_next": false,
  "has_prev": false,
  "pagination": {
    "page": 1,
    "limit": 4,
    "total_items": 4,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "message": "Tìm thấy 4 món ăn phù hợp với từ khóa 'Cơm'.",
  "data": [
    {
      "id": "dish-1",
      "name": "Cơm Tấm Sườn Bì Chả Đặc Biệt",
      "category": "mon-chinh",
      "category_name": "Món chính",
      "meal_time": "Trưa & Tối",
      "price": 52000,
      "price_formatted": "52.000 ₫",
      "original_price": 60000,
      "stock": 25,
      "is_available": true,
      "tag": "hot",
      "tag_label": "Bán chạy",
      "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
      "description": "Sườn cốt lết ướp mật ong nướng than hồng thơm lừng...",
      "calories": "650 kcal",
      "preparation_time": "10 - 15 phút"
    }
  ]
}
```

#### Ví Dụ 2: Tìm kiếm theo tên không dấu (Fuzzy/Unaccent Matching)
- **Request**: `GET http://127.0.0.1:5000/api/dishes/search?q=pho+bo`
- **Response**: Tự động nhận diện và khớp chính xác món `"Phở Bò Tái Lăn Hà Nội"`.

#### Ví Dụ 3: Xử lý từ khóa rỗng (Empty Keyword Handling)
- **Request**: `GET http://127.0.0.1:5000/api/dishes/search?q=&page=1&limit=6`
- **Response**:
```json
{
  "success": true,
  "task_id": "TF1A8D7",
  "keyword": "",
  "is_empty_keyword": true,
  "page": 1,
  "limit": 6,
  "total_items": 12,
  "total_pages": 2,
  "has_next": true,
  "has_prev": false,
  "message": "Từ khóa tìm kiếm rỗng. Hệ thống trả về toàn bộ danh sách món ăn có phân trang.",
  "data": [ ... 6 món đầu tiên ... ]
}
```

#### Ví Dụ 4: Phân trang trang tiếp theo (Page 2)
- **Request**: `GET http://127.0.0.1:5000/api/dishes/search?q=&page=2&limit=6`
- **Response**: Trả về 6 món còn lại, `has_next: false`, `has_prev: true`.

---

## 📤 11. Hướng Dẫn Đẩy Nhánh Lên GitHub (Nộp Task TF1A8D7)

Chạy các lệnh sau trong PowerShell hoặc Git Bash:

```powershell
# 1. Tạo và chuyển sang nhánh mới cho task BE TF1A8D7
git checkout -b feature/tf1a8d7-ngan

# 2. Thêm file và commit đúng mã task TF1A8D7
git add .
git commit -m "TF1A8D7: [BE] API tìm kiếm món ăn theo tên, có phân trang và xử lý từ khóa rỗng"

# 3. Đẩy nhánh lên GitHub
git push -u origin feature/tf1a8d7-ngan
```

### 🔗 Minh Chứng Nộp Bài (Task TF1A8D7):
- **Link Nhánh GitHub**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/tree/feature/tf1a8d7-ngan`
- **Link Tạo / Nộp Pull Request**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/pull/new/feature/tf1a8d7-ngan`
  *(Tiêu đề PR: `TF1A8D7: [BE] API tìm kiếm món ăn theo tên, có phân trang và xử lý từ khóa rỗng`)*

---

## 🥣 12. Tài Liệu Chi Tiết Chức Năng [FE] Lọc Món Theo Loại (Task TF1B44A)

Chức năng **Lọc món theo loại trên trang thực đơn** (`daily-menu.html`, `js/daily-menu.js` & `css/daily-menu.css`) giải quyết trọn vẹn yêu cầu nghiệp vụ:

### 1. Các Nút Lọc Theo Loại Món Đầy Đủ
* 🍲 **Tất cả**: Xem toàn bộ các món ăn phục vụ trong ngày.
* 🍗 **Món chính (`mon-chinh`)**: Cơm Tấm Sườn Bì Chả, Cơm Gà Xối Mỡ, Cơm Niêu Cá Bống Kho Tộ, Cơm Chiên Hải Sản Hoàng Kim.
* 🥣 **Canh (`mon-canh`)** *(Yêu cầu trọng tâm)*: Canh Sườn Non Hầm Rau Củ Bắp Ngọt, Canh Rong Biển Đậu Hũ Non Hạt Sen (Chay).
* 🍜 **Món nước / Bún Phở (`mon-nuoc`)**: Phở Bò Tái Lăn Hà Nội, Bún Bò Huế Chả Cua Thịt Bắp.
* 🥗 **Món chay (`mon-chay`)**: Nấm Kho Tiêu Cơm Gạo Lứt (Chay).
* 🍹 **Tráng miệng & Đồ uống (`trang-mieng`)**: Trà Đào Cam Sả Hạt Chia, Sữa Chua Trân Châu Hạ Long, Trà Sữa Trân Châu Hoàng Kim.
* 🏷️ **Bộ lọc theo tình trạng số suất**: Còn món (`available-only`) và Hết món (`out-of-stock-only`).

### 2. Huy Hiệu Số Đếm Thời Gian Thực (Live Badge Count)
Mỗi nút loại món đều có số đếm động tương ứng (`countAll`, `countMain`, `countCanh`, `countSoup`, `countVeggie`, `countDrink`, `countAvailableOnly`, `countOutOnly`), tự động cập nhật ngay khi đổi ngày hoặc khi tải dữ liệu từ API.

### 3. Thanh Trạng Thái Đang Lọc (Active Filter Indicator)
Khi kích hoạt một loại món, giao diện hiển thị thanh banner thông báo trực quan:
* Ví dụ: `"Đang lọc theo loại món: Canh (2 món)"` cùng badge mã task `TF1B44A`.
* Kèm nút bấm nhanh `"Xem tất cả loại"` để người dùng quay lại toàn bộ thực đơn chỉ với 1 click.

### 4. Đồng Bộ Với Tìm Kiếm, Sắp Xếp & Tham Số URL
* Tương thích mượt mà với ô tìm kiếm (`Task TF1A94A`): Khi đang tìm kiếm từ khóa, bấm lọc theo loại sẽ lọc kết quả trong phạm vi loại món đó.
* Hỗ trợ URL tham số: Truy cập `daily-menu.html?category=mon-canh` hoặc `?type=canh` sẽ tự động kích hoạt ngay tab món Canh khi tải trang.

### 5. Hướng Dẫn Đẩy Nhánh & Nộp Bài (Task TF1B44A):
```powershell
# 1. Tạo và chuyển sang nhánh mới cho task FE TF1B44A
git checkout -b feature/tf1b44a-ngan

# 2. Thêm file và commit đúng mã task TF1B44A
git add .
git commit -m "TF1B44A: [FE] Lọc món theo loại trên trang thực đơn (món chính, canh, tráng miệng...)"

# 3. Đẩy nhánh lên GitHub
git push -u origin feature/tf1b44a-ngan
```

#### 🔗 Minh Chứng Nộp Bài (Task TF1B44A):
* **Link Nhánh GitHub**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/tree/feature/tf1b44a-ngan`
* **Link Tạo / Nộp Pull Request**:  
  `https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an/pull/new/feature/tf1b44a-ngan`
  *(Tiêu đề PR: `TF1B44A: [FE] Lọc món theo loại trên trang thực đơn`)*
