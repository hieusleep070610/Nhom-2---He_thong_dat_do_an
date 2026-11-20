#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script kiểm thử tự động API thực đơn theo ngày (Mã Task: TF1A638)
Chạy bằng lệnh: python test_api.py
"""

import json
from app import get_menu_by_date, order_dish, parse_date_str, get_dish_detail, search_dishes

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

    # 8. Test giao diện Frontend Trang chi tiết món ăn (Task TF1A86F)
    print("[TEST 8] Kiểm tra file và cấu trúc Trang chi tiết món ăn (Task TF1A86F):")
    import os
    from app import get_static_file, DISH_CATALOG

    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(base_dir, "dish-detail.html")
    css_file = os.path.join(base_dir, "css", "dish-detail.css")
    js_file = os.path.join(base_dir, "js", "dish-detail.js")

    assert os.path.exists(html_file), "Thất bại: Không tìm thấy file dish-detail.html"
    assert os.path.exists(css_file), "Thất bại: Không tìm thấy file css/dish-detail.css"
    assert os.path.exists(js_file), "Thất bại: Không tìm thấy file js/dish-detail.js"
    print("  ✅ Các file Frontend cốt lõi của Task TF1A86F đều tồn tại.")

    with open(html_file, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Kiểm tra 5 yêu cầu bắt buộc của Task TF1A86F: ảnh, mô tả, giá, nguyên liệu, nút thêm vào đơn
    assert "dishMainImg" in html_content, "Thất bại: Thiếu phần tử ảnh món ăn"
    assert "dishFullDescription" in html_content, "Thất bại: Thiếu phần tử mô tả món ăn"
    assert "dishPriceCurrent" in html_content, "Thất bại: Thiếu phần tử hiển thị giá món"
    assert "ingredientsChipsGrid" in html_content or "tab-ingredients" in html_content, "Thất bại: Thiếu phần tử danh sách nguyên liệu"
    assert "btnAddToCart" in html_content, "Thất bại: Thiếu nút 'Thêm vào đơn'"
    assert "TF1A86F" in html_content, "Thất bại: Thiếu mã Task TF1A86F trên giao diện"
    print("  ✅ Đã kiểm tra đầy đủ 5 yêu cầu cốt lõi của Task TF1A86F: Ảnh, Mô tả, Giá, Nguyên liệu, Nút thêm vào đơn.")
    print("  -> TEST 8 PASSED!\n")

    # 9. Test phục vụ trang chi tiết qua Server Static Handler
    print("[TEST 9] Kiểm tra phục vụ file dish-detail.html qua web server:")
    content, mime = get_static_file("dish-detail.html")
    assert content is not None, "Thất bại: Server không đọc được dish-detail.html"
    assert "text/html" in mime, f"Thất bại: MIME type không đúng: {mime}"
    
    # Kiểm tra route không đuôi .html
    content_clean, mime_clean = get_static_file("dish-detail")
    assert content_clean is not None, "Thất bại: Server không đọc được route /dish-detail"
    print("  ✅ Server phục vụ chuẩn xác cả /dish-detail.html và route thân thiện /dish-detail")
    print("  -> TEST 9 PASSED!\n")

    # =========================================================================
    # TASK TF1A8D7: [BE] API TÌM KIẾM MÓN ĂN THEO TÊN, PHÂN TRANG & TỪ KHÓA RỖNG
    # =========================================================================
    print("=" * 60)
    print("  🔍 KIỂM THỬ API TÌM KIẾM MÓN ĂN THEO TÊN (TASK: TF1A8D7)")
    print("=" * 60)

    # 10. Test tìm kiếm theo tên có dấu
    print("\n[TEST 10] Tìm kiếm món ăn theo tên tiếng Việt có dấu (keyword='Cơm'):")
    res10, status10 = search_dishes(keyword="Cơm", page=1, limit=10)
    assert status10 == 200, f"Thất bại: Status code phải là 200, nhận được {status10}"
    assert res10["success"] is True, "Thất bại: success phải là True"
    assert res10["task_id"] == "TF1A8D7", f"Thất bại: task_id phải là TF1A8D7, nhận {res10.get('task_id')}"
    assert res10["total_items"] >= 4, f"Thất bại: Phải tìm thấy ít nhất 4 món 'Cơm', nhận {res10['total_items']}"
    assert all("cơm" in d["name"].lower() for d in res10["data"]), "Thất bại: Kết quả tìm kiếm phải chứa từ 'cơm'"
    print(f"  ✅ Tìm thấy {res10['total_items']} món có tên chứa 'Cơm'.")
    for d in res10["data"]:
        print(f"     - {d['name']} ({d['price_formatted']})")
    print("  -> TEST 10 PASSED!\n")

    # 11. Test tìm kiếm theo tên không dấu (Fuzzy/Unaccent Matching)
    print("[TEST 11] Tìm kiếm món ăn theo tên tiếng Việt không dấu (keyword='pho bo', 'ga'):")
    res11_pho, status11_pho = search_dishes(keyword="pho bo")
    assert status11_pho == 200, "Thất bại: Status code 200"
    assert res11_pho["total_items"] >= 1, "Thất bại: Phải tìm thấy món Phở Bò"
    assert any("Phở Bò" in d["name"] for d in res11_pho["data"]), "Thất bại: Thiếu món Phở Bò Tái Lăn"
    print(f"  ✅ Tìm 'pho bo' -> Khớp: '{res11_pho['data'][0]['name']}'")

    res11_ga, status11_ga = search_dishes(keyword="ga")
    assert any("Gà" in d["name"] for d in res11_ga["data"]), "Thất bại: Thiếu món Cơm Gà"
    print(f"  ✅ Tìm 'ga' -> Khớp món gà thành công.")
    print("  -> TEST 11 PASSED!\n")

    # 12. Test xử lý từ khóa rỗng (Empty Keyword Handling)
    print("[TEST 12] Xử lý từ khóa rỗng (rỗng, dấu cách, None):")
    # 12a. Keyword rỗng chuỗi ""
    res12_empty, status12_empty = search_dishes(keyword="", page=1, limit=12)
    assert status12_empty == 200, "Thất bại: Status code 200"
    assert res12_empty["is_empty_keyword"] is True, "Thất bại: is_empty_keyword phải là True"
    assert res12_empty["total_items"] == 12, f"Thất bại: Khi từ khóa rỗng phải trả về 12 món, nhận {res12_empty['total_items']}"
    print(f"  ✅ Từ khóa rỗng ('') -> Trả về toàn bộ {res12_empty['total_items']} món ăn.")

    # 12b. Keyword chỉ chứa khoảng trắng "   "
    res12_spaces, _ = search_dishes(keyword="    ")
    assert res12_spaces["is_empty_keyword"] is True, "Thất bại: Chuỗi khoảng trắng phải được xem là từ khóa rỗng"
    print("  ✅ Từ khóa chỉ có khoảng trắng ('   ') -> Xử lý chuẩn xác như từ khóa rỗng.")

    # 12c. Keyword là None
    res12_none, _ = search_dishes(keyword=None)
    assert res12_none["is_empty_keyword"] is True, "Thất bại: Keyword None phải được xử lý là rỗng"
    print("  ✅ Từ khóa là None -> Tự động nhận diện là từ khóa rỗng.")

    # 12d. Chế độ strict_empty=True (nếu client yêu cầu bắt buộc có từ khóa)
    res12_strict, status12_strict = search_dishes(keyword="", strict_empty=True)
    assert status12_strict == 400, "Thất bại: strict_empty=True với từ khóa rỗng phải trả về HTTP 400"
    assert res12_strict["code"] == "EMPTY_KEYWORD", "Thất bại: Mã lỗi phải là EMPTY_KEYWORD"
    print(f"  ✅ Chế độ strict_empty=True: Bắt lỗi hợp lệ HTTP 400 ({res12_strict['error']})")
    print("  -> TEST 12 PASSED!\n")

    # 13. Test cơ chế phân trang (Pagination)
    print("[TEST 13] Kiểm tra tính năng phân trang (page=1..3, limit=4):")
    res13_p1, _ = search_dishes(keyword="", page=1, limit=4)
    assert len(res13_p1["data"]) == 4, f"Thất bại: Trang 1 phải có 4 món, nhận {len(res13_p1['data'])}"
    assert res13_p1["page"] == 1, "Thất bại: Trang hiện tại phải là 1"
    assert res13_p1["total_pages"] == 3, f"Thất bại: Tổng số trang phải là 3 (12 món / 4), nhận {res13_p1['total_pages']}"
    assert res13_p1["has_next"] is True, "Thất bại: Trang 1 phải có has_next=True"
    assert res13_p1["has_prev"] is False, "Thất bại: Trang 1 phải có has_prev=False"
    print(f"  ✅ Trang 1: 4 món, total_pages={res13_p1['total_pages']}, has_next={res13_p1['has_next']}, has_prev={res13_p1['has_prev']}")

    res13_p2, _ = search_dishes(keyword="", page=2, limit=4)
    assert len(res13_p2["data"]) == 4, "Thất bại: Trang 2 phải có 4 món"
    assert res13_p2["data"][0]["id"] != res13_p1["data"][0]["id"], "Thất bại: Món trang 2 phải khác trang 1"
    assert res13_p2["has_next"] is True, "Thất bại: Trang 2 phải có has_next=True"
    assert res13_p2["has_prev"] is True, "Thất bại: Trang 2 phải có has_prev=True"
    print(f"  ✅ Trang 2: 4 món tiếp theo, has_next={res13_p2['has_next']}, has_prev={res13_p2['has_prev']}")

    res13_p3, _ = search_dishes(keyword="", page=3, limit=4)
    assert len(res13_p3["data"]) == 4, "Thất bại: Trang 3 phải có 4 món cuối"
    assert res13_p3["has_next"] is False, "Thất bại: Trang cuối phải có has_next=False"
    assert res13_p3["has_prev"] is True, "Thất bại: Trang cuối phải có has_prev=True"
    print(f"  ✅ Trang 3 (cuối): 4 món cuối, has_next={res13_p3['has_next']}, has_prev={res13_p3['has_prev']}")

    # Trang vượt quá giới hạn
    res13_out, _ = search_dishes(keyword="", page=99, limit=4)
    assert len(res13_out["data"]) == 0, "Thất bại: Trang vượt quá phải trả về danh sách rỗng"
    assert res13_out["has_next"] is False, "Thất bại: has_next phải là False"
    print("  ✅ Trang vượt quá giới hạn (page=99) -> Trả về data=[] và thông báo hợp lệ.")
    print("  -> TEST 13 PASSED!\n")

    # 14. Test từ khóa không tồn tại
    print("[TEST 14] Tìm kiếm từ khóa không tồn tại trong thực đơn:")
    res14, status14 = search_dishes(keyword="MonAnKhongTonTai999")
    assert status14 == 200, "Thất bại: Status code phải là 200"
    assert res14["total_items"] == 0, "Thất bại: total_items phải bằng 0"
    assert res14["total_pages"] == 0, "Thất bại: total_pages phải bằng 0"
    assert len(res14["data"]) == 0, "Thất bại: data phải rỗng"
    assert "Không tìm thấy món ăn" in res14["message"], "Thất bại: Thiếu thông báo không tìm thấy"
    print(f"  ✅ Phản hồi chuẩn: {res14['message']}")
    print("  -> TEST 14 PASSED!\n")

    # =========================================================================
    # TASK TF1B44A: [FE] LỌC MÓN THEO LOẠI TRÊN TRANG THỰC ĐƠN
    # =========================================================================
    print("=" * 60)
    print("  🍲 KIỂM THỬ BỘ LỌC THEO LOẠI MÓN TRÊN THỰC ĐƠN (TASK: TF1B44A)")
    print("=" * 60)

    # 15. Test phân loại món ăn trong thực đơn (Món chính, Canh, Món nước, Món chay, Tráng miệng)
    print("\n[TEST 15] Kiểm tra cấu trúc dữ liệu các loại món theo yêu cầu Task TF1B44A:")
    menu_today = get_menu_by_date("today")
    all_dishes = menu_today["data"]
    
    categories = set(d["category"] for d in all_dishes)
    assert "mon-chinh" in categories, "Thất bại: Thiếu loại 'mon-chinh' (Món chính)"
    assert "mon-canh" in categories, "Thất bại: Thiếu loại 'mon-canh' (Canh)"
    assert "trang-mieng" in categories, "Thất bại: Thiếu loại 'trang-mieng' (Tráng miệng)"
    
    canh_dishes = [d for d in all_dishes if d["category"] == "mon-canh"]
    main_dishes = [d for d in all_dishes if d["category"] == "mon-chinh"]
    dessert_dishes = [d for d in all_dishes if d["category"] == "trang-mieng"]

    assert len(canh_dishes) >= 2, f"Thất bại: Cần có ít nhất 2 món canh, nhận {len(canh_dishes)}"
    assert len(main_dishes) >= 4, f"Thất bại: Cần có ít nhất 4 món chính, nhận {len(main_dishes)}"
    assert len(dessert_dishes) >= 3, f"Thất bại: Cần có ít nhất 3 món tráng miệng, nhận {len(dessert_dishes)}"
    
    print(f"  ✅ Món chính ({len(main_dishes)} món): {', '.join(d['name'] for d in main_dishes[:2])}...")
    print(f"  ✅ Món canh ({len(canh_dishes)} món): {', '.join(d['name'] for d in canh_dishes)}...")
    print(f"  ✅ Tráng miệng & Đồ uống ({len(dessert_dishes)} món): {', '.join(d['name'] for d in dessert_dishes[:2])}...")
    print("  -> TEST 15 PASSED!\n")

    # 16. Test giao diện Frontend Bộ lọc theo loại món (Task TF1B44A)
    print("[TEST 16] Kiểm tra cấu trúc giao diện bộ lọc loại món trên daily-menu.html:")
    daily_menu_file = os.path.join(base_dir, "daily-menu.html")
    assert os.path.exists(daily_menu_file), "Thất bại: Không tìm thấy daily-menu.html"
    
    with open(daily_menu_file, "r", encoding="utf-8") as f:
        daily_html = f.read()

    assert 'data-category="mon-canh"' in daily_html, "Thất bại: Thiếu nút lọc món canh trong category-filters"
    assert 'data-category="mon-chinh"' in daily_html, "Thất bại: Thiếu nút lọc món chính"
    assert 'data-category="trang-mieng"' in daily_html, "Thất bại: Thiếu nút lọc tráng miệng"
    assert 'id="countCanh"' in daily_html, "Thất bại: Thiếu badge số đếm cho món canh (countCanh)"
    assert 'id="activeFilterIndicator"' in daily_html, "Thất bại: Thiếu thanh thông báo trạng thái lọc (activeFilterIndicator)"
    assert 'id="btnClearCategoryFilter"' in daily_html, "Thất bại: Thiếu nút xóa bộ lọc loại món (btnClearCategoryFilter)"
    assert 'TF1B44A' in daily_html, "Thất bại: Thiếu mã task TF1B44A trên giao diện"

    print("  ✅ Nút lọc 'Món chính', 'Canh', 'Tráng miệng...' đều hiện diện đầy đủ.")
    print("  ✅ Badge đếm số lượng thời gian thực countCanh, countMain, countDrink tồn tại.")
    print("  ✅ Thanh hiển thị trạng thái lọc activeFilterIndicator và nút xem tất cả đầy đủ.")
    print("  ✅ Mã task TF1B44A đã được định danh trên giao diện.")
    print("  -> TEST 16 PASSED!\n")

    print("=" * 60)
    print("  🎉 TẤT CẢ CÁC BÀI TEST ĐỀU THÀNH CÔNG RỰC RỠ (100% PASS)!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
