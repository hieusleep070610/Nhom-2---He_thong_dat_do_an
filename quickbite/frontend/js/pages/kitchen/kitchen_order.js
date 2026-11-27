(() => {
    const API_BASE = "http://127.0.0.1:8000/api";

    // Bộ lọc & danh sách
    const dateInput = document.getElementById("filterDate");
    const statusSelect = document.getElementById("filterStatus");
    const pickupTimeSelect = document.getElementById("filterPickupTime");
    const resetBtn = document.getElementById("resetFiltersBtn");
    const searchInput = document.querySelector(".search-input-top");
    const queueList = document.querySelector("#queueView .queue-list");
    const tabs = Array.from(document.querySelectorAll(".queue-tabs span"));
    const navItems = Array.from(document.querySelectorAll(".sidebar .nav-item"));
    const views = Array.from(document.querySelectorAll(".view-section"));
    const feedbackBanner = document.getElementById("kitchenFeedbackBanner");

    // 4 thẻ thống kê
    const statNewCount = document.getElementById("statNewCount");
    const statPreparingCount = document.getElementById("statPreparingCount");
    const statLateCount = document.getElementById("statLateCount");
    const statCompletedCount = document.getElementById("statCompletedCount");

    // Chi tiết chế biến
    const detailOrderCode = document.getElementById("detailOrderCode");
    const detailPickupTime = document.getElementById("detailPickupTime");
    const detailKitchenNote = document.getElementById("detailKitchenNote");
    const detailOrderStatus = document.getElementById("detailOrderStatus");
    const detailDishList = document.getElementById("detailDishList");
    const backToQueueBtn = document.getElementById("backToQueueBtn");
    const startPrepBtn = document.getElementById("startPrepBtn");
    const markReadyBtn = document.getElementById("markReadyBtn");

    // Modal từ chối đơn
    const rejectModal = document.getElementById("rejectReasonModal");
    const rejectModalBackdrop = document.getElementById("rejectModalBackdrop");
    const rejectModalOrderInfo = document.getElementById("rejectModalOrderInfo");
    const rejectReasonInput = document.getElementById("rejectReasonInput");
    const rejectReasonError = document.getElementById("rejectReasonError");
    const cancelRejectBtn = document.getElementById("cancelRejectBtn");
    const confirmRejectBtn = document.getElementById("confirmRejectBtn");

    function getLocalTodayStr() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    const todayStr = getLocalTodayStr();
    if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
    }

    let allDayOrders = [];
    let currentFilteredOrders = [];
    let selectedOrderId = null;
    let activeTab = "Đơn mới";
    let pendingRejectOrder = null;
    let busyOrderId = null;

    const TIME_SLOTS = {
        morning: [6 * 60, 11 * 60],
        noon: [11 * 60, 14 * 60],
        afternoon: [14 * 60, 18 * 60],
        evening: [18 * 60, 22 * 60],
    };

    const STATUS_LABELS = {
        pending: "Chờ xác nhận",
        confirmed: "Đã xác nhận",
        preparing: "Đang chế biến",
        ready: "Sẵn sàng nhận",
        completed: "Hoàn thành",
        cancelled: "Đã hủy",
    };

    const BADGE_CLASSES = {
        pending: "status-pending",
        confirmed: "status-confirmed",
        cancelled: "status-cancelled",
    };

    function showFeedback(message, type = "success") {
        if (!feedbackBanner) return;
        feedbackBanner.textContent = message;
        feedbackBanner.className = `kitchen-feedback show ${type}`;
    }

    function clearFeedback() {
        if (!feedbackBanner) return;
        feedbackBanner.textContent = "";
        feedbackBanner.className = "kitchen-feedback";
    }

    function getAuthHeaders() {
        const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("access_token") ||
            "";
        const clean = token.trim().replace(/^"(.*)"$/, "$1");
        return clean
            ? { Authorization: `Bearer ${clean}`, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" };
    }

    function normalizeStatus(raw) {
        return String(raw || "").trim().toLowerCase();
    }

    function formatStatus(status) {
        const key = normalizeStatus(status);
        return STATUS_LABELS[key] || status || "-";
    }

    function parseMinutes(val) {
        if (!val) return null;
        const match = String(val).match(/(\d{1,2}):(\d{2})/);
        if (!match) return null;
        return Number(match[1]) * 60 + Number(match[2]);
    }

    function extractDateOnly(val) {
        if (!val) return "";
        const match = String(val).match(/(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : "";
    }

    // Kiểm tra đơn sắp trễ: chưa hoàn thành/hủy và giờ nhận <= hiện tại + 15 phút (hoặc backend gắn cờ is_late)
    function isOrderLate(order) {
        if (order.is_late === true) return true;
        const st = normalizeStatus(order.status);
        if (["ready", "completed", "cancelled"].includes(st)) return false;

        const orderDate = extractDateOnly(order.pickup_date || order.created_at || "");
        if (orderDate && orderDate !== getLocalTodayStr()) return false;

        const pickupMins = parseMinutes(order.slot_label || order.pickup_time || "");
        if (pickupMins === null) return false;

        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        return pickupMins - nowMins <= 15;
    }

    function updateStatsCards(orders) {
        let newCount = 0;
        let prepCount = 0;
        let lateCount = 0;
        let completedCount = 0;

        orders.forEach((o) => {
            const st = normalizeStatus(o.status);
            if (st === "pending" || st === "confirmed") newCount += 1;
            if (st === "preparing") prepCount += 1;
            if (isOrderLate(o)) lateCount += 1;
            if (st === "completed") completedCount += 1;
        });

        if (statNewCount) statNewCount.textContent = String(newCount);
        if (statPreparingCount) statPreparingCount.textContent = String(prepCount);
        if (statLateCount) statLateCount.textContent = String(lateCount);
        if (statCompletedCount) statCompletedCount.textContent = String(completedCount);
    }

    function switchView(viewId) {
        views.forEach((v) => v.classList.toggle("active", v.id === viewId));
        navItems.forEach((nav) => {
            nav.classList.toggle("active", nav.dataset.view === viewId);
        });
    }

    navItems.forEach((nav) => {
        nav.addEventListener("click", (e) => {
            e.preventDefault();
            const targetView = nav.dataset.view;
            if (targetView) switchView(targetView);
            if (targetView === "historyView") renderHistoryFromCache();
        });
    });

    backToQueueBtn?.addEventListener("click", () => switchView("queueView"));

    function matchFilters(order) {
        const selectedStatus = normalizeStatus(statusSelect?.value);
        const slotKey = pickupTimeSelect?.value || "";
        const kw = (searchInput?.value || "").trim().toLowerCase();
        const st = normalizeStatus(order.status);

        // 1. Lọc theo trạng thái (ưu tiên dropdown nếu đang chọn cụ thể, nếu để "Tất cả trạng thái" thì lọc theo Tab)
        if (selectedStatus) {
            if (st !== selectedStatus) return false;
        } else {
            if (activeTab === "Đơn mới" && st !== "pending" && st !== "confirmed") return false;
            if (activeTab === "Đang chế biến" && st !== "preparing") return false;
            if (activeTab === "Sắp trễ" && !isOrderLate(order)) return false;
        }

        // 2. Lọc theo khung giờ
        if (slotKey) {
            const mins = parseMinutes(order.slot_label || order.pickup_time || "");
            const [start, end] = TIME_SLOTS[slotKey] || [0, 24 * 60];
            if (mins === null || mins < start || mins > end) return false;
        }

        // 3. Lọc theo từ khóa
        if (kw) {
            const haystack = [
                order.code,
                order.order_code,
                order.customer_name,
                order.note,
                formatStatus(order.status),
                order.slot_label,
                order.pickup_time,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(kw)) return false;
        }

        return true;
    }

    function openRejectModal(order) {
        if (!rejectModal) return;
        pendingRejectOrder = order;
        const code = order.code || order.order_code || `#${order.id}`;
        if (rejectModalOrderInfo) {
            rejectModalOrderInfo.textContent = `Đơn hàng: ${code} • Giờ nhận: ${order.slot_label || order.pickup_time || "--:--"}`;
        }
        if (rejectReasonInput) rejectReasonInput.value = "";
        if (rejectReasonError) rejectReasonError.textContent = "";
        rejectModal.classList.remove("hidden");
        rejectModal.setAttribute("aria-hidden", "false");
        rejectReasonInput?.focus();
    }

    function closeRejectModal() {
        if (!rejectModal) return;
        pendingRejectOrder = null;
        if (rejectReasonInput) rejectReasonInput.value = "";
        if (rejectReasonError) rejectReasonError.textContent = "";
        rejectModal.classList.add("hidden");
        rejectModal.setAttribute("aria-hidden", "true");
    }

    rejectModalBackdrop?.addEventListener("click", closeRejectModal);
    cancelRejectBtn?.addEventListener("click", closeRejectModal);

    async function submitDecision(order, action, reason = null) {
        if (!order?.id || busyOrderId !== null) return;
        busyOrderId = order.id;
        clearFeedback();
        renderQueueList(currentFilteredOrders);

        const payload = action === "reject" ? { action: "reject", reason } : { action: "accept" };

        try {
            const res = await fetch(`${API_BASE}/kitchen/orders/${order.id}/decision`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showFeedback(data.detail || data.message || `Không thể xử lý đơn (HTTP ${res.status}).`, "error");
                return;
            }
            closeRejectModal();
            const code = order.code || order.order_code || `#${order.id}`;
            showFeedback(
                data.message ||
                    (action === "accept"
                        ? `Đã tiếp nhận đơn ${code} và tạo thông báo cho khách hàng.`
                        : `Đã từ chối đơn ${code} và tạo thông báo cho khách hàng.`),
                "success"
            );
            await fetchOrdersByDate();
        } catch {
            showFeedback("Lỗi kết nối tới máy chủ khi cập nhật quyết định đơn hàng.", "error");
        } finally {
            busyOrderId = null;
            renderQueueList(currentFilteredOrders);
        }
    }

    confirmRejectBtn?.addEventListener("click", async () => {
        if (!pendingRejectOrder) return;
        const reason = (rejectReasonInput?.value || "").trim();
        if (!reason) {
            if (rejectReasonError) rejectReasonError.textContent = "Vui lòng nhập lý do từ chối.";
            rejectReasonInput?.focus();
            return;
        }
        if (rejectReasonError) rejectReasonError.textContent = "";
        await submitDecision(pendingRejectOrder, "reject", reason);
    });

    function renderQueueList(orders) {
        if (!queueList) return;
        if (!orders.length) {
            queueList.innerHTML = `<div class="empty-filter-state">Không có đơn hàng nào khớp với điều kiện lọc.</div>`;
            return;
        }

        queueList.innerHTML = orders
            .map((order, idx) => {
                const code = order.code || order.order_code || `#${order.id}`;
                const count = order.items_count ?? order.items?.length ?? 0;
                const timeText = order.slot_label || order.pickup_time || "--:--";
                const st = normalizeStatus(order.status);
                const statusText = formatStatus(order.status);
                const badgeClass = BADGE_CLASSES[st] || "";
                const isBusy = busyOrderId === order.id;

                const actionsHtml =
                    st === "pending"
                        ? `
                        <div class="queue-item-actions">
                            <button type="button" class="btn-accept" data-index="${idx}" ${isBusy ? "disabled" : ""}>Tiếp nhận</button>
                            <button type="button" class="btn-reject" data-index="${idx}" ${isBusy ? "disabled" : ""}>Từ chối</button>
                        </div>
                    `
                        : "";

                const noteHtml = order.note
                    ? `<div class="queue-item-note">Ghi chú: ${order.note}</div>`
                    : "";

                return `
                    <div class="queue-item" data-index="${idx}" data-id="${order.id ?? ""}">
                        <div class="queue-item-left">
                            <div class="item-title">${code} <span>• ${count} món</span></div>
                            <div class="queue-item-meta">
                                <span class="item-time">${timeText}</span>
                                <span class="status-badge ${badgeClass}">${statusText}</span>
                            </div>
                            ${noteHtml}
                        </div>
                        ${actionsHtml}
                    </div>
                `;
            })
            .join("");

        queueList.querySelectorAll(".btn-accept").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const idx = Number(btn.dataset.index);
                const order = currentFilteredOrders[idx];
                if (order) await submitDecision(order, "accept");
            });
        });

        queueList.querySelectorAll(".btn-reject").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = Number(btn.dataset.index);
                const order = currentFilteredOrders[idx];
                if (order) openRejectModal(order);
            });
        });

        queueList.querySelectorAll(".queue-item").forEach((el) => {
            el.addEventListener("click", () => {
                const idx = Number(el.dataset.index);
                const order = currentFilteredOrders[idx];
                if (order) openOrderDetail(order);
            });
        });
    }

    function renderHistoryFromCache() {
        const historyList = document.getElementById("historyList");
        if (!historyList) return;
        const completed = allDayOrders.filter((o) => normalizeStatus(o.status) === "completed");
        if (!completed.length) {
            historyList.innerHTML = `<div class="empty-filter-state">Chưa có đơn hoàn thành trong ngày ${dateInput?.value || todayStr}.</div>`;
            return;
        }
        historyList.innerHTML = completed
            .map((o) => {
                const code = o.code || o.order_code || `#${o.id}`;
                const count = o.items_count ?? o.items?.length ?? 0;
                const timeText = o.slot_label || o.pickup_time || "";
                return `
                    <div class="queue-item">
                        <div class="item-title">${code} <span>• ${count} món</span></div>
                        <div class="item-time">${timeText} • Hoàn thành</div>
                    </div>
                `;
            })
            .join("");
    }

    function renderDetailView(order) {
        selectedOrderId = order.id ?? null;
        if (detailOrderCode) detailOrderCode.textContent = order.code || order.order_code || `#${order.id || "-"}`;
        if (detailPickupTime) detailPickupTime.textContent = order.slot_label || order.pickup_time || "-";
        if (detailKitchenNote) detailKitchenNote.textContent = order.note || order.kitchen_note || "Không có ghi chú";
        if (detailOrderStatus) detailOrderStatus.textContent = formatStatus(order.status);

        const items = Array.isArray(order.items) ? order.items : [];
        if (!detailDishList) return;

        if (!items.length) {
            detailDishList.innerHTML = `<div class="empty-filter-state">Đơn hàng chưa có danh sách món chi tiết từ API.</div>`;
            return;
        }

        detailDishList.innerHTML = items
            .map((item) => {
                const name = item.menu_item_name || item.name || item.title || "Món ăn";
                const qty = item.quantity ?? item.qty ?? 1;
                const note = item.note || "Theo công thức";
                return `
                    <div class="dish-item">
                        <span class="dish-name">${name}</span>
                        <span class="dish-meta">Số lượng: ${qty} • ${note}</span>
                    </div>
                `;
            })
            .join("");
    }

    async function openOrderDetail(order) {
        renderDetailView(order);
        switchView("detailView");

        if (!order?.id) return;
        const endpoints = [
            `${API_BASE}/kitchen/orders/${order.id}`,
            `${API_BASE}/orders/${order.id}`,
        ];

        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers: getAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    renderDetailView(data);
                    return;
                }
            } catch {
                // Thử endpoint tiếp theo
            }
        }
    }

    async function updateOrderStatus(newStatus) {
        if (!selectedOrderId) return;
        const endpoints = [
            `${API_BASE}/kitchen/orders/${selectedOrderId}/status`,
            `${API_BASE}/orders/${selectedOrderId}/status`,
        ];

        for (const url of endpoints) {
            try {
                const res = await fetch(url, {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status: newStatus }),
                });
                if (res.ok) {
                    if (detailOrderStatus) detailOrderStatus.textContent = formatStatus(newStatus);
                    await fetchOrdersByDate();
                    return;
                }
                const errData = await res.json().catch(() => ({}));
                alert(errData.detail || `Không thể cập nhật trạng thái (HTTP ${res.status})`);
                return;
            } catch {
                // Thử endpoint tiếp theo
            }
        }
    }

    startPrepBtn?.addEventListener("click", () => updateOrderStatus("preparing"));
    markReadyBtn?.addEventListener("click", () => updateOrderStatus("ready"));

    function applyFilterAndRender() {
        currentFilteredOrders = allDayOrders.filter(matchFilters);
        renderQueueList(currentFilteredOrders);
    }

    function extractArray(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.orders)) return payload.orders;
        if (Array.isArray(payload?.data)) return payload.data;
        return null;
    }

    async function fetchOrdersByDate() {
        const pickupDate = dateInput?.value || todayStr;
        if (queueList) {
            queueList.innerHTML = `<div class="empty-filter-state">Đang tải dữ liệu đơn hàng...</div>`;
        }

        const endpoints = [
            `${API_BASE}/kitchen/orders?pickup_date=${encodeURIComponent(pickupDate)}`,
            `${API_BASE}/orders/filter?pickup_date=${encodeURIComponent(pickupDate)}&limit=100`,
            `${API_BASE}/orders?pickup_date=${encodeURIComponent(pickupDate)}`,
        ];

        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers: getAuthHeaders() });
                if (!res.ok) continue;
                const raw = await res.json();
                const list = extractArray(raw);
                if (list) {
                    // Lọc chắc chắn theo ngày nếu backend trả dư ngày khác
                    allDayOrders = list.filter((o) => {
                        const d = extractDateOnly(o.pickup_date || o.scheduled_date || o.created_at || "");
                        return !d || d === pickupDate;
                    });
                    updateStatsCards(allDayOrders);
                    applyFilterAndRender();
                    renderHistoryFromCache();
                    return;
                }
            } catch {
                // Thử endpoint kế tiếp
            }
        }

        allDayOrders = [];
        updateStatsCards([]);
        if (queueList) {
            queueList.innerHTML = `<div class="empty-filter-state">Không tải được dữ liệu từ API (kiểm tra đăng nhập hoặc server backend).</div>`;
        }
    }

    function setActiveTab(tabEl) {
        tabs.forEach((t) => {
            t.classList.remove("tab-active");
            t.classList.add("tab-inactive");
        });
        if (tabEl) {
            tabEl.classList.remove("tab-inactive");
            tabEl.classList.add("tab-active");
            activeTab = tabEl.textContent.trim();
        }
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            setActiveTab(tab);
            // Đưa dropdown trạng thái về "Tất cả trạng thái" để không xung đột với tab
            if (statusSelect) statusSelect.value = "";
            applyFilterAndRender();
        });
    });

    dateInput?.addEventListener("change", fetchOrdersByDate);

    statusSelect?.addEventListener("change", () => {
        const val = statusSelect.value;
        // Nếu người dùng chọn trạng thái cụ thể ở dropdown, bỏ highlight tab để tránh hiểu nhầm
        if (val) {
            tabs.forEach((t) => {
                t.classList.remove("tab-active");
                t.classList.add("tab-inactive");
            });
        } else if (tabs[0]) {
            setActiveTab(tabs[0]);
        }
        applyFilterAndRender();
    });

    pickupTimeSelect?.addEventListener("change", applyFilterAndRender);
    searchInput?.addEventListener("input", applyFilterAndRender);

    resetBtn?.addEventListener("click", () => {
        if (dateInput) dateInput.value = todayStr;
        if (statusSelect) statusSelect.value = "";
        if (pickupTimeSelect) pickupTimeSelect.value = "";
        if (searchInput) searchInput.value = "";
        if (tabs[0]) setActiveTab(tabs[0]);
        clearFeedback();
        fetchOrdersByDate();
    });

    // Chạy lần đầu khi mở trang
    fetchOrdersByDate();
})();