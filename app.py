#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
FoodieHub - Hệ Thống Đặt Đồ Ăn - Nhóm 2
Backend API: Xem thực đơn theo ngày kèm số suất còn lại của từng món
Mã Task: TF1A638 | TF1B47E (tối ưu truy vấn thực đơn)

TF1B47E - Các tối ưu áp dụng cho mock server (app.py):
  1. _DISH_INDEX_BY_ID   : dict O(1) lookup thay vì vòng lặp O(n) qua DISH_CATALOG
  2. _DISH_INDEX_BY_CAT  : dict nhóm theo category, tìm theo danh mục O(1)
  3. _NORM_INDEX         : dict tên món đã chuẩn hóa dấu → tìm kiếm không dấu O(n_match)
  4. get_menu_by_date()  : dùng dict lookup O(1) thay vì next(...) O(n)
  5. search_dishes()     : dùng _NORM_INDEX đã build sẵn, không normalize lại mỗi request
  6. Mỗi API endpoint trả thêm trường query_time_ms (thời gian xử lý thực tế tính bằng ms)
"""

import os
import sys
import json
import math
import time
import mimetypes
import unicodedata
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
        "name": "Canh Sườn Non Hầm Rau Củ Bắp Ngọt",
        "category": "mon-canh",
        "category_name": "Canh / Súp",
        "meal_time": "Trưa & Tối",
        "price": 45000,
        "original_price": 52000,
        "base_stock": 18,
        "tag": "chef",
        "tag_label": "Thanh mát",
        "calories": "380 kcal",
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80",
        "description": "Sườn non heo tươi hầm mềm róc xương cùng bắp ngọt Mỹ, cà rốt, khoai tây và nấm hương trong nước dùng thanh trong ngọt tự nhiên.",
        "ingredients": [
            "Sườn non heo tươi tuyển chọn",
            "Bắp ngọt Mỹ cắt khúc vừa ăn",
            "Cà rốt & khoai tây Đà Lạt tươi",
            "Nấm hương khô ngâm nở thơm lừng",
            "Hành hoa, ngò rí & tiêu sọ xay",
            "Nước dùng hầm xương ống ngọt thanh"
        ],
        "allergy_info": [
            "Không chứa chất dị ứng nguy hiểm phổ biến",
            "Thịt heo tươi nguyên chất",
            "Không chứa đậu phộng",
            "Không chứa sữa"
        ],
        "allergens": [],
        "nutrition": {
            "calories": "380 kcal",
            "protein": "26g",
            "carbs": "32g",
            "fat": "14g"
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
        "name": "Canh Rong Biển Đậu Hũ Non Hạt Sen (Chay)",
        "category": "mon-canh",
        "category_name": "Canh / Súp",
        "meal_time": "Cả Ngày",
        "price": 38000,
        "original_price": 45000,
        "base_stock": 20,
        "tag": "new",
        "tag_label": "Thực dưỡng",
        "calories": "240 kcal",
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80",
        "description": "Rong biển nang Hàn Quốc thanh mát nấu cùng đậu hũ non mềm mịn, hạt sen tươi Huế bở bùi và nấm đùi gà áp chảo giải nhiệt cơ thể hiệu quả.",
        "ingredients": [
            "Rong biển nang Hàn Quốc cao cấp",
            "Đậu hũ non organic mềm mịn",
            "Hạt sen tươi Huế bở bùi",
            "Nấm đùi gà cắt lát áp chảo",
            "Kỷ tử đỏ & dầu mè thơm",
            "Gừng tươi đập dập khử hàn"
        ],
        "allergy_info": [
            "Có chứa đậu nành (trong đậu hũ non)",
            "Có chứa mè (dầu mè)",
            "Món thuần chay (Vegan) thanh đạm",
            "Không chứa gluten",
            "Không chứa sữa, trứng, thịt"
        ],
        "allergens": ["Đậu nành", "Mè (Vừng)"],
        "nutrition": {
            "calories": "240 kcal",
            "protein": "15g",
            "carbs": "26g",
            "fat": "8g"
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

# ==============================================================================
# TF1B47E: BUILD INDEX IN-MEMORY — xây dựng sau khi DISH_CATALOG đã khai báo xong
# Mục tiêu: đổi O(n) linear scan → O(1) dict lookup cho mọi thao tác tra cứu món
# ==============================================================================

def _build_dish_indexes():
    """Xây dựng các dict index từ DISH_CATALOG để tăng tốc lookup."""
    by_id   = {}   # dish_id  → dish dict
    by_cat  = {}   # category → [dish dict, ...]
    norm    = {}   # dish_id  → (norm_name_no_accent, lower_name)

    for dish in DISH_CATALOG:
        did = dish["id"]
        cat = dish.get("category", "")
        name = dish.get("name", "")

        by_id[did] = dish

        if cat not in by_cat:
            by_cat[cat] = []
        by_cat[cat].append(dish)

        norm_name  = _remove_accents_static(name)
        lower_name = name.lower()
        norm[did]  = (norm_name, lower_name)

    return by_id, by_cat, norm

def _remove_accents_static(s: str) -> str:
    """Phiên bản static (không phụ thuộc hàm ngoài) dùng lúc build index."""
    if not s:
        return ""
    s = str(s).replace("đ", "d").replace("Đ", "d")
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()

# Cơ sở dữ liệu số suất còn lại theo ngày trong RAM
# Format: { "YYYY-MM-DD": { "dish_id": stock_integer } }
DAILY_STOCK_DB = {}

# Các dict index — được khởi tạo ngay sau khi module load
_DISH_INDEX_BY_ID: dict  = {}  # dish_id → dish dict
_DISH_INDEX_BY_CAT: dict = {}  # category → list[dish]
_NORM_INDEX: dict        = {}  # dish_id → (norm_name, lower_name)

WEEKDAYS_VN = [
    "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm",
    "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"
]

# Khởi tạo index ngay khi module load (chạy 1 lần duy nhất)
_DISH_INDEX_BY_ID, _DISH_INDEX_BY_CAT, _NORM_INDEX = _build_dish_indexes()

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

    TF1B47E — Tối ưu:
      - Đo thời gian thực thi (perf_counter) và trả về trường query_time_ms
      - Dùng DAILY_STOCK_DB[date_key] dict O(1) thay vì linear scan
      - Dùng DISH_CATALOG list (order preserved) nhưng không gọi next() O(n) nữa
    """
    _t0 = time.perf_counter()

    dt = parse_date_str(date_str)
    date_key = dt.strftime("%Y-%m-%d")
    day_name = WEEKDAYS_VN[dt.weekday()]

    # Hỗ trợ kiểm thử trạng thái thực đơn rỗng (Empty state cho Task TF1A6E9)
    if mock_empty or date_str in ("empty", "2026-01-01"):
        _ms = round((time.perf_counter() - _t0) * 1000, 3)
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
            "query_time_ms": _ms,
            "data": []
        }

    initialize_daily_stock_if_needed(date_key, dt)

    # TF1B47E: O(1) dict lookup thay vì vòng for lồng nhau
    day_stocks = DAILY_STOCK_DB[date_key]

    items = []
    for dish in DISH_CATALOG:
        stock = day_stocks.get(dish["id"], 0)   # O(1) hash lookup

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

    _ms = round((time.perf_counter() - _t0) * 1000, 3)
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
        "query_time_ms": _ms,
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
    # TF1B47E: O(1) dict lookup thay vì next(...) O(n) qua DISH_CATALOG
    target_dish = _DISH_INDEX_BY_ID.get(dish_id)
    dish_name = target_dish["name"] if target_dish else dish_id

    return {
        "success": True,
        "message": f"Đặt thành công {quantity} suất '{dish_name}' cho ngày {date_key}.",
        "dish_id": dish_id,
        "dish_name": dish_name,
        "date": date_key,
        "ordered_quantity": quantity,
        "remaining_stock": day_stocks[dish_id]
    }, 200

