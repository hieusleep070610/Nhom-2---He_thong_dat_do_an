const ORDER_STATUS_META = {
  pending: { label: "Chờ xác nhận", tone: "pending" },
  confirmed: { label: "Đã xác nhận", tone: "confirmed" },
  preparing: { label: "Đang chuẩn bị", tone: "preparing" },
  ready: { label: "Sẵn sàng nhận", tone: "ready" },
  completed: { label: "Hoàn tất", tone: "completed" },
  cancelled: { label: "Đã hủy", tone: "cancelled" },
};

const PAGE_LIMIT = 8;

const listEl = document.getElementById("order-list");
const paginationEl = document.getElementById("order-pagination");
const summaryEl = document.getElementById("orders-summary-text");
const searchEl = document.getElementById("order-search");
const statusSelectEl = document.getElementById("order-status-select");
const statusTabsEl = document.getElementById("order-status-tabs");

const modalBackdropEl = document.getElementById("order-detail-modal");
const modalTitleEl = document.getElementById("order-detail-title");
const modalSubtitleEl = document.getElementById("order-detail-subtitle");
const modalBodyEl = document.getElementById("order-detail-body");
const closeModalBtn = document.getElementById("close-order-detail");

const state = {
  status: "",
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  items: [],
  keyword: "",
  loading: false,
  error: null,
};

function getStatusBadge(status) {
  const key = String(status || "").trim().toLowerCase();
  const meta = ORDER_STATUS_META[key] || {
    label: status || "Không rõ",
    tone: "default",
  };
  return `<span class="order-badge order-badge--${escapeHtml(meta.tone)}">${escapeHtml(meta.label)}</span>`;
}

