const linesEl = document.getElementById("cart-lines");
const countEl = document.getElementById("cart-count");

const SHIP_FEE = 15000; // phí giao hàng cố định khi giỏ có món

function dong(value) {
  return Number(value).toLocaleString("vi-VN") + "đ";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Dòng mô tả dưới tên món: "Size lớn · Thêm giò heo · ghi chú"
function optionText(item) {
  const parts = [];
  if (item.size) parts.push(`Size ${item.size.toLowerCase()}`);
  (item.toppings || []).forEach((name) => parts.push(`Thêm ${name.toLowerCase()}`));
  if (item.note) parts.push(item.note);
  return parts.join(" · ");
}

function renderCart() {
  const cart = readCart();
  const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  countEl.textContent = `Bạn đang có ${count} món trong giỏ hàng`;

  if (!cart.length) {
    linesEl.innerHTML = '<p class="cart-empty">Giỏ hàng đang trống. Hãy thêm món từ thực đơn.</p>';
  } else {
    linesEl.innerHTML = cart.map((item, index) => `
      <article class="cart-line">
        <div class="cart-product">
          <div class="cart-thumb ${item.tone === "green" ? "art-green" : "art-peach"}">
            <span class="plate"></span>
          </div>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(optionText(item))}</p>
            <button type="button" class="cart-remove" data-remove="${index}">Xóa</button>
          </div>
        </div>
        <div class="cart-qty">
          <button type="button" data-dec="${index}" aria-label="Giảm">−</button>
          <span>${item.qty}</span>
          <button type="button" data-inc="${index}" aria-label="Tăng">+</button>
        </div>
        <strong class="cart-price">${dong(item.unitPrice * item.qty)}</strong>
      </article>`).join("");
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const ship = cart.length ? SHIP_FEE : 0;
  document.getElementById("cart-subtotal").textContent = dong(subtotal);
  document.getElementById("cart-ship").textContent = dong(ship);
  document.getElementById("cart-off").textContent = "- 0đ";
  document.getElementById("cart-total").textContent = dong(subtotal + ship);
  document.getElementById("cart-checkout").disabled = cart.length === 0;
}

linesEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const cart = readCart();
  if (button.dataset.remove != null) {
    cart.splice(Number(button.dataset.remove), 1);
  } else if (button.dataset.dec != null) {
    const item = cart[Number(button.dataset.dec)];
    item.qty = Math.max(1, Number(item.qty) - 1);
  } else if (button.dataset.inc != null) {
    const item = cart[Number(button.dataset.inc)];
    item.qty = Math.min(10, Number(item.qty) + 1);
  } else {
    return;
  }
  writeCart(cart);
  renderCart();
});

document.getElementById("cart-checkout").addEventListener("click", () => {
  if (!readCart().length) {
    showToast("Giỏ hàng đang trống", "error");
    return;
  }
  window.location.href = "checkout.html";
});

renderCart();