def get_dish_detail(dish_id: str):
    """
    [CORE API] Lấy thông tin chi tiết một món ăn: ảnh, mô tả, giá, nguyên liệu, thông tin dị ứng
    Mã Task: TF1A785

    TF1B47E — Tối ưu:
      - Dùng _DISH_INDEX_BY_ID O(1) dict lookup thay vì next(...) O(n) vòng lặp
      - Trả thêm query_time_ms đo thời gian thực thi
    """
    _t0 = time.perf_counter()

    if not dish_id:
        return {
            "success": False,
            "task_id": "TF1A785",
            "error": "Mã món ăn (dish_id) không được để trống"
        }, 400

    clean_id = dish_id.strip()
    # TF1B47E: O(1) dict lookup thay vì O(n) next() scan
    target_dish = _DISH_INDEX_BY_ID.get(clean_id)

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

    _ms = round((time.perf_counter() - _t0) * 1000, 3)
    return {
        "success": True,
        "task_id": "TF1A785",
        "query_time_ms": _ms,
        "data": data
    }, 200

def remove_accents(input_str: str) -> str:
    """Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu (ví dụ: 'phở bò' -> 'pho bo')"""
    if not input_str:
        return ""
    s = str(input_str).replace("đ", "d").replace("Đ", "d")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()

