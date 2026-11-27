const AUTO_REFRESH_MS = 10000;
let pollTimerId = null;
let isFetchingOrders = false;
let latestOrders = [];
let selectedOrderId = null;

const STATUS_META = {
  pending: { label: "Chờ xác nhận", headline: "Đơn hàng đang chờ xác nhận", stepIndex: 0 },
  confirmed: { label: "Đã xác nhận", headline: "Đơn hàng đã được xác nhận", stepIndex: 0 },
  preparing: { label: "Đang chuẩn bị", headline: "Đơn hàng đang được chuẩn bị", stepIndex: 1 },
  ready: { label: "Đang giao", headline: "Đơn hàng đang được giao", stepIndex: 2 },
  delivering: { label: "Đang giao", headline: "Đơn hàng đang được giao", stepIndex: 2 },
  completed: { label: "Đã giao", headline: "Đơn hàng đã hoàn thành", stepIndex: 3 },
  cancelled: { label: "Đã hủy", headline: "Đơn hàng đã bị hủy", stepIndex: 0 },
};

function getLocalTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getApiBaseUrl() {
  const configured =
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
    (typeof window.API_BASE_URL === "string" && window.API_BASE_URL) ||
    "";

  const cleaned = String(configured).trim().replace(/\/+$/, "");
  if (cleaned) return cleaned;

  if (window.location.port === "5500") {
    return "http://127.0.0.1:8000";
  }
  return "";
}

function getAuthToken() {
  const candidates = [
    localStorage.getItem("access_token"),
    localStorage.getItem("token"),
    localStorage.getItem("auth_token"),
    sessionStorage.getItem("access_token"),
    sessionStorage.getItem("token"),
  ];

  for (const val of candidates) {
    if (typeof val === "string") {
      const cleaned = val.trim().replace(/^"(.*)"$/, "$1");
      if (cleaned && cleaned !== "null" && cleaned !== "undefined") {
        return cleaned;
      }
    }
  }
  return "";
}

function extractOrders(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatCurrencyVND(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "-";
  }
  return `${Number(amount).toLocaleString("vi-VN")}đ`;
}

