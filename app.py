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
# DỮ LIỆU THỰC ĐƠN GỐC (MOCK DATABASE MÓN ĂN - TASK TF1A638 & TF1A785)
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
        "allergens": ["Trứng", "Đậu nành"],
        "nutrition": {
            "calories": "650 kcal",
            "protein": "32g",
            "carbs": "68g",
            "fat": "24g"
        },
        "preparation_time": "10 - 15 phút"
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
        "description": "Thịt bò bắp thái mỏng xào lăn tỏi gừng lửa lớn, nước dùng ninh từ xương ống hầm 14 tiếng thơm nức hương quế hồi thảo quả.",
        "ingredients": [
            "Bánh phở tươi tráng thủ công",
            "Thịt bò bắp & thăn bò tươi thái mỏng",
            "Nước dùng xương ống bò hầm 14 tiếng",
            "Gừng ta đập dập & tỏi phi thơm",
            "Hành hoa, mùi tàu & chanh ớt tươi",
            "Hương vị quế chi, thảo quả, đại hồi"
        ],
        "allergy_info": [
            "Có chứa gluten (bánh phở truyền thống)",
            "Thịt bò tươi nguyên chất",
            "Không chứa đậu phộng",
            "Không chứa hải sản"
        ],
        "allergens": ["Gluten"],
        "nutrition": {
            "calories": "520 kcal",
            "protein": "35g",
            "carbs": "56g",
            "fat": "14g"
        },
        "preparation_time": "5 - 8 phút"
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
        "description": "Đùi gà góc phần tư xối mỡ lớp da vàng ruộm giòn tan, thịt bên trong mềm ngọt mọng nước ăn cùng cơm chiên cà chua thơm bùi.",
        "ingredients": [
            "Đùi gà góc tư tươi tuyển chọn",
            "Cơm chiên hạt tơi áo màu cà chua",
            "Nước sốt tỏi ớt chua ngọt",
            "Dưa leo, cà chua và rau răm tươi",
            "Muối tiêu chanh nguyên chất"
        ],
        "allergy_info": [
            "Có chứa đậu nành (trong nước ướp gà)",
            "Không chứa hạt đậu phộng",
            "Không chứa sữa"
        ],
        "allergens": ["Đậu nành"],
        "nutrition": {
            "calories": "680 kcal",
            "protein": "38g",
            "carbs": "72g",
            "fat": "26g"
        },
        "preparation_time": "12 - 15 phút"
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
        "description": "Chả viên và chả miếng nướng xém cạnh trên than hoa đượm khói, chấm nước mắm đu đủ cà rốt ấm nóng kèm đĩa bún tươi và rau ghém xanh mướt.",
        "ingredients": [
            "Bún lá tươi sợi nhỏ",
            "Thịt ba chỉ heo nướng xém cạnh",
            "Chả băm viên ướp hành tím nướng vỉ",
            "Nước mắm pha tỏi ớt đường ấm nóng",
            "Đu đủ xanh & cà rốt thái lát ngâm chua",
            "Rau sống: xà lách, tía tô, kinh giới, húng bạc hà"
        ],
        "allergy_info": [
            "Có chứa cá (nước mắm cá cơm truyền thống)",
            "Có chứa đậu nành (trong nước màu caramel ướp thịt)",
            "Không chứa sữa",
            "Không chứa trứng"
        ],
        "allergens": ["Cá", "Đậu nành"],
        "nutrition": {
            "calories": "510 kcal",
            "protein": "29g",
            "carbs": "60g",
            "fat": "18g"
        },
        "preparation_time": "8 - 10 phút"
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
        "description": "Cá kho keo nước màu dừa, tiêu sọ cay nồng, tóp mỡ béo ngậy. Ăn cùng cơm cháy giòn rụm trong niêu đất truyền thống.",
        "ingredients": [
            "Cá bống tươi sông làm sạch ruột",
            "Nước dừa xiêm tươi thắng nước màu",
            "Thịt ba rọi thái hạt lựu tóp mỡ",
            "Tiêu sọ Phú Quốc giã dập & ớt hiểm",
            "Cơm niêu đất nung cháy đáy vàng giòn",
            "Hành hoa & mỡ hành phi thơm"
        ],
        "allergy_info": [
            "Có chứa cá (cá bống sông)",
            "Có chứa đậu nành (trong nước tương/mắm kho)",
            "Không chứa sữa",
            "Không chứa đậu phộng"
        ],
        "allergens": ["Cá", "Đậu nành"],
        "nutrition": {
            "calories": "490 kcal",
            "protein": "28g",
            "carbs": "62g",
            "fat": "15g"
        },
        "preparation_time": "15 - 20 phút"
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
        "description": "Đậu hũ non chiên giòn, nấm đùi gà áp chảo, xà lách romaine, cà chua bi organic rưới sốt mè rang béo thơm thanh mát.",
        "ingredients": [
            "Đậu hũ non organic chiên vàng ruộm",
            "Nấm đùi gà tươi áp chảo dầu olive",
            "Rau xà lách Romaine & bắp cải tím bào",
            "Cà chua bi organic cherry ngọt mát",
            "Sốt mè rang Nhật Bản đậm đà",
            "Hạt vừng trắng rang thơm"
        ],
        "allergy_info": [
            "Có chứa hạt mè (vừng trắng)",
            "Có chứa đậu nành (đậu hũ & sốt mè)",
            "Món thuần chay (Vegan) hoàn toàn không chứa thịt, trứng, sữa",
            "Không chứa gluten"
        ],
        "allergens": ["Mè (Vừng)", "Đậu nành"],
        "nutrition": {
            "calories": "320 kcal",
            "protein": "16g",
            "carbs": "28g",
            "fat": "14g"
        },
        "preparation_time": "5 - 8 phút"
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
        "description": "Hạt cơm vàng óng áo đều lòng đỏ trứng muối, tôm sú tươi giòn, mực nút, đậu Hà Lan và ngô ngọt giòn sần sật.",
        "ingredients": [
            "Gạo thơm chiên tơi hạt",
            "Lòng đỏ trứng vịt muối nghiền mịn",
            "Tôm sú biển bóc nõn tươi giòn",
            "Mực ống nút thái khoanh tròn",
            "Đậu Hà Lan hạt xanh & ngô ngọt hạt",
            "Hành lá, tiêu sọ & dầu mè thơm"
        ],
        "allergy_info": [
            "Cảnh báo: Có chứa hải sản giáp xác (Tôm, Mực)",
            "Có chứa trứng (trứng muối)",
            "Có chứa dầu mè",
            "Không chứa đậu phộng"
        ],
        "allergens": ["Hải sản (Tôm, Mực)", "Trứng", "Mè (Vừng)"],
        "nutrition": {
            "calories": "610 kcal",
            "protein": "34g",
            "carbs": "65g",
            "fat": "21g"
        },
        "preparation_time": "10 - 12 phút"
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
        "description": "Sợi bún to tròn mềm mại, nước dùng cay nồng hương sả và mắm ruốc Huế đặc trưng, chả cua quết tay dẻo ngọt và bắp bò giòn.",
        "ingredients": [
            "Bún sợi to chuẩn phong cách xứ Huế",
            "Thịt bắp hoa bò thái lát mỏng",
            "Chả cua biển quết tay dẻo ngọt",
            "Nước dùng hầm xương bò & sả cây đập dập",
            "Mắm ruốc Huế truyền thống tạo vị đậm đà",
            "Hành tây bào mỏng, ớt chưng sa tế & rau hoa chuối"
        ],
        "allergy_info": [
            "Có chứa hải sản (chả cua biển, mắm ruốc ruốc biển)",
            "Thịt bò",
            "Không chứa sữa",
            "Không chứa đậu phộng"
        ],
        "allergens": ["Hải sản (Cua, Ruốc biển)"],
        "nutrition": {
            "calories": "580 kcal",
            "protein": "36g",
            "carbs": "62g",
            "fat": "19g"
        },
        "preparation_time": "6 - 8 phút"
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
        "description": "Nấm rơm cùng nấm đùi gà kho keo vị mặn ngọt đậm đà quyện hạt tiêu cay ấm, dùng kèm chén cơm gạo lứt huyết rồng dẻo thơm.",
        "ingredients": [
            "Gạo lứt huyết rồng hữu cơ nấu dẻo",
            "Nấm rơm búp tươi cắt chân sạch",
            "Nấm đùi gà tươi cắt quân cờ áp chảo",
            "Nước tương đậu nành lên men thủ công",
            "Tiêu đen nguyên hạt & tiêu xay Đắk Lắk",
            "Dầu thực vật & hành boa-rô phi thơm"
        ],
        "allergy_info": [
            "Có chứa đậu nành (trong nước tương lên men)",
            "Món thuần chay 100% không chứa sữa, trứng, thịt",
            "Không chứa gluten",
            "Không chứa đậu phộng"
        ],
        "allergens": ["Đậu nành"],
        "nutrition": {
            "calories": "380 kcal",
            "protein": "14g",
            "carbs": "64g",
            "fat": "9g"
        },
        "preparation_time": "8 - 12 phút"
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
        "description": "Trà đen ủ lạnh thanh mát quyện vị chua ngọt tự nhiên của nước cam tươi, hương sả nồng nàn cùng đào miếng giòn.",
        "ingredients": [
            "Cốt hồng trà đen Ceylon ủ lạnh 12h",
            "Nước cam sành vắt tươi nguyên chất",
            "Nước cốt sả cây nấu đường phèn thanh mát",
            "Miếng đào ngâm vàng giòn chua ngọt",
            "Hạt chia hữu cơ giàu omega-3",
            "Lá bạc hà tươi trang trí"
        ],
        "allergy_info": [
            "Không chứa chất dị ứng phổ biến",
            "Hoàn toàn không chứa sữa động vật",
            "Không chứa gluten",
            "Không chứa hạt đậu phộng"
        ],
        "allergens": [],
        "nutrition": {
            "calories": "160 kcal",
            "protein": "2g",
            "carbs": "36g",
            "fat": "1g"
        },
        "preparation_time": "3 - 5 phút"
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
        "description": "Sữa chua dẻo mịn chua ngọt hài hòa, ăn kèm trân châu trắng cốt dừa ấm nóng rắc thêm dừa sợi sấy giòn.",
        "ingredients": [
            "Sữa chua lên men tự nhiên từ sữa tươi",
            "Trân châu trắng bột lọc dẻo giòn dai",
            "Nước cốt dừa nguyên chất đun nóng ấm",
            "Cùi dừa non sấy khô giòn rụm",
            "Sữa đặc có đường Ông Thọ"
        ],
        "allergy_info": [
            "Có chứa sữa và các sản phẩm từ sữa bò (Lactose)",
            "Không dùng cho người không dung nạp đường Lactose",
            "Không chứa gluten",
            "Không chứa đậu phộng"
        ],
        "allergens": ["Sữa (Lactose)"],
        "nutrition": {
            "calories": "210 kcal",
            "protein": "6g",
            "carbs": "32g",
            "fat": "7g"
        },
        "preparation_time": "3 - 5 phút"
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
        "description": "Trà sữa đậm vị hồng trà Ceylon thơm ngát kết hợp sữa tươi thanh trùng, trân châu hoàng kim nấu mật ong dẻo mềm.",
        "ingredients": [
            "Hồng trà đen Assam hảo hạng ủ nhiệt độ chuẩn",
            "Sữa tươi thanh trùng Đà Lạt nguyên chất",
            "Trân châu hoàng kim bột năng dẻo dai",
            "Mật ong hoa nhãn nấu sốt trân châu",
            "Đường mía tự nhiên"
        ],
        "allergy_info": [
            "Có chứa sữa động vật (Lactose)",
            "Có chứa mật ong hoa rừng",
            "Không chứa đậu nành",
            "Không chứa đậu phộng"
        ],
        "allergens": ["Sữa (Lactose)"],
        "nutrition": {
            "calories": "310 kcal",
            "protein": "5g",
            "carbs": "48g",
            "fat": "9g"
        },
        "preparation_time": "3 - 5 phút"
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

