# Kết quả kiểm thử tạo đơn

- Ngày chạy: 20/11/2026
- Lệnh: `.\venv\Scripts\python.exe -m pytest -q tests/test_create_order_service.py`
- Kết quả: **33 passed** (2,38 giây)
- Phạm vi: kiểm thử service với cơ sở dữ liệu fixture của test; không thao tác dữ liệu database đang chạy.

## Các tình huống được yêu cầu

| Tình huống | Kiểm thử | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| Tạo đơn đúng | `test_creates_wallet_paid_order_and_history` | Tạo đơn, lưu lịch sử và thanh toán ví đúng | Đạt |
| Hết món / không đủ suất trong thực đơn ngày | `test_insufficient_daily_servings_is_rejected` | Từ chối tạo đơn khi số suất còn lại không đủ | Đạt |
| Khung giờ đã đầy | `test_full_pickup_slot_is_rejected` | Từ chối tạo đơn, trả lỗi `SLOT_FULL` | Đạt |
| Đặt cho ngày đã qua | `test_past_pickup_date_is_rejected` | Từ chối ngày nhận trong quá khứ | Đạt |

Kiểm thử liên quan cũng đạt: `test_recipe_stock_shortage_rolls_back_order_and_quota` xác nhận thiếu nguyên liệu sẽ rollback đơn và quota; `test_dish_not_in_selected_daily_menu_conflicts` xác nhận món không thuộc thực đơn ngày được chọn bị từ chối.