function formatDateTimeVi(isoStr) {
  if (!isoStr) return "-";
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return String(isoStr);
  return dt.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusMeta(status) {
  const key = String(status || "").toLowerCase().trim();
  return (
    STATUS_META[key] || {
      label: status || "-",
      headline: "Theo dõi trạng thái đơn hàng",
      stepIndex: 0,
    }
  );
}

async function fetchOrders(todayStr, statusFilter) {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const query = new URLSearchParams({
    pickup_date: todayStr,
    page: "1",
    limit: "100",
  });
  if (statusFilter) {
    query.set("status", statusFilter);
  }

  const res = await fetch(`${baseUrl}/api/orders/filter?${query.toString()}`, { headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const payload = await res.json();
  const raw = payload?.statusCode ? payload.data : payload;
  const todayItems = extractOrders(raw);
  if (todayItems.length > 0) {
    return { orders: todayItems, isFallbackAll: false };
  }

  // Nếu hôm nay chưa có đơn nào, fallback lấy danh sách đơn để có thể xem/tìm kiếm đơn gần nhất
  const fallbackRes = await fetch(`${baseUrl}/api/orders`, { headers });
  if (fallbackRes.ok) {
    const fallbackPayload = await fallbackRes.json();
    const fallbackRaw = fallbackPayload?.statusCode ? fallbackPayload.data : fallbackPayload;
    const allItems = extractOrders(fallbackRaw);
    return { orders: allItems, isFallbackAll: true };
  }

  return { orders: [], isFallbackAll: false };
}

function pickActiveOrder(orders) {
  const keyword = (
    document.getElementById("top-search-input")?.value ||
    document.getElementById("search-order-input")?.value ||
    ""
  )
    .trim()
    .toLowerCase();

  if (keyword) {
    const matched = orders.find((o) => {
      const code = String(o.code || o.id || "").toLowerCase();
      const customer = String(o.customer_name || "").toLowerCase();
      const title = String(o.title || "").toLowerCase();
      return code.includes(keyword) || customer.includes(keyword) || title.includes(keyword);
    });
    if (matched) {
      selectedOrderId = matched.id;
      return matched;
    }
  }

  if (selectedOrderId !== null) {
    const existing = orders.find((o) => Number(o.id) === Number(selectedOrderId));
    if (existing) return existing;
  }

  if (orders.length > 0) {
    selectedOrderId = orders[0].id;
    return orders[0];
  }

  return null;
}

function renderOrderDetail(order, isFallbackAll) {
  const titleEl = document.getElementById("page-status-title");
  const subtitleEl = document.getElementById("page-status-subtitle");
  const codeEl = document.getElementById("stat-order-code");
  const dishEl = document.getElementById("stat-restaurant-name");
  const amountEl = document.getElementById("stat-delivery-address");
  const statusEl = document.getElementById("stat-order-status");
  const driverNameEl = document.getElementById("driver-name");
  const driverPhoneEl = document.getElementById("driver-phone");
  const trackingCardEl = document.querySelector(".tracking-card");
  const stepEls = document.querySelectorAll(".progress-step");
  const activeLine = document.getElementById("progress-line-active");

  const isCancelled = String(order?.status || "").toLowerCase().trim() === "cancelled";

  if (trackingCardEl) {
    trackingCardEl.classList.toggle("is-cancelled", isCancelled);
  }
  if (statusEl) {
    statusEl.classList.toggle("is-cancelled", isCancelled);
  }

  if (!order) {
    if (titleEl) titleEl.textContent = "Chưa có đơn hàng nào";
    if (subtitleEl) subtitleEl.textContent = "Đang chờ đơn hàng mới từ hệ thống";
    if (codeEl) codeEl.textContent = "-";
    if (dishEl) dishEl.textContent = "-";
    if (amountEl) amountEl.textContent = "0đ";
    if (statusEl) statusEl.textContent = "-";
    if (driverNameEl) driverNameEl.textContent = "-";
    if (driverPhoneEl) driverPhoneEl.textContent = "";
    stepEls.forEach((el) => el.classList.remove("completed", "active"));
    if (activeLine) activeLine.style.width = "0%";
    return;
  }

  const meta = getStatusMeta(order.status);

  if (titleEl) titleEl.textContent = meta.headline;
  if (subtitleEl) {
    const timeText = formatDateTimeVi(order.created_at);
    if (isCancelled) {
      subtitleEl.textContent = `Đơn đã bị hủy • Tạo lúc ${timeText}`;
    } else {
      subtitleEl.textContent = isFallbackAll
        ? `Hiển thị đơn gần nhất (${timeText}) • Chưa có đơn ngày hôm nay`
        : `Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")} • Tạo lúc ${timeText}`;
    }
  }

  if (codeEl) codeEl.textContent = order.code || `#${order.id}`;
  if (dishEl) dishEl.textContent = order.title || order.restaurant_name || "-";
  if (amountEl) amountEl.textContent = formatCurrencyVND(order.total_amount);
  if (statusEl) statusEl.textContent = meta.label;

  if (driverNameEl) driverNameEl.textContent = order.customer_name || "-";
  if (driverPhoneEl) {
    const payStatus = order.payment_status || "-";
    const payMethod = order.payment_method ? ` (${order.payment_method})` : "";
    const cancelNote = isCancelled ? " • Đã hủy tiến trình giao" : "";
    driverPhoneEl.textContent = `Thanh toán: ${payStatus}${payMethod} • ${formatDateTimeVi(order.created_at)}${cancelNote}`;
  }

  if (isCancelled) {
    stepEls.forEach((el) => el.classList.remove("completed", "active"));
    if (activeLine) activeLine.style.width = "0%";
    return;
  }

  const stepIdx = meta.stepIndex;
  stepEls.forEach((el, i) => {
    el.classList.remove("completed", "active");
    if (stepIdx > i) el.classList.add("completed");
    else if (stepIdx === i) el.classList.add("active");
  });

  if (activeLine) {
    const totalSteps = Math.max(1, stepEls.length - 1);
    const pct = stepIdx <= 0 ? 0 : Math.min(100, (stepIdx / totalSteps) * 100);
    activeLine.style.width = `${pct}%`;
  }
}

async function loadTodayOrders() {
  if (isFetchingOrders) return;
  isFetchingOrders = true;

  const todayStr = getLocalTodayString();
  const statusFilter = document.getElementById("status-filter-select")?.value || "";

  try {
    const { orders, isFallbackAll } = await fetchOrders(todayStr, statusFilter);
    latestOrders = orders;
    const activeOrder = pickActiveOrder(latestOrders);
    renderOrderDetail(activeOrder, isFallbackAll);
  } catch (err) {
    console.error("Lỗi tải đơn hàng:", err);
    const subtitleEl = document.getElementById("page-status-subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = `Không tải được dữ liệu đơn hàng (${err.message})`;
    }
  } finally {
    isFetchingOrders = false;
  }
}

function stopAutoRefresh() {
  if (pollTimerId !== null) {
    clearInterval(pollTimerId);
    pollTimerId = null;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  const toggle = document.getElementById("auto-refresh-toggle");
  if (toggle && !toggle.checked) return;

  pollTimerId = setInterval(() => {
    if (!document.hidden) {
      loadTodayOrders();
    }
  }, AUTO_REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-manual-refresh")?.addEventListener("click", loadTodayOrders);
  document.getElementById("status-filter-select")?.addEventListener("change", loadTodayOrders);
  document.getElementById("top-search-input")?.addEventListener("input", () => {
    const activeOrder = pickActiveOrder(latestOrders);
    renderOrderDetail(activeOrder, false);
  });
  document.getElementById("search-order-input")?.addEventListener("input", () => {
    const activeOrder = pickActiveOrder(latestOrders);
    renderOrderDetail(activeOrder, false);
  });
  document.getElementById("auto-refresh-toggle")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      loadTodayOrders();
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  loadTodayOrders();
  startAutoRefresh();
});

window.addEventListener("beforeunload", stopAutoRefresh);
