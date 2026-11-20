const PROCESSING = new Set(["pending", "confirmed", "preparing", "ready"]);

const listEl = document.getElementById("order-list");
const searchEl = document.getElementById("order-search");
let orders = [];
let filter = "all";

function groupOf(status) {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return PROCESSING.has(status) ? "processing" : "processing";
}

function visibleOrders() {
  const keyword = searchEl.value.trim().toLowerCase();
  return orders.filter((order) => {
    const matchesFilter = filter === "all" || groupOf(order.status) === filter;
    const matchesSearch = !keyword || `${order.title} ${order.code}`.toLowerCase().includes(keyword);
    return matchesFilter && matchesSearch;
  });
}

function renderRows(rows) {
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
  document.getElementById("count-all").textContent = String(counts.all);
  document.getElementById("count-processing").textContent = String(counts.processing);
  document.getElementById("count-completed").textContent = String(counts.completed);
  document.getElementById("count-cancelled").textContent = String(counts.cancelled);
  renderRows(visibleOrders());
}

document.getElementById("order-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  document.querySelectorAll("#order-filters .metric-card").forEach((card) => {
    card.classList.toggle("is-selected", card === button);
  });
  render();
});

searchEl.addEventListener("input", render);

async function loadOrders() {
  try {
    const data = await api.get("/orders/mine");
    orders = Array.isArray(data) ? data : [];
    render();
  } catch (error) {
    orders = [];
    render();
    if (error.status === 401) {
      listEl.innerHTML = '<p class="cart-empty">Hãy <a href="login.html">đăng nhập</a> để xem đơn hàng của bạn.</p>';
    } else {
      listEl.innerHTML = `<p class="cart-empty">${escapeHtml(error.message || "Không tải được đơn hàng.")}</p>`;
    }
  }
}

loadOrders();
