# Kết quả kiểm thử tạo đơn đồng thời

Ngày chạy: 2026-11-26

## Minh chứng

| Kịch bản | Kiểm thử | Kết quả |
|---|---|---|
| Hai khách hàng, hai session đồng thời đặt suất cuối của cùng món | `test_two_customers_competing_for_last_dish_serving` | Đạt: chỉ một đơn được tạo; yêu cầu còn lại bị từ chối; tổng số lượng đã đặt không vượt quá 1 suất. |
| Đặt tại đúng thời điểm đóng khung giờ (`now == end_time`) | `test_pickup_slot_is_closed_at_exact_end_time` | Đạt: API từ chối với mã `SLOT_PAST` và không tạo đơn. |
| Lặp hai kiểm thử trên 5 lần | Chạy cả hai test theo từng vòng | Đạt: **10/10 lần chạy test** đều qua. |
| Toàn bộ kiểm thử backend, gồm các kiểm thử cũ | `python -m pytest -q` | **36 passed** |

Lệnh chạy: `backend/venv/Scripts/python.exe -m pytest -q`

Kiểm thử cạnh tranh dùng SQLite với hai session và hai thread độc lập. Môi trường test này xác nhận không bán vượt suất, nhưng không mô phỏng khóa hàng InnoDB; cần chạy cùng kịch bản trên MySQL để xác nhận trực tiếp hành vi khóa của production.
