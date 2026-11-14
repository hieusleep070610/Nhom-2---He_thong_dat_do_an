#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script kiểm thử tự động API thực đơn theo ngày (Mã Task: TF1A638)
Chạy bằng lệnh: python test_api.py
"""

import json
from app import get_menu_by_date, order_dish, parse_date_str

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

    print("=" * 60)
    print("  🎉 TẤT CẢ CÁC BÀI TEST ĐỀU THÀNH CÔNG RỰC RỠ (100% PASS)!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
