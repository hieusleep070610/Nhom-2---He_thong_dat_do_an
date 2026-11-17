/**
 * FoodieHub - Hệ Thống Đặt Đồ Ăn - Nhóm 2
 * Quản lý & Hiển thị thực đơn theo ngày nối Backend API
 * Mã Task: TF1A6E9 ([FE] Trang xem thực đơn theo ngày nối API)
 * Mã Task BE: TF1A638 (API trả thực đơn kèm số suất còn lại)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[TF1A6E9] Khởi tạo Frontend Trang Xem Thực Đơn Theo Ngày Nối API');

    // =========================================================================
    // DỮ LIỆU DỰ PHÒNG KHI OFFLINE (LOCAL FALLBACK REPOSITORY)
    // =========================================================================
    const LOCAL_FALLBACK_REPOSITORY = [
        {
            id: 'dish-1',
            name: 'Cơm Tấm Sườn Bì Chả Đặc Biệt',
            category: 'mon-chinh',
            mealTime: 'Trưa & Tối',
            price: 52000,
            originalPrice: 60000,
            stock: 15,
            initialStock: 25,
            tag: 'hot',
            tagLabel: 'Bán chạy',
            calories: '650 kcal',
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
            description: 'Sườn cốt lết ướp mật ong nướng than hồng thơm lừng, bì dai giòn cùng chả trứng hấp béo ngậy kèm đồ chua và nước mắm kẹo đậm đà.'
        },
        {
            id: 'dish-2',
            name: 'Phở Bò Tái Lăn Hà Nội',
            category: 'mon-nuoc',
            mealTime: 'Bữa Trưa',
            price: 55000,
            originalPrice: 65000,
            stock: 3,
            initialStock: 20,
            tag: 'chef',
            tagLabel: 'Bếp trưởng đề xuất',
            calories: '520 kcal',
            image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
            description: 'Thịt bò bắp thái mỏng xào lăn tỏi gừng lửa lớn, nước dùng ninh từ xương ống hầm 14 tiếng thơm nức hương quế hồi thảo quả.'
        },
        {
            id: 'dish-3',
            name: 'Cơm Gà Xối Mỡ Da Giòn',
            category: 'mon-chinh',
            mealTime: 'Trưa & Tối',
            price: 48000,
            originalPrice: 55000,
            stock: 22,
            initialStock: 30,
            tag: 'hot',
            tagLabel: 'Yêu thích',
            calories: '680 kcal',
            image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
            description: 'Đùi gà góc phần tư xối mỡ lớp da vàng ruộm giòn tan, thịt bên trong mềm ngọt mọng nước ăn cùng cơm chiên cà chua thơm bùi.'
        },
        {
            id: 'dish-4',
            name: 'Bún Chả Nướng Than Hoa',
            category: 'mon-nuoc',
            mealTime: 'Bữa Trưa',
            price: 50000,
            originalPrice: 55000,
            stock: 2,
            initialStock: 18,
            tag: 'hot',
            tagLabel: 'Sắp hết',
            calories: '510 kcal',
            image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
            description: 'Chả viên và chả miếng nướng xém cạnh trên than hoa đượm khói, chấm nước mắm đu đủ cà rốt ấm nóng kèm đĩa bún tươi và rau ghém xanh mướt.'
        },
        {
            id: 'dish-5',
            name: 'Cơm Niêu Cá Bống Kho Tộ',
            category: 'mon-chinh',
            mealTime: 'Bữa Tối',
            price: 59000,
            originalPrice: 65000,
            stock: 0,
            initialStock: 15,
            tag: null,
            tagLabel: '',
            calories: '490 kcal',
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            description: 'Cá kho keo nước màu dừa, tiêu sọ cay nồng, tóp mỡ béo ngậy. Ăn cùng cơm cháy giòn rụm trong niêu đất truyền thống.'
        },
        {
            id: 'dish-6',
            name: 'Salad Đậu Hũ Nấm Sốt Mè Rang (Chay)',
            category: 'mon-chay',
            mealTime: 'Cả Ngày',
            price: 38000,
            originalPrice: 45000,
            stock: 12,
            initialStock: 20,
            tag: 'new',
            tagLabel: 'Thực dưỡng',
            calories: '320 kcal',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
            description: 'Đậu hũ non chiên giòn, nấm đùi gà áp chảo, xà lách romaine, cà chua bi organic rưới sốt mè rang béo thơm thanh mát.'
        },
        {
            id: 'dish-7',
            name: 'Cơm Chiên Hải Sản Hoàng Kim',
            category: 'mon-chinh',
            mealTime: 'Trưa & Tối',
            price: 55000,
            originalPrice: 62000,
            stock: 18,
            initialStock: 25,
            tag: 'chef',
            tagLabel: 'Đặc sản',
            calories: '610 kcal',
            image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
            description: 'Hạt cơm vàng óng áo đều lòng đỏ trứng muối, tôm sú tươi giòn, mực nút, đậu Hà Lan và ngô ngọt giòn sần sật.'
        },
        {
            id: 'dish-8',
            name: 'Bún Bò Huế Chả Cua Thịt Bắp',
            category: 'mon-nuoc',
            mealTime: 'Bữa Sáng & Trưa',
            price: 52000,
            originalPrice: 58000,
            stock: 6,
            initialStock: 28,
            tag: 'hot',
            tagLabel: 'Bán chạy',
            calories: '580 kcal',
            image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            description: 'Sợi bún to tròn mềm mại, nước dùng cay nồng hương sả và mắm ruốc Huế đặc trưng, chả cua quết tay dẻo ngọt và bắp bò giòn.'
        },
        {
            id: 'dish-9',
            name: 'Nấm Kho Tiêu Cơm Gạo Lứt (Chay)',
            category: 'mon-chay',
            mealTime: 'Trưa & Tối',
            price: 42000,
            originalPrice: 48000,
            stock: 9,
            initialStock: 16,
            tag: null,
            tagLabel: '',
            calories: '380 kcal',
            image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
            description: 'Nấm rơm cùng nấm đùi gà kho keo vị mặn ngọt đậm đà quyện hạt tiêu cay ấm, dùng kèm chén cơm gạo lứt huyết rồng dẻo thơm.'
        },
        {
            id: 'dish-10',
            name: 'Trà Đào Cam Sả Hạt Chia',
            category: 'trang-mieng',
            mealTime: 'Cả Ngày',
            price: 28000,
            originalPrice: 35000,
            stock: 35,
            initialStock: 40,
            tag: 'hot',
            tagLabel: 'Giải nhiệt',
            calories: '160 kcal',
            image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
            description: 'Trà đen ủ lạnh thanh mát quyện vị chua ngọt tự nhiên của nước cam tươi, hương sả nồng nàn cùng đào miếng giòn.'
        },
        {
            id: 'dish-11',
            name: 'Sữa Chua Trân Châu Hạ Long',
            category: 'trang-mieng',
            mealTime: 'Cả Ngày',
            price: 25000,
            originalPrice: 30000,
            stock: 14,
            initialStock: 25,
            tag: 'new',
            tagLabel: 'Tráng miệng',
            calories: '210 kcal',
            image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
            description: 'Sữa chua dẻo mịn chua ngọt hài hòa, ăn kèm trân châu trắng cốt dừa ấm nóng rắc thêm dừa sợi sấy giòn.'
        },
        {
            id: 'dish-12',
            name: 'Trà Sữa Trân Châu Hoàng Kim',
            category: 'trang-mieng',
            mealTime: 'Cả Ngày',
            price: 32000,
            originalPrice: 38000,
            stock: 1,
            initialStock: 20,
            tag: 'hot',
            tagLabel: 'Hot trend',
            calories: '310 kcal',
            image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80',
            description: 'Trà sữa đậm vị hồng trà Ceylon thơm ngát kết hợp sữa tươi thanh trùng, trân châu hoàng kim nấu mật ong dẻo mềm.'
        }
    ];

    // =========================================================================
    // STATE ỨNG DỤNG (TASK TF1A6E9)
    // =========================================================================
    const state = {
        selectedDate: new Date(),
        selectedCategory: 'all', // all, mon-chinh, mon-nuoc, mon-chay, trang-mieng, available-only, out-of-stock-only
        searchTerm: '',
        sortBy: 'default',
        cart: [],
        dailyMenuCache: {}, // { dateKey: { dishes: [...], meta: {...} } }
        isBackendConnected: false,
        isLoading: false,
        isDemoEmptyDate: false
    };

    // DOM Elements
    const dateTabsWrapper = document.getElementById('dateTabsWrapper');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const customDatePicker = document.getElementById('customDatePicker');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const servingTimeBadge = document.getElementById('servingTimeBadge');
    
    // Banner stats
    const statTotalBadge = document.getElementById('statTotalBadge');
    const statAvailBadge = document.getElementById('statAvailBadge');
    const statOutBadge = document.getElementById('statOutBadge');
    const btnQuickEmptyDemo = document.getElementById('btnQuickEmptyDemo');

    // Menu and States (TF1A6E9: Loading, Menu Grid, Empty Menu, Empty Search)
    const menuLoadingState = document.getElementById('menuLoadingState');
    const loadingTextTitle = document.getElementById('loadingTextTitle');
    const loadingTextSubtitle = document.getElementById('loadingTextSubtitle');
    const menuGrid = document.getElementById('menuGrid');
    
    const emptyMenuState = document.getElementById('emptyMenuState');
    const emptyMenuTitle = document.getElementById('emptyMenuTitle');
    const emptyMenuDesc = document.getElementById('emptyMenuDesc');
    const btnEmptyGoToday = document.getElementById('btnEmptyGoToday');
    const btnEmptyGoTomorrow = document.getElementById('btnEmptyGoTomorrow');

    const emptySearchState = document.getElementById('emptySearchState');
    const emptySearchDesc = document.getElementById('emptySearchDesc');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    // Search and Filters
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const categoryFilters = document.getElementById('categoryFilters');
    const sortSelect = document.getElementById('sortSelect');
    
    // Category Counts
    const countAll = document.getElementById('countAll');
    const countMain = document.getElementById('countMain');
    const countSoup = document.getElementById('countSoup');
    const countVeggie = document.getElementById('countVeggie');
    const countDrink = document.getElementById('countDrink');
    const countAvailableOnly = document.getElementById('countAvailableOnly');
    const countOutOnly = document.getElementById('countOutOnly');
    const statTotalDishes = document.getElementById('statTotalDishes');
    
    // Modal
    const foodModal = document.getElementById('foodModal');
    const modalBody = document.getElementById('modalBody');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    
    // Cart
    const cartBtn = document.getElementById('cartBtn');
    const cartBadge = document.getElementById('cartBadge');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
    const cartDrawerCloseBtn = document.getElementById('cartDrawerCloseBtn');
    const cartDrawerItems = document.getElementById('cartDrawerItems');
    const cartTotalQuantity = document.getElementById('cartTotalQuantity');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const toastContainer = document.getElementById('toastContainer');

    // Thêm badge trạng thái kết nối Backend API trên header
    const addBackendStatusBadge = () => {
        const logo = document.querySelector('.logo');
        if (logo && !document.getElementById('apiStatusBadge')) {
            const apiBadge = document.createElement('span');
            apiBadge.id = 'apiStatusBadge';
            apiBadge.style.cssText = 'font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px; background: #e0f2fe; color: #0284c7; margin-left: 6px; display: inline-flex; align-items: center; gap: 5px;';
            apiBadge.innerHTML = '<i class="fa-solid fa-cloud"></i> Đang kết nối API...';
            logo.appendChild(apiBadge);
        }
    };
    addBackendStatusBadge();

    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
    };

    const formatDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const formatDateVN = (date) => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    const getDayNameVietnamese = (date) => {
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        return days[date.getDay()];
    };

    const isSameDate = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    // =========================================================================
    // 1. NỐI TRANG THỰC ĐƠN VỚI BACKEND API (TASK TF1A6E9)
    // =========================================================================
    const fetchMenuFromAPI = async (dateKey, forceEmpty = false) => {
        const cacheKey = forceEmpty ? `${dateKey}-empty` : dateKey;

        // Nếu đã cache kết quả
        if (state.dailyMenuCache[cacheKey]) {
            console.log(`[TF1A6E9] Lấy dữ liệu thực đơn từ Cache: ${cacheKey}`);
            return state.dailyMenuCache[cacheKey];
        }

        // Danh sách endpoint ứng viên để gọi API
        const emptyQuery = forceEmpty ? '&empty=1' : '';
        const candidateUrls = [
            `/api/menu?date=${dateKey}${emptyQuery}`,
            `http://127.0.0.1:5000/api/menu?date=${dateKey}${emptyQuery}`,
            `http://127.0.0.1:5001/api/menu?date=${dateKey}${emptyQuery}`,
            `http://127.0.0.1:8000/api/menu?date=${dateKey}${emptyQuery}`,
            `http://127.0.0.1:8080/api/menu?date=${dateKey}${emptyQuery}`
        ];

        for (const url of candidateUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const resJson = await response.json();
                    if (resJson.success && Array.isArray(resJson.data)) {
                        state.isBackendConnected = true;
                        updateApiBadge(true);

                        console.log(`[TF1A6E9] Nối API thành công từ ${url}:`, {
                            date: resJson.date,
                            total: resJson.total_dishes,
                            available: resJson.available_dishes,
                            out_of_stock: resJson.out_of_stock_dishes
                        });

                        // Chuẩn hóa dữ liệu trả về từ API
                        const dishes = resJson.data.map(d => ({
                            id: d.id,
                            name: d.name,
                            category: d.category,
                            categoryName: d.category_name || 'Món ăn',
                            mealTime: d.meal_time || 'Trưa & Tối',
                            price: d.price,
                            originalPrice: d.original_price || Math.round(d.price * 1.15),
                            stock: d.stock,
                            initialStock: d.initial_stock || 25,
                            isAvailable: (typeof d.is_available === 'boolean') ? d.is_available : (d.stock > 0),
                            stockStatus: d.stock_status || (d.stock === 0 ? 'out_of_stock' : (d.stock <= 8 ? 'low_stock' : 'available')),
                            stockLabel: d.stock_label || (d.stock === 0 ? 'Hết suất hôm nay' : `Còn ${d.stock} suất`),
                            tag: d.tag,
                            tagLabel: d.tag_label,
                            calories: d.calories || '550 kcal',
                            image: d.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
                            description: d.description || ''
                        }));

                        const result = {
                            dishes: dishes,
                            meta: {
                                total_dishes: resJson.total_dishes ?? dishes.length,
                                available_dishes: resJson.available_dishes ?? dishes.filter(d => d.stock > 0).length,
                                out_of_stock_dishes: resJson.out_of_stock_dishes ?? dishes.filter(d => d.stock === 0).length,
                                day_of_week: resJson.day_of_week || getDayNameVietnamese(state.selectedDate),
                                date_formatted: resJson.date_formatted || formatDateVN(state.selectedDate),
                                serving_time: resJson.serving_time || { lunch: '10:30 - 13:30', dinner: '17:30 - 20:30' }
                            }
                        };

                        state.dailyMenuCache[cacheKey] = result;
                        return result;
                    }
                }
            } catch (err) {
                // Tiếp tục thử URL kế tiếp
            }
        }

        // =====================================================================
        // CƠ CHẾ DỰ PHÒNG OFFLINE (KHI SERVER CHƯA BẬT HOẶC MỞ FILE TĨNH)
        // =====================================================================
        updateApiBadge(false);
        console.warn(`[TF1A6E9] Không kết nối được Backend API, chuyển sang chế độ dự phòng Offline Demo`);

        // Trường hợp thử nghiệm thực đơn rỗng
        if (forceEmpty || dateKey === '2026-01-01') {
            const emptyResult = {
                dishes: [],
                meta: {
                    total_dishes: 0,
                    available_dishes: 0,
                    out_of_stock_dishes: 0,
                    day_of_week: getDayNameVietnamese(state.selectedDate),
                    date_formatted: formatDateVN(state.selectedDate),
                    serving_time: { lunch: 'Tạm ngưng', dinner: 'Tạm ngưng' }
                }
            };
            state.dailyMenuCache[cacheKey] = emptyResult;
            return emptyResult;
        }

        const dayNumber = parseInt(dateKey.split('-')[2], 10) || 1;
        const fallbackDishes = LOCAL_FALLBACK_REPOSITORY.map((dish, idx) => {
            let stockVariation = (dish.stock + (dayNumber * (idx + 1)) % 17) % (dish.initialStock + 1);
            if (idx === 4) stockVariation = 0; // Luôn có món hết suất để kiểm thử (Cơm Niêu Cá Bống)
            if (idx === 1) stockVariation = 3; // Món sắp hết suất
            if (idx === 11) stockVariation = 1; // Món chỉ còn 1 suất

            const isAvail = stockVariation > 0;
            return {
                ...dish,
                stock: stockVariation,
                isAvailable: isAvail,
                stockStatus: stockVariation === 0 ? 'out_of_stock' : (stockVariation <= 8 ? 'low_stock' : 'available'),
                stockLabel: stockVariation === 0 ? 'Hết suất hôm nay' : `Còn ${stockVariation} suất`
            };
        });

        const fallbackResult = {
            dishes: fallbackDishes,
            meta: {
                total_dishes: fallbackDishes.length,
                available_dishes: fallbackDishes.filter(d => d.stock > 0).length,
                out_of_stock_dishes: fallbackDishes.filter(d => d.stock === 0).length,
                day_of_week: getDayNameVietnamese(state.selectedDate),
                date_formatted: formatDateVN(state.selectedDate),
                serving_time: { lunch: '10:30 - 13:30', dinner: '17:30 - 20:30' }
            }
        };

        state.dailyMenuCache[cacheKey] = fallbackResult;
        return fallbackResult;
    };

    const updateApiBadge = (connected) => {
        const badge = document.getElementById('apiStatusBadge');
        if (badge) {
            if (connected) {
                badge.style.background = '#dcfce7';
                badge.style.color = '#15803d';
                badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> API: Online (TF1A6E9)';
            } else {
                badge.style.background = '#fef3c7';
                badge.style.color = '#b45309';
                badge.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Offline Demo (TF1A6E9)';
            }
        }
    };

    // =========================================================================
    // 2. CHỌN NGÀY (RENDER DATE TABS & BANNER)
    // =========================================================================
    const renderDateTabs = () => {
        dateTabsWrapper.innerHTML = '';
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const tabDate = new Date();
            tabDate.setDate(today.getDate() + i);

            const isCurrentActive = !state.isDemoEmptyDate && isSameDate(tabDate, state.selectedDate);
            const isToday = i === 0;

            const card = document.createElement('div');
            card.className = `date-tab-card ${isCurrentActive ? 'active' : ''} ${isToday ? 'today' : ''}`;
            
            const dayOfWeekStr = isToday ? 'Hôm nay' : (tabDate.getDay() === 0 ? 'CN' : `T${tabDate.getDay() + 1}`);
            const dateNumStr = `${String(tabDate.getDate()).padStart(2, '0')}/${String(tabDate.getMonth() + 1).padStart(2, '0')}`;
            const badgeStr = isToday ? 'Hôm nay' : getDayNameVietnamese(tabDate).replace('Thứ ', 'T');

            card.innerHTML = `
                <span class="tab-dayname">${dayOfWeekStr}</span>
                <span class="tab-date-num">${dateNumStr}</span>
                <span class="tab-badge">${badgeStr}</span>
            `;

            card.addEventListener('click', () => {
                if (state.isLoading) return;
                state.isDemoEmptyDate = false;
                state.selectedDate = new Date(tabDate);
                onDateChanged();
            });

            dateTabsWrapper.appendChild(card);
        }

        customDatePicker.value = formatDateKey(state.selectedDate);

        const activeDayName = isSameDate(state.selectedDate, today) 
            ? 'Hôm nay - ' + getDayNameVietnamese(state.selectedDate)
            : getDayNameVietnamese(state.selectedDate);
        
        const dateStrFormatted = formatDateVN(state.selectedDate);
        selectedDateTitle.textContent = `${activeDayName}, ${dateStrFormatted}`;
    };

    // =========================================================================
    // 3. HIỆN TRẠNG THÁI ĐANG TẢI (LOADING STATE)
    // =========================================================================
    const setLoading = (loading, dateStr = '') => {
        state.isLoading = loading;
        if (loading) {
            menuLoadingState.style.display = 'flex';
            loadingTextTitle.textContent = `Đang kết nối API và tải thực đơn...`;
            loadingTextSubtitle.textContent = `Đang đồng bộ thực đơn ngày ${dateStr} từ máy chủ FoodieHub...`;
            menuGrid.style.display = 'none';
            emptyMenuState.style.display = 'none';
            emptySearchState.style.display = 'none';
        } else {
            menuLoadingState.style.display = 'none';
        }
    };

    // =========================================================================
    // 4. RENDER MENU GRID VỚI CÁC TRẠNG THÁI: HẾT MÓN, ĐANG TẢI, RỖNG
    // =========================================================================
    const renderMenuGrid = async () => {
        const dateKey = formatDateKey(state.selectedDate);
        const dateFormatted = formatDateVN(state.selectedDate);
        const dayName = getDayNameVietnamese(state.selectedDate);

        // KÍCH HOẠT TRẠNG THÁI ĐANG TẢI (LOADING STATE)
        setLoading(true, dateFormatted);

        // Tạo độ trễ thị giác tối thiểu (350ms) để người dùng cảm nhận mượt mà hiệu ứng tải
        const [apiData] = await Promise.all([
            fetchMenuFromAPI(dateKey, state.isDemoEmptyDate),
            new Promise(resolve => setTimeout(resolve, 350))
        ]);

        const allDishes = apiData.dishes || [];
        const meta = apiData.meta || {};

        // TẮT TRẠNG THÁI ĐANG TẢI
        setLoading(false);

        // Cập nhật thông tin thống kê từ API lên thanh trạng thái ngày
        updateDateBannerMeta(meta);

        // Cập nhật số lượng trên các nút danh mục
        updateCategoryCounts(allDishes);

        // =====================================================================
        // TRƯỜNG HỢP 1: TRẠNG THÁI RỖNG - NGÀY NÀY KHÔNG CÓ THỰC ĐƠN
        // =====================================================================
        if (allDishes.length === 0) {
            console.log(`[TF1A6E9] Trạng thái rỗng: Thực đơn ngày ${dateFormatted} trống.`);
            menuGrid.style.display = 'none';
            emptySearchState.style.display = 'none';
            emptyMenuState.style.display = 'block';

            emptyMenuTitle.textContent = `Chưa có thực đơn cho ${dayName} (${dateFormatted})`;
            emptyMenuDesc.textContent = `Nhà hàng hiện chưa lên thực đơn hoặc tạm ngưng phục vụ trong ngày đã chọn. Quý khách vui lòng chọn ngày khác để tiếp tục đặt món nhé!`;
            return;
        }

        // =====================================================================
        // LỌC THEO DANH MỤC & TÌM KIẾM
        // =====================================================================
        let filteredDishes = allDishes.filter(dish => {
            if (state.selectedCategory === 'all') return true;
            if (state.selectedCategory === 'available-only') return dish.stock > 0;
            if (state.selectedCategory === 'out-of-stock-only') return dish.stock === 0;
            return dish.category === state.selectedCategory;
        });

        if (state.searchTerm.trim() !== '') {
            const term = state.searchTerm.toLowerCase().trim();
            filteredDishes = filteredDishes.filter(dish => 
                dish.name.toLowerCase().includes(term) ||
                dish.description.toLowerCase().includes(term)
            );
        }

        // =====================================================================
        // TRƯỜNG HỢP 2: TRẠNG THÁI RỖNG - KHÔNG TÌM THẤY KẾT QUẢ TÌM KIẾM / LỌC
        // =====================================================================
        if (filteredDishes.length === 0) {
            console.log(`[TF1A6E9] Trạng thái rỗng: Không tìm thấy món ăn phù hợp với bộ lọc.`);
            menuGrid.style.display = 'none';
            emptyMenuState.style.display = 'none';
            emptySearchState.style.display = 'block';

            if (state.searchTerm.trim()) {
                emptySearchDesc.textContent = `Không có món ăn nào khớp với từ khóa "${state.searchTerm}". Hãy thử từ khóa khác nhé!`;
            } else if (state.selectedCategory === 'out-of-stock-only') {
                emptySearchDesc.textContent = `Tuyệt vời! Ngày hôm nay hiện không có món nào bị hết suất. Tất cả các món đều sẵn sàng phục vụ!`;
            } else if (state.selectedCategory === 'available-only') {
                emptySearchDesc.textContent = `Hiện các món trong danh mục này đã hết suất phục vụ cho ngày này.`;
            } else {
                emptySearchDesc.textContent = `Danh mục này hiện chưa có món ăn phù hợp cho ngày đã chọn.`;
            }
            return;
        }

        // Sắp xếp món ăn
        sortDishes(filteredDishes, state.sortBy);

        // HIỂN THỊ DANH SÁCH MÓN ĂN
        emptyMenuState.style.display = 'none';
        emptySearchState.style.display = 'none';
        menuGrid.style.display = 'grid';
        menuGrid.innerHTML = '';

        filteredDishes.forEach(dish => {
            const card = createFoodCardElement(dish);
            menuGrid.appendChild(card);
        });
    };

    // =========================================================================
    // 5. HIỆN TRẠNG THÁI HẾT MÓN (OUT OF STOCK FOOD CARD)
    // =========================================================================
    const createFoodCardElement = (dish) => {
        const card = document.createElement('article');
        
        // KIỂM TRA TRẠNG THÁI HẾT MÓN
        const isOutOfStock = (dish.stock === 0) || (dish.isAvailable === false);
        const isLowStock = !isOutOfStock && dish.stock <= 8;

        let stockStatusClass = 'stock-plenty';
        let stockText = `Còn ${dish.stock} suất`;
        let stockPercent = Math.min(100, Math.round((dish.stock / (dish.initialStock || 25)) * 100));

        if (isOutOfStock) {
            stockStatusClass = 'stock-out';
            stockText = 'Hết suất hôm nay';
            stockPercent = 0;
        } else if (isLowStock) {
            stockStatusClass = 'stock-warning';
            stockText = `Chỉ còn ${dish.stock} suất!`;
        }

        card.className = `food-card ${isOutOfStock ? 'out-of-stock' : ''}`;
        card.setAttribute('data-id', dish.id);

        let tagHtml = '';
        if (isOutOfStock) {
            tagHtml = `<span class="badge-tag badge-sold-out"><i class="fa-solid fa-circle-xmark"></i> Hết món</span>`;
        } else if (dish.tag && dish.tagLabel) {
            tagHtml = `<span class="badge-tag ${dish.tag}">${dish.tagLabel}</span>`;
        }

        const categoryMap = {
            'mon-chinh': 'Món chính',
            'mon-nuoc': 'Món nước',
            'mon-chay': 'Món chay',
            'trang-mieng': 'Tráng miệng / Đồ uống'
        };

        // Lớp phủ nổi bật báo "HẾT MÓN" trên ảnh
        const outOfStockOverlayHtml = isOutOfStock
            ? `<div class="out-of-stock-overlay"><i class="fa-solid fa-ban"></i> ĐÃ HẾT MÓN</div>`
            : '';

        card.innerHTML = `
            <div class="card-media">
                <img src="${dish.image}" alt="${dish.name}" class="card-img" loading="lazy">
                ${outOfStockOverlayHtml}
                <div class="card-tags">${tagHtml}</div>
                <span class="card-cat-badge">${categoryMap[dish.category] || dish.categoryName || 'Món ăn'}</span>
                <span class="card-meal-time"><i class="fa-regular fa-clock"></i> ${dish.mealTime}</span>
            </div>
            <div class="card-body">
                <div class="card-title-row">
                    <h3 class="card-title" title="Xem chi tiết ${dish.name}">${dish.name}</h3>
                </div>
                <p class="card-desc">${dish.description}</p>
                
                <div class="stock-bar-wrapper ${stockStatusClass}">
                    <div class="stock-info">
                        <span class="stock-label"><i class="fa-solid fa-boxes-stacked"></i> Số suất phục vụ:</span>
                        <span class="stock-value">${stockText}</span>
                    </div>
                    <div class="stock-progress">
                        <div class="stock-progress-fill" style="width: ${stockPercent}%"></div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="card-price-group">
                        <span class="price-original">${formatCurrency(dish.originalPrice)}</span>
                        <span class="card-price">${formatCurrency(dish.price)}</span>
                    </div>
                    <button class="btn-add-dish" ${isOutOfStock ? 'disabled title="Món này đã hết suất trong ngày"' : 'title="Thêm vào giỏ món ăn"'} data-id="${dish.id}">
                        ${isOutOfStock ? '<i class="fa-solid fa-ban"></i> Hết suất' : '<i class="fa-solid fa-plus"></i> Chọn món'}
                    </button>
                </div>
            </div>
        `;

        const titleEl = card.querySelector('.card-title');
        const mediaEl = card.querySelector('.card-media');
        [titleEl, mediaEl].forEach(el => {
            el.addEventListener('click', () => openFoodModal(dish));
        });

        const addBtn = card.querySelector('.btn-add-dish');
        if (!isOutOfStock) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addToCart(dish);
            });
        }

        return card;
    };

    const updateDateBannerMeta = (meta) => {
        if (!meta) return;
        if (statTotalBadge) statTotalBadge.textContent = meta.total_dishes ?? 0;
        if (statAvailBadge) statAvailBadge.textContent = meta.available_dishes ?? 0;
        if (statOutBadge) statOutBadge.textContent = meta.out_of_stock_dishes ?? 0;
        
        if (meta.serving_time && servingTimeBadge) {
            servingTimeBadge.innerHTML = `<i class="fa-solid fa-truck-fast"></i> Giao trưa ${meta.serving_time.lunch || '10:30 - 13:30'} & tối ${meta.serving_time.dinner || '17:30 - 20:30'}`;
        }
    };

    const updateCategoryCounts = (dishes) => {
        const total = dishes.length;
        const mainCount = dishes.filter(d => d.category === 'mon-chinh').length;
        const soupCount = dishes.filter(d => d.category === 'mon-nuoc').length;
        const veggieCount = dishes.filter(d => d.category === 'mon-chay').length;
        const drinkCount = dishes.filter(d => d.category === 'trang-mieng').length;
        const availCount = dishes.filter(d => d.stock > 0).length;
        const outCount = dishes.filter(d => d.stock === 0).length;

        if (countAll) countAll.textContent = total;
        if (countMain) countMain.textContent = mainCount;
        if (countSoup) countSoup.textContent = soupCount;
        if (countVeggie) countVeggie.textContent = veggieCount;
        if (countDrink) countDrink.textContent = drinkCount;
        if (countAvailableOnly) countAvailableOnly.textContent = availCount;
        if (countOutOnly) countOutOnly.textContent = outCount;
        if (statTotalDishes) statTotalDishes.textContent = total > 0 ? `${total}+` : '0';
    };

    const sortDishes = (dishes, sortBy) => {
        switch (sortBy) {
            case 'price-asc':
                dishes.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                dishes.sort((a, b) => b.price - a.price);
                break;
            case 'stock-asc':
                dishes.sort((a, b) => a.stock - b.stock);
                break;
            case 'stock-desc':
                dishes.sort((a, b) => b.stock - a.stock);
                break;
            default:
                // Mặc định: ưu tiên món còn suất lên đầu, món hết suất xếp cuối
                dishes.sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));
                break;
        }
    };

    // =========================================================================
    // 6. GIỎ HÀNG
    // =========================================================================
    const addToCart = (dish) => {
        const dateKey = formatDateKey(state.selectedDate);
        const cache = state.dailyMenuCache[dateKey];
        const dishes = cache ? cache.dishes : [];
        const targetDish = dishes.find(d => d.id === dish.id);

        if (!targetDish || targetDish.stock <= 0) {
            showToast('Món này vừa hết suất, vui lòng chọn món khác nhé!', 'warning');
            return;
        }

        targetDish.stock -= 1;

        const existingCartItem = state.cart.find(item => item.dishId === dish.id && item.dateKey === dateKey);
        if (existingCartItem) {
            existingCartItem.quantity += 1;
        } else {
            state.cart.push({
                dishId: dish.id,
                dateKey: dateKey,
                dishInfo: { ...dish },
                quantity: 1
            });
        }

        updateCartUI();
        renderMenuGrid();
        showToast(`Đã thêm "${dish.name}" vào danh sách đặt món!`, 'success');
    };

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
                    <p>Chưa có suất ăn nào được chọn</p>
                    <small>Chọn ngày và bấm "Chọn món" để lên thực đơn của bạn</small>
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
                    <p class="cart-item-price">${formatCurrency(item.dishInfo.price)}</p>
                    <div class="cart-item-qty-row">
                        <button class="qty-btn btn-minus" data-index="${index}">-</button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="qty-btn btn-plus" data-index="${index}">+</button>
                    </div>
                </div>
                <button class="cart-remove-item" data-index="${index}" title="Xóa món"><i class="fa-solid fa-trash-can"></i></button>
            `;

            itemRow.querySelector('.btn-minus').addEventListener('click', () => {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                    returnStock(item.dishId, item.dateKey, 1);
                } else {
                    returnStock(item.dishId, item.dateKey, item.quantity);
                    state.cart.splice(index, 1);
                }
                updateCartUI();
                renderMenuGrid();
            });

            itemRow.querySelector('.btn-plus').addEventListener('click', () => {
                const cache = state.dailyMenuCache[item.dateKey];
                const dishes = cache ? cache.dishes : [];
                const currentInStore = dishes.find(d => d.id === item.dishId);
                if (currentInStore && currentInStore.stock > 0) {
                    currentInStore.stock -= 1;
                    item.quantity += 1;
                    updateCartUI();
                    renderMenuGrid();
                } else {
                    showToast('Đã đạt số suất tối đa còn lại của món này!', 'warning');
                }
            });

            itemRow.querySelector('.cart-remove-item').addEventListener('click', () => {
                returnStock(item.dishId, item.dateKey, item.quantity);
                state.cart.splice(index, 1);
                updateCartUI();
                renderMenuGrid();
                showToast(`Đã xóa món khỏi giỏ hàng`, 'warning');
            });

            cartDrawerItems.appendChild(itemRow);
        });
    };

    const returnStock = (dishId, dateKey, qty) => {
        const cache = state.dailyMenuCache[dateKey];
        if (cache && cache.dishes) {
            const targetDish = cache.dishes.find(d => d.id === dishId);
            if (targetDish) {
                targetDish.stock = Math.min(targetDish.initialStock || 30, targetDish.stock + qty);
            }
        }
    };

    // =========================================================================
    // 7. MODAL CHI TIẾT MÓN ĂN (KẾT NỐI API TF1A785: NGUYÊN LIỆU & DỊ ỨNG)
    // =========================================================================
    const openFoodModal = async (dish) => {
        const isOutOfStock = dish.stock === 0 || dish.isAvailable === false;
        
        // Thử gọi API chi tiết món ăn (Task TF1A785)
        let detailData = { ...dish };
        const candidateDetailUrls = [
            `/api/dishes/${dish.id}`,
            `http://127.0.0.1:5000/api/dishes/${dish.id}`,
            `http://127.0.0.1:5001/api/dishes/${dish.id}`,
            `http://127.0.0.1:8000/api/dishes/${dish.id}`
        ];

        for (const url of candidateDetailUrls) {
            try {
                const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    const resJson = await res.json();
                    if (resJson.success && resJson.data) {
                        detailData = { ...detailData, ...resJson.data };
                        console.log(`[TF1A785] Lấy chi tiết món ăn thành công từ API: ${dish.id}`, resJson.data);
                        break;
                    }
                }
            } catch (err) {
                // Tiếp tục thử fallback
            }
        }

        const outOfStockAlertHtml = isOutOfStock
            ? `<div class="modal-stock-alert out">
                   <i class="fa-solid fa-triangle-exclamation"></i>
                   <div>
                       <strong>Món ăn này hiện đã HẾT SUẤT hôm nay!</strong><br>
                       <small>Quý khách vui lòng chọn món ăn khác hoặc đặt trước cho các ngày tiếp theo nhé.</small>
                   </div>
               </div>`
            : '';

        // Render danh sách nguyên liệu (Task TF1A785)
        const ingredientsList = Array.isArray(detailData.ingredients) && detailData.ingredients.length > 0
            ? detailData.ingredients
            : ['Nguyên liệu tươi sạch trong ngày', 'Gia vị truyền thống', 'Đảm bảo vệ sinh an toàn thực phẩm'];

        const ingredientsHtml = `
            <h4 class="modal-section-title"><i class="fa-solid fa-seedling text-primary"></i> Nguyên liệu chế biến (Task TF1A785):</h4>
            <div class="ingredients-chips">
                ${ingredientsList.map(ing => `<span class="ingredient-chip"><i class="fa-solid fa-circle-check"></i> ${ing}</span>`).join('')}
            </div>
        `;

        // Render thông tin dị ứng (Task TF1A785)
        const allergyList = Array.isArray(detailData.allergy_info) && detailData.allergy_info.length > 0
            ? detailData.allergy_info
            : ['Không chứa chất gây dị ứng nguy hiểm phổ biến'];
        
        const allergensList = Array.isArray(detailData.allergens) ? detailData.allergens : [];
        const allergensTagsHtml = allergensList.length > 0
            ? `<div class="allergen-tags">
                   <strong style="font-size: 0.78rem; color: #991b1b; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-circle-exclamation"></i> Cảnh báo dị ứng:</strong>
                   ${allergensList.map(a => `<span class="allergen-tag">${a}</span>`).join('')}
               </div>`
            : `<div class="allergen-tags"><span class="badge-tag new" style="text-transform: none;"><i class="fa-solid fa-circle-check"></i> An toàn cho hầu hết người dùng</span></div>`;

        const allergyHtml = `
            <div class="allergy-box">
                <div class="allergy-header">
                    <i class="fa-solid fa-shield-virus"></i> Thông tin lưu ý dị ứng (Allergy Info):
                </div>
                <ul class="allergy-list">
                    ${allergyList.map(al => `<li><i class="fa-solid fa-circle-dot"></i> ${al}</li>`).join('')}
                </ul>
                ${allergensTagsHtml}
            </div>
        `;

        const nutrition = detailData.nutrition || { calories: detailData.calories || '550 kcal', protein: '30g', carbs: '55g', fat: '18g' };

        modalBody.innerHTML = `
            <img src="${detailData.image || detailData.image_url}" alt="${detailData.name}" class="modal-dish-img">
            <div class="modal-info-padding">
                <h2>${detailData.name}</h2>
                <div class="modal-meta-row">
                    <span class="badge-role"><i class="fa-regular fa-clock"></i> ${detailData.mealTime || detailData.meal_time || 'Trưa & Tối'}</span>
                    <span class="badge-role ${isOutOfStock ? 'text-danger' : ''}"><i class="fa-solid fa-boxes-stacked"></i> ${isOutOfStock ? 'Hết suất' : `Còn ${dish.stock} suất`}</span>
                    ${detailData.preparation_time ? `<span class="badge-role"><i class="fa-solid fa-fire"></i> ${detailData.preparation_time}</span>` : ''}
                    <strong class="text-primary" style="font-size: 1.3rem;">${formatCurrency(detailData.price)}</strong>
                </div>

                ${outOfStockAlertHtml}

                <p class="modal-dish-desc">${detailData.description}</p>
                
                ${ingredientsHtml}

                ${allergyHtml}

                <h4 class="modal-section-title"><i class="fa-solid fa-chart-pie text-primary"></i> Giá trị dinh dưỡng ước tính:</h4>
                <div class="nutrition-grid">
                    <div class="nutrition-item">
                        <strong>${nutrition.calories || detailData.calories}</strong>
                        <span>Năng lượng</span>
                    </div>
                    <div class="nutrition-item">
                        <strong>${nutrition.protein || '28g'}</strong>
                        <span>Chất đạm (Protein)</span>
                    </div>
                    <div class="nutrition-item">
                        <strong>${nutrition.carbs || '50g'}</strong>
                        <span>Carbohydrate</span>
                    </div>
                </div>

                <button class="btn btn-primary btn-block modal-add-btn" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? '<i class="fa-solid fa-ban"></i> Đã hết suất hôm nay' : '<i class="fa-solid fa-cart-plus"></i> Đặt món ngay (' + formatCurrency(detailData.price) + ')'}
                </button>
            </div>
        `;

        const modalAddBtn = modalBody.querySelector('.modal-add-btn');
        if (!isOutOfStock) {
            modalAddBtn.addEventListener('click', () => {
                addToCart(dish);
                closeModal();
            });
        }

        foodModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        foodModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // =========================================================================
    // 8. TOAST NOTIFICATION
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

    const onDateChanged = () => {
        renderDateTabs();
        renderMenuGrid();
    };

    // =========================================================================
    // 9. EVENT LISTENERS
    // =========================================================================
    prevDayBtn.addEventListener('click', () => {
        if (state.isLoading) return;
        state.isDemoEmptyDate = false;
        const current = new Date(state.selectedDate);
        current.setDate(current.getDate() - 1);
        state.selectedDate = current;
        onDateChanged();
    });

    nextDayBtn.addEventListener('click', () => {
        if (state.isLoading) return;
        state.isDemoEmptyDate = false;
        const current = new Date(state.selectedDate);
        current.setDate(current.getDate() + 1);
        state.selectedDate = current;
        onDateChanged();
    });

    customDatePicker.addEventListener('change', (e) => {
        if (state.isLoading) return;
        if (e.target.value) {
            state.isDemoEmptyDate = false;
            const [y, m, d] = e.target.value.split('-').map(Number);
            state.selectedDate = new Date(y, m - 1, d);
            onDateChanged();
        }
    });

    // Nút thử nghiệm nhanh trạng thái rỗng (Task TF1A6E9)
    if (btnQuickEmptyDemo) {
        btnQuickEmptyDemo.addEventListener('click', () => {
            if (state.isLoading) return;
            state.isDemoEmptyDate = !state.isDemoEmptyDate;
            if (state.isDemoEmptyDate) {
                // Chọn một ngày nghỉ lễ ví dụ 01/01/2026
                state.selectedDate = new Date(2026, 0, 1);
                showToast('Đang kích hoạt trạng thái thực đơn rỗng (Task TF1A6E9)...', 'warning');
            } else {
                state.selectedDate = new Date();
                showToast('Trở về thực đơn ngày hôm nay', 'success');
            }
            onDateChanged();
        });
    }

    // Nút quay về hôm nay khi gặp Empty Menu State
    if (btnEmptyGoToday) {
        btnEmptyGoToday.addEventListener('click', () => {
            if (state.isLoading) return;
            state.isDemoEmptyDate = false;
            state.selectedDate = new Date();
            onDateChanged();
            showToast('Đã chuyển về thực đơn hôm nay!', 'success');
        });
    }

    // Nút xem ngày mai khi gặp Empty Menu State
    if (btnEmptyGoTomorrow) {
        btnEmptyGoTomorrow.addEventListener('click', () => {
            if (state.isLoading) return;
            state.isDemoEmptyDate = false;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            state.selectedDate = tomorrow;
            onDateChanged();
            showToast('Đã chuyển sang thực đơn ngày mai!', 'success');
        });
    }

    categoryFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.cat-pill');
        if (!pill) return;

        categoryFilters.querySelectorAll('.cat-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        state.selectedCategory = pill.getAttribute('data-category');
        renderMenuGrid();
    });

    sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderMenuGrid();
    });

    searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        clearSearchBtn.style.display = state.searchTerm ? 'block' : 'none';
        renderMenuGrid();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchTerm = '';
        clearSearchBtn.style.display = 'none';
        renderMenuGrid();
    });

    resetFilterBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchTerm = '';
        clearSearchBtn.style.display = 'none';
        state.selectedCategory = 'all';
        categoryFilters.querySelectorAll('.cat-pill').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === 'all');
        });
        renderMenuGrid();
    });

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
    modalCloseBtn.addEventListener('click', closeModal);
    foodModal.addEventListener('click', (e) => {
        if (e.target === foodModal) closeModal();
    });

    checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) {
            showToast('Vui lòng chọn ít nhất một suất ăn trước khi đặt hàng!', 'warning');
            return;
        }
        const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        showToast(`Đặt hàng thành công ${totalQty} suất ăn cho ngày đã chọn!`, 'success');
        state.cart = [];
        updateCartUI();
        closeCartDrawer();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeCartDrawer();
        }
    });

    // =========================================================================
    // KHỞI CHẠY LẦN ĐẦU
    // =========================================================================
    renderDateTabs();
    renderMenuGrid();
    updateCartUI();
});
