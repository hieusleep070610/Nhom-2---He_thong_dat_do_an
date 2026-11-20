const pickupDate = document.getElementById("pickup-date");
const timeSlots = document.getElementById("time-slots");
const slotStatus = document.getElementById("slot-status");
const pickupSummary = document.getElementById("pickup-summary");
const confirmButton = document.getElementById("btn-confirm");

const state = { slotId: null, slotLabel: "", slots: [], wallet: null };
const el = document.getElementById("pickup-date");
console.log({
  disabled: el.disabled,
  readOnly: el.readOnly,
  attrDisabled: el.hasAttribute("disabled"),
  pointerEvents: getComputedStyle(el).pointerEvents,
});

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function money(val) {
  return `${Number(val || 0).toLocaleString("vi-VN")}đ`;
}

function getCart() {
  return typeof readCart === "function"
    ? readCart()
    : JSON.parse(localStorage.getItem("foodie_cart") || "[]");
}

function clearCart() {
  if (typeof writeCart === "function") writeCart([]);
  localStorage.setItem("foodie_cart", "[]");
}

function getToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}

function totalQty() {
  return getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function isSlotPast(slot) {
  if (pickupDate.value !== todayStr(0)) return false;
  const [h, m] = String(slot.end_time || "23:59").slice(0, 5).split(":").map(Number);
  const end = new Date();
  end.setHours(h, m, 0, 0);
  return end <= new Date();
}

function renderSummary() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0);

  document.getElementById("checkout-subtotal").textContent = money(subtotal);
  document.getElementById("checkout-shipping").textContent = money(0);
  document.getElementById("checkout-total").textContent = money(subtotal);

  const linesEl = document.getElementById("checkout-lines");
  linesEl.innerHTML = cart.length
    ? cart
        .map(
          (item) => `
      <article class="ck-line">
        <div>
          <strong>${item.name} × ${Number(item.qty || 0)}</strong>
          <span>${money(Number(item.unitPrice || 0) * Number(item.qty || 0))}</span>
        </div>
      </article>`
        )
        .join("")
    : '<p class="cart-empty">Giỏ hàng đang trống.</p>';

  renderSlots();
}

function renderSlots() {
  const needQty = totalQty();
  const validSlots = state.slots.filter(
    (s) => s.is_active && !s.is_full && !isSlotPast(s) && Number(s.remaining_servings) >= needQty
  );

  if (!validSlots.some((s) => Number(s.pickup_slot_id) === state.slotId)) {
    state.slotId = null;
    state.slotLabel = "";
  }

  pickupSummary.textContent = state.slotId ? `${pickupDate.value} · ${state.slotLabel}` : "Chưa chọn";

  if (!state.slots.length) {
    slotStatus.textContent = "Ngày này chưa có khung giờ nhận món.";
  } else if (!validSlots.length) {
    slotStatus.textContent = "Không còn khung giờ đủ chỗ cho giỏ hàng.";
  } else {
    slotStatus.textContent = `Chọn khung giờ (${validSlots.length} khung khả dụng)`;
  }

  timeSlots.innerHTML = state.slots
    .map((s) => {
      const label = `${String(s.start_time).slice(0, 5)}–${String(s.end_time).slice(0, 5)}`;
      const disabled = !s.is_active || s.is_full || isSlotPast(s) || Number(s.remaining_servings) < needQty;
      const selected = Number(s.pickup_slot_id) === state.slotId;

      return `
      <button type="button" class="ck-slot ${selected ? "is-selected" : ""} ${disabled ? "is-unavailable" : ""}"
        data-slot-id="${Number(s.pickup_slot_id)}" ${disabled ? "disabled" : ""}>
        <strong>${label}</strong>
        <small>${disabled ? "Hết chỗ / Qua giờ" : `Còn ${Number(s.remaining_servings)} suất`}</small>
      </button>`;
    })
    .join("");
}

async function loadSlots() {
  state.slots = [];
  state.slotId = null;
  renderSlots();

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/menu/pickup-slots?service_date=${encodeURIComponent(pickupDate.value)}`);
    const data = await res.json();
    state.slots = Array.isArray(data?.slots) ? data.slots : [];
  } catch (err) {
    slotStatus.textContent = "Không tải được khung giờ.";
  }
  renderSlots();
}

async function loadUserAndWallet() {
  const balanceEl = document.getElementById("checkout-wallet-balance");
  if (!getToken()) {
    balanceEl.textContent = "Đăng nhập để dùng ví thanh toán.";
    return;
  }

  try {
    const user = await api.get("/auth/me");
    document.getElementById("checkout-name").value = user.full_name || "";
    document.getElementById("checkout-phone").value = user.phone || "";
  } catch (err) {}

  try {
    const wallet = await api.get("/wallets/mine");
    if (wallet && wallet.status?.toLowerCase() === "active") {
      state.wallet = wallet;
      balanceEl.textContent = `Số dư ví: ${money(wallet.balance)}`;
    } else {
      state.wallet = null;
      balanceEl.textContent = "Ví chưa kích hoạt.";
    }
  } catch (err) {
    state.wallet = null;
    balanceEl.textContent = "Không lấy được thông tin ví.";
  }
}

pickupDate.disabled = false;
pickupDate.readOnly = false;
pickupDate.min = todayStr(0);
pickupDate.max = todayStr(7);
pickupDate.value = todayStr(0);

pickupDate.addEventListener("change", () => {
  if (!pickupDate.value || pickupDate.value < pickupDate.min) pickupDate.value = pickupDate.min;
  if (pickupDate.value > pickupDate.max) pickupDate.value = pickupDate.max;
  loadSlots();
});

timeSlots.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-slot-id]");
  if (!btn || btn.disabled) return;
  const slot = state.slots.find((s) => Number(s.pickup_slot_id) === Number(btn.dataset.slotId));
  if (!slot) return;
  state.slotId = Number(slot.pickup_slot_id);
  state.slotLabel = `${String(slot.start_time).slice(0, 5)}–${String(slot.end_time).slice(0, 5)}`;
  renderSlots();
});

confirmButton.addEventListener("click", async () => {
  const cart = getCart();
  const token = getToken();
  if (!token) return showToast("Hãy đăng nhập trước khi đặt hàng.", "error");
  if (!cart.length) return showToast("Giỏ hàng đang trống.", "error");
  if (!state.slotId) return showToast("Hãy chọn khung giờ nhận món.", "error");
  if (!state.wallet) return showToast("Cần ví điện tử hoạt động để thanh toán.", "error");

  const payload = {
    pickup_date: pickupDate.value,
    pickup_slot_id: state.slotId,
    items: cart.map((item) => ({ dish_id: Number(item.dish_id), quantity: Number(item.qty) })),
    payment_method: "wallet",
    note: document.getElementById("checkout-note")?.value.trim() || null,
  };

  confirmButton.disabled = true;
  const prevText = confirmButton.textContent;
  confirmButton.textContent = "Đang tạo đơn…";

  try {
    const order = await api.post("/orders", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": `web-${Date.now()}`,
      },
    });
    clearCart();
    const orderCode = order?.order_code || order?.code || "";
    showToast(orderCode ? `Đặt hàng thành công · ${orderCode}` : "Đặt hàng thành công!", "success");
    setTimeout(() => {
      window.location.href = "orders.html";
    }, 800);
  } catch (err) {
    showToast(err.message || "Đặt hàng thất bại.", "error");
    await loadSlots();
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = prevText;
  }
});


renderSummary();
loadSlots();
loadUserAndWallet();