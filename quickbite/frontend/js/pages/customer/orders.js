const PROCESSING = new Set(["pending", "confirmed", "preparing", "ready"]);

const listEl = document.getElementById("order-list");
const searchEl = document.getElementById("order-search");
let orders = [];
let filter = "all";

function groupOf(status) {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (PROCESSING.has(status)) return "processing";
  return "processing";
}

function readLocalOrders() {
  try {
    const rows = JSON.parse(localStorage.getItem("foodie_orders") || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    return [];
  }
}

function visibleOrders() {
  const keyword = searchEl.value.trim().toLowerCase();
  return orders.filter((order) => {
    const group = groupOf(order.status);
    const matchesFilter = filter === "all" || group === filter;
    const matchesSearch = !keyword || String(order.title).toLowerCase().includes(keyword);
    return matchesFilter && matchesSearch;
  });
}

const DESIGN_ROWS = [
  "Bún bò Huế",
  "Cơm gà xối mỡ",
  "Salad cá hồi",
  "Mì Ý bò bằm",
  "Trà đào cam sả",
];

function renderRows(titles) {
  if (!titles.length) {
    listEl.innerHTML = '<p class="cart-empty">Chưa có đơn hàng trong mục này.</p>';
    return;
  }
  listEl.innerHTML = titles.map((title) => `
    <div class="data-row">
      <span>${escapeHtml(title)}</span>
      <a href="dish.html">Xem chi tiết →</a>
    </div>`).join("");
}

function render() {
  if (!orders.length) {
    document.getElementById("count-all").textContent = "12";
    document.getElementById("count-processing").textContent = "2";
    document.getElementById("count-completed").textContent = "9";
    document.getElementById("count-cancelled").textContent = "1";
    renderRows(DESIGN_ROWS);
    return;
  }

  const counts = { all: orders.length, processing: 0, completed: 0, cancelled: 0 };
  orders.forEach((order) => {
    counts[groupOf(order.status)] += 1;
  });
  document.getElementById("count-all").textContent = String(counts.all);
  document.getElementById("count-processing").textContent = String(counts.processing);
  document.getElementById("count-completed").textContent = String(counts.completed);
  document.getElementById("count-cancelled").textContent = String(counts.cancelled);
  renderRows(visibleOrders().map((order) => order.title));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
  const localOrders = readLocalOrders();
  let remote = [];
  try {
    const data = await api.get("/orders");
    if (Array.isArray(data)) remote = data;
  } catch (error) {
    remote = [];
  }
  const seen = new Set();
  orders = [...localOrders, ...remote].filter((order) => {
    const key = `${order.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return order.title;
  });
  render();
}

loadOrders();
