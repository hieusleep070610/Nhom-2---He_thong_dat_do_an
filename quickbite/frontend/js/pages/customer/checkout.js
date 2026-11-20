const CK_CART_KEY = typeof CART_KEY !== "undefined" ? CART_KEY : "quickbite_cart";
const CK_DRAFT_KEY =
  typeof DRAFT_ORDER_KEY !== "undefined" ? DRAFT_ORDER_KEY : "quickbite_active_order";
const CK_ORDERS_KEY = typeof QB_ORDERS_KEY !== "undefined" ? QB_ORDERS_KEY : "quickbite_orders";
const CK_SHIP_FEE = typeof SHIP_FEE !== "undefined" ? SHIP_FEE : 15000;
const CK_FREE_SHIP_FROM =
  typeof FREE_SHIP_FROM !== "undefined" ? FREE_SHIP_FROM : 150000;

const linesEl = document.getElementById("checkout-lines");
const subtotalEl = document.getElementById("checkout-subtotal");
const shippingEl = document.getElementById("checkout-shipping");
const pickupSummaryEl = document.getElementById("pickup-summary");
const totalEl = document.getElementById("checkout-total");
const confirmBtn = document.getElementById("btn-confirm");
const pickupDateEl = document.getElementById("pickup-date");
const slotsEl = document.getElementById("time-slots");
const slotStatusEl = document.getElementById("slot-status");
const payMethodsEl = document.getElementById("pay-methods");

let activeOrder = null;
let selectedSlot = null;
let selectedPayMethod = "cod";
let walletId = 1;
let walletBalance = 250000;

