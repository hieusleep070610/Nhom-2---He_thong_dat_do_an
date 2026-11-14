/**
 * FoodieHub - Hệ Thống Đặt Đồ Ăn - Nhóm 2
 * Quản lý & Hiển thị thực đơn theo ngày (Mã Task FE: TF1A5C3, Mã Task BE: TF1A638)
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // DỮ LIỆU DỰ PHÒNG KHI KHÔNG KẾT NỐI ĐƯỢC BACKEND API (OFFLINE FALLBACK)
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
    // STATE ỨNG DỤNG
    // =========================================================================
    const state = {
        selectedDate: new Date(),
        selectedCategory: 'all',
        searchTerm: '',
        sortBy: 'default',
        cart: [],
        dailyMenuCache: {},
        isBackendConnected: false
    };

    // DOM Elements
    const dateTabsWrapper = document.getElementById('dateTabsWrapper');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const customDatePicker = document.getElementById('customDatePicker');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    
    const menuGrid = document.getElementById('menuGrid');
    const emptyState = document.getElementById('emptyState');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const categoryFilters = document.getElementById('categoryFilters');
    const sortSelect = document.getElementById('sortSelect');
    
    // Counts
    const countAll = document.getElementById('countAll');
    const countMain = document.getElementById('countMain');
    const countSoup = document.getElementById('countSoup');
    const countVeggie = document.getElementById('countVeggie');
    const countDrink = document.getElementById('countDrink');
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
        const teamBadge = document.querySelector('.badge-team');
        if (teamBadge && !document.getElementById('apiStatusBadge')) {
            const apiBadge = document.createElement('span');
            apiBadge.id = 'apiStatusBadge';
            apiBadge.style.cssText = 'font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px; background: #e0f2fe; color: #0284c7; margin-left: 6px;';
            apiBadge.innerHTML = '<i class="fa-solid fa-server"></i> API: TF1A638';
            teamBadge.parentNode.insertBefore(apiBadge, teamBadge.nextSibling);
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
    // GỌI BACKEND API (TASK TF1A638) KÈM CƠ CHẾ DỰ PHÒNG OFFLINE
    // =========================================================================
    const fetchMenuFromAPI = async (dateKey) => {
        // Nếu đã cache trong phiên làm việc
        if (state.dailyMenuCache[dateKey]) {
            return state.dailyMenuCache[dateKey];
        }

        const candidateUrls = [
            `/api/menu?date=${dateKey}`,
            `http://127.0.0.1:5000/api/menu?date=${dateKey}`,
            `http://127.0.0.1:5001/api/menu?date=${dateKey}`,
            `http://127.0.0.1:8000/api/menu?date=${dateKey}`
        ];

        for (const url of candidateUrls) {
            try {
                const response = await fetch(url, { method: 'GET' });
                if (response.ok) {
                    const resJson = await response.json();
                    if (resJson.success && Array.isArray(resJson.data)) {
                        state.isBackendConnected = true;
                        updateApiBadge(true);
                        
                        // Chuẩn hóa dữ liệu trả về từ API Backend
                        const dishes = resJson.data.map(d => ({
                            id: d.id,
                            name: d.name,
                            category: d.category,
                            mealTime: d.meal_time || 'Trưa & Tối',
                            price: d.price,
                            originalPrice: d.original_price,
                            stock: d.stock,
                            initialStock: d.initial_stock,
                            tag: d.tag,
                            tagLabel: d.tag_label,
                            calories: d.calories,
                            image: d.image_url,
                            description: d.description
                        }));

                        state.dailyMenuCache[dateKey] = dishes;
                        return dishes;
                    }
                }
            } catch (err) {
                // Tiếp tục thử URL tiếp theo hoặc fallback
            }
        }

        // Nếu backend chưa bật hoặc mở file trực tiếp (file:///), tự sinh mock data
        updateApiBadge(false);
        const dayNumber = parseInt(dateKey.split('-')[2], 10) || 1;
        const fallbackDishes = LOCAL_FALLBACK_REPOSITORY.map((dish, idx) => {
            let stockVariation = (dish.stock + (dayNumber * (idx + 1)) % 17) % (dish.initialStock + 1);
            if (idx === 4) stockVariation = 0;
            if (idx === 1) stockVariation = 3;
            if (idx === 11) stockVariation = 1;
            return { ...dish, stock: stockVariation };
        });

        state.dailyMenuCache[dateKey] = fallbackDishes;
        return fallbackDishes;
    };

    const updateApiBadge = (connected) => {
        const badge = document.getElementById('apiStatusBadge');
        if (badge) {
            if (connected) {
                badge.style.background = '#dcfce7';
                badge.style.color = '#15803d';
                badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> API: Online';
            } else {
                badge.style.background = '#fef3c7';
                badge.style.color = '#b45309';
                badge.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Giao diện tĩnh';
            }
        }
    };

    // =========================================================================
    // RENDER DATE TABS
    // =========================================================================
    const renderDateTabs = () => {
        dateTabsWrapper.innerHTML = '';
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const tabDate = new Date();
            tabDate.setDate(today.getDate() + i);

            const isCurrentActive = isSameDate(tabDate, state.selectedDate);
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
                state.selectedDate = new Date(tabDate);
                onDateChanged();
            });

            dateTabsWrapper.appendChild(card);
        }

        customDatePicker.value = formatDateKey(state.selectedDate);

        const activeDayName = isSameDate(state.selectedDate, today) 
            ? 'Hôm nay - ' + getDayNameVietnamese(state.selectedDate)
            : getDayNameVietnamese(state.selectedDate);
        
        const dateStrFormatted = `${String(state.selectedDate.getDate()).padStart(2, '0')}/${String(state.selectedDate.getMonth() + 1).padStart(2, '0')}/${state.selectedDate.getFullYear()}`;
        selectedDateTitle.textContent = `${activeDayName}, ${dateStrFormatted}`;
    };

    // =========================================================================
    // RENDER MENU GRID
    // =========================================================================
    const renderMenuGrid = async () => {
        const dateKey = formatDateKey(state.selectedDate);
        
        // Hiện hiệu ứng tải nếu cần
        menuGrid.style.opacity = '0.6';
        const allDishes = await fetchMenuFromAPI(dateKey);
        menuGrid.style.opacity = '1';

        updateCategoryCounts(allDishes);

        let filteredDishes = allDishes.filter(dish => {
            if (state.selectedCategory === 'all') return true;
            return dish.category === state.selectedCategory;
        });

        if (state.searchTerm.trim() !== '') {
            const term = state.searchTerm.toLowerCase().trim();
            filteredDishes = filteredDishes.filter(dish => 
                dish.name.toLowerCase().includes(term) ||
                dish.description.toLowerCase().includes(term)
            );
        }

        sortDishes(filteredDishes, state.sortBy);

        menuGrid.innerHTML = '';
        if (filteredDishes.length === 0) {
            menuGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        menuGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        filteredDishes.forEach(dish => {
            const card = createFoodCardElement(dish);
            menuGrid.appendChild(card);
        });
    };

    const createFoodCardElement = (dish) => {
        const card = document.createElement('article');
        const isOutOfStock = dish.stock === 0;
        const isLowStock = dish.stock > 0 && dish.stock <= 8;

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
        if (dish.tag && dish.tagLabel) {
            tagHtml = `<span class="badge-tag ${dish.tag}">${dish.tagLabel}</span>`;
        }

        const categoryMap = {
            'mon-chinh': 'Món chính',
            'mon-nuoc': 'Món nước',
            'mon-chay': 'Món chay',
            'trang-mieng': 'Tráng miệng / Đồ uống'
        };

        card.innerHTML = `
            <div class="card-media">
                <img src="${dish.image}" alt="${dish.name}" class="card-img" loading="lazy">
                <div class="card-tags">${tagHtml}</div>
                <span class="card-cat-badge">${categoryMap[dish.category] || 'Món ăn'}</span>
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
                    <button class="btn-add-dish" ${isOutOfStock ? 'disabled' : ''} data-id="${dish.id}">
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

    const updateCategoryCounts = (dishes) => {
        countAll.textContent = dishes.length;
        countMain.textContent = dishes.filter(d => d.category === 'mon-chinh').length;
        countSoup.textContent = dishes.filter(d => d.category === 'mon-nuoc').length;
        countVeggie.textContent = dishes.filter(d => d.category === 'mon-chay').length;
        countDrink.textContent = dishes.filter(d => d.category === 'trang-mieng').length;
        statTotalDishes.textContent = dishes.length + '+';
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
                dishes.sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));
                break;
        }
    };

    // =========================================================================
    // GIỎ HÀNG
    // =========================================================================
    const addToCart = (dish) => {
        const dateKey = formatDateKey(state.selectedDate);
        const dishes = state.dailyMenuCache[dateKey] || [];
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
                const dishes = state.dailyMenuCache[item.dateKey];
                const currentInStore = dishes ? dishes.find(d => d.id === item.dishId) : null;
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
        const dishes = state.dailyMenuCache[dateKey];
        if (dishes) {
            const targetDish = dishes.find(d => d.id === dishId);
            if (targetDish) {
                targetDish.stock = Math.min(targetDish.initialStock || 30, targetDish.stock + qty);
            }
        }
    };

    // =========================================================================
    // MODAL CHI TIẾT MÓN ĂN
    // =========================================================================
    const openFoodModal = (dish) => {
        const isOutOfStock = dish.stock === 0;
        modalBody.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}" class="modal-dish-img">
            <div class="modal-info-padding">
                <h2>${dish.name}</h2>
                <div class="modal-meta-row">
                    <span class="badge-role"><i class="fa-regular fa-clock"></i> ${dish.mealTime}</span>
                    <span class="badge-role"><i class="fa-solid fa-boxes-stacked"></i> Còn ${dish.stock} suất</span>
                    <strong class="text-primary" style="font-size: 1.3rem;">${formatCurrency(dish.price)}</strong>
                </div>
                <p class="modal-dish-desc">${dish.description}</p>
                
                <h4 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--dark);">Giá trị dinh dưỡng ước tính:</h4>
                <div class="nutrition-grid">
                    <div class="nutrition-item">
                        <strong>${dish.calories}</strong>
                        <span>Năng lượng</span>
                    </div>
                    <div class="nutrition-item">
                        <strong>28g</strong>
                        <span>Chất đạm (Protein)</span>
                    </div>
                    <div class="nutrition-item">
                        <strong>45g</strong>
                        <span>Carbohydrate</span>
                    </div>
                </div>

                <button class="btn btn-primary btn-block modal-add-btn" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? '<i class="fa-solid fa-ban"></i> Đã hết suất' : '<i class="fa-solid fa-cart-plus"></i> Đặt món ngay (' + formatCurrency(dish.price) + ')'}
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
    // TOAST NOTIFICATION
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

    prevDayBtn.addEventListener('click', () => {
        const current = new Date(state.selectedDate);
        current.setDate(current.getDate() - 1);
        state.selectedDate = current;
        onDateChanged();
    });

    nextDayBtn.addEventListener('click', () => {
        const current = new Date(state.selectedDate);
        current.setDate(current.getDate() + 1);
        state.selectedDate = current;
        onDateChanged();
    });

    customDatePicker.addEventListener('change', (e) => {
        if (e.target.value) {
            const [y, m, d] = e.target.value.split('-').map(Number);
            state.selectedDate = new Date(y, m - 1, d);
            onDateChanged();
        }
    });

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

    // KHỞI CHẠY LẦN ĐẦU
    renderDateTabs();
    renderMenuGrid();
    updateCartUI();
});
