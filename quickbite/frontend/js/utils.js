// Các hàm tiện ích dùng chung cho nhiều trang.

// Chống XSS: luôn dùng hàm này khi chèn dữ liệu người dùng nhập vào innerHTML
const QB_CART_KEY = typeof CART_KEY !== "undefined" ? CART_KEY : "quickbite_cart";
const QB_DRAFT_ORDER_KEY = "quickbite_active_order";
const QB_ORDERS_KEY = "quickbite_orders";
const QB_SHIP_FEE = 15000;
const QB_FREE_SHIP_FROM = 150000;

function qbGetCart() {
  if (typeof readCart === "function") {
    const data = readCart();
    if (Array.isArray(data)) return data;
  }
  try {
    return JSON.parse(localStorage.getItem(QB_CART_KEY) || "[]") || [];
  } catch {
    return [];
  }
}

function qbSetCart(items) {
  if (typeof writeCart === "function") {
    writeCart(items);
  }
  localStorage.setItem(QB_CART_KEY, JSON.stringify(items));
}

function qbAddOneAndSyncOrder(newItem) {
  const cart = qbGetCart();
  const qtyToAdd = Math.max(1, Number(newItem.qty || 1));
  const unitPrice = Number(newItem.unitPrice ?? newItem.price ?? 0);
  const size = newItem.size || "medium";
  const toppings = Array.isArray(newItem.toppings) ? newItem.toppings : [];
  const sortedToppings = [...toppings].sort();

  const existingIndex = cart.findIndex((it) => {
    const sameDish = Number(it.dish_id) === Number(newItem.dish_id);
    const sameSize = (it.size || "medium") === size;
    const sameToppings =
      JSON.stringify([...(it.toppings || [])].sort()) === JSON.stringify(sortedToppings);
    return sameDish && sameSize && sameToppings;
  });

  if (existingIndex > -1) {
    cart[existingIndex].qty = Math.min(99, Number(cart[existingIndex].qty || 0) + qtyToAdd);
    cart[existingIndex].unitPrice = unitPrice;
  } else {
    cart.push({
      dish_id: Number(newItem.dish_id),
      name: newItem.name,
      size,
      toppings,
      unitPrice,
      qty: qtyToAdd,
      tone: newItem.tone || "peach",
    });
  }

  qbSetCart(cart);
  return qbSyncCartToProcessingOrder(cart);
}

function qbSyncCartToProcessingOrder(cart = qbGetCart()) {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 1),
    0
  );
  const ship = subtotal > 0 && subtotal < QB_FREE_SHIP_FROM ? QB_SHIP_FEE : 0;
  const totalAmount = subtotal + ship;

  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(QB_DRAFT_ORDER_KEY) || "null");
  } catch {
    draft = null;
  }

  // Chỉ tái sử dụng đơn nếu đơn đang ở trạng thái xử lý (pending)
  if (!draft || typeof draft !== "object" || draft.status !== "pending") {
    const id = Date.now();
    draft = {
      id,
      code: `DH-${String(id).slice(-4)}`,
      status: "pending", // Đang xử lý (chờ thanh toán)
      customer_name: "Khách hàng",
      customer_phone: "0912345678",
      pickup_date: new Date().toISOString().slice(0, 10),
      pickup_slot_id: 1,
      items: [],
      subtotal: 0,
      ship: 0,
      total_amount: 0,
    };
  }

  draft.items = cart.map((item) => {
    const unitPrice = Number(item.unitPrice || 0);
    const qty = Number(item.qty || 1);
    const noteParts = [];
    if (item.size) noteParts.push(`Size ${{small:"nhỏ",medium:"vừa",large:"lớn"}[item.size] || item.size}`);
    if (Array.isArray(item.toppings) && item.toppings.length) {
      noteParts.push(`Topping: ${item.toppings.join(", ")}`);
    }
    return {
      dish_id: Number(item.dish_id),
      item_name: item.name,
      size: item.size || "medium",
      toppings: item.toppings || [],
      unit_price: unitPrice,
      quantity: qty,
      line_total: unitPrice * qty,
      note: noteParts.join(" · "),
    };
  });

  draft.subtotal = subtotal;
  draft.ship = ship;
  draft.total_amount = totalAmount;
  draft.title = draft.items.length
    ? `${draft.code} — ${draft.items.map((i) => `${i.item_name} ×${i.quantity}`).join(", ")}`
    : `${draft.code} (Đang xử lý)`;
  draft.updated_at = new Date().toISOString();

  localStorage.setItem(QB_DRAFT_ORDER_KEY, JSON.stringify(draft));
  return draft;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// 45000 -> "45.000 ₫"
function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " ₫";
}

// "2026-11-04T09:30:00" -> "09:30 4/11/2026"
function formatDateTime(value) {
  const d = new Date(value);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " +
    d.toLocaleDateString("vi-VN");
}

// Hiện thông báo nhỏ ở góc màn hình. type: "success" | "error"
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