function syncFilterControls() {
  statusSelectEl.value = state.status;
  statusTabsEl.querySelectorAll("[data-status]").forEach((btn) => {
    const active = (btn.dataset.status || "") === state.status;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
}

function setStatusFilter(nextStatus) {
  state.status = (nextStatus || "").trim().toLowerCase();
  state.page = 1;
  syncFilterControls();
  loadOrders();
}

function filteredItems() {
  const kw = state.keyword.trim().toLowerCase();
  if (!kw) return state.items;
  return state.items.filter((order) => {
    const code = String(order.code || "").toLowerCase();
    const idStr = String(order.id || "");
    const pickupDate = String(order.pickup_date || "").toLowerCase();
    return code.includes(kw) || idStr.includes(kw) || pickupDate.includes(kw);
  });
}

function renderLoading() {
  summaryEl.textContent = "Đang tải...";
  paginationEl.innerHTML = "";
  listEl.innerHTML = `
    <div class="orders-state orders-state--loading" role="status">
      <div class="orders-spinner" aria-hidden="true"></div>
      <p>Đang tải danh sách đơn hàng...</p>
    </div>
  `;
}

function renderError(error) {
  summaryEl.textContent = "";
  paginationEl.innerHTML = "";

  if (error && error.status === 401) {
    listEl.innerHTML = `
      <div class="orders-state orders-state--error" role="alert">
        <p>Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.</p>
        <a class="orders-btn orders-btn--primary" href="login.html">Đăng nhập ngay</a>
      </div>
    `;
    return;
  }

  const message = error && error.message ? error.message : "Không thể tải danh sách đơn hàng.";
  listEl.innerHTML = `
    <div class="orders-state orders-state--error" role="alert">
      <p>${escapeHtml(message)}</p>
      <button type="button" class="orders-btn orders-btn--primary" id="retry-orders-btn">Thử lại</button>
    </div>
  `;

  document.getElementById("retry-orders-btn")?.addEventListener("click", () => {
    loadOrders();
  });
}

function renderList() {
  if (state.loading) {
    renderLoading();
    return;
  }

  if (state.error) {
    renderError(state.error);
    return;
  }

  const rows = filteredItems();
  summaryEl.textContent = state.total > 0 ? `Tổng cộng ${state.total} đơn hàng` : "";

  if (!rows.length) {
    listEl.innerHTML = `
      <div class="orders-state orders-state--empty">
        <p>${
          state.keyword
            ? "Không có đơn hàng nào khớp với từ khóa tìm kiếm trên trang này."
            : "Chưa có đơn hàng nào trong mục này."
        }</p>
        <a class="orders-btn orders-btn--secondary" href="menu.html">Khám phá thực đơn</a>
      </div>
    `;
    renderPagination();
    return;
  }

  listEl.innerHTML = `
    <div class="order-card-list">
      ${rows
        .map((order) => {
          const createdText = order.created_at ? formatDateTime(order.created_at) : "—";
          const pickupText = order.pickup_date ? escapeHtml(order.pickup_date) : "—";
          const slotText = order.pickup_slot_id ? `Khung giờ #${escapeHtml(order.pickup_slot_id)}` : "";
          return `
            <article class="order-card" data-order-id="${escapeHtml(order.id)}">
              <div class="order-card__top">
                <div class="order-card__code-group">
                  <strong class="order-card__code">${escapeHtml(order.code || `#${order.id}`)}</strong>
                  ${getStatusBadge(order.status)}
                </div>
                <span class="order-card__total">${formatMoney(order.total_amount ?? 0)}</span>
              </div>

              <div class="order-card__meta">
                <span>Đặt lúc: <strong>${escapeHtml(createdText)}</strong></span>
                <span>Ngày nhận: <strong>${pickupText}</strong>${slotText ? ` · ${slotText}` : ""}</span>
              </div>

              <div class="order-card__actions">
                <button
                  type="button"
                  class="orders-btn orders-btn--ghost btn-view-detail"
                  data-order-id="${escapeHtml(order.id)}"
                >
                  Xem chi tiết
                </button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil((state.total || 0) / state.limit));
  if (state.total <= state.limit && state.page === 1) {
    paginationEl.innerHTML = "";
    return;
  }

  const prevDisabled = state.page <= 1 ? "disabled" : "";
  const nextDisabled = state.page >= totalPages ? "disabled" : "";

  paginationEl.innerHTML = `
    <button type="button" class="orders-page-btn" id="prev-page-btn" ${prevDisabled}>Trang trước</button>
    <span class="orders-page-info">Trang <strong>${state.page}</strong> / ${totalPages}</span>
    <button type="button" class="orders-page-btn" id="next-page-btn" ${nextDisabled}>Trang sau</button>
  `;

  document.getElementById("prev-page-btn")?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      loadOrders();
    }
  });

  document.getElementById("next-page-btn")?.addEventListener("click", () => {
    if (state.page < totalPages) {
      state.page += 1;
      loadOrders();
    }
  });
}

async function loadOrders() {
  state.loading = true;
  state.error = null;
  renderList();

  const params = {
    page: state.page,
    limit: state.limit,
  };
  if (state.status) {
    params.status = state.status;
  }

  try {
    const res = await api.get("/orders/me", params);
    state.total = Number(res?.total ?? 0);
    state.page = Number(res?.page ?? state.page);
    state.limit = Number(res?.limit ?? state.limit);
    state.items = Array.isArray(res?.items) ? res.items : [];
    state.loading = false;
    state.error = null;
    renderList();
  } catch (error) {
    state.loading = false;
    state.error = error;
    state.items = [];
    state.total = 0;
    renderList();
  }
}

function openDetailModal() {
  modalBackdropEl.hidden = false;
  document.body.classList.add("modal-open");
}

function closeDetailModal() {
  modalBackdropEl.hidden = true;
  document.body.classList.remove("modal-open");
  modalBodyEl.innerHTML = "";
}