def get_menu_by_date(date_str: str = "today", mock_empty: bool = False):
    """
    [CORE API] Lấy danh sách thực đơn và số suất còn lại của từng món theo ngày
    Mã Task: TF1A638 (BE API) & TF1A6E9 (FE Nối API)
    """
    dt = parse_date_str(date_str)
    date_key = dt.strftime("%Y-%m-%d")
    day_name = WEEKDAYS_VN[dt.weekday()]

    # Hỗ trợ kiểm thử trạng thái thực đơn rỗng (Empty state cho Task TF1A6E9)
    if mock_empty or date_str in ("empty", "2026-01-01"):
        return {
            "success": True,
            "task_id": "TF1A638",
            "fe_task_id": "TF1A6E9",
            "date": date_key,
            "date_formatted": dt.strftime("%d/%m/%Y"),
            "day_of_week": day_name,
            "serving_time": {
                "lunch": "Tạm ngưng",
                "dinner": "Tạm ngưng"
            },
            "total_dishes": 0,
            "available_dishes": 0,
            "out_of_stock_dishes": 0,
            "message": "Ngày này nhà hàng tạm ngưng phục vụ thực đơn.",
            "data": []
        }

    initialize_daily_stock_if_needed(date_key, dt)

    day_stocks = DAILY_STOCK_DB[date_key]

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
        "fe_task_id": "TF1A6E9",
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

