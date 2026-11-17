#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script kiểm thử tự động API thực đơn theo ngày (Mã Task: TF1A638)
Chạy bằng lệnh: python test_api.py
"""

import json
from app import get_menu_by_date, order_dish, parse_date_str, get_dish_detail

def run_tests():
    print("=" * 60)
    print("  🧪 BẮT ĐẦU KIỂM THỬ API THỰC ĐƠN THEO NGÀY (TASK: TF1A638)")
    print("=" * 60)

    # 1. Test lấy thực đơn ngày hôm nay
    print("\n[TEST 1] Lấy thực đơn ngày hôm nay:")
    result_today = get_menu_by_date("today")
    assert result_today["success"] is True, "Thất bại: success phải là True"
    assert result_today["task_id"] == "TF1A638", "Thất bại: Sai mã Task ID"
    assert len(result_today["data"]) > 0, "Thất bại: Danh sách món ăn trống"
    
    first_dish = result_today["data"][0]
    print(f"  ✅ Ngày: {result_today['date']} ({result_today['day_of_week']})")
    print(f"  ✅ Tổng số món: {result_today['total_dishes']}")
    print(f"  ✅ Mẫu món đầu tiên: '{first_dish['name']}'")
    print(f"     - Giá: {first_dish['price_formatted']}")
    print(f"     - Số suất còn lại: {first_dish['stock']} ({first_dish['stock_label']})")
    print("  -> TEST 1 PASSED!\n")

    # 2. Test lấy thực đơn ngày trong tương lai
    test_date = "2026-11-20"
    print(f"[TEST 2] Lấy thực đơn theo ngày cụ thể ({test_date}):")
    result_future = get_menu_by_date(test_date)
    assert result_future["date"] == test_date, f"Thất bại: Ngày trả về không khớp {test_date}"
    print(f"  ✅ Khớp đúng ngày truy vấn: {result_future['date']}")
    print(f"  ✅ Có {result_future['available_dishes']} món còn suất, {result_future['out_of_stock_dishes']} món hết suất")
    print("  -> TEST 2 PASSED!\n")

    # 3. Test kiểm tra số suất còn lại và trạng thái
    print("[TEST 3] Kiểm tra logic số suất còn lại:")
    has_out_of_stock = any(d["stock"] == 0 for d in result_today["data"])
    has_low_stock = any(0 < d["stock"] <= 8 for d in result_today["data"])
    assert has_out_of_stock, "Cần có ít nhất 1 món hết suất để kiểm tra trạng thái"
    assert has_low_stock, "Cần có ít nhất 1 món sắp hết suất để kiểm tra trạng thái cảnh báo"
    print("  ✅ Đã kiểm tra đầy đủ các trạng thái: Còn hàng, Sắp hết suất, Hết suất.")
    print("  -> TEST 3 PASSED!\n")

    # 4. Test đặt món và trừ số suất còn lại
    print("[TEST 4] Test API đặt món và trừ số suất còn lại:")
    target_dish_id = "dish-1"
    initial_stock = next(d["stock"] for d in result_today["data"] if d["id"] == target_dish_id)
    order_res, status_code = order_dish("today", target_dish_id, quantity=2)
    assert status_code == 200, f"Thất bại đặt món: {order_res}"
    assert order_res["remaining_stock"] == initial_stock - 2, "Thất bại: Số suất còn lại không được trừ đúng"
    print(f"  ✅ Đặt 2 suất '{order_res['dish_name']}':")
    print(f"     - Suất ban đầu: {initial_stock}")
    print(f"     - Suất sau khi đặt: {order_res['remaining_stock']}")
    print("  -> TEST 4 PASSED!\n")

    # 5. Test kiểm tra API trả thực đơn rỗng (Empty State - TF1A6E9)
    print("[TEST 5] Kiểm tra API trả thực đơn rỗng (Task TF1A6E9):")
    result_empty = get_menu_by_date("2026-01-01", mock_empty=True)
    assert result_empty["success"] is True, "Thất bại: success phải là True"
    assert result_empty["total_dishes"] == 0, "Thất bại: Tổng số món phải là 0"
    assert len(result_empty["data"]) == 0, "Thất bại: Dữ liệu món ăn phải là mảng rỗng []"
    print("  ✅ API trả về mảng rỗng chuẩn xác để Frontend kích hoạt Empty State.")
    print("  -> TEST 5 PASSED!\n")

    # 6. Test API chi tiết món ăn (Task TF1A785)
    print("[TEST 6] Kiểm tra API chi tiết món ăn (Task TF1A785):")
    detail_res, detail_status = get_dish_detail("dish-1")
    assert detail_status == 200, f"Thất bại gọi API chi tiết món: status code {detail_status}"
    assert detail_res["success"] is True, "Thất bại: success phải là True"
    assert detail_res["task_id"] == "TF1A785", f"Thất bại: Sai mã Task ID: {detail_res.get('task_id')}"
    
    dish_data = detail_res["data"]
    assert "image_url" in dish_data and dish_data["image_url"], "Thất bại: Thiếu trường 'image_url'"
    assert "description" in dish_data and dish_data["description"], "Thất bại: Thiếu trường 'description'"
    assert "price" in dish_data and dish_data["price"] > 0, "Thất bại: Thiếu hoặc sai trường 'price'"
    assert "ingredients" in dish_data and isinstance(dish_data["ingredients"], list) and len(dish_data["ingredients"]) > 0, "Thất bại: Thiếu danh sách 'ingredients'"
    assert "allergy_info" in dish_data and isinstance(dish_data["allergy_info"], list), "Thất bại: Thiếu danh sách 'allergy_info'"
    assert "allergens" in dish_data and isinstance(dish_data["allergens"], list), "Thất bại: Thiếu danh sách 'allergens'"
    
    print(f"  ✅ Tên món: {dish_data['name']}")
    print(f"  ✅ Giá: {dish_data['price_formatted']}")
    print(f"  ✅ Mô tả: {dish_data['description'][:60]}...")
    print(f"  ✅ Ảnh: {dish_data['image_url'][:50]}...")
    print(f"  ✅ Số lượng nguyên liệu: {len(dish_data['ingredients'])} nguyên liệu ({', '.join(dish_data['ingredients'][:3])}...)")
    print(f"  ✅ Thông tin dị ứng: {len(dish_data['allergy_info'])} lưu ý (Dị ứng chính: {', '.join(dish_data['allergens']) if dish_data['allergens'] else 'Không có'})")
    print("  -> TEST 6 PASSED!\n")

    # 7. Test API chi tiết món ăn khi mã món không tồn tại (Task TF1A785 - Error 404)
    print("[TEST 7] Kiểm tra lỗi 404 khi món không tồn tại (Task TF1A785):")
    not_found_res, not_found_status = get_dish_detail("dish-khong-ton-tai-999")
    assert not_found_status == 404, f"Thất bại: status code phải là 404, nhận được {not_found_status}"
    assert not_found_res["success"] is False, "Thất bại: success phải là False"
    assert not_found_res["code"] == "DISH_NOT_FOUND", "Thất bại: Mã lỗi phải là DISH_NOT_FOUND"
    print(f"  ✅ Xử lý mã món không tồn tại đúng chuẩn HTTP 404: {not_found_res['error']}")
    print("  -> TEST 7 PASSED!\n")

    print("=" * 60)
    print("  🎉 TẤT CẢ CÁC BÀI TEST ĐỀU THÀNH CÔNG RỰC RỠ (100% PASS)!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