function renderOrderDetail(detail) {
  modalTitleEl.textContent = `Đơn hàng ${detail.code || `#${detail.id}`}`;
  modalSubtitleEl.textContent = detail.created_at
    ? `Đặt lúc ${formatDateTime(detail.created_at)}`
    : "";

  const items = Array.isArray(detail.items) ? detail.items : [];
  const itemsHtml = items.length
    ? `
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Món ăn</th>
            <th class="num">SL</th>
            <th class="num">Đơn giá</th>
            <th class="num">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              const lineTotal =
                item.line_total ?? Number(item.unit_price || 0) * Number(item.quantity || 1);
              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(item.item_name)}</strong>
                    ${item.item_code ? `<br><small class="muted-code">${escapeHtml(item.item_code)}</small>` : ""}
                  </td>
                  <td class="num">${escapeHtml(item.quantity)}</td>
                  <td class="num">${formatMoney(item.unit_price ?? 0)}</td>
                  <td class="num"><strong>${formatMoney(lineTotal)}</strong></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `
    : `<p class="orders-muted">Không có danh sách món chi tiết.</p>`;

  modalBodyEl.innerHTML = `
    <div class="order-detail-meta">
      <div class="detail-row">
        <span>Trạng thái</span>
        <span>${getStatusBadge(detail.status)}</span>
      </div>
      <div class="detail-row">
        <span>Người nhận</span>
        <strong>${escapeHtml(detail.customer_name || "—")}</strong>
      </div>
      <div class="detail-row">
        <span>Số điện thoại</span>
        <strong>${escapeHtml(detail.customer_phone || "—")}</strong>
      </div>
      <div class="detail-row">
        <span>Ngày & khung giờ nhận</span>
        <strong>${escapeHtml(detail.pickup_date || "—")}${
          detail.pickup_slot_id ? ` · Slot #${escapeHtml(detail.pickup_slot_id)}` : ""
        }</strong>
      </div>
      ${
        detail.note
          ? `<div class="detail-row detail-row--col">
              <span>Ghi chú đơn hàng</span>
              <p class="detail-note">${escapeHtml(detail.note)}</p>
            </div>`
          : ""
      }
    </div>

    <h3 class="order-detail-section-title">Danh sách món</h3>
    ${itemsHtml}

    <div class="order-detail-total">
      <span>Tổng thanh toán</span>
      <strong>${formatMoney(detail.total_amount ?? 0)}</strong>
    </div>
  `;
}

async function handleOpenOrderDetail(orderId) {
  if (!orderId) return;
  modalTitleEl.textContent = "Đang tải chi tiết đơn hàng...";
  modalSubtitleEl.textContent = "";
  modalBodyEl.innerHTML = `
    <div class="orders-state orders-state--loading">
      <div class="orders-spinner" aria-hidden="true"></div>
      <p>Đang lấy thông tin chi tiết...</p>
    </div>
  `;
  openDetailModal();

  try {
    const detail = await api.get(`/orders/me/${encodeURIComponent(orderId)}`);
    renderOrderDetail(detail);
  } catch (error) {
    const msg =
      error?.status === 404
        ? "Không tìm thấy đơn hàng hoặc đơn không thuộc tài khoản của bạn."
        : error?.message || "Không tải được chi tiết đơn hàng.";
    modalBodyEl.innerHTML = `
      <div class="orders-state orders-state--error" role="alert">
        <p>${escapeHtml(msg)}</p>
        <button type="button" class="orders-btn orders-btn--ghost" id="retry-detail-btn">Thử lại</button>
      </div>
    `;
    document.getElementById("retry-detail-btn")?.addEventListener("click", () => {
      handleOpenOrderDetail(orderId);
    });
  }
}

statusTabsEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-status]");
  if (!btn) return;
  setStatusFilter(btn.dataset.status);
});

statusSelectEl.addEventListener("change", (event) => {
  setStatusFilter(event.target.value);
});

searchEl.addEventListener("input", (event) => {
  state.keyword = event.target.value || "";
  renderList();
});

listEl.addEventListener("click", (event) => {
  const btn = event.target.closest(".btn-view-detail");
  const card = event.target.closest(".order-card");
  const orderId = btn?.dataset.orderId || card?.dataset.orderId;
  if (orderId) {
    handleOpenOrderDetail(orderId);
  }
});

closeModalBtn.addEventListener("click", closeDetailModal);
modalBackdropEl.addEventListener("click", (event) => {
  if (event.target === modalBackdropEl) {
    closeDetailModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdropEl.hidden) {
    closeDetailModal();
  }
});

syncFilterControls();
loadOrders();