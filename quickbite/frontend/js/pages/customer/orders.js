const PROCESSING = new Set(["pending", "confirmed", "preparing", "ready"]);

let orders = [];
let filter = "all";

function getListEl() {
  return document.getElementById("order-list");
}

function getSearchEl() {
  return document.getElementById("order-search");
}

function groupOf(status) {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return PROCESSING.has(status) ? "processing" : "processing";
}

function visibleOrders() {
  const searchEl = getSearchEl();
  const keyword = searchEl ? searchEl.value.trim().toLowerCase() : "";
  return orders.filter((order) => {
    const matchesFilter = filter === "all" || groupOf(order.status) === filter;
    const matchesSearch = !keyword || `${order.title} ${order.code}`.toLowerCase().includes(keyword);
    return matchesFilter && matchesSearch;
  });
}

function renderRows(rows) {
  const listEl = getListEl();
  if (!listEl) return;
  if (!rows.length) {
    listEl.innerHTML = '<p class="cart-empty">Chưa có đơn hàng trong mục này.</p>';
    return;
  }
  listEl.innerHTML = rows.map((order) => `
    <div class="data-row">
      <span><strong>${escapeHtml(order.title)}</strong><br><small>${escapeHtml(order.code)} · ${escapeHtml(order.pickup_date || "")}</small></span>
      <span>${formatMoney(order.total_amount)} · ${escapeHtml(order.status)}</span>
    </div>`).join("");
}

function render() {
  const counts = { all: orders.length, processing: 0, completed: 0, cancelled: 0 };
  orders.forEach((order) => { counts[groupOf(order.status)] += 1; });
  const countAll = document.getElementById("count-all");
  const countProcessing = document.getElementById("count-processing");
  const countCompleted = document.getElementById("count-completed");
  const countCancelled = document.getElementById("count-cancelled");
  if (countAll) countAll.textContent = String(counts.all);
  if (countProcessing) countProcessing.textContent = String(counts.processing);
  if (countCompleted) countCompleted.textContent = String(counts.completed);
  if (countCancelled) countCancelled.textContent = String(counts.cancelled);
  renderRows(visibleOrders());
}

async function loadOrders() {
  const listEl = getListEl();
  try {
    const data = await api.get("/orders/mine");
    orders = Array.isArray(data) ? data : [];
    render();
  } catch (error) {
    orders = [];
    render();
    if (!listEl) return;
    if (error.status === 401) {
      listEl.innerHTML = '<p class="cart-empty">Hãy <a href="login.html">đăng nhập</a> để xem đơn hàng của bạn.</p>';
    } else {
      listEl.innerHTML = `<p class="cart-empty">${escapeHtml(error.message || "Không tải được đơn hàng.")}</p>`;
    }
  }
}

function initOrdersPage() {
  const filtersEl = document.getElementById("order-filters");
  if (filtersEl) {
    filtersEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      filter = button.dataset.filter;
      document.querySelectorAll("#order-filters .metric-card").forEach((card) => {
        card.classList.toggle("is-selected", card === button);
      });
      render();
    });
  }

  const searchEl = getSearchEl();
  if (searchEl) {
    searchEl.addEventListener("input", render);
  }

  loadOrders();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOrdersPage);
} else {
  initOrdersPage();
}