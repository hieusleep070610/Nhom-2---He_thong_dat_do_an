
const linesEl = document.getElementById("cart-lines");
const countEl = document.getElementById("cart-count");

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

function optionText(item) {
  const parts = [];
  if (item.size) parts.push(`Size ${{small:"nhỏ",medium:"vừa",large:"lớn"}[item.size] || item.size.toLowerCase()}`);
  if (item.toppings?.length) parts.push(`Topping: ${item.toppings.join(", ")}`);
  return parts.join(" · ");
}

function createNoImage() {
  const fallback = document.createElement("div");
  fallback.className = "no-image no-image--compact";
  fallback.setAttribute("role", "img");
  fallback.setAttribute("aria-label", "No image");
  fallback.innerHTML = '<span aria-hidden="true">▧</span><small>No image</small>';
  return fallback;
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
            ${item.image_url ? `<img class="cart-dish-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy">` : '<div class="no-image no-image--compact" role="img" aria-label="No image"><span aria-hidden="true">▧</span><small>No image</small></div>'}
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
    linesEl.querySelectorAll(".cart-dish-image").forEach((image) => image.addEventListener("error", () => image.replaceWith(createNoImage()), { once: true }));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const ship = 0;
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
