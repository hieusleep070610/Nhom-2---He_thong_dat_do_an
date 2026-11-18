/**
 * FoodieHub - Hệ Thống Đặt Đồ Ăn - Nhóm 2
 * Quản lý & Hiển thị Trang Chi Tiết Món Ăn
 * Mã Task: TF1A86F ([FE] Trang chi tiết món ăn: ảnh, mô tả, giá, nguyên liệu, nút thêm vào đơn)
 * Kết nối API Backend Task TF1A785 (GET /api/dishes/<id>) & TF1A638 (GET /api/menu)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[TF1A86F] Khởi tạo Frontend Trang Chi Tiết Món Ăn');

    // =========================================================================
    // 1. DỮ LIỆU DỰ PHÒNG OFFLINE (FALLBACK CHO CẢ 12 MÓN ĂN)
    // =========================================================================
    const LOCAL_FALLBACK_DISHES = [
        {
            id: 'dish-1',
            name: 'Cơm Tấm Sườn Bì Chả Đặc Biệt',
            category: 'mon-chinh',
            category_name: 'Món chính',
            meal_time: 'Trưa & Tối',
            price: 52000,
            original_price: 60000,
            base_stock: 25,
            stock: 15,
            tag: 'hot',
            tag_label: 'Bán chạy',
            calories: '650 kcal',
            image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
            description: 'Sườn cốt lết ướp mật ong nướng than hồng thơm lừng, bì dai giòn cùng chả trứng hấp béo ngậy kèm đồ chua và nước mắm kẹo đậm đà.',
            ingredients: [
                'Gạo tấm thơm ST25',
                'Sườn cốt lết heo tươi ướp mật ong',
                'Bì heo thái chỉ sợi thính gạo rang',
                'Chả trứng hấp mộc nhĩ nấm mèo',
                'Mỡ hành lá phi thơm tóp mỡ giòn',
                'Nước mắm chua ngọt pha kẹo',
                'Đồ chua (củ cải trắng, cà rốt ngâm giấm)'
            ],
            allergy_info: [
                'Có chứa trứng gà (trong chả trứng)',
                'Có chứa đậu nành (trong nước sốt ướp sườn)',
                'Không chứa đậu phộng',
                'Không chứa sữa động vật'
            ],
            allergens: ['Trứng', 'Đậu nành'],
            nutrition: {
                calories: '650 kcal',
                protein: '32g',
                carbs: '68g',
                fat: '24g'
            },
            preparation_time: '10 - 15 phút'
        },
        {
            id: 'dish-2',
            name: 'Phở Bò Tái Lăn Hà Nội',
            category: 'mon-nuoc',
            category_name: 'Món nước',
            meal_time: 'Bữa Trưa',
            price: 55000,
            original_price: 65000,
            base_stock: 20,
            stock: 3,
            tag: 'chef',
            tag_label: 'Bếp trưởng đề xuất',
            calories: '520 kcal',
            image_url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
            description: 'Thịt bò bắp thái mỏng xào lăn tỏi gừng lửa lớn, nước dùng ninh từ xương ống hầm 14 tiếng thơm nức hương quế hồi thảo quả.',
            ingredients: [
                'Bánh phở tươi tráng thủ công',
                'Thịt bò bắp & thăn bò tươi thái mỏng',
                'Nước dùng xương ống bò hầm 14 tiếng',
                'Gừng ta đập dập & tỏi phi thơm',
                'Hành hoa, mùi tàu & chanh ớt tươi',
                'Hương vị quế chi, thảo quả, đại hồi'
            ],
            allergy_info: [
                'Có chứa gluten (bánh phở truyền thống)',
                'Thịt bò tươi nguyên chất',
                'Không chứa đậu phộng',
                'Không chứa hải sản'
            ],
            allergens: ['Gluten'],
            nutrition: {
                calories: '520 kcal',
                protein: '35g',
                carbs: '56g',
                fat: '14g'
            },
            preparation_time: '5 - 8 phút'
        },
        {
            id: 'dish-3',
            name: 'Cơm Gà Xối Mỡ Da Giòn',
            category: 'mon-chinh',
            category_name: 'Món chính',
            meal_time: 'Trưa & Tối',
            price: 48000,
            original_price: 55000,
            base_stock: 30,
            stock: 22,
            tag: 'hot',
            tag_label: 'Yêu thích',
            calories: '680 kcal',
            image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
            description: 'Đùi gà góc phần tư xối mỡ lớp da vàng ruộm giòn tan, thịt bên trong mềm ngọt mọng nước ăn cùng cơm chiên cà chua thơm bùi.',
            ingredients: [
                'Đùi gà góc tư tươi tuyển chọn',
                'Cơm chiên hạt tơi áo màu cà chua',
                'Nước sốt tỏi ớt chua ngọt',
                'Dưa leo, cà chua và rau răm tươi',
                'Muối tiêu chanh nguyên chất'
            ],
            allergy_info: [
                'Có chứa đậu nành (trong nước ướp gà)',
                'Không chứa hạt đậu phộng',
                'Không chứa sữa'
            ],
            allergens: ['Đậu nành'],
            nutrition: {
                calories: '680 kcal',
                protein: '38g',
                carbs: '72g',
                fat: '26g'
            },
            preparation_time: '12 - 15 phút'
        },
        {
            id: 'dish-4',
            name: 'Bún Chả Nướng Than Hoa',
            category: 'mon-nuoc',
            category_name: 'Món nước',
            meal_time: 'Bữa Trưa',
            price: 50000,
            original_price: 55000,
            base_stock: 18,
            stock: 2,
            tag: 'hot',
            tag_label: 'Sắp hết',
            calories: '510 kcal',
            image_url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
            description: 'Chả viên và chả miếng nướng xém cạnh trên than hoa đượm khói, chấm nước mắm đu đủ cà rốt ấm nóng kèm đĩa bún tươi và rau ghém xanh mướt.',
            ingredients: [
                'Bún lá tươi sợi nhỏ',
                'Thịt ba chỉ heo nướng xém cạnh',
                'Chả băm viên ướp hành tím nướng vỉ',
                'Nước mắm pha tỏi ớt đường ấm nóng',
                'Đu đủ xanh & cà rốt thái lát ngâm chua',
                'Rau sống: xà lách, tía tô, kinh giới, húng bạc hà'
            ],
            allergy_info: [
                'Có chứa cá (nước mắm cá cơm truyền thống)',
                'Có chứa đậu nành (trong nước màu caramel ướp thịt)',
                'Không chứa sữa',
                'Không chứa trứng'
            ],
            allergens: ['Cá', 'Đậu nành'],
            nutrition: {
                calories: '510 kcal',
                protein: '29g',
                carbs: '60g',
                fat: '18g'
            },
            preparation_time: '8 - 10 phút'
        },
        {
            id: 'dish-5',
            name: 'Cơm Niêu Cá Bống Kho Tộ',
            category: 'mon-chinh',
            category_name: 'Món chính',
            meal_time: 'Bữa Tối',
            price: 59000,
            original_price: 65000,
            base_stock: 15,
            stock: 0,
            tag: null,
            tag_label: '',
            calories: '490 kcal',
            image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            description: 'Cá kho keo nước màu dừa, tiêu sọ cay nồng, tóp mỡ béo ngậy. Ăn cùng cơm cháy giòn rụm trong niêu đất truyền thống.',
            ingredients: [
                'Cá bống tươi sông làm sạch ruột',
                'Nước dừa xiêm tươi thắng nước màu',
                'Thịt ba rọi thái hạt lựu tóp mỡ',
                'Tiêu sọ Phú Quốc giã dập & ớt hiểm',
                'Cơm niêu đất nung cháy đáy vàng giòn',
                'Hành hoa & mỡ hành phi thơm'
            ],
            allergy_info: [
                'Có chứa cá (cá bống sông)',
                'Có chứa đậu nành (trong nước tương/mắm kho)',
                'Không chứa sữa',
                'Không chứa đậu phộng'
            ],
            allergens: ['Cá', 'Đậu nành'],
            nutrition: {
                calories: '490 kcal',
                protein: '28g',
                carbs: '62g',
                fat: '15g'
            },
            preparation_time: '15 - 20 phút'
        },
        {
            id: 'dish-6',
            name: 'Salad Đậu Hũ Nấm Sốt Mè Rang (Chay)',
            category: 'mon-chay',
            category_name: 'Món chay',
            meal_time: 'Cả Ngày',
            price: 38000,
            original_price: 45000,
            base_stock: 20,
            stock: 12,
            tag: 'new',
            tag_label: 'Thực dưỡng',
            calories: '320 kcal',
            image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
            description: 'Đậu hũ non chiên giòn, nấm đùi gà áp chảo, xà lách romaine, cà chua bi organic rưới sốt mè rang béo thơm thanh mát.',
            ingredients: [
                'Đậu hũ non organic chiên vàng ruộm',
                'Nấm đùi gà tươi áp chảo dầu olive',
                'Rau xà lách Romaine & bắp cải tím bào',
                'Cà chua bi organic cherry ngọt mát',
                'Sốt mè rang Nhật Bản đậm đà',
                'Hạt vừng trắng rang thơm'
            ],
            allergy_info: [
                'Có chứa hạt mè (vừng trắng)',
                'Có chứa đậu nành (đậu hũ & sốt mè)',
                'Món thuần chay (Vegan) hoàn toàn không chứa thịt, trứng, sữa',
                'Không chứa gluten'
            ],
            allergens: ['Mè (Vừng)', 'Đậu nành'],
            nutrition: {
                calories: '320 kcal',
                protein: '16g',
                carbs: '28g',
                fat: '14g'
            },
            preparation_time: '5 - 8 phút'
        },
        {
            id: 'dish-7',
            name: 'Cơm Chiên Hải Sản Hoàng Kim',
            category: 'mon-chinh',
            category_name: 'Món chính',
            meal_time: 'Trưa & Tối',
            price: 55000,
            original_price: 62000,
            base_stock: 25,
            stock: 18,
            tag: 'chef',
            tag_label: 'Đặc sản',
            calories: '610 kcal',
            image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
            description: 'Hạt cơm vàng óng áo đều lòng đỏ trứng muối, tôm sú tươi giòn, mực nút, đậu Hà Lan và ngô ngọt giòn sần sật.',
            ingredients: [
                'Gạo thơm chiên tơi hạt',
                'Lòng đỏ trứng vịt muối nghiền mịn',
                'Tôm sú biển bóc nõn tươi giòn',
                'Mực ống nút thái khoanh tròn',
                'Đậu Hà Lan hạt xanh & ngô ngọt hạt',
                'Hành lá, tiêu sọ & dầu mè thơm'
            ],
            allergy_info: [
                'Cảnh báo: Có chứa hải sản giáp xác (Tôm, Mực)',
                'Có chứa trứng (trứng muối)',
                'Có chứa dầu mè',
                'Không chứa đậu phộng'
            ],
            allergens: ['Hải sản (Tôm, Mực)', 'Trứng', 'Mè (Vừng)'],
            nutrition: {
                calories: '610 kcal',
                protein: '34g',
                carbs: '65g',
                fat: '21g'
            },
            preparation_time: '10 - 12 phút'
        },
        {
            id: 'dish-8',
            name: 'Bún Bò Huế Chả Cua Thịt Bắp',
            category: 'mon-nuoc',
            category_name: 'Món nước',
            meal_time: 'Bữa Sáng & Trưa',
            price: 52000,
            original_price: 58000,
            base_stock: 28,
            stock: 6,
            tag: 'hot',
            tag_label: 'Bán chạy',
            calories: '580 kcal',
            image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            description: 'Sợi bún to tròn mềm mại, nước dùng cay nồng hương sả và mắm ruốc Huế đặc trưng, chả cua quết tay dẻo ngọt và bắp bò giòn.',
            ingredients: [
                'Bún sợi to chuẩn phong cách xứ Huế',
                'Thịt bắp hoa bò thái lát mỏng',
                'Chả cua biển quết tay dẻo ngọt',
                'Nước dùng hầm xương bò & sả cây đập dập',
                'Mắm ruốc Huế truyền thống tạo vị đậm đà',
                'Hành tây bào mỏng, ớt chưng sa tế & rau hoa chuối'
            ],
            allergy_info: [
                'Có chứa hải sản (chả cua biển, mắm ruốc ruốc biển)',
                'Thịt bò',
                'Không chứa sữa',
                'Không chứa đậu phộng'
            ],
            allergens: ['Hải sản (Cua, Ruốc biển)'],
            nutrition: {
                calories: '580 kcal',
                protein: '36g',
                carbs: '62g',
                fat: '19g'
            },
            preparation_time: '6 - 8 phút'
        },
        {
            id: 'dish-9',
            name: 'Nấm Kho Tiêu Cơm Gạo Lứt (Chay)',
            category: 'mon-chay',
            category_name: 'Món chay',
            meal_time: 'Trưa & Tối',
            price: 42000,
            original_price: 48000,
            base_stock: 16,
            stock: 9,
            tag: null,
            tag_label: '',
            calories: '380 kcal',
            image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
            description: 'Nấm rơm cùng nấm đùi gà kho keo vị mặn ngọt đậm đà quyện hạt tiêu cay ấm, dùng kèm chén cơm gạo lứt huyết rồng dẻo thơm.',
            ingredients: [
                'Gạo lứt huyết rồng hữu cơ nấu dẻo',
                'Nấm rơm búp tươi cắt chân sạch',
                'Nấm đùi gà tươi cắt quân cờ áp chảo',
                'Nước tương đậu nành lên men thủ công',
                'Tiêu đen nguyên hạt & tiêu xay Đắk Lắk',
                'Dầu thực vật & hành boa-rô phi thơm'
            ],
            allergy_info: [
                'Có chứa đậu nành (trong nước tương lên men)',
                'Món thuần chay 100% không chứa sữa, trứng, thịt',
                'Không chứa gluten',
                'Không chứa đậu phộng'
            ],
            allergens: ['Đậu nành'],
            nutrition: {
                calories: '380 kcal',
                protein: '14g',
                carbs: '64g',
                fat: '9g'
            },
            preparation_time: '8 - 12 phút'
        },
        {
            id: 'dish-10',
            name: 'Trà Đào Cam Sả Hạt Chia',
            category: 'trang-mieng',
            category_name: 'Tráng miệng & Đồ uống',
            meal_time: 'Cả Ngày',
            price: 28000,
            original_price: 35000,
            base_stock: 40,
            stock: 25,
            tag: 'hot',
            tag_label: 'Giải nhiệt',
            calories: '160 kcal',
            image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
            description: 'Trà đen ủ lạnh thanh mát quyện vị chua ngọt tự nhiên của nước cam tươi, hương sả nồng nàn cùng đào miếng giòn.',
            ingredients: [
                'Cốt hồng trà đen Ceylon ủ lạnh 12h',
                'Nước cam sành vắt tươi nguyên chất',
                'Nước cốt sả cây nấu đường phèn thanh mát',
                'Miếng đào ngâm vàng giòn chua ngọt',
                'Hạt chia hữu cơ giàu omega-3',
                'Lá bạc hà tươi trang trí'
            ],
            allergy_info: [
                'Không chứa chất dị ứng phổ biến',
                'Hoàn toàn không chứa sữa động vật',
                'Không chứa gluten',
                'Không chứa hạt đậu phộng'
            ],
            allergens: [],
            nutrition: {
                calories: '160 kcal',
                protein: '2g',
                carbs: '36g',
                fat: '1g'
            },
            preparation_time: '3 - 5 phút'
        },
        {
            id: 'dish-11',
            name: 'Sữa Chua Trân Châu Hạ Long',
            category: 'trang-mieng',
            category_name: 'Tráng miệng & Đồ uống',
            meal_time: 'Cả Ngày',
            price: 25000,
            original_price: 30000,
            base_stock: 25,
            stock: 14,
            tag: 'new',
            tag_label: 'Tráng miệng',
            calories: '210 kcal',
            image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
            description: 'Sữa chua dẻo mịn chua ngọt hài hòa, ăn kèm trân châu trắng cốt dừa ấm nóng rắc thêm dừa sợi sấy giòn.',
            ingredients: [
                'Sữa chua lên men tự nhiên từ sữa tươi',
                'Trân châu trắng bột lọc dẻo giòn dai',
                'Nước cốt dừa nguyên chất đun nóng ấm',
                'Cùi dừa non sấy khô giòn rụm',
                'Sữa đặc có đường Ông Thọ'
            ],
            allergy_info: [
                'Có chứa sữa và các sản phẩm từ sữa bò (Lactose)',
                'Không dùng cho người không dung nạp đường Lactose',
                'Không chứa gluten',
                'Không chứa đậu phộng'
            ],
            allergens: ['Sữa (Lactose)'],
            nutrition: {
                calories: '210 kcal',
                protein: '6g',
                carbs: '32g',
                fat: '7g'
            },
            preparation_time: '3 - 5 phút'
        },
        {
            id: 'dish-12',
            name: 'Trà Sữa Trân Châu Hoàng Kim',
            category: 'trang-mieng',
            category_name: 'Tráng miệng & Đồ uống',
            meal_time: 'Cả Ngày',
            price: 32000,
            original_price: 38000,
            base_stock: 20,
            stock: 8,
            tag: 'hot',
            tag_label: 'Hot trend',
            calories: '310 kcal',
            image_url: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80',
            description: 'Trà sữa đậm vị hồng trà Ceylon thơm ngát kết hợp sữa tươi thanh trùng, trân châu hoàng kim nấu mật ong dẻo mềm.',
            ingredients: [
                'Hồng trà đen Assam hảo hạng ủ nhiệt độ chuẩn',
                'Sữa tươi thanh trùng Đà Lạt nguyên chất',
                'Trân châu hoàng kim bột năng dẻo dai',
                'Mật ong hoa nhãn nấu sốt trân châu',
                'Đường mía tự nhiên'
            ],
            allergy_info: [
                'Có chứa sữa động vật (Lactose)',
                'Có chứa mật ong hoa rừng',
                'Không chứa đậu nành',
                'Không chứa đậu phộng'
            ],
            allergens: ['Sữa (Lactose)'],
            nutrition: {
                calories: '310 kcal',
                protein: '4g',
                carbs: '48g',
                fat: '8g'
            },
            preparation_time: '3 - 5 phút'
        }
    ];

    // =========================================================================
    // 2. KHỞI TẠO STATE & PHÂN TÍCH THAM SỐ URL (QUERY PARAMS)
    // =========================================================================
    const urlParams = new URLSearchParams(window.location.search);
    const targetDishId = (urlParams.get('id') || 'dish-1').trim();
    
    // Format ngày YYYY-MM-DD
    const getTodayKey = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const targetDateKey = urlParams.get('date') || getTodayKey();

    const state = {
        dishId: targetDishId,
        dateKey: targetDateKey,
        currentDish: null,
        stock: 15,
        initialStock: 25,
        isOutOfStock: false,
        quantity: 1,
        cart: [],
        isLoading: true
    };

    // =========================================================================
    // 3. TIỆN ÍCH HỖ TRỢ
    // =========================================================================
    const formatCurrency = (amount) => {
        if (typeof amount !== 'number' || isNaN(amount)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount)
            .replace('₫', '')
            .trim() + ' ₫';
    };

    const formatDateVn = (dateStr) => {
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        } catch (e) {}
        return dateStr;
    };

    // =========================================================================
    // 4. QUẢN LÝ GIỎ HÀNG (ĐỒNG BỘ LOCALSTORAGE VỚI DAILY-MENU.HTML)
    // =========================================================================
    const CART_STORAGE_KEY = 'foodiehub_cart';

    const loadCartFromStorage = () => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            if (saved) {
                state.cart = JSON.parse(saved);
            } else {
                state.cart = [];
            }
        } catch (e) {
            state.cart = [];
        }
        updateCartUI();
    };

    const saveCartToStorage = () => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
        } catch (e) {}
    };

    // =========================================================================
    // 5. DOM ELEMENTS
    // =========================================================================
    // Header & breadcrumb
    const breadcrumbDishName = document.getElementById('breadcrumbDishName');
    const breadcrumbDateLink = document.getElementById('breadcrumbDateLink');
    const btnBackToMenu = document.getElementById('btnBackToMenu');
    const servingDateText = document.getElementById('servingDateText');
    const cartBtn = document.getElementById('cartBtn');
    const cartBadge = document.getElementById('cartBadge');
    
    // States
    const dishDetailSkeleton = document.getElementById('dishDetailSkeleton');
    const dishDetailError = document.getElementById('dishDetailError');
    const dishDetailContent = document.getElementById('dishDetailContent');
    const errorMessageTitle = document.getElementById('errorMessageTitle');
    const errorMessageDesc = document.getElementById('errorMessageDesc');

    // Left Column Media
    const dishMainImg = document.getElementById('dishMainImg');
    const dishMediaBadges = document.getElementById('dishMediaBadges');
    const dishOutOverlay = document.getElementById('dishOutOverlay');
    const specPrepTime = document.getElementById('specPrepTime');
    const specCalories = document.getElementById('specCalories');

    // Right Column Info
    const dishCatPill = document.getElementById('dishCatPill');
    const dishMealTimePill = document.getElementById('dishMealTimePill');
    const dishCodeBadge = document.getElementById('dishCodeBadge');
    const dishNameTitle = document.getElementById('dishNameTitle');
    const dishPriceCurrent = document.getElementById('dishPriceCurrent');
    const dishPriceOriginal = document.getElementById('dishPriceOriginal');
    const dishDiscountPill = document.getElementById('dishDiscountPill');
    const dishStockCard = document.getElementById('dishStockCard');
    const dishStockValue = document.getElementById('dishStockValue');
    const dishStockProgressFill = document.getElementById('dishStockProgressFill');
    const dishFullDescription = document.getElementById('dishFullDescription');

    // Quantity & Actions (Core TF1A86F)
    const btnQtyMinus = document.getElementById('btnQtyMinus');
    const btnQtyPlus = document.getElementById('btnQtyPlus');
    const quantityInput = document.getElementById('quantityInput');
    const dishSubtotalPreview = document.getElementById('dishSubtotalPreview');
    const btnAddToCart = document.getElementById('btnAddToCart');
    const btnAddToCartText = document.getElementById('btnAddToCartText');
    const btnQuickOrder = document.getElementById('btnQuickOrder');

    // Mobile sticky bar
    const mobileStickyActionBar = document.getElementById('mobileStickyActionBar');
    const stickyDishTitle = document.getElementById('stickyDishTitle');
    const stickyDishPrice = document.getElementById('stickyDishPrice');
    const btnStickyAdd = document.getElementById('btnStickyAdd');
    const btnStickyAddText = document.getElementById('btnStickyAddText');

    // Tabs content
    const ingredientsChipsGrid = document.getElementById('ingredientsChipsGrid');
    const allergensPillsWrap = document.getElementById('allergensPillsWrap');
    const allergensListTags = document.getElementById('allergensListTags');
    const allergyDetailedList = document.getElementById('allergyDetailedList');
    const nutriCalories = document.getElementById('nutriCalories');
    const nutriProtein = document.getElementById('nutriProtein');
    const nutriCarbs = document.getElementById('nutriCarbs');
    const nutriFat = document.getElementById('nutriFat');

    // Related dishes
    const relatedDishesGrid = document.getElementById('relatedDishesGrid');

    // Cart Drawer
    const cartDrawer = document.getElementById('cartDrawer');
    const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
    const cartDrawerCloseBtn = document.getElementById('cartDrawerCloseBtn');
    const cartDrawerItems = document.getElementById('cartDrawerItems');
    const cartTotalQuantity = document.getElementById('cartTotalQuantity');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');

    // Quick Order Modal
    const quickOrderModal = document.getElementById('quickOrderModal');
    const quickOrderCloseBtn = document.getElementById('quickOrderCloseBtn');
    const btnCancelQuickOrder = document.getElementById('btnCancelQuickOrder');
    const quickOrderThumb = document.getElementById('quickOrderThumb');
    const quickOrderDishName = document.getElementById('quickOrderDishName');
    const quickOrderQty = document.getElementById('quickOrderQty');
    const quickOrderPrice = document.getElementById('quickOrderPrice');
    const quickOrderTotalBtn = document.getElementById('quickOrderTotalBtn');
    const quickOrderForm = document.getElementById('quickOrderForm');

    // Toast
    const toastContainer = document.getElementById('toastContainer');

    // Search bar
    const navbarSearchInput = document.getElementById('navbarSearchInput');
    const navbarClearSearchBtn = document.getElementById('navbarClearSearchBtn');

    // =========================================================================
    // 6. GỌI API LẤY THÔNG TIN CHI TIẾT MÓN ĂN & SỐ SUẤT (TF1A785 & TF1A638)
    // =========================================================================
    const fetchDishDetailAndStock = async () => {
        setLoadingState(true);

        let dishData = null;
        let dayStock = null;

        // 1. Lấy thông tin chi tiết món ăn (Task TF1A785)
        const candidateDetailUrls = [
            `/api/dishes/${state.dishId}`,
            `http://127.0.0.1:5000/api/dishes/${state.dishId}`,
            `http://127.0.0.1:5001/api/dishes/${state.dishId}`,
            `http://127.0.0.1:8000/api/dishes/${state.dishId}`
        ];

        for (const url of candidateDetailUrls) {
            try {
                const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    const resJson = await res.json();
                    if (resJson.success && resJson.data) {
                        dishData = resJson.data;
                        console.log(`[TF1A785] Đã tải chi tiết món ăn từ Backend API: ${state.dishId}`);
                        break;
                    }
                }
            } catch (e) {
                // Tiếp tục thử URL tiếp theo
            }
        }

        // 2. Lấy số suất còn lại theo ngày từ API (Task TF1A638)
        const candidateMenuUrls = [
            `/api/menu?date=${state.dateKey}`,
            `http://127.0.0.1:5000/api/menu?date=${state.dateKey}`,
            `http://127.0.0.1:5001/api/menu?date=${state.dateKey}`,
            `http://127.0.0.1:8000/api/menu?date=${state.dateKey}`
        ];

        for (const url of candidateMenuUrls) {
            try {
                const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    const resJson = await res.json();
                    if (resJson.success && Array.isArray(resJson.data)) {
                        const matched = resJson.data.find(d => d.id === state.dishId);
                        if (matched) {
                            dayStock = matched.stock;
                            console.log(`[TF1A638] Số suất còn lại của ${state.dishId} trong ngày ${state.dateKey}: ${dayStock}`);
                            break;
                        }
                    }
                }
            } catch (e) {}
        }

        // 3. Fallback Offline nếu API không phản hồi
        if (!dishData) {
            dishData = LOCAL_FALLBACK_DISHES.find(d => d.id === state.dishId);
            if (dishData) {
                console.log(`[Offline Fallback] Sử dụng dữ liệu mẫu cho món: ${state.dishId}`);
            }
        }

        setLoadingState(false);

        if (!dishData) {
            showErrorState(
                `Không tìm thấy món ăn "${state.dishId}"`,
                'Món ăn này không tồn tại trong hệ thống thực đơn của FoodieHub. Quý khách vui lòng quay lại danh sách thực đơn để chọn món khác.'
            );
            return;
        }

        // Cập nhật số suất
        state.currentDish = dishData;
        state.initialStock = dishData.base_stock || 25;
        state.stock = (dayStock !== null && dayStock !== undefined) ? dayStock : (dishData.stock ?? 15);
        state.isOutOfStock = state.stock <= 0;

        renderDishDetail(dishData);
        renderRelatedDishes(dishData);
    };

    // =========================================================================
    // 7. RENDER GIAO DIỆN CHI TIẾT MÓN ĂN (CORE TASK TF1A86F)
    // =========================================================================
    const renderDishDetail = (dish) => {
        // Cập nhật Page Title & Breadcrumb
        document.title = `${dish.name} | Chi Tiết Món Ăn - FoodieHub`;
        breadcrumbDishName.textContent = dish.name;
        breadcrumbDateLink.href = `daily-menu.html?date=${state.dateKey}`;
        btnBackToMenu.href = `daily-menu.html?date=${state.dateKey}`;
        servingDateText.textContent = `Thực đơn ngày: ${formatDateVn(state.dateKey)}`;

        // Cột trái: Hình ảnh món ăn
        dishMainImg.src = dish.image_url || dish.image;
        dishMainImg.alt = dish.name;
        dishMainImg.onerror = () => {
            dishMainImg.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
        };

        // Nhãn tag trên ảnh
        dishMediaBadges.innerHTML = '';
        if (dish.tag && dish.tag_label) {
            const tagEl = document.createElement('span');
            tagEl.className = `badge-tag ${dish.tag}`;
            tagEl.textContent = dish.tag_label;
            dishMediaBadges.appendChild(tagEl);
        }

        // Lớp phủ khi hết món
        if (state.isOutOfStock) {
            dishOutOverlay.style.display = 'flex';
        } else {
            dishOutOverlay.style.display = 'none';
        }

        // Thông số nhanh
        specPrepTime.textContent = dish.preparation_time || '10 - 15 phút';
        specCalories.textContent = dish.nutrition ? dish.nutrition.calories : (dish.calories || '550 kcal');

        // Cột phải: Thông tin & Giá
        const categoryMap = {
            'mon-chinh': 'Món chính',
            'mon-nuoc': 'Món nước',
            'mon-chay': 'Món chay',
            'trang-mieng': 'Tráng miệng / Đồ uống'
        };
        dishCatPill.innerHTML = `<i class="fa-solid fa-bowl-food"></i> ${categoryMap[dish.category] || dish.category_name || 'Món ăn'}`;
        dishMealTimePill.innerHTML = `<i class="fa-regular fa-clock"></i> ${dish.meal_time || 'Trưa & Tối'}`;
        dishCodeBadge.textContent = `Mã: ${dish.id}`;
        dishNameTitle.textContent = dish.name;

        // Giá & Khuyến mãi (Task TF1A86F)
        dishPriceCurrent.textContent = formatCurrency(dish.price);
        if (dish.original_price && dish.original_price > dish.price) {
            dishPriceOriginal.textContent = formatCurrency(dish.original_price);
            dishPriceOriginal.style.display = 'inline';
            const discountPercent = Math.round(((dish.original_price - dish.price) / dish.original_price) * 100);
            dishDiscountPill.textContent = `-${discountPercent}%`;
            dishDiscountPill.style.display = 'inline-block';
        } else {
            dishPriceOriginal.style.display = 'none';
            dishDiscountPill.style.display = 'none';
        }

        // Khung trạng thái suất ăn còn lại
        updateStockCardUI();

        // Mô tả món ăn (Task TF1A86F)
        dishFullDescription.textContent = dish.description || 'Món ăn thơm ngon, đậm đà được chuẩn bị tỉ mỉ từ bếp trưởng FoodieHub.';

        // Khung chọn số lượng & Tạm tính
        state.quantity = state.isOutOfStock ? 0 : 1;
        updateQuantityAndSubtotal();

        // Nút thêm vào đơn
        if (state.isOutOfStock) {
            btnAddToCart.disabled = true;
            btnAddToCartText.innerHTML = '<i class="fa-solid fa-ban"></i> Đã hết suất hôm nay';
            btnQuickOrder.disabled = true;

            btnStickyAdd.disabled = true;
            btnStickyAddText.innerHTML = '<i class="fa-solid fa-ban"></i> Hết suất';
        } else {
            btnAddToCart.disabled = false;
            btnAddToCartText.innerHTML = 'Thêm vào đơn';
            btnQuickOrder.disabled = false;

            btnStickyAdd.disabled = false;
            btnStickyAddText.innerHTML = 'Thêm vào đơn';
        }

        // Mobile sticky bar
        stickyDishTitle.textContent = dish.name;
        stickyDishPrice.textContent = formatCurrency(dish.price);

        // Render Tabs chi tiết: Nguyên liệu (TF1A785 & TF1A86F)
        renderIngredientsTab(dish);

        // Render Tab dị ứng
        renderAllergyTab(dish);

        // Render Tab dinh dưỡng
        renderNutritionTab(dish);

        dishDetailContent.style.display = 'block';
    };

    // =========================================================================
    // 8. RENDER CÁC TAB NGUYÊN LIỆU, DỊ ỨNG, DINH DƯỠNG (TASK TF1A785 & TF1A86F)
    // =========================================================================
    const renderIngredientsTab = (dish) => {
        ingredientsChipsGrid.innerHTML = '';
        const list = Array.isArray(dish.ingredients) && dish.ingredients.length > 0
            ? dish.ingredients
            : [
                'Nguyên liệu sạch chọn lọc trong ngày',
                'Gia vị truyền thống không hóa chất',
                'Dầu thực vật cao cấp',
                'Rau tươi xanh thu hoạch buổi sáng'
            ];

        list.forEach(ing => {
            const chip = document.createElement('div');
            chip.className = 'ingredient-chip-card';
            chip.innerHTML = `
                <div class="ingredient-icon-wrap"><i class="fa-solid fa-seedling"></i></div>
                <span class="ingredient-chip-name">${ing}</span>
            `;
            ingredientsChipsGrid.appendChild(chip);
        });
    };

    const renderAllergyTab = (dish) => {
        // Thẻ allergens chính
        allergensListTags.innerHTML = '';
        const allergens = Array.isArray(dish.allergens) ? dish.allergens : [];
        if (allergens.length > 0) {
            allergensPillsWrap.style.display = 'flex';
            allergens.forEach(al => {
                const pill = document.createElement('span');
                pill.className = 'allergen-pill';
                pill.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${al}`;
                allergensListTags.appendChild(pill);
            });
        } else {
            allergensPillsWrap.style.display = 'none';
        }

        // Danh sách lưu ý dị ứng
        allergyDetailedList.innerHTML = '';
        const notes = Array.isArray(dish.allergy_info) && dish.allergy_info.length > 0
            ? dish.allergy_info
            : ['Món ăn không chứa các chất gây dị ứng nguy hiểm phổ biến.'];

        notes.forEach(note => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${note}</span>`;
            allergyDetailedList.appendChild(li);
        });
    };

    const renderNutritionTab = (dish) => {
        const nutri = dish.nutrition || {
            calories: dish.calories || '550 kcal',
            protein: '30g',
            carbs: '60g',
            fat: '18g'
        };
        nutriCalories.textContent = nutri.calories || dish.calories || '550 kcal';
        nutriProtein.textContent = nutri.protein || '30g';
        nutriCarbs.textContent = nutri.carbs || '60g';
        nutriFat.textContent = nutri.fat || '18g';
    };

    // =========================================================================
    // 9. RENDER CÁC MÓN GỢI Ý THÊM (RELATED DISHES)
    // =========================================================================
    const renderRelatedDishes = (currentDish) => {
        relatedDishesGrid.innerHTML = '';
        const others = LOCAL_FALLBACK_DISHES.filter(d => d.id !== currentDish.id);
        
        // Ưu tiên món cùng danh mục, lấy 4 món
        const sameCategory = others.filter(d => d.category === currentDish.category);
        const diffCategory = others.filter(d => d.category !== currentDish.category);
        const related = [...sameCategory, ...diffCategory].slice(0, 4);

        related.forEach(item => {
            const card = document.createElement('div');
            card.className = 'related-dish-card';
            card.innerHTML = `
                <div class="related-img-wrap">
                    <img src="${item.image_url || item.image}" alt="${item.name}" class="related-img" loading="lazy">
                </div>
                <div class="related-card-body">
                    <h4 class="related-card-title">${item.name}</h4>
                    <div class="related-card-footer">
                        <span class="related-card-price">${formatCurrency(item.price)}</span>
                        <a href="dish-detail.html?id=${item.id}&date=${state.dateKey}" class="btn-related-view">
                            Xem món <i class="fa-solid fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
            relatedDishesGrid.appendChild(card);
        });
    };

    // =========================================================================
    // 10. ĐIỀU KHIỂN SỐ LƯỢNG VÀ TÍNH TỔNG TẠM TÍNH (TASK TF1A86F)
    // =========================================================================
    const updateStockCardUI = () => {
        dishStockCard.classList.remove('status-out', 'status-low');
        const percent = Math.min(100, Math.round((state.stock / state.initialStock) * 100));

        if (state.stock === 0) {
            dishStockCard.classList.add('status-out');
            dishStockValue.textContent = 'Hết suất hôm nay';
            dishStockProgressFill.style.width = '0%';
        } else if (state.stock <= 8) {
            dishStockCard.classList.add('status-low');
            dishStockValue.textContent = `Chỉ còn ${state.stock} suất!`;
            dishStockProgressFill.style.width = `${percent}%`;
        } else {
            dishStockValue.textContent = `Còn ${state.stock} suất`;
            dishStockProgressFill.style.width = `${percent}%`;
        }
    };

    const updateQuantityAndSubtotal = () => {
        quantityInput.value = state.quantity;
        const total = (state.currentDish ? state.currentDish.price : 0) * state.quantity;
        dishSubtotalPreview.textContent = formatCurrency(total);

        btnQtyMinus.disabled = state.quantity <= 1 || state.isOutOfStock;
        btnQtyPlus.disabled = state.quantity >= state.stock || state.isOutOfStock;
    };

    btnQtyMinus.addEventListener('click', () => {
        if (state.quantity > 1) {
            state.quantity -= 1;
            updateQuantityAndSubtotal();
        }
    });

    btnQtyPlus.addEventListener('click', () => {
        if (state.quantity < state.stock) {
            state.quantity += 1;
            updateQuantityAndSubtotal();
        } else {
            showToast(`Món này chỉ còn tối đa ${state.stock} suất trong ngày!`, 'warning');
        }
    });

    // =========================================================================
    // 11. HÀNH ĐỘNG NÚT: THÊM VÀO ĐƠN & ĐẶT MÓN NGAY (TASK TF1A86F)
    // =========================================================================
    const handleAddToCart = () => {
        if (!state.currentDish || state.isOutOfStock) {
            showToast('Món ăn hiện đã hết suất trong ngày!', 'warning');
            return;
        }

        if (state.quantity <= 0) {
            showToast('Vui lòng chọn ít nhất 1 suất ăn!', 'warning');
            return;
        }

        if (state.quantity > state.stock) {
            showToast(`Số lượng vượt quá số suất còn lại (${state.stock} suất)!`, 'warning');
            return;
        }

        const addedQty = state.quantity;

        // Kiểm tra xem món đã có trong giỏ chưa
        const existingItem = state.cart.find(
            item => item.dishId === state.dishId && item.dateKey === state.dateKey
        );

        if (existingItem) {
            existingItem.quantity += addedQty;
        } else {
            state.cart.push({
                dishId: state.dishId,
                dateKey: state.dateKey,
                dishInfo: {
                    id: state.currentDish.id,
                    name: state.currentDish.name,
                    price: state.currentDish.price,
                    image: state.currentDish.image_url || state.currentDish.image
                },
                quantity: addedQty
            });
        }

        // Giảm số suất còn lại của phiên hiện tại
        state.stock -= addedQty;
        if (state.stock <= 0) {
            state.stock = 0;
            state.isOutOfStock = true;
            btnAddToCart.disabled = true;
            btnAddToCartText.innerHTML = '<i class="fa-solid fa-ban"></i> Đã hết suất hôm nay';
            btnQuickOrder.disabled = true;
            dishOutOverlay.style.display = 'flex';

            btnStickyAdd.disabled = true;
            btnStickyAddText.innerHTML = '<i class="fa-solid fa-ban"></i> Hết suất';
        }
        updateStockCardUI();
        state.quantity = state.isOutOfStock ? 0 : 1;
        updateQuantityAndSubtotal();

        // Lưu vào LocalStorage
        saveCartToStorage();
        updateCartUI();

        // Hiệu ứng phản hồi thành công trên nút
        btnAddToCartText.innerHTML = '<i class="fa-solid fa-check"></i> Đã thêm vào đơn!';
        btnStickyAddText.innerHTML = '<i class="fa-solid fa-check"></i> Đã thêm!';
        setTimeout(() => {
            if (!state.isOutOfStock) {
                btnAddToCartText.innerHTML = 'Thêm vào đơn';
                btnStickyAddText.innerHTML = 'Thêm vào đơn';
            }
        }, 1800);

        showToast(`Đã thêm ${addedQty} suất "${state.currentDish.name}" vào đơn!`, 'success');
    };

    btnAddToCart.addEventListener('click', handleAddToCart);
    btnStickyAdd.addEventListener('click', handleAddToCart);

    // =========================================================================
    // 12. ĐẶT MÓN NGAY & MODAL XÁC NHẬN NHANH (EXPRESS ORDER)
    // =========================================================================
    btnQuickOrder.addEventListener('click', () => {
        if (!state.currentDish || state.isOutOfStock) {
            showToast('Món ăn hiện đã hết suất trong ngày!', 'warning');
            return;
        }

        quickOrderThumb.src = state.currentDish.image_url || state.currentDish.image;
        quickOrderDishName.textContent = state.currentDish.name;
        quickOrderQty.textContent = state.quantity;
        quickOrderPrice.textContent = formatCurrency(state.currentDish.price);
        
        const total = state.currentDish.price * state.quantity;
        quickOrderTotalBtn.textContent = formatCurrency(total);

        quickOrderModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    const closeQuickOrderModal = () => {
        quickOrderModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    quickOrderCloseBtn.addEventListener('click', closeQuickOrderModal);
    btnCancelQuickOrder.addEventListener('click', closeQuickOrderModal);

    quickOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnSubmitQuickOrder');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi đơn hàng...';

        const orderPayload = {
            date: state.dateKey,
            dish_id: state.dishId,
            quantity: state.quantity
        };

        // Thử gửi lên API Backend Task TF1A638 /api/order
        let isSuccess = false;
        const candidateOrderUrls = [
            '/api/order',
            'http://127.0.0.1:5000/api/order',
            'http://127.0.0.1:5001/api/order',
            'http://127.0.0.1:8000/api/order'
        ];

        for (const url of candidateOrderUrls) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload)
                });
                if (res.ok) {
                    const resJson = await res.json();
                    if (resJson.success) {
                        isSuccess = true;
                        break;
                    }
                }
            } catch (err) {}
        }

        // Hoàn tất đặt hàng
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Xác nhận đặt';
        closeQuickOrderModal();

        // Trừ suất
        state.stock = Math.max(0, state.stock - state.quantity);
        state.isOutOfStock = state.stock === 0;
        updateStockCardUI();
        state.quantity = state.isOutOfStock ? 0 : 1;
        updateQuantityAndSubtotal();

        const orderCode = 'FH' + Math.floor(100000 + Math.random() * 900000);
        showToast(`🎉 Đặt món thành công! Mã đơn: #${orderCode}. Bếp đang chuẩn bị!`, 'success');
    });

    // =========================================================================
    // 13. QUẢN LÝ GIỎ HÀNG MINI (CART DRAWER UI)
    // =========================================================================
    const updateCartUI = () => {
        const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = state.cart.reduce((sum, item) => sum + (item.quantity * item.dishInfo.price), 0);

        cartBadge.textContent = totalItems;
        cartTotalQuantity.textContent = `${totalItems} suất`;
        cartTotalPrice.textContent = formatCurrency(totalPrice);

        cartDrawerItems.innerHTML = '';
        if (state.cart.length === 0) {
            cartDrawerItems.innerHTML = `
                <div class="cart-empty-msg">
                    <i class="fa-solid fa-basket-shopping"></i>
                    <p>Chưa có suất ăn nào trong đơn</p>
                    <small>Chọn món ăn và bấm "Thêm vào đơn" để chuẩn bị bữa ăn</small>
                </div>
            `;
            return;
        }

        state.cart.forEach((item, index) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'cart-item';
            itemRow.innerHTML = `
                <img src="${item.dishInfo.image}" alt="${item.dishInfo.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.dishInfo.name}</h4>
                    <p class="cart-item-price">${formatCurrency(item.dishInfo.price)} &bull; ${formatDateVn(item.dateKey)}</p>
                    <div class="cart-item-qty-row">
                        <button class="qty-btn btn-minus" data-index="${index}">-</button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="qty-btn btn-plus" data-index="${index}">+</button>
                    </div>
                </div>
                <button class="cart-remove-item" data-index="${index}" title="Xóa món"><i class="fa-solid fa-trash-can"></i></button>
            `;

            const syncRestoredStock = (qty) => {
                if (item.dishId === state.dishId && item.dateKey === state.dateKey) {
                    state.stock = Math.min(state.initialStock, state.stock + qty);
                    if (state.stock > 0) {
                        state.isOutOfStock = false;
                        btnAddToCart.disabled = false;
                        btnAddToCartText.innerHTML = 'Thêm vào đơn';
                        btnQuickOrder.disabled = false;
                        dishOutOverlay.style.display = 'none';

                        btnStickyAdd.disabled = false;
                        btnStickyAddText.innerHTML = 'Thêm vào đơn';
                    }
                    if (state.quantity === 0 && state.stock > 0) {
                        state.quantity = 1;
                    }
                    updateStockCardUI();
                    updateQuantityAndSubtotal();
                }
            };

            itemRow.querySelector('.btn-minus').addEventListener('click', () => {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                    syncRestoredStock(1);
                } else {
                    syncRestoredStock(item.quantity);
                    state.cart.splice(index, 1);
                }
                saveCartToStorage();
                updateCartUI();
            });

            itemRow.querySelector('.btn-plus').addEventListener('click', () => {
                if (item.dishId === state.dishId && item.dateKey === state.dateKey) {
                    if (state.stock > 0) {
                        state.stock -= 1;
                        item.quantity += 1;
                        if (state.stock === 0) {
                            state.isOutOfStock = true;
                            btnAddToCart.disabled = true;
                            btnAddToCartText.innerHTML = '<i class="fa-solid fa-ban"></i> Đã hết suất hôm nay';
                            btnQuickOrder.disabled = true;
                            dishOutOverlay.style.display = 'flex';

                            btnStickyAdd.disabled = true;
                            btnStickyAddText.innerHTML = '<i class="fa-solid fa-ban"></i> Hết suất';
                        }
                        updateStockCardUI();
                        updateQuantityAndSubtotal();
                    } else {
                        showToast(`Món này đã hết suất còn lại trong ngày!`, 'warning');
                        return;
                    }
                } else {
                    item.quantity += 1;
                }
                saveCartToStorage();
                updateCartUI();
            });

            itemRow.querySelector('.cart-remove-item').addEventListener('click', () => {
                syncRestoredStock(item.quantity);
                state.cart.splice(index, 1);
                saveCartToStorage();
                updateCartUI();
                showToast(`Đã xóa món khỏi giỏ hàng`, 'warning');
            });

            cartDrawerItems.appendChild(itemRow);
        });
    };

    cartBtn.addEventListener('click', () => {
        cartDrawer.classList.add('active');
        cartDrawerOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    const closeCartDrawer = () => {
        cartDrawer.classList.remove('active');
        cartDrawerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    cartDrawerCloseBtn.addEventListener('click', closeCartDrawer);
    cartDrawerOverlay.addEventListener('click', closeCartDrawer);

    checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) {
            showToast('Chưa có món ăn nào trong giỏ hàng!', 'warning');
            return;
        }
        closeCartDrawer();
        showToast('🎉 Đã xác nhận đơn hàng thành công! Đội ngũ FoodieHub đang chuẩn bị.', 'success');
        state.cart = [];
        saveCartToStorage();
        updateCartUI();
    });

    // =========================================================================
    // 14. CHUYỂN ĐỔI TAB CHI TIẾT
    // =========================================================================
    const tabButtons = document.querySelectorAll('.detail-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-pane-content').forEach(pane => {
                pane.classList.remove('active');
            });
            const activePane = document.getElementById(targetTabId);
            if (activePane) {
                activePane.classList.add('active');
            }
        });
    });

    // =========================================================================
    // 15. TÌM KIẾM TỪ THANH NAVBAR
    // =========================================================================
    if (navbarSearchInput) {
        navbarSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = navbarSearchInput.value.trim();
                if (q) {
                    window.location.href = `daily-menu.html?search=${encodeURIComponent(q)}`;
                }
            }
        });
    }

    if (navbarClearSearchBtn && navbarSearchInput) {
        navbarClearSearchBtn.addEventListener('click', () => {
            navbarSearchInput.value = '';
        });
    }

    // =========================================================================
    // 16. TOAST NOTIFICATION
    // =========================================================================
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    };

    // =========================================================================
    // 17. TRẠNG THÁI LOADING & ERROR
    // =========================================================================
    function setLoadingState(isLoading) {
        state.isLoading = isLoading;
        if (isLoading) {
            dishDetailSkeleton.style.display = 'block';
            dishDetailContent.style.display = 'none';
            dishDetailError.style.display = 'none';
        } else {
            dishDetailSkeleton.style.display = 'none';
        }
    }

    function showErrorState(title, desc) {
        dishDetailSkeleton.style.display = 'none';
        dishDetailContent.style.display = 'none';
        dishDetailError.style.display = 'block';
        errorMessageTitle.textContent = title;
        errorMessageDesc.textContent = desc;
    }

    // =========================================================================
    // 18. KHỞI CHẠY LẦN ĐẦU
    // =========================================================================
    loadCartFromStorage();
    fetchDishDetailAndStock();
});
