const CART_STORAGE_KEY = "quickbite_cart";
const ORDERS_STORAGE_KEY = "quickbite_orders";

const linesEl = document.getElementById("cart-lines");
const countEl = document.getElementById("cart-count");
const subtotalEl = document.getElementById("cart-subtotal");
const shipEl = document.getElementById("cart-ship");
const offEl = document.getElementById("cart-off");
const totalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("cart-checkout");

function formatVND(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function getCartItems() {
  if (typeof window.getCart === "function") {
    return window.getCart() || [];
  }
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCartItems(items) {
  if (typeof window.saveCart === "function") {
    window.saveCart(items);
  } else {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }
}

function clearCartItems() {
  if (typeof window.clearCart === "function") {
    window.clearCart();
  } else {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}

function calcSummary(items) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice || item.price || 0) * Number(item.qty || 1),
    0
  );
  const ship = subtotal === 0 || subtotal >= 150000 ? 0 : 15000;
  const discount = 0;
  const total = Math.max(0, subtotal + ship - discount);
  return { subtotal, ship, discount, total };
}

function renderCart() {
  const items = getCartItems();
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  countEl.textContent = `Bạn đang có ${totalQty} món trong giỏ hàng`;

  if (!items.length) {
    linesEl.innerHTML = `
      <div class="cart-empty" style="padding: 24px; text-align: center;">
        <p>Giỏ hàng của bạn đang trống.</p>
      </div>
    `;
    subtotalEl.textContent = formatVND(0);
    shipEl.textContent = formatVND(0);
    offEl.textContent = `- ${formatVND(0)}`;
    totalEl.textContent = formatVND(0);
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;

  linesEl.innerHTML = items
    .map((item, index) => {
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const qty = Number(item.qty || 1);
      const lineTotal = unitPrice * qty;
      const metaParts = [];
      if (item.size) metaParts.push(`Size: ${item.size}`);
      if (Array.isArray(item.toppings) && item.toppings.length) {
        metaParts.push(`Topping: ${item.toppings.join(", ")}`);
      }

      return `
        <div class="cart-item" data-index="${index}" style="display: grid; grid-template-columns: 2fr 1fr 1fr; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #eee;">
          <div>
            <strong>${item.name}</strong>
            ${metaParts.length ? `<div style="font-size: 13px; color: #666; margin-top: 4px;">${metaParts.join(" · ")}</div>` : ""}
            <div style="font-size: 13px; color: #888; margin-top: 2px;">Đơn giá: ${formatVND(unitPrice)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="qty-dec" data-index="${index}" aria-label="Giảm số lượng">−</button>
            <span>${qty}</span>
            <button type="button" class="qty-inc" data-index="${index}" aria-label="Tăng số lượng">+</button>
            <button type="button" class="item-remove" data-index="${index}" style="margin-left: 6px; font-size: 12px; color: #dc2626; background: none; border: none; cursor: pointer;">Xóa</button>
          </div>
          <div style="text-align: right; font-weight: 600;">
            ${formatVND(lineTotal)}
          </div>
        </div>
      `;
    })
    .join("");

  const { subtotal, ship, discount, total } = calcSummary(items);
  subtotalEl.textContent = formatVND(subtotal);
  shipEl.textContent = formatVND(ship);
  offEl.textContent = `- ${formatVND(discount)}`;
  totalEl.textContent = formatVND(total);
}

linesEl.addEventListener("click", (event) => {
  const index = Number(event.target.dataset.index);
  if (Number.isNaN(index)) return;

  const items = getCartItems();
  if (!items[index]) return;

  if (event.target.classList.contains("qty-inc")) {
    items[index].qty = Math.min(10, Number(items[index].qty || 1) + 1);
  } else if (event.target.classList.contains("qty-dec")) {
    const nextQty = Number(items[index].qty || 1) - 1;
    if (nextQty <= 0) {
      items.splice(index, 1);
    } else {
      items[index].qty = nextQty;
    }
  } else if (event.target.classList.contains("item-remove")) {
    items.splice(index, 1);
  } else {
    return;
  }

  saveCartItems(items);
  renderCart();
});

async function submitOrder(items, summary) {
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    customer_name: "Nguyễn Văn A",
    customer_phone: "0912345678",
    note: "",
    pickup_date: today,
    pickup_slot_id: 1,
    total_amount: summary.total,
    items: items.map((item) => {
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const qty = Number(item.qty || 1);
      const detailNote = [
        item.size ? `Size ${item.size}` : "",
        Array.isArray(item.toppings) && item.toppings.length ? `Topping: ${item.toppings.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        dish_id: item.dish_id || 1,
        item_code: `DISH_${item.dish_id || 1}`,
        item_name: item.name,
        unit_price: unitPrice,
        quantity: qty,
        line_total: unitPrice * qty,
        note: detailNote,
      };
    }),
  };

  try {
    if (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) {
      const res = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        return created?.id || created?.data?.id || Date.now();
      }
    }
  } catch {
    // Fallback lưu vào localStorage nếu chưa kết nối được API tạo đơn
  }

  const fallbackId = Date.now();
  const existingOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || [];
  existingOrders.unshift({
    id: fallbackId,
    code: `DH-${String(fallbackId).slice(-4)}`,
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    status: "pending",
    subtotal: summary.subtotal,
    ship: summary.ship,
    total_amount: summary.total,
    created_at: new Date().toISOString(),
    items: payload.items,
  });
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existingOrders));
  return fallbackId;
}

checkoutBtn.addEventListener("click", async () => {
  const items = getCartItems();
  if (!items.length) return;

  checkoutBtn.disabled = true;
  const summary = calcSummary(items);
  const orderId = await submitOrder(items, summary);

  clearCartItems();
  renderCart();

  if (typeof showToast === "function") {
    showToast("Đặt hàng thành công! Đang chuyển tới đơn hàng...");
  }

  setTimeout(() => {
    window.location.href = `orders.html?order_id=${encodeURIComponent(orderId)}`;
  }, 400);
});

renderCart();