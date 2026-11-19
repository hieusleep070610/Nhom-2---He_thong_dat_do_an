const pickupDate = document.getElementById("pickup-date");
const timeSlots = document.getElementById("time-slots");
const slotStatus = document.getElementById("slot-status");
const pickupSummary = document.getElementById("pickup-summary");
const confirmButton = document.getElementById("btn-confirm");
const state = { slotId: null, slotLabel: "", slots: [], loading: false, wallet: null };
const PENDING_ORDER_KEY = "foodie_pending_order";

function todayString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function money(value) { return `${Number(value).toLocaleString("vi-VN")}đ`; }
function cartNow() { return typeof readCart === "function" ? readCart() : []; }
function totalServings() { return cartNow().reduce((sum, item) => sum + (Number(item.qty) || 0), 0); }
function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function getToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}
function slotIsPast(slot) {
  if (pickupDate.value !== todayString()) return false;
  const [hour, minute] = String(slot.end_time).slice(0, 5).split(":").map(Number);
  const end = new Date(); end.setHours(hour, minute, 0, 0);
  return end <= new Date();
}
function renderSummary() {
  const cart = cartNow();
  const subtotal = cart.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0);
  document.getElementById("checkout-subtotal").textContent = money(subtotal);
  document.getElementById("checkout-shipping").textContent = money(0);
  document.getElementById("checkout-total").textContent = money(subtotal);
  document.getElementById("checkout-lines").innerHTML = cart.length ? cart.map((item) => `
    <article class="ck-line"><div class="cart-thumb ${item.tone === "green" ? "art-green" : "art-peach"}"><div class="plate"><span><i></i><i></i><i></i></span></div></div>
      <div><strong>${escapeHtml(item.name)} × ${Number(item.qty) || 0}</strong><span>${money(Number(item.unitPrice || 0) * Number(item.qty || 0))}</span></div>
    </article>`).join("") : '<p class="cart-empty">Giỏ hàng đang trống.</p>';
  renderSlots();
}
function renderSlots() {
  const validSlots = state.slots.filter((slot) => slot.is_active && !slot.is_full && !slotIsPast(slot)
    && Number(slot.remaining_servings) >= totalServings());
  const selected = state.slots.find((slot) => Number(slot.pickup_slot_id) === state.slotId);
  if (!selected || !validSlots.includes(selected)) state.slotId = null;
  pickupSummary.textContent = state.slotId
    ? `${formatDate(pickupDate.value)} · ${state.slotLabel}` : "Chưa chọn";
  if (state.loading) slotStatus.textContent = "Đang tải khung giờ và số suất còn lại…";
  else if (!state.slots.length) slotStatus.textContent = slotStatus.dataset.error || "Ngày này chưa có khung giờ nhận món.";
  else if (!validSlots.length) slotStatus.textContent = "Không còn khung giờ hợp lệ đủ chỗ cho giỏ hàng.";
  else slotStatus.textContent = `Chọn khung giờ · ${validSlots.length} khung đủ chỗ`;
  timeSlots.innerHTML = state.slots.map((slot) => {
    const label = `${String(slot.start_time).slice(0, 5)}–${String(slot.end_time).slice(0, 5)}`;
    let status = "Còn chỗ";
    if (!slot.is_active) status = "Ngừng hoạt động";
    else if (slotIsPast(slot)) status = "Đã qua";
    else if (slot.is_full || Number(slot.remaining_servings) <= 0) status = "Đã đầy";
    else if (Number(slot.remaining_servings) < totalServings()) status = "Không đủ chỗ";
    const disabled = status !== "Còn chỗ";
    return `<button type="button" role="option" class="ck-slot ${Number(slot.pickup_slot_id) === state.slotId ? "is-selected" : ""} ${disabled ? "is-unavailable" : ""}"
      data-slot-id="${Number(slot.pickup_slot_id)}" ${disabled ? "disabled" : ""} aria-selected="${Number(slot.pickup_slot_id) === state.slotId}">
      <strong>${escapeHtml(label)}</strong><small>${escapeHtml(status)} · ${Number(slot.remaining_servings) || 0} suất</small></button>`;
  }).join("");
}
async function loadDateData() {
  state.loading = true; state.slots = []; state.slotId = null; slotStatus.dataset.error = ""; renderSlots();
  try {
    const [menuResponse, slotResponse] = await Promise.all([
      fetch(`${CONFIG.API_BASE_URL}/menu/daily-menus/remaining?menu_date=${encodeURIComponent(pickupDate.value)}`),
      fetch(`${CONFIG.API_BASE_URL}/menu/pickup-slots?service_date=${encodeURIComponent(pickupDate.value)}`),
    ]);
    if (!menuResponse.ok || !slotResponse.ok) throw new Error("Không lấy được dữ liệu ngày nhận từ máy chủ.");
    const [menu, slotData] = await Promise.all([menuResponse.json(), slotResponse.json()]);
    if (!menu || !Array.isArray(menu.items) || !slotData || !Array.isArray(slotData.slots)) {
      throw new Error("Dữ liệu ngày nhận không đúng định dạng.");
    }
    state.slots = slotData.slots;
    if (!menu.items.length) slotStatus.dataset.error = "Ngày này chưa có thực đơn.";
  } catch (error) {
    slotStatus.dataset.error = error.message || "Không tải được dữ liệu. Hãy thử lại.";
  } finally { state.loading = false; renderSlots(); }
}
async function loadCustomerAndWallet() {
  const balanceLabel = document.getElementById("checkout-wallet-balance");
  if (!getToken()) {
    balanceLabel.textContent = "Đăng nhập để thanh toán bằng ví.";
    return;
  }
  try {
    const user = await api.get("/auth/me");
    document.getElementById("checkout-name").value = user.full_name || "";
    document.getElementById("checkout-phone").value = user.phone || "";
  } catch (error) {
    if (error.status === 401) balanceLabel.textContent = "Phiên đăng nhập hết hạn. Hãy đăng nhập lại.";
  }
  try {
    const wallet = await api.get("/wallets/mine");
    if (wallet.status?.toLowerCase() !== "active") {
      state.wallet = null;
      balanceLabel.textContent = "Ví hiện không hoạt động.";
      return;
    }
    state.wallet = wallet;
    balanceLabel.textContent = `Số dư khả dụng: ${money(wallet.balance)}`;
  } catch (error) {
    state.wallet = null;
    balanceLabel.textContent = error.status === 404 ? "Tài khoản chưa có ví điện tử." : error.message;
  }
}
function pendingIdempotencyKey(payload) {
  const serialized = JSON.stringify(payload);
  try {
    const saved = JSON.parse(sessionStorage.getItem(PENDING_ORDER_KEY) || "null");
    if (saved && saved.payload === serialized && saved.key) return saved.key;
  } catch (error) { /* replace unreadable saved state */ }
  const key = globalThis.crypto?.randomUUID?.()
    || `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ payload: serialized, key }));
  return key;
}

pickupDate.min = todayString();
const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 7);
pickupDate.max = todayString(maxDate); pickupDate.value = todayString();
pickupDate.addEventListener("change", () => {
  if (!pickupDate.value || pickupDate.value < pickupDate.min || pickupDate.value > pickupDate.max) pickupDate.value = pickupDate.min;
  loadDateData();
});
timeSlots.addEventListener("click", (event) => {
  const button = event.target.closest("[data-slot-id]");
  if (!button || button.disabled) return;
  const slot = state.slots.find((item) => Number(item.pickup_slot_id) === Number(button.dataset.slotId));
  if (!slot) return;
  state.slotId = Number(slot.pickup_slot_id);
  state.slotLabel = `${String(slot.start_time).slice(0, 5)}–${String(slot.end_time).slice(0, 5)}`;
  renderSlots();
});
document.getElementById("pay-methods").addEventListener("change", (event) => {
  document.querySelectorAll(".ck-pay").forEach((row) => row.classList.toggle("is-selected", row.contains(event.target) && event.target.checked));
});
confirmButton.addEventListener("click", async () => {
  const cart = cartNow();
  if (!getToken()) { showToast("Hãy đăng nhập trước khi đặt hàng.", "error"); return; }
  if (!cart.length) { showToast("Giỏ hàng đang trống.", "error"); return; }
  if (cart.some((item) => !Number.isInteger(Number(item.dish_id)) || Number(item.dish_id) < 1)) {
    showToast("Giỏ hàng có món thiếu mã. Hãy xóa món đó và thêm lại từ thực đơn.", "error"); return;
  }
  if (cart.some((item) => !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 || Number(item.qty) > 10)) {
    showToast("Mỗi món chỉ đặt được từ 1 đến 10 suất.", "error"); return;
  }
  if (!pickupDate.value || pickupDate.value < pickupDate.min) { showToast("Hãy chọn ngày nhận hợp lệ.", "error"); return; }
  const slot = state.slots.find((item) => Number(item.pickup_slot_id) === state.slotId);
  if (!slot || !slot.is_active || slot.is_full || slotIsPast(slot) || Number(slot.remaining_servings) < totalServings()) {
    showToast("Khung giờ đã chọn không còn đủ chỗ. Hãy tải lại ngày nhận.", "error"); await loadDateData(); return;
  }
  if (!state.wallet) { showToast("Cần có ví điện tử hoạt động để thanh toán.", "error"); return; }
  const paymentMethod = document.querySelector('input[name="pay"]:checked')?.value;
  if (paymentMethod !== "wallet") { showToast("Phương thức thanh toán này chưa được hỗ trợ.", "error"); return; }

  const orderRequest = {
    pickup_date: pickupDate.value,
    pickup_slot_id: state.slotId,
    items: cart.map((item) => ({ dish_id: Number(item.dish_id), quantity: Number(item.qty) })),
    payment_method: "wallet",
    note: document.getElementById("checkout-note").value.trim() || null,
  };
  confirmButton.disabled = true;
  const originalText = confirmButton.textContent;
  confirmButton.textContent = "Đang tạo đơn…";
  try {
    const order = await api.post("/orders", orderRequest, {
      headers: { "Idempotency-Key": pendingIdempotencyKey(orderRequest) },
    });
    writeCart([]);
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    showToast(`Đặt hàng thành công · ${order.order_code} · ${money(order.total_amount)}`, "success");
    setTimeout(() => { window.location.href = "orders.html"; }, 900);
  } catch (error) {
    showToast(error.message || "Không thể tạo đơn. Hãy thử lại.", "error");
    if (["INSUFFICIENT_SERVINGS", "SLOT_FULL", "INSUFFICIENT_INGREDIENTS"].includes(error.data?.details?.code)) {
      await loadDateData();
    }
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = originalText;
  }
});
window.addEventListener("storage", (event) => { if (event.key === "foodie_cart") renderSummary(); });
renderSummary();
loadDateData();
loadCustomerAndWallet();
