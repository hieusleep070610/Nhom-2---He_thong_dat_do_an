const state = {
  orders: [],
  activeTabStatus: "pending",
  pickupDate: getTodayDateString(),
  pickupSlotId: "",
  searchQuery: "",
  submittingOrderId: null,
  pendingRejectOrder: null,
};

const els = {
  pickupDateInput: document.getElementById("pickupDateInput"),
  pickupSlotSelect: document.getElementById("pickupSlotSelect"),
  refreshBtn: document.getElementById("refreshKitchenBtn"),
  searchInput: document.getElementById("kitchenSearchInput"),
  tabsContainer: document.getElementById("kitchenQueueTabs"),
  queueList: document.getElementById("kitchenQueueList"),
  feedbackBanner: document.getElementById("kitchenFeedbackBanner"),
  statPending: document.getElementById("statPendingCount"),
  statConfirmed: document.getElementById("statConfirmedCount"),
  statTotal: document.getElementById("statTotalCount"),
  statCancelled: document.getElementById("statCancelledCount"),
  rejectModal: document.getElementById("rejectReasonModal"),
  rejectBackdrop: document.getElementById("rejectModalBackdrop"),
  rejectOrderInfo: document.getElementById("rejectModalOrderInfo"),
  rejectReasonInput: document.getElementById("rejectReasonInput"),
  rejectReasonError: document.getElementById("rejectReasonError"),
  cancelRejectBtn: document.getElementById("cancelRejectBtn"),
  confirmRejectBtn: document.getElementById("confirmRejectBtn"),
};

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function showFeedback(message, type = "success") {
  els.feedbackBanner.textContent = message;
  els.feedbackBanner.className = `kitchen-feedback show ${type}`;
}

