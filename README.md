# Hệ Thống Đặt Đồ Ăn - Nhóm 2

## Task: [FE] Dựng trang tĩnh thực đơn theo ngày
- **Mã Task**: `TF1A5C3`
- **Tên nhánh (Branch)**: `feature/tf1a5c3-thuc-don-theo-ngay`
- **Commit Message chuẩn**: `TF1A5C3: dựng trang tĩnh thực đơn theo ngày`
- **Pull Request Title**: `TF1A5C3: Dựng trang tĩnh thực đơn theo ngày`
- **Kho lưu trữ (Repository)**: [Nhom-2---He_thong_dat_do_an](https://github.com/hieusleep070610/Nhom-2---He_thong_dat_do_an)

---

## 📋 Mô Tả Yêu Cầu & Tính Năng Đã Thực Hiện
Trang tĩnh thực đơn theo ngày bằng **HTML5 / CSS3 / JavaScript** với dữ liệu giả phong phú:
1. **Bộ chọn ngày (Date Selector)**:
   - Thanh trượt hiển thị 7 ngày trong tuần với nhãn Hôm nay, Thứ 2 -> Chủ Nhật kèm ngày/tháng rõ ràng.
   - Nút chọn ngày qua ô `input type="date"` tùy chọn ngày bất kỳ.
   - Nút chuyển nhanh ngày trước (`<`) và ngày sau (`>`).
   - Cập nhật banner trạng thái ngày đang chọn và khung giờ giao hàng (Trưa & Tối).
2. **Thẻ món ăn (Food Card)**:
   - Ảnh món ăn chất lượng cao, nhãn gắn thẻ (Bán chạy, Món mới, Bếp trưởng đề xuất).
   - Tên món ăn, danh mục, thời gian phục vụ, mô tả chi tiết nguyên liệu và hương vị.
   - **Giá tiền**: Hiển thị giá niêm yết và giá khuyến mãi (định dạng `₫` chuẩn Việt Nam).
   - **Số suất còn lại**:
     - *Còn nhiều suất*: Badge màu xanh lá (`Còn X suất`).
     - *Sắp hết suất (≤ 8 suất)*: Badge màu vàng cam có hiệu ứng nhấp nháy cảnh báo (`Chỉ còn X suất!`).
     - *Hết suất (0 suất)*: Badge màu đỏ/xám (`Hết suất hôm nay`), thẻ món làm mờ và vô hiệu hóa nút đặt món.
3. **Tính năng bổ sung nâng cao trải nghiệm**:
   - **Bộ lọc danh mục**: Tất cả, Món chính, Món nước, Món chay, Tráng miệng / Đồ uống kèm số lượng đếm tức thì.
   - **Ô tìm kiếm tức thì**: Tìm món ăn theo tên và mô tả.
   - **Sắp xếp**: Theo giá (tăng/giảm dần), theo số suất còn lại (nhiều/ít).
   - **Giỏ hàng mini & Toast**: Nhấn "Chọn món" sẽ tự động trừ 1 suất khỏi ngày đó và cập nhật giỏ hàng mini.
   - **Modal chi tiết**: Bấm vào món để xem thông tin dinh dưỡng (Calories, Protein, Carb) và nguyên liệu.

---

## 📂 Cấu Trúc Thư Mục
```text
├── daily-menu.html         # Giao diện chính thực đơn theo ngày
├── index.html              # Trang điều hướng chính
├── css/
│   └── daily-menu.css      # Toàn bộ CSS phong cách hiện đại, responsive mobile/tablet/desktop
├── js/
│   └── daily-menu.js       # Dữ liệu giả lập và logic chọn ngày, giỏ hàng, lọc món
└── README.md               # Tài liệu hướng dẫn và mã task
```

---

## 🚀 Hướng Dẫn Chạy Thử
1. Mở trực tiếp file `daily-menu.html` hoặc `index.html` bằng trình duyệt bất kỳ (Chrome, Edge, Firefox).
2. Trải nghiệm chọn các ngày khác nhau để thấy số suất và trạng thái món thay đổi.
3. Thử tìm kiếm, lọc danh mục, thêm món vào giỏ hàng và xem modal chi tiết.
