const ADMIN_API = CONFIG.API_BASE_URL;
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}₫`;
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

async function adminGet(path) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const response = await fetch(`${ADMIN_API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`);
  return data?.statusCode ? data.data : data;
}

function showDashboardError(message) {
  const node = document.getElementById("dashboardState");
  node.textContent = message;
  node.className = "admin-state is-error";
  node.hidden = false;
}

function renderRecentOrders(orders) {
  const body = document.getElementById("dashboardRecentOrders");
  const recent = [...orders].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
  body.innerHTML = recent.map((order) => `<tr><td>${escape(order.code || `#${order.id}`)}</td><td>${escape(order.customer_name || "Khách hàng")}</td><td>${escape(order.title || "Đơn món ăn")}</td><td>${money(order.total_amount)}</td><td>${escape(order.status)}</td></tr>`).join("");
  if (!recent.length) body.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">Chưa có đơn hàng.</td></tr>';
}

function renderStock(ingredients) {
  const alerts = ingredients.filter((item) => Number(item.stock_quantity ?? 0) <= Number(item.min_stock ?? 0));
  document.getElementById("dashboardStockAlerts").textContent = alerts.length.toLocaleString("vi-VN");
  const node = document.getElementById("dashboardStockList");
  node.innerHTML = alerts.slice(0, 5).map((item) => `<div class="dashboard-stock-row"><strong>${escape(item.name)}</strong><span>${Number(item.stock_quantity || 0).toLocaleString("vi-VN")} / ${Number(item.min_stock || 0).toLocaleString("vi-VN")} ${escape(item.unit)} · ${Number(item.stock_quantity || 0) <= 0 ? "Đã hết" : "Sắp hết"}</span></div>`).join("");
  if (!alerts.length) node.innerHTML = '<p class="admin-muted">Không có nguyên liệu dưới ngưỡng.</p>';
}

function renderRevenueChart(orders) {
  const chart = document.getElementById("dashboardRevenueChart");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString("en-CA");
    const amount = orders.filter((order) => String(order.created_at || "").slice(0, 10) === key && order.status !== "cancelled")
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    return { date, amount };
  });
  const max = Math.max(1, ...days.map((day) => day.amount));
  chart.innerHTML = days.map((day, index) => `<div class="dashboard-chart-day"><span class="dashboard-chart-value">${day.amount ? money(day.amount) : "0₫"}</span><div class="dashboard-chart-track"><i class="${index === days.length - 1 ? "is-today" : ""}" style="height:${Math.max(3, Math.round(day.amount / max * 100))}%"></i></div><span>${day.date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}</span></div>`).join("");
}

async function loadDashboard() {
  const results = await Promise.allSettled([adminGet("/orders"), adminGet("/menu/dishes"), adminGet("/ingredients")]);
  const orders = results[0].status === "fulfilled" ? results[0].value : [];
  const dishes = results[1].status === "fulfilled" ? results[1].value : [];
  const ingredients = results[2].status === "fulfilled" ? results[2].value : [];
  const failures = results.filter((result) => result.status === "rejected");
  const today = new Date().toLocaleDateString("en-CA");
  const todayOrders = orders.filter((order) => String(order.created_at || "").slice(0, 10) === today && order.status !== "cancelled");
  document.getElementById("dashboardOrders").textContent = results[0].status === "fulfilled" ? todayOrders.length.toLocaleString("vi-VN") : "—";
  document.getElementById("dashboardDishes").textContent = results[1].status === "fulfilled" ? dishes.length.toLocaleString("vi-VN") : "—";
  document.getElementById("dashboardRevenue").textContent = results[0].status === "fulfilled" ? money(todayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)) : "—";
  if (results[0].status === "fulfilled") { renderRevenueChart(orders); renderRecentOrders(orders); }
  else {
    document.getElementById("dashboardRevenueChart").innerHTML = '<p class="admin-muted">Không tải được dữ liệu doanh thu.</p>';
    document.getElementById("dashboardRecentOrders").innerHTML = '<tr><td colspan="5" class="admin-empty-cell">Không tải được đơn hàng.</td></tr>';
  }
  if (results[2].status === "fulfilled") renderStock(ingredients);
  else {
    document.getElementById("dashboardStockAlerts").textContent = "—";
    document.getElementById("dashboardStockList").innerHTML = '<p class="admin-state is-error">Không tải được dữ liệu kho.</p>';
  }
  if (failures.length) showDashboardError("Một số dữ liệu chưa tải được. Kiểm tra quyền admin hoặc kết nối backend.");
  else document.getElementById("dashboardState").hidden = true;
}

document.getElementById("exportReport").addEventListener("click", async () => {
  const button = document.getElementById("exportReport");
  button.disabled = true;
  try {
    const orders = await adminGet("/orders");
    const rows = [["Mã đơn", "Khách hàng", "Trạng thái", "Thanh toán", "Tổng tiền", "Ngày tạo"], ...orders.map((o) => [o.code, o.customer_name, o.status, o.payment_status, o.total_amount, o.created_at])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "quickbite-orders.csv"; link.click(); URL.revokeObjectURL(url);
  } catch (error) { showDashboardError(error.message); }
  finally { button.disabled = false; }
});

loadDashboard();