function clearFeedback() {
  els.feedbackBanner.textContent = "";
  els.feedbackBanner.className = "kitchen-feedback";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPickupSortKey(order) {
  const slotTime = order?.pickup_slot?.start_time || order?.pickup_time || "99:99:99";
  const createdTime = order?.created_at ? new Date(order.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const idNum = Number(order?.id ?? Number.MAX_SAFE_INTEGER);
  return { slotTime: String(slotTime), createdTime, idNum };
}

function sortOrdersByPickupTime(orders) {
  return [...orders].sort((a, b) => {
    const ka = getPickupSortKey(a);
    const kb = getPickupSortKey(b);
    if (ka.slotTime !== kb.slotTime) return ka.slotTime.localeCompare(kb.slotTime);
    if (ka.createdTime !== kb.createdTime) return ka.createdTime - kb.createdTime;
    return ka.idNum - kb.idNum;
  });
}

function extractOrdersList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function syncSlotOptions(orders) {
  const prevValue = state.pickupSlotId;
  const slotMap = new Map();

  for (const order of orders) {
    const slot = order?.pickup_slot;
    if (slot && slot.id != null) {
      const label = slot.label || `${slot.start_time ?? ""} - ${slot.end_time ?? ""}`.trim();
      slotMap.set(String(slot.id), {
        id: String(slot.id),
        label: label || `Khung #${slot.id}`,
        startTime: String(slot.start_time || "99:99:99"),
      });
    }
  }

  const sortedSlots = [...slotMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  els.pickupSlotSelect.innerHTML = `<option value="">Tất cả khung giờ nhận</option>`;
  for (const s of sortedSlots) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    els.pickupSlotSelect.appendChild(opt);
  }

  if (prevValue && slotMap.has(prevValue)) {
    els.pickupSlotSelect.value = prevValue;
  } else {
    state.pickupSlotId = "";
    els.pickupSlotSelect.value = "";
  }
}

function updateStats(orders) {
  let pending = 0;
  let confirmed = 0;
  let cancelled = 0;

  for (const order of orders) {
    const status = String(order?.status || "").toLowerCase();
    if (status === "pending") pending += 1;
    else if (status === "confirmed") confirmed += 1;
    else if (status === "cancelled") cancelled += 1;
  }

  els.statPending.textContent = String(pending);
  els.statConfirmed.textContent = String(confirmed);
  els.statTotal.textContent = String(orders.length);
  els.statCancelled.textContent = String(cancelled);
}

function getStatusBadgeHtml(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending") {
    return `<span class="status-badge status-pending">Chờ tiếp nhận</span>`;
  }
  if (normalized === "confirmed") {
    return `<span class="status-badge status-confirmed">Đã tiếp nhận</span>`;
  }
  if (normalized === "cancelled") {
    return `<span class="status-badge status-cancelled">Đã hủy / Từ chối</span>`;
  }
  return `<span class="status-badge">${escapeHtml(status || "Không rõ")}</span>`;
}

function getPickupTimeText(order) {
  const slot = order?.pickup_slot;
  if (slot?.label) return slot.label;
  if (slot?.start_time) return String(slot.start_time).slice(0, 5);
  return "Chưa rõ giờ nhận";
}

function getItemCount(order) {
  if (!Array.isArray(order?.items)) return Number(order?.item_count ?? 0);
  return order.items.reduce((sum, item) => sum + Number(item?.quantity ?? 1), 0);
}

function renderOrders() {
  const sorted = sortOrdersByPickupTime(state.orders);
  updateStats(sorted);

  const query = state.searchQuery.trim().toLowerCase();
  const filtered = sorted.filter((order) => {
    const status = String(order?.status || "").toLowerCase();
    if (state.activeTabStatus !== "all" && status !== state.activeTabStatus) {
      return false;
    }
    if (!query) return true;
    const code = String(order?.code || order?.id || "").toLowerCase();
    const note = String(order?.note || "").toLowerCase();
    const itemNames = Array.isArray(order?.items)
      ? order.items.map((i) => i?.dish_name || i?.name || "").join(" ").toLowerCase()
      : "";
    return code.includes(query) || note.includes(query) || itemNames.includes(query);
  });

  if (!filtered.length) {
    els.queueList.innerHTML = `
      <div class="queue-item">
        <div class="item-title">Không có đơn hàng nào khớp bộ lọc hiện tại.</div>
      </div>
    `;
    return;
  }

  els.queueList.innerHTML = filtered
    .map((order) => {
      const orderId = order.id;
      const code = order.code || `#${orderId}`;
      const itemCount = getItemCount(order);
      const pickupTime = getPickupTimeText(order);
      const status = String(order.status || "").toLowerCase();
      const isPending = status === "pending";
      const isBusy = state.submittingOrderId === orderId;

      const noteHtml = order.note
        ? `<div class="queue-item-note">Ghi chú: ${escapeHtml(order.note)}</div>`
        : "";

      const actionsHtml = isPending
        ? `
          <button
            type="button"
            class="btn-accept"
            data-action="accept"
            data-order-id="${escapeHtml(orderId)}"
            ${isBusy ? "disabled" : ""}
          >
            ${isBusy ? "Đang xử lý..." : "Tiếp nhận"}
          </button>
          <button
            type="button"
            class="btn-reject"
            data-action="reject"
            data-order-id="${escapeHtml(orderId)}"
            ${isBusy ? "disabled" : ""}
          >
            Từ chối
          </button>
        `
        : "";

      return `
        <div class="queue-item" data-order-id="${escapeHtml(orderId)}">
          <div class="queue-item-left">
            <div class="item-title">
              ${escapeHtml(code)} <span>• ${escapeHtml(itemCount)} món</span>
            </div>
            <div class="queue-item-meta">
              <span class="item-time">Giờ nhận: <strong>${escapeHtml(pickupTime)}</strong></span>
              ${getStatusBadgeHtml(status)}
            </div>
            ${noteHtml}
          </div>
          <div class="queue-item-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadKitchenOrders() {
  els.refreshBtn.disabled = true;
  try {
    const params = {
      pickup_date: state.pickupDate,
    };
    if (state.pickupSlotId) {
      params.pickup_slot_id = state.pickupSlotId;
    }

    const data = await api.get("/kitchen/orders", params);
    const list = extractOrdersList(data);
    state.orders = sortOrdersByPickupTime(list);
    syncSlotOptions(state.orders);
    renderOrders();
  } catch (err) {
    els.queueList.innerHTML = `
      <div class="queue-item">
        <div class="item-title">Không tải được danh sách đơn bếp.</div>
        <div class="item-time">${escapeHtml(err?.message || "Lỗi không xác định")}</div>
      </div>
    `;
    showFeedback(err?.message || "Không tải được danh sách đơn nhà bếp.", "error");
  } finally {
    els.refreshBtn.disabled = false;
  }
}

async function submitOrderDecision(orderId, action, reason = null) {
  state.submittingOrderId = orderId;
  renderOrders();
  clearFeedback();

  try {
    const body = action === "reject"
      ? { action: "reject", reason: reason.trim() }
      : { action: "accept" };

    const res = await http.patch(`/kitchen/orders/${orderId}/decision`, body);
    const payload = res?.data;
    showFeedback(
      payload?.message || (action === "accept" ? "Đã tiếp nhận đơn." : "Đã từ chối đơn."),
      "success",
    );
    await loadKitchenOrders();
  } catch (err) {
    showFeedback(err?.message || "Không thể cập nhật quyết định cho đơn.", "error");
  } finally {
    state.submittingOrderId = null;
    renderOrders();
  }
}

function openRejectModal(order) {
  state.pendingRejectOrder = order;
  const code = order?.code || `#${order?.id}`;
  els.rejectOrderInfo.textContent = `Đơn ${code} • Giờ nhận: ${getPickupTimeText(order)}`;
  els.rejectReasonInput.value = "";
  els.rejectReasonError.textContent = "";
  els.rejectModal.classList.remove("hidden");
  els.rejectModal.setAttribute("aria-hidden", "false");
  els.rejectReasonInput.focus();
}

function closeRejectModal() {
  state.pendingRejectOrder = null;
  els.rejectReasonError.textContent = "";
  els.rejectModal.classList.add("hidden");
  els.rejectModal.setAttribute("aria-hidden", "true");
}

function bindEvents() {
  els.pickupDateInput.value = state.pickupDate;

  els.pickupDateInput.addEventListener("change", (e) => {
    state.pickupDate = e.target.value || getTodayDateString();
    loadKitchenOrders();
  });

  els.pickupSlotSelect.addEventListener("change", (e) => {
    state.pickupSlotId = e.target.value;
    loadKitchenOrders();
  });

  els.refreshBtn.addEventListener("click", () => {
    loadKitchenOrders();
  });

  els.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value || "";
    renderOrders();
  });

  els.tabsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-status]");
    if (!btn) return;
    state.activeTabStatus = btn.dataset.status;

    for (const tabBtn of els.tabsContainer.querySelectorAll("button[data-status]")) {
      const isSelected = tabBtn === btn;
      tabBtn.className = isSelected ? "tab-active" : "tab-inactive";
    }
    renderOrders();
  });

  els.queueList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action][data-order-id]");
    if (!btn || btn.disabled) return;

    const orderId = Number(btn.dataset.orderId);
    const action = btn.dataset.action;
    const order = state.orders.find((o) => Number(o.id) === orderId);
    if (!order) return;

    if (action === "accept") {
      submitOrderDecision(orderId, "accept");
    } else if (action === "reject") {
      openRejectModal(order);
    }
  });

  els.cancelRejectBtn.addEventListener("click", closeRejectModal);
  els.rejectBackdrop.addEventListener("click", closeRejectModal);

  els.confirmRejectBtn.addEventListener("click", async () => {
    const order = state.pendingRejectOrder;
    if (!order) return;

    const reason = els.rejectReasonInput.value.trim();
    if (!reason) {
      els.rejectReasonError.textContent = "Vui lòng nhập lý do từ chối đơn.";
      els.rejectReasonInput.focus();
      return;
    }

    const orderId = Number(order.id);
    closeRejectModal();
    await submitOrderDecision(orderId, "reject", reason);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadKitchenOrders();
});