def get_dish_detail(dish_id: str):
    """
    [CORE API] Lấy thông tin chi tiết một món ăn: ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng
    Mã Task: TF1A785
    """
    if not dish_id:
        return {
            "success": False,
            "task_id": "TF1A785",
            "error": "Mã món ăn (dish_id) không được để trống"
        }, 400

    clean_id = dish_id.strip()
    target_dish = next((d for d in DISH_CATALOG if d["id"] == clean_id), None)

    if not target_dish:
        return {
            "success": False,
            "task_id": "TF1A785",
            "error": f"Không tìm thấy món ăn với ID '{clean_id}'",
            "code": "DISH_NOT_FOUND"
        }, 404

    data = {
        "id": target_dish["id"],
        "name": target_dish["name"],
        "category": target_dish["category"],
        "category_name": target_dish["category_name"],
        "meal_time": target_dish["meal_time"],
        "price": target_dish["price"],
        "price_formatted": f"{target_dish['price']:,} ₫".replace(",", "."),
        "original_price": target_dish["original_price"],
        "image_url": target_dish["image_url"],
        "description": target_dish["description"],
        "ingredients": target_dish.get("ingredients", []),
        "allergy_info": target_dish.get("allergy_info", []),
        "allergens": target_dish.get("allergens", []),
        "nutrition": target_dish.get("nutrition", {
            "calories": target_dish.get("calories", "500 kcal"),
            "protein": "25g",
            "carbs": "50g",
            "fat": "15g"
        }),
        "preparation_time": target_dish.get("preparation_time", "10 - 15 phút"),
        "tag": target_dish.get("tag"),
        "tag_label": target_dish.get("tag_label")
    }

    return {
        "success": True,
        "task_id": "TF1A785",
        "data": data
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
    elif clean_path in ("dish-detail", "detail", "dish"):
        clean_path = "dish-detail.html"
    
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

    @app.route("/dish-detail", methods=["GET"])
    @app.route("/dish-detail.html", methods=["GET"])
    def dish_detail_page():
        return send_from_directory(CURRENT_DIR, "dish-detail.html")

    @app.route("/<path:filename>", methods=["GET"])
    def static_files(filename):
        if os.path.exists(os.path.join(CURRENT_DIR, filename)):
            return send_from_directory(CURRENT_DIR, filename)
        return jsonify({"success": False, "error": "File not found"}), 404

    @app.route("/api/menu", methods=["GET"])
    def api_get_menu():
        date_param = request.args.get("date", "today")
        mock_empty = request.args.get("empty", "").lower() in ("1", "true", "yes")
        try:
            res = get_menu_by_date(date_param, mock_empty=mock_empty)
            return jsonify(res), 200
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.route("/api/menu/<date_str>", methods=["GET"])
    def api_get_menu_path(date_str):
        mock_empty = request.args.get("empty", "").lower() in ("1", "true", "yes")
        try:
            res = get_menu_by_date(date_str, mock_empty=mock_empty)
            return jsonify(res), 200
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.route("/api/dishes/<dish_id>", methods=["GET"])
    @app.route("/api/dish/<dish_id>", methods=["GET"])
    def api_get_dish_detail(dish_id):
        res, status_code = get_dish_detail(dish_id)
        return jsonify(res), status_code

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

            # API: Lấy thực đơn theo ngày (Hỗ trợ Task TF1A638 & TF1A6E9)
            if path == "/api/menu" or path.startswith("/api/menu/"):
                date_str = "today"
                if path.startswith("/api/menu/") and len(path) > len("/api/menu/"):
                    date_str = path.replace("/api/menu/", "")
                elif "date" in params:
                    date_str = params["date"][0]

                mock_empty = "empty" in params and params["empty"][0].lower() in ("1", "true", "yes")

                try:
                    res = get_menu_by_date(date_str, mock_empty=mock_empty)
                    self._send_json(200, res)
                except ValueError as e:
                    self._send_json(400, {"success": False, "error": str(e)})
                return

            # API: Chi tiết món ăn (Task TF1A785: ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng)
            if path.startswith("/api/dishes/") or path.startswith("/api/dish/"):
                parts = [p for p in path.split("/") if p]
                dish_id = parts[-1] if len(parts) >= 3 else ""
                res, status_code = get_dish_detail(dish_id)
                self._send_json(status_code, res)
                return
            elif path in ("/api/dishes", "/api/dish") and "id" in params:
                dish_id = params["id"][0]
                res, status_code = get_dish_detail(dish_id)
                self._send_json(status_code, res)
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
            print(f"  👉 API chi tiết món ăn (TF1A785) : http://{host}:{port}/api/dishes/dish-1")
            print(f"  👉 Trang chi tiết món (TF1A86F)  : http://{host}:{port}/dish-detail.html?id=dish-1")
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