def search_dishes(keyword: str = None, page: int = 1, limit: int = 6, date_str: str = None, strict_empty: bool = False):
    """
    [CORE API] Tìm kiếm món ăn theo tên, có phân trang và xử lý từ khóa rỗng.
    Mã Task: TF1A8D7

    TF1B47E — Tối ưu:
      - Dùng _NORM_INDEX (đã build sẵn khi module load) → không normalize lại tên mỗi request
      - Trả thêm query_time_ms đo thời gian thực thi

    Tham số:
      - keyword (str): Từ khóa tìm kiếm món theo tên (ví dụ: "cơm", "phở", "bò", "gà", "").
      - page (int): Số thứ tự trang (bắt đầu từ 1, mặc định 1).
      - limit (int): Số phần tử trên mỗi trang (mặc định 6, giới hạn tối đa 50).
      - date_str (str): Ngày (YYYY-MM-DD) để lấy số suất tương ứng theo ngày nếu có.
      - strict_empty (bool): Nếu True, khi từ khóa rỗng sẽ trả về lỗi HTTP 400. Mặc định False (trả về tất cả món kèm thông báo).
    """
    _t0 = time.perf_counter()

    raw_keyword = keyword if keyword is not None else ""
    clean_keyword = raw_keyword.strip()
    is_empty_keyword = (len(clean_keyword) == 0)

    # Xử lý chế độ strict khi từ khóa rỗng nếu client yêu cầu
    if is_empty_keyword and strict_empty:
        return {
            "success": False,
            "task_id": "TF1A8D7",
            "error": "Từ khóa tìm kiếm không được để trống (strict_empty=True)",
            "code": "EMPTY_KEYWORD"
        }, 400

    # Chuẩn hóa tham số phân trang page và limit
    try:
        page_num = int(page)
    except (ValueError, TypeError):
        page_num = 1
    if page_num < 1:
        page_num = 1

    try:
        limit_num = int(limit)
    except (ValueError, TypeError):
        limit_num = 6
    if limit_num < 1:
        limit_num = 6
    elif limit_num > 50:
        limit_num = 50

    # Khởi tạo kho ngày nếu có date_str
    day_stocks = None
    if date_str:
        try:
            dt = parse_date_str(date_str)
            d_key = dt.strftime("%Y-%m-%d")
            initialize_daily_stock_if_needed(d_key, dt)
            day_stocks = DAILY_STOCK_DB.get(d_key, {})
        except Exception:
            pass

    # TF1B47E: Dùng _NORM_INDEX đã build sẵn — tránh normalize lại mỗi request
    if is_empty_keyword:
        matched_dishes = list(DISH_CATALOG)
        message = "Từ khóa tìm kiếm rỗng. Hệ thống trả về toàn bộ danh sách món ăn có phân trang."
    else:
        norm_keyword  = remove_accents(clean_keyword)
        lower_keyword = clean_keyword.lower()
        kw_words      = norm_keyword.split()
        matched_dishes = []

        for dish in DISH_CATALOG:
            did = dish["id"]
            # Lấy từ index đã build, không gọi remove_accents() lại
            norm_name, lower_name = _NORM_INDEX.get(did, ("", ""))

            # 1. Khớp chuỗi con chính xác có dấu hoặc không dấu trong tên món
            if lower_keyword in lower_name or norm_keyword in norm_name:
                matched_dishes.append(dish)
            # 2. Khớp tất cả các từ trong cụm từ khóa (ví dụ: "bò tái" khớp "Phở Bò Tái Lăn...")
            elif len(kw_words) > 1 and all(w in norm_name for w in kw_words):
                matched_dishes.append(dish)

        if not matched_dishes:
            message = f"Không tìm thấy món ăn nào có tên phù hợp với từ khóa '{clean_keyword}'."
        else:
            message = f"Tìm thấy {len(matched_dishes)} món ăn phù hợp với từ khóa '{clean_keyword}'."

    # Thực hiện phân trang (Pagination)
    total_items = len(matched_dishes)
    total_pages = math.ceil(total_items / limit_num) if total_items > 0 else 0
    start_idx = (page_num - 1) * limit_num
    end_idx = start_idx + limit_num
    paged_slice = matched_dishes[start_idx:end_idx]

    has_next = (page_num < total_pages)
    has_prev = (page_num > 1 and total_pages > 0)

    if total_items > 0 and page_num > total_pages:
        message = f"Trang {page_num} vượt quá tổng số {total_pages} trang hiện có."

    # Định dạng dữ liệu trả về cho từng món
    data_items = []
    for dish in paged_slice:
        dish_id = dish["id"]
        stock = day_stocks.get(dish_id, dish["base_stock"]) if day_stocks else dish["base_stock"]
        item = {
            "id": dish["id"],
            "name": dish["name"],
            "category": dish["category"],
            "category_name": dish["category_name"],
            "meal_time": dish["meal_time"],
            "price": dish["price"],
            "price_formatted": f"{dish['price']:,} ₫".replace(",", "."),
            "original_price": dish.get("original_price"),
            "stock": stock,
            "is_available": stock > 0,
            "tag": dish.get("tag"),
            "tag_label": dish.get("tag_label"),
            "image_url": dish.get("image_url"),
            "description": dish.get("description"),
            "calories": dish.get("calories"),
            "preparation_time": dish.get("preparation_time")
        }
        data_items.append(item)

    _ms = round((time.perf_counter() - _t0) * 1000, 3)
    result = {
        "success": True,
        "task_id": "TF1A8D7",
        "keyword": clean_keyword,
        "is_empty_keyword": is_empty_keyword,
        "page": page_num,
        "limit": limit_num,
        "total_items": total_items,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev,
        "pagination": {
            "page": page_num,
            "limit": limit_num,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        },
        "query_time_ms": _ms,
        "message": message,
        "data": data_items
    }
    return result, 200

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

    @app.route("/api/dishes/search", methods=["GET"])
    @app.route("/api/search", methods=["GET"])
    @app.route("/api/dish/search", methods=["GET"])
    def api_search_dishes():
        keyword = request.args.get("q") or request.args.get("keyword") or request.args.get("name")
        page = request.args.get("page", 1)
        limit = request.args.get("limit") or request.args.get("page_size", 6)
        date_str = request.args.get("date")
        strict_empty = request.args.get("strict_empty", "").lower() in ("1", "true", "yes")

        res, status_code = search_dishes(
            keyword=keyword,
            page=page,
            limit=limit,
            date_str=date_str,
            strict_empty=strict_empty
        )
        return jsonify(res), status_code

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

            # API: Tìm kiếm món ăn theo tên (Task TF1A8D7: tìm theo tên, phân trang, xử lý từ khóa rỗng)
            if path in ("/api/dishes/search", "/api/search", "/api/dish/search"):
                keyword = None
                if "q" in params:
                    keyword = params["q"][0]
                elif "keyword" in params:
                    keyword = params["keyword"][0]
                elif "name" in params:
                    keyword = params["name"][0]

                page = params.get("page", [1])[0]
                limit = params.get("limit", params.get("page_size", [6]))[0]
                date_str = params.get("date", [None])[0]
                strict_empty = "strict_empty" in params and params["strict_empty"][0].lower() in ("1", "true", "yes")

                res, status_code = search_dishes(
                    keyword=keyword,
                    page=page,
                    limit=limit,
                    date_str=date_str,
                    strict_empty=strict_empty
                )
                self._send_json(status_code, res)
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
            print(f"  👉 API tìm kiếm món ăn (TF1A8D7) : http://{host}:{port}/api/dishes/search?q=cơm&page=1&limit=4")
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
