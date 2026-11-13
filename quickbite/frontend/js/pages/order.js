// Trang tĩnh: chọn món và giờ nhận. Không gọi API.
// Thực đơn và khung giờ nằm trong file này; đơn xác nhận chỉ lưu localStorage.

const MENU_ITEMS = [
  { id: "com-ga", name: "Cơm gà xối mỡ", price: 45000, category: "Cơm", note: "Gà chiên giòn, dưa góp" },
  { id: "com-suon", name: "Cơm sườn nướng", price: 50000, category: "Cơm", note: "Sườn mật ong, trứng ốp" },
  { id: "com-ca", name: "Cơm cá kho", price: 40000, category: "Cơm", note: "Cá basa kho tiêu" },
  { id: "pho-bo", name: "Phở bò tái", price: 55000, category: "Món nước", note: "Nước dùng trong, bánh phở" },
  { id: "bun-cha", name: "Bún chả Hà Nội", price: 50000, category: "Món nước", note: "Chả nướng, nước mắm chua ngọt" },
  { id: "banh-mi", name: "Bánh mì thịt", price: 25000, category: "Món nước", note: "Pate, chả, đồ chua" },
  { id: "tra-da", name: "Trà đá", price: 5000, category: "Đồ uống", note: "Ly lớn" },
  { id: "ca-phe", name: "Cà phê sữa đá", price: 20000, category: "Đồ uống", note: "Pha phin" },
  { id: "nuoc-suoi", name: "Nước suối", price: 10000, category: "Đồ uống", note: "Chai 500ml" },
];

const SLOT_START = 10 * 60 + 30;
const SLOT_END = 19 * 60;
const SLOT_STEP = 30;
const LEAD_MINUTES = 30;
const STORAGE_KEY = "ks25-pickup-order";

const menuList = document.getElementById("menu-list");
const categoryFilters = document.getElementById("category-filters");
const timeSlots = document.getElementById("time-slots");
const slotHint = document.getElementById("slot-hint");
const pickupDate = document.getElementById("pickup-date");
const cartBox = document.getElementById("cart");
const form = document.getElementById("order-form");
const receiptBox = document.getElementById("receipt");

const categories = ["Tất cả", ...new Set(MENU_ITEMS.map((item) => item.category))];

const state = {
  category: "Tất cả",
  qty: Object.fromEntries(MENU_ITEMS.map((item) => [item.id, 0])),
  time: "",
};

function todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatSlot(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function slotsForDate(dateValue) {
  const isToday = dateValue === todayString();
  const earliest = minutesNow() + LEAD_MINUTES;
  const slots = [];
  for (let minute = SLOT_START; minute <= SLOT_END; minute += SLOT_STEP) {
    slots.push({
      label: formatSlot(minute),
      disabled: isToday && minute < earliest,
    });
  }
  return slots;
}

function selectedLines() {
  return MENU_ITEMS
    .filter((item) => state.qty[item.id] > 0)
    .map((item) => ({ ...item, qty: state.qty[item.id], lineTotal: item.price * state.qty[item.id] }));
}

function orderTotal(lines) {
  return lines.reduce((sum, line) => sum + line.lineTotal, 0);
}

function renderFilters() {
  categoryFilters.innerHTML = categories.map((category) => `
    <button type="button" class="chip ${category === state.category ? "active" : ""}" data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>`).join("");
}

function renderMenu() {
  const visible = MENU_ITEMS.filter((item) => state.category === "Tất cả" || item.category === state.category);
  menuList.innerHTML = visible.map((item) => {
    const qty = state.qty[item.id];
    return `
      <article class="dish-card ${qty > 0 ? "is-picked" : ""}">
        <div class="dish-top">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="muted">${escapeHtml(item.category)} · ${escapeHtml(item.note)}</div>
          </div>
          <div class="dish-price">${formatMoney(item.price)}</div>
        </div>
        <div class="qty-row">
          <span class="muted">Số lượng</span>
          <div class="qty-controls">
            <button type="button" class="btn" data-qty="-1" data-id="${item.id}" ${qty === 0 ? "disabled" : ""}>−</button>
            <span class="qty-value">${qty}</span>
            <button type="button" class="btn" data-qty="1" data-id="${item.id}" ${qty >= 10 ? "disabled" : ""}>+</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderSlots() {
  const isToday = pickupDate.value === todayString();
  const slots = slotsForDate(pickupDate.value);
  const openSlots = slots.filter((slot) => !slot.disabled);
  if (state.time && !openSlots.some((slot) => slot.label === state.time)) state.time = "";
  if (!state.time && openSlots.length) state.time = openSlots[0].label;

  timeSlots.innerHTML = slots.map((slot) => `
    <button type="button" class="slot ${slot.label === state.time ? "active" : ""}" data-time="${slot.label}" ${slot.disabled ? "disabled" : ""}>
      ${slot.label}
    </button>`).join("");

  if (openSlots.length === 0) {
    slotHint.textContent = "Ngày này đã hết khung giờ. Chọn ngày khác để đặt nhận.";
  } else if (isToday) {
    slotHint.textContent = "Hôm nay chỉ chọn giờ còn cách ít nhất 30 phút.";
  } else {
    slotHint.textContent = "Khung giờ cách nhau 30 phút, từ 10:30 đến 19:00.";
  }
}

function renderCart() {
  const lines = selectedLines();
  if (lines.length === 0) {
    cartBox.innerHTML = `<p class="muted">Chưa chọn món nào.</p>`;
    return;
  }
  cartBox.innerHTML = `
    ${lines.map((line) => `
      <div class="cart-line">
        <span>${escapeHtml(line.name)} × ${line.qty}</span>
        <span>${formatMoney(line.lineTotal)}</span>
      </div>`).join("")}
    <div class="cart-total"><span>Tổng</span><span>${formatMoney(orderTotal(lines))}</span></div>`;
}

function renderReceipt(order) {
  receiptBox.hidden = false;
  receiptBox.innerHTML = `
    <h3>Đã ghi đơn ${escapeHtml(order.code)}</h3>
    <p>${escapeHtml(order.customerName)} · ${escapeHtml(order.customerPhone)}</p>
    <p>Nhận lúc <strong>${escapeHtml(order.time)}</strong> ngày <strong>${escapeHtml(order.dateLabel)}</strong></p>
    ${order.lines.map((line) => `<div class="cart-line"><span>${escapeHtml(line.name)} × ${line.qty}</span><span>${formatMoney(line.lineTotal)}</span></div>`).join("")}
    <div class="cart-total"><span>Tổng</span><span>${formatMoney(order.total)}</span></div>
    ${order.note ? `<p class="muted">Ghi chú: ${escapeHtml(order.note)}</p>` : ""}
    <button type="button" class="btn" id="btn-new-order">Đặt đơn khác</button>`;
}

function setupDate() {
  const today = new Date();
  const max = addDays(today, 7);
  pickupDate.min = todayString(today);
  pickupDate.max = todayString(max);
  pickupDate.value = todayString(today);
  if (slotsForDate(pickupDate.value).every((slot) => slot.disabled)) {
    pickupDate.value = todayString(addDays(today, 1));
  }
}

categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderMenu();
});

menuList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-qty]");
  if (!button) return;
  const id = button.dataset.id;
  const next = state.qty[id] + Number(button.dataset.qty);
  state.qty[id] = Math.min(10, Math.max(0, next));
  receiptBox.hidden = true;
  renderMenu();
  renderCart();
});

timeSlots.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-time]");
  if (!button || button.disabled) return;
  state.time = button.dataset.time;
  renderSlots();
});

pickupDate.addEventListener("change", () => {
  if (!pickupDate.value) pickupDate.value = pickupDate.min;
  renderSlots();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const lines = selectedLines();
  if (lines.length === 0) {
    showToast("Chọn ít nhất một món", "error");
    return;
  }
  if (!state.time) {
    showToast("Chọn giờ nhận", "error");
    return;
  }
  const phone = form.customerPhone.value.trim();
  if (!/^0\d{8,10}$/.test(phone)) {
    showToast("Số điện thoại chưa đúng", "error");
    return;
  }

  const date = new Date(`${pickupDate.value}T00:00:00`);
  const order = {
    code: "DH" + Date.now().toString().slice(-6),
    customerName: form.customerName.value.trim(),
    customerPhone: phone,
    note: form.note.value.trim(),
    date: pickupDate.value,
    dateLabel: date.toLocaleDateString("vi-VN"),
    time: state.time,
    lines,
    total: orderTotal(lines),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  renderReceipt(order);
  showToast("Đã lưu đơn trên trình duyệt");
  receiptBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

receiptBox.addEventListener("click", (event) => {
  if (!event.target.closest("#btn-new-order")) return;
  state.qty = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, 0]));
  form.reset();
  setupDate();
  receiptBox.hidden = true;
  receiptBox.innerHTML = "";
  localStorage.removeItem(STORAGE_KEY);
  renderMenu();
  renderSlots();
  renderCart();
});

setupDate();
renderFilters();
renderMenu();
renderSlots();
renderCart();

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  try {
    renderReceipt(JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}