function ckApiBase() {
  if (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) {
    return CONFIG.API_BASE_URL.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000/api";
}

function dong(val) {
  return Number(val || 0).toLocaleString("vi-VN") + "đ";
}

function esc(val) {
  return String(val ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ckNotify(msg, type = "success") {
  if (typeof showToast === "function") {
    showToast(msg, type);
  } else {
    alert(msg);
  }
}

function readJsonSafe(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadOrderFromState() {
  const params = new URLSearchParams(location.search);
  const queryOrderId = params.get("order_id");

  const draft = readJsonSafe(CK_DRAFT_KEY, null);
  const historyOrders = readJsonSafe(CK_ORDERS_KEY, []);
  const cart = readJsonSafe(CK_CART_KEY, []);

  if (queryOrderId) {
    if (draft && String(draft.id) === String(queryOrderId)) return draft;
    if (Array.isArray(historyOrders)) {
      const matched = historyOrders.find((o) => String(o.id) === String(queryOrderId));
      if (matched) return matched;
    }
  }

  if (draft && Array.isArray(draft.items) && draft.items.length > 0) {
    return draft;
  }

  if (Array.isArray(cart) && cart.length > 0) {
    const id = Date.now();
    const items = cart.map((item) => {
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      const qty = Number(item.qty ?? item.quantity ?? 1);
      return {
        dish_id: Number(item.dish_id ?? item.id ?? 0),
        item_name: item.name || item.item_name || "Món ăn",
        size: item.size || "Thường",
        toppings: Array.isArray(item.toppings) ? item.toppings : [],
        unit_price: unitPrice,
        quantity: qty,
        line_total: unitPrice * qty,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.line_total, 0);
    const ship = subtotal > 0 && subtotal < CK_FREE_SHIP_FROM ? CK_SHIP_FEE : 0;
    return {
      id,
      code: `DH-${String(id).slice(-4)}`,
      status: "pending",
      items,
      subtotal,
      ship,
      total_amount: subtotal + ship,
    };
  }

  return null;
}

function renderSummary() {
  const items = activeOrder && Array.isArray(activeOrder.items) ? activeOrder.items : [];

  if (!items.length) {
    linesEl.innerHTML =
      '<p class="cart-empty">Chưa có món trong đơn. Hãy thêm món ở <a href="menu.html">Thực đơn</a>.</p>';
    subtotalEl.textContent = "0đ";
    shippingEl.textContent = "0đ";
    totalEl.textContent = "0đ";
    confirmBtn.disabled = true;
    return;
  }

  linesEl.innerHTML = items
    .map((it) => {
      const name = it.item_name || it.name || "Món ăn";
      const qty = Number(it.quantity ?? it.qty ?? 1);
      const unitPrice = Number(it.unit_price ?? it.unitPrice ?? it.price ?? 0);
      const lineTotal = Number(it.line_total ?? unitPrice * qty);
      const meta = [];
      if (it.size) meta.push(`Size ${it.size}`);
      if (Array.isArray(it.toppings) && it.toppings.length) {
        meta.push(`Topping: ${it.toppings.join(", ")}`);
      }
      return `
        <div class="ck-line" style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed #eee;">
          <div>
            <strong>${esc(name)}</strong> <small>×${qty}</small>
            ${meta.length ? `<div style="font-size:12px;color:#666;">${esc(meta.join(" · "))}</div>` : ""}
          </div>
          <strong>${dong(lineTotal)}</strong>
        </div>
      `;
    })
    .join("");

  const subtotal = items.reduce(
    (s, it) =>
      s +
      Number(
        it.line_total ??
          Number(it.unit_price ?? it.unitPrice ?? it.price ?? 0) *
            Number(it.quantity ?? it.qty ?? 1)
      ),
    0
  );
  const ship = subtotal > 0 && subtotal < CK_FREE_SHIP_FROM ? CK_SHIP_FEE : 0;
  const total = subtotal + ship;

  activeOrder.subtotal = subtotal;
  activeOrder.ship = ship;
  activeOrder.total_amount = total;

  subtotalEl.textContent = dong(subtotal);
  shippingEl.textContent = ship === 0 ? "Miễn phí" : dong(ship);
  totalEl.textContent = dong(total);
  confirmBtn.disabled = false;
}

function updatePickupSummary() {
  const dateVal = pickupDateEl && pickupDateEl.value ? pickupDateEl.value : "";
  if (!dateVal && !selectedSlot) {
    pickupSummaryEl.textContent = "Chưa chọn";
    return;
  }
  const slotText = selectedSlot ? selectedSlot.label : "Giờ tiêu chuẩn";
  pickupSummaryEl.textContent = dateVal ? `${dateVal} (${slotText})` : slotText;
}

function renderDefaultSlots() {
  if (!slotsEl) return;
  const defaultSlots = [
    { id: 1, label: "11:30 - 12:00", spots: 8 },
    { id: 2, label: "12:00 - 12:30", spots: 5 },
    { id: 3, label: "18:00 - 18:30", spots: 10 },
    { id: 4, label: "18:30 - 19:00", spots: 6 },
  ];

  slotsEl.innerHTML = defaultSlots
    .map(
      (s, idx) => `
      <button type="button" class="ck-slot ${idx === 0 ? "is-selected" : ""}" data-slot-id="${s.id}" data-slot-label="${esc(s.label)}">
        <span>${esc(s.label)}</span>
        <small>${s.spots} chỗ</small>
      </button>
    `
    )
    .join("");

  selectedSlot = defaultSlots[0];
  if (slotStatusEl) {
    slotStatusEl.textContent = "Chọn khung giờ (đã chọn khung sớm nhất)";
  }
  updatePickupSummary();
}

function updateWalletBalanceText() {
  const walletSmall = payMethodsEl?.querySelector('input[value="wallet"]')?.closest("label")?.querySelector("small");
  if (walletSmall) {
    walletSmall.textContent = `Số dư khả dụng: ${dong(walletBalance)}`;
  }
}

async function loadWalletInfo(id = walletId) {
  try {
    const res = await fetch(`${ckApiBase()}/wallets/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.balance != null) {
      walletBalance = Number(data.balance);
      updateWalletBalanceText();
    }
  } catch {
    // giữ số dư hiển thị mặc định nếu chưa kết nối ví
  }
}

if (pickupDateEl && !pickupDateEl.value) {
  pickupDateEl.value = new Date().toISOString().slice(0, 10);
}

pickupDateEl?.addEventListener("change", updatePickupSummary);

slotsEl?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-slot-id]");
  if (!btn) return;
  selectedSlot = {
    id: Number(btn.dataset.slotId),
    label: btn.dataset.slotLabel || btn.textContent.trim(),
  };
  slotsEl.querySelectorAll("[data-slot-id]").forEach((el) => {
    el.classList.toggle("is-selected", el === btn);
  });
  updatePickupSummary();
});

payMethodsEl?.addEventListener("change", (event) => {
  const radio = event.target.closest('input[name="pay"]');
  if (!radio) return;
  selectedPayMethod = radio.value;
  payMethodsEl.querySelectorAll(".ck-pay").forEach((label) => {
    label.classList.toggle("is-selected", label.contains(radio));
  });
  if (selectedPayMethod === "wallet") {
    loadWalletInfo(walletId);
  }
});

confirmBtn?.addEventListener("click", async () => {
  if (!activeOrder || !Array.isArray(activeOrder.items) || !activeOrder.items.length) {
    ckNotify("Không có món nào trong đơn để thanh toán.", "error");
    return;
  }

  const totalAmount = Number(activeOrder.total_amount || 0);
  const inputs = document.querySelectorAll(".ck-forms .ck-input");
  const customerName = (inputs[0]?.value || "Khách hàng").trim();
  const customerPhone = (inputs[1]?.value || "").trim();
  const address = (inputs[2]?.value || "").trim();
  const note = (inputs[3]?.value || "").trim();

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Đang xử lý...";

  let finalStatus = selectedPayMethod === "wallet" ? "paid" : "confirmed";

  try {
    if (selectedPayMethod === "wallet") {
      if (walletBalance < totalAmount) {
        throw new Error(`Số dư ví không đủ (${dong(walletBalance)} < ${dong(totalAmount)}).`);
      }

      const numericOrderId = Number(activeOrder.id);
      const res = await fetch(`${ckApiBase()}/wallets/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: walletId,
          order_id: Number.isSafeInteger(numericOrderId) ? numericOrderId : 1,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || `Thanh toán ví thất bại (HTTP ${res.status})`);
      }

      if (data.new_balance != null) {
        walletBalance = Number(data.new_balance);
        updateWalletBalanceText();
      }
      finalStatus = "paid";
    }

    const finishedOrder = {
      ...activeOrder,
      status: finalStatus,
      payment_method: selectedPayMethod,
      customer_name: customerName,
      customer_phone: customerPhone,
      address,
      note,
      pickup_date: pickupDateEl?.value || new Date().toISOString().slice(0, 10),
      pickup_slot_id: selectedSlot?.id || 1,
      pickup_slot_label: selectedSlot?.label || "",
      title: `${activeOrder.code || `Đơn #${activeOrder.id}`} — ${activeOrder.items
        .map((i) => `${i.item_name || i.name} ×${i.quantity ?? i.qty ?? 1}`)
        .join(", ")}`,
      paid_at: new Date().toISOString(),
    };

    const existingOrders = readJsonSafe(CK_ORDERS_KEY, []);
    const nextOrders = Array.isArray(existingOrders)
      ? [finishedOrder, ...existingOrders.filter((o) => String(o.id) !== String(finishedOrder.id))]
      : [finishedOrder];
    localStorage.setItem(CK_ORDERS_KEY, JSON.stringify(nextOrders));

    try {
      const draft = readJsonSafe(CK_DRAFT_KEY, null);
      if (!draft || String(draft.id) === String(activeOrder.id)) {
        localStorage.removeItem(CK_DRAFT_KEY);
      }
    } catch {
      // bỏ qua
    }

    if (typeof writeCart === "function") {
      writeCart([]);
    } else {
      localStorage.setItem(CK_CART_KEY, "[]");
    }

    ckNotify(
      selectedPayMethod === "wallet"
        ? `Thanh toán ví thành công! Số dư mới: ${dong(walletBalance)}`
        : "Đặt hàng thành công!"
    );

    setTimeout(() => {
      window.location.href = "orders.html";
    }, 900);
  } catch (error) {
    ckNotify(error.message || "Không thể hoàn tất thanh toán.", "error");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Xác nhận đặt hàng";
  }
});

activeOrder = loadOrderFromState();
renderSummary();
renderDefaultSlots();
loadWalletInfo(walletId);