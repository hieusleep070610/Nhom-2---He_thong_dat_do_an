#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
FoodieHub - Hệ Thống Đặt Đồ Ăn - Nhóm 2
Backend API: Xem thực đơn theo ngày kèm số suất còn lại của từng món
Mã Task: TF1A638
"""

import os
import sys
import json
import mimetypes
import urllib.parse
from datetime import datetime, date

# ==============================================================================
# DỮ LIỆU THỰC ĐƠN GỐC (MOCK DATABASE MÓN ĂN)
# ==============================================================================
DISH_CATALOG = [
    {
        "id": "dish-1",
        "name": "Cơm Tấm Sườn Bì Chả Đặc Biệt",
        "category": "mon-chinh",
        "category_name": "Món chính",
        "meal_time": "Trưa & Tối",
        "price": 52000,
        "original_price": 60000,
        "base_stock": 25,
        "tag": "hot",
        "tag_label": "Bán chạy",
        "calories": "650 kcal",
        "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
        "description": "Sườn cốt lết ướp mật ong nướng than hồng thơm lừng, bì dai giòn cùng chả trứng hấp béo ngậy kèm đồ chua và nước mắm kẹo đậm đà."
    },
    {
        "id": "dish-2",
        "name": "Phở Bò Tái Lăn Hà Nội",
        "category": "mon-nuoc",
        "category_name": "Món nước",
        "meal_time": "Bữa Trưa",
        "price": 55000,
        "original_price": 65000,
        "base_stock": 20,
        "tag": "chef",
        "tag_label": "Bếp trưởng đề xuất",
        "calories": "520 kcal",
        "image_url": "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80",
        "description": "Thịt bò bắp thái mỏng xào lăn tỏi gừng lửa lớn, nước dùng ninh từ xương ống hầm 14 tiếng thơm nức hương quế hồi thảo quả."
    },
    {
        "id": "dish-3",
        "name": "Cơm Gà Xối Mỡ Da Giòn",
        "category": "mon-chinh",
        "category_name": "Món chính",
        "meal_time": "Trưa & Tối",
        "price": 48000,
        "original_price": 55000,
        "base_stock": 30,
        "tag": "hot",
        "tag_label": "Yêu thích",
        "calories": "680 kcal",
        "image_url": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80",
        "description": "Đùi gà góc phần tư xối mỡ lớp da vàng ruộm giòn tan, thịt bên trong mềm ngọt mọng nước ăn cùng cơm chiên cà chua thơm bùi."
    },
    {
        "id": "dish-4",
        "name": "Bún Chả Nướng Than Hoa",
        "category": "mon-nuoc",
        "category_name": "Món nước",
        "meal_time": "Bữa Trưa",
        "price": 50000,
        "original_price": 55000,
        "base_stock": 18,
        "tag": "hot",
        "tag_label": "Sắp hết",
        "calories": "510 kcal",
        "image_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80",
        "description": "Chả viên và chả miếng nướng xém cạnh trên than hoa đượm khói, chấm nước mắm đu đủ cà rốt ấm nóng kèm đĩa bún tươi và rau ghém xanh mướt."
    },
    {
        "id": "dish-5",
        "name": "Cơm Niêu Cá Bống Kho Tộ",
        "category": "mon-chinh",
        "category_name": "Món chính",
        "meal_time": "Bữa Tối",
        "price": 59000,
        "original_price": 65000,
        "base_stock": 15,
        "tag": None,
        "tag_label": "",
        "calories": "490 kcal",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        "description": "Cá kho keo nước màu dừa, tiêu sọ cay nồng, tóp mỡ béo ngậy. Ăn cùng cơm cháy giòn rụm trong niêu đất truyền thống."
    },
    {
        "id": "dish-6",
        "name": "Salad Đậu Hũ Nấm Sốt Mè Rang (Chay)",
        "category": "mon-chay",
        "category_name": "Món chay",
        "meal_time": "Cả Ngày",
        "price": 38000,
        "original_price": 45000,
        "base_stock": 20,
        "tag": "new",
        "tag_label": "Thực dưỡng",
        "calories": "320 kcal",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
        "description": "Đậu hũ non chiên giòn, nấm đùi gà áp chảo, xà lách romaine, cà chua bi organic rưới sốt mè rang béo thơm thanh mát."
    },
    {
        "id": "dish-7",
        "name": "Cơm Chiên Hải Sản Hoàng Kim",
        "category": "mon-chinh",
        "category_name": "Món chính",
        "meal_time": "Trưa & Tối",
        "price": 55000,
        "original_price": 62000,
        "base_stock": 25,
        "tag": "chef",
        "tag_label": "Đặc sản",
        "calories": "610 kcal",
        "image_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
        "description": "Hạt cơm vàng óng áo đều lòng đỏ trứng muối, tôm sú tươi giòn, mực nút, đậu Hà Lan và ngô ngọt giòn sần sật."
    },
    {
        "id": "dish-8",
        "name": "Bún Bò Huế Chả Cua Thịt Bắp",
        "category": "mon-nuoc",
        "category_name": "Món nước",
        "meal_time": "Bữa Sáng & Trưa",
        "price": 52000,
        "original_price": 58000,
        "base_stock": 28,
        "tag": "hot",
        "tag_label": "Bán chạy",
        "calories": "580 kcal",
        "image_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
        "description": "Sợi bún to tròn mềm mại, nước dùng cay nồng hương sả và mắm ruốc Huế đặc trưng, chả cua quết tay dẻo ngọt và bắp bò giòn."
    },
    {
        "id": "dish-9",
        "name": "Nấm Kho Tiêu Cơm Gạo Lứt (Chay)",
        "category": "mon-chay",
        "category_name": "Món chay",
        "meal_time": "Trưa & Tối",
        "price": 42000,
        "original_price": 48000,
        "base_stock": 16,
        "tag": None,
        "tag_label": "",
        "calories": "380 kcal",
        "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
        "description": "Nấm rơm cùng nấm đùi gà kho keo vị mặn ngọt đậm đà quyện hạt tiêu cay ấm, dùng kèm chén cơm gạo lứt huyết rồng dẻo thơm."
    },
    {
        "id": "dish-10",
        "name": "Trà Đào Cam Sả Hạt Chia",
        "category": "trang-mieng",
        "category_name": "Tráng miệng & Đồ uống",
        "meal_time": "Cả Ngày",
        "price": 28000,
        "original_price": 35000,
        "base_stock": 40,
        "tag": "hot",
        "tag_label": "Giải nhiệt",
        "calories": "160 kcal",
        "image_url": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
        "description": "Trà đen ủ lạnh thanh mát quyện vị chua ngọt tự nhiên của nước cam tươi, hương sả nồng nàn cùng đào miếng giòn."
    },
    {
        "id": "dish-11",
        "name": "Sữa Chua Trân Châu Hạ Long",
        "category": "trang-mieng",
        "category_name": "Tráng miệng & Đồ uống",
        "meal_time": "Cả Ngày",
        "price": 25000,
        "original_price": 30000,
        "base_stock": 25,
        "tag": "new",
        "tag_label": "Tráng miệng",
        "calories": "210 kcal",
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80",
        "description": "Sữa chua dẻo mịn chua ngọt hài hòa, ăn kèm trân châu trắng cốt dừa ấm nóng rắc thêm dừa sợi sấy giòn."
    },
    {
        "id": "dish-12",
        "name": "Trà Sữa Trân Châu Hoàng Kim",
        "category": "trang-mieng",
        "category_name": "Tráng miệng & Đồ uống",
        "meal_time": "Cả Ngày",
        "price": 32000,
        "original_price": 38000,
        "base_stock": 20,
        "tag": "hot",
        "tag_label": "Hot trend",
        "calories": "310 kcal",
        "image_url": "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80",
        "description": "Trà sữa đậm vị hồng trà Ceylon thơm ngát kết hợp sữa tươi thanh trùng, trân châu hoàng kim nấu mật ong dẻo mềm."
    }
]

# Cơ sở dữ liệu số suất còn lại theo ngày trong RAM
# Format: { "YYYY-MM-DD": { "dish_id": stock_integer } }
DAILY_STOCK_DB = {}

WEEKDAYS_VN = [
    "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm",
    "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"
]

def parse_date_str(date_str: str) -> date:
    """Xác thực và chuyển đổi chuỗi ngày YYYY-MM-DD"""
    if not date_str or date_str.lower() in ("today", "now"):
        return datetime.now().date()
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Định dạng ngày '{date_str}' không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD (Ví dụ: 2026-11-14)")

def initialize_daily_stock_if_needed(date_key: str, dt_obj: date):
    """Khởi tạo kho số suất món ăn giả lập cho một ngày nếu chưa có"""
    if date_key in DAILY_STOCK_DB:
        return

    day_num = dt_obj.day
    day_stock = {}
    for idx, dish in enumerate(DISH_CATALOG):
        stock = (dish["base_stock"] - (day_num * (idx + 2)) % 15)
        stock = max(0, min(dish["base_stock"], stock))

        # Đảm bảo có món hết suất và món sắp hết suất để minh họa đúng yêu cầu task
        if idx == 4:
            stock = 0  # Hết suất (Cơm Niêu Cá Bống)
        elif idx == 1:
            stock = 3  # Sắp hết (Phở Bò Tái Lăn)
        elif idx == 11:
            stock = 1  # Chỉ còn 1 suất (Trà Sữa)

        day_stock[dish["id"]] = stock

    DAILY_STOCK_DB[date_key] = day_stock

def get_menu_by_date(date_str: str = "today"):
    """
    [CORE API] Lấy danh sách thực đơn và số suất còn lại của từng món theo ngày
    Mã Task: TF1A638
    """
    dt = parse_date_str(date_str)
    date_key = dt.strftime("%Y-%m-%d")
    initialize_daily_stock_if_needed(date_key, dt)

    day_stocks = DAILY_STOCK_DB[date_key]
    day_name = WEEKDAYS_VN[dt.weekday()]

    items = []
    for dish in DISH_CATALOG:
        stock = day_stocks.get(dish["id"], 0)

        if stock == 0:
            stock_status = "out_of_stock"
            stock_label = "Hết suất hôm nay"
        elif stock <= 8:
            stock_status = "low_stock"
            stock_label = f"Chỉ còn {stock} suất"
        else:
            stock_status = "available"
            stock_label = f"Còn {stock} suất"

        item = {
            "id": dish["id"],
            "name": dish["name"],
            "category": dish["category"],
            "category_name": dish["category_name"],
            "meal_time": dish["meal_time"],
            "price": dish["price"],
            "price_formatted": f"{dish['price']:,} ₫".replace(",", "."),
            "original_price": dish["original_price"],
            "stock": stock,
            "initial_stock": dish["base_stock"],
            "stock_status": stock_status,
            "stock_label": stock_label,
            "is_available": stock > 0,
            "tag": dish["tag"],
            "tag_label": dish["tag_label"],
            "calories": dish["calories"],
            "image_url": dish["image_url"],
            "description": dish["description"]
        }
        items.append(item)

    return {
        "success": True,
        "task_id": "TF1A638",
        "date": date_key,
        "date_formatted": dt.strftime("%d/%m/%Y"),
        "day_of_week": day_name,
        "serving_time": {
            "lunch": "10:30 - 13:30",
            "dinner": "17:30 - 20:30"
        },
        "total_dishes": len(items),
        "available_dishes": sum(1 for d in items if d["is_available"]),
        "out_of_stock_dishes": sum(1 for d in items if not d["is_available"]),
        "data": items
    }

def order_dish(date_str: str, dish_id: str, quantity: int = 1):
    """Giảm số suất khi đặt món và cập nhật số suất còn lại"""
    dt = parse_date_str(date_str)
    date_key = dt.strftime("%Y-%m-%d")
    initialize_daily_stock_if_needed(date_key, dt)

    day_stocks = DAILY_STOCK_DB[date_key]
    if dish_id not in day_stocks:
        return {"success": False, "message": f"Không tìm thấy món ăn với ID {dish_id}"}, 404

    current_stock = day_stocks[dish_id]
    if current_stock < quantity:
        return {
            "success": False,
            "message": f"Số suất còn lại không đủ. Món này hiện chỉ còn {current_stock} suất.",
            "current_stock": current_stock
        }, 400

    day_stocks[dish_id] -= quantity
    target_dish = next(d for d in DISH_CATALOG if d["id"] == dish_id)

    return {
        "success": True,
        "message": f"Đặt thành công {quantity} suất '{target_dish['name']}' cho ngày {date_key}.",
        "dish_id": dish_id,
        "dish_name": target_dish["name"],
        "date": date_key,
        "ordered_quantity": quantity,
        "remaining_stock": day_stocks[dish_id]
    }, 200

# ==============================================================================
# BỘ XỬ LÝ SERVER (HỖ TRỢ FLASK HOẶC STANDALONE HTTP KHÔNG CẦN CÀI THƯ VIỆN)
# ==============================================================================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def get_static_file(rel_path):
    """Tìm và đọc file tĩnh (HTML, CSS, JS) an toàn"""
    clean_path = rel_path.lstrip("/\\").replace("/", os.sep)
    if not clean_path or clean_path == ".":
        clean_path = "daily-menu.html"
    
    full_path = os.path.join(CURRENT_DIR, clean_path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        mime_type, _ = mimetypes.guess_type(full_path)
        mime_type = mime_type or "application/octet-stream"
        if "text" in mime_type or mime_type in ("application/javascript", "application/json"):
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().encode("utf-8"), mime_type
        else:
            with open(full_path, "rb") as f:
                return f.read(), mime_type
    return None, None

# Kiểm tra xem có Flask không
USE_FLASK = False
try:
    from flask import Flask, request, jsonify, send_from_directory
    from flask_cors import CORS
    USE_FLASK = True
except ImportError:
    USE_FLASK = False

if USE_FLASK:
    app = Flask(__name__, static_folder=CURRENT_DIR)
    CORS(app)

    @app.route("/", methods=["GET"])
    def index():
        return send_from_directory(CURRENT_DIR, "daily-menu.html")

    @app.route("/<path:filename>", methods=["GET"])
    def static_files(filename):
        if os.path.exists(os.path.join(CURRENT_DIR, filename)):
            return send_from_directory(CURRENT_DIR, filename)
        return jsonify({"success": False, "error": "File not found"}), 404

    @app.route("/api/menu", methods=["GET"])
    def api_get_menu():
        date_param = request.args.get("date", "today")
        try:
            res = get_menu_by_date(date_param)
            return jsonify(res), 200
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.route("/api/menu/<date_str>", methods=["GET"])
    def api_get_menu_path(date_str):
        try:
            res = get_menu_by_date(date_str)
            return jsonify(res), 200
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.route("/api/order", methods=["POST"])
    def api_order():
        data = request.get_json() or {}
        date_param = data.get("date", "today")
        dish_id = data.get("dish_id")
        quantity = int(data.get("quantity", 1))

        if not dish_id:
            return jsonify({"success": False, "error": "Thiếu trường 'dish_id'"}), 400

        try:
            res, status_code = order_dish(date_param, dish_id, quantity)
            return jsonify(res), status_code
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

else:
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class StandaloneAPIHandler(BaseHTTPRequestHandler):
        def _send_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(200)
            self._send_cors_headers()
            self.end_headers()

        def do_GET(self):
            parsed_url = urllib.parse.urlparse(self.path)
            path = parsed_url.path
            params = urllib.parse.parse_qs(parsed_url.query)

            # API: Lấy thực đơn theo ngày
            if path == "/api/menu" or path.startswith("/api/menu/"):
                date_str = "today"
                if path.startswith("/api/menu/") and len(path) > len("/api/menu/"):
                    date_str = path.replace("/api/menu/", "")
                elif "date" in params:
                    date_str = params["date"][0]

                try:
                    res = get_menu_by_date(date_str)
                    self._send_json(200, res)
                except ValueError as e:
                    self._send_json(400, {"success": False, "error": str(e)})
                return

            # Phục vụ file tĩnh (HTML, CSS, JS)
            req_file = "daily-menu.html" if path in ("/", "") else path
            content, mime_type = get_static_file(req_file)
            if content:
                self.send_response(200)
                self.send_header("Content-Type", f"{mime_type}; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(content)
            else:
                self._send_json(404, {"success": False, "error": f"Không tìm thấy tài nguyên: {path}"})

        def do_POST(self):
            if self.path == "/api/order":
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                try:
                    data = json.loads(body) if body else {}
                except json.JSONDecodeError:
                    self._send_json(400, {"success": False, "error": "Invalid JSON"})
                    return

                date_param = data.get("date", "today")
                dish_id = data.get("dish_id")
                quantity = int(data.get("quantity", 1))

                if not dish_id:
                    self._send_json(400, {"success": False, "error": "Thiếu 'dish_id'"})
                    return

                try:
                    res, status_code = order_dish(date_param, dish_id, quantity)
                    self._send_json(status_code, res)
                except ValueError as e:
                    self._send_json(400, {"success": False, "error": str(e)})
            else:
                self._send_json(404, {"success": False, "error": "Endpoint không tồn tại"})

        def _send_json(self, status_code, data):
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))

        def log_message(self, format, *args):
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} - {args[1]}")


# ==============================================================================
# HÀM CHẠY SERVER VỚI CƠ CHẾ TỰ ĐỘNG CHỌN PORT TRỐNG (TRÁNH LỖI WINERROR 10048)
# ==============================================================================
def run_server(initial_port=5000):
    host = "127.0.0.1"
    today_str = datetime.now().strftime("%Y-%m-%d")
    candidate_ports = [initial_port, 5001, 8000, 8080, 8888]

    for port in candidate_ports:
        try:
            print("=" * 68)
            print("  🍲 FoodieHub Backend API - Hệ Thống Đặt Đồ Ăn (Nhóm 2)")
            print("  📌 Mã Task: TF1A638 - API xem thực đơn theo ngày kèm số suất")
            print(f"  🌐 Trang Web (Frontend + Backend): http://{host}:{port}")
            print(f"  👉 API xem thực đơn hôm nay       : http://{host}:{port}/api/menu")
            print(f"  👉 API xem theo ngày bất kỳ      : http://{host}:{port}/api/menu?date={today_str}")
            print("=" * 68)

            if USE_FLASK:
                print("  ⚡ [Chế độ]: Flask Framework")
                app.run(host=host, port=port, debug=False)
                return
            else:
                print("  ⚡ [Chế độ]: Python Built-in Server (Không cần cài thêm thư viện)")
                server = HTTPServer((host, port), StandaloneAPIHandler)
                print(f"  ✅ Server đã khởi động thành công trên cổng {port}!")
                print("  (Bấm Ctrl + C trong terminal để dừng server)\n")
                server.serve_forever()
                return

        except OSError as e:
            # Lỗi WinError 10048: Cổng đã bị chiếm dụng bởi ứng dụng khác
            print(f"  ⚠️ Cổng {port} đang bận, tự động thử cổng tiếp theo...")
            continue
        except KeyboardInterrupt:
            print("\n  Đã dừng server an toàn.")
            sys.exit(0)

    print("❌ Không thể mở cổng nào trong danh sách. Vui lòng kiểm tra lại mạng hoặc tắt bớt ứng dụng đang chạy.")

if __name__ == "__main__":
    p = 5000
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        p = int(sys.argv[1])
    run_server(p)
