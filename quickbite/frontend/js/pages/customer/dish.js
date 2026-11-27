let selectedDish = null;
let quantity = 1;
let selectedSize = "medium";

const priceEl = document.getElementById("dish-price");
const addButton = document.getElementById("btn-add");
const quantityEl = document.getElementById("qty-value");
const heroImage = document.getElementById("dish-hero");
const descEl = document.getElementById("dish-description");
const titleEl = document.querySelector(".fd-info h1");
const crumbEl = document.querySelector(".fd-crumb");

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getSelectedUnitPrice() {
  if (!selectedDish) return 0;
  const sizeFactor = { small: 0.85, medium: 1, large: 1.15 }[selectedSize] || 1;
  const base = Number(selectedDish.price ?? selectedDish.unit_price ?? 0) * sizeFactor;
  const toppingPrice = [...document.querySelectorAll(".fd-toppings input:checked")].reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
  return Math.round(base + toppingPrice);
}

function renderPrice() {
  if (!selectedDish) return;
  const unitPrice = getSelectedUnitPrice();
  if (priceEl) priceEl.textContent = money(unitPrice);
  if (addButton) {
    addButton.textContent = `Thêm ${quantity} suất · ${money(unitPrice * quantity)}`;
  }
  if (quantityEl) quantityEl.textContent = String(quantity);
}

document.querySelectorAll('input[name="dish-size"]').forEach((input) => input.addEventListener("change", () => { selectedSize = input.value; renderPrice(); }));

function showPlaceholderImage() {
  if (!heroImage) return;
  heroImage.removeAttribute("src");
  heroImage.hidden = true;
  if (heroImage.parentElement && !heroImage.parentElement.querySelector(".no-image")) {
    const fallback = document.createElement("div");
    fallback.className = "no-image";
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", "No image");
    fallback.innerHTML = '<span aria-hidden="true">▧</span><small>No image</small>';
    heroImage.parentElement.appendChild(fallback);
  }
}

function saveDishToCart(item) {
  if (typeof addToCart === "function") {
    addToCart(item);
    return;
  }

  const STORAGE_KEY = "foodie_cart";
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const existing = current.find((entry) => Number(entry.dish_id) === Number(item.dish_id));

  if (existing) {
    existing.qty = Math.min(10, Number(existing.qty || 0) + Number(item.qty || 1));
  } else {
    current.push(item);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

document.getElementById("qty-minus")?.addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  renderPrice();
});

document.getElementById("qty-plus")?.addEventListener("click", () => {
  quantity = Math.min(10, quantity + 1);
  renderPrice();
});

if (addButton) {
  addButton.disabled = false;
  addButton.addEventListener("click", () => {
    const qty = Math.min(10, Math.max(1, Number(quantityEl?.textContent) || quantity || 1));
    const dishId =
      Number(selectedDish?.id) ||
      Number(new URLSearchParams(location.search).get("id")) ||
      1;
    const dishName =
      selectedDish?.name ||
      titleEl?.textContent?.trim() ||
      "Món ăn";
    const unitPrice = getSelectedUnitPrice();

    if (unitPrice <= 0) return;

    saveDishToCart({
      dish_id: dishId,
      name: dishName,
      unitPrice,
      image_url: selectedDish?.image_url || "",
      toppings: [...document.querySelectorAll(".fd-toppings input:checked")].map((input) => input.value),
      size: selectedSize,
      qty,
      tone: "peach",
    });

    if (typeof showToast === "function") {
      showToast(`Đã thêm ${qty} suất ${dishName} vào giỏ hàng.`);
    }

    window.location.href = "cart.html";
  });
}

async function loadDish() {
  if (addButton) addButton.disabled = true;
  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) {
    if (descEl) descEl.textContent = "Hãy mở món ăn từ thực đơn.";
    showPlaceholderImage();
    return;
  }

  try {
    const raw = await api.get("/menu/dishes");
    const rows = Array.isArray(raw) ? raw : raw?.data;
    const found = Array.isArray(rows)
      ? rows.find((dish) => Number(dish.id ?? dish.dish_id) === id && dish.is_available !== false)
      : null;

    if (!found) throw new Error("Không tìm thấy món hoặc món đã ngừng bán.");

    selectedDish = {
      id: Number(found.id ?? found.dish_id),
      name: found.name,
      description: found.description || "Chưa có mô tả cho món ăn này.",
      price: Number(found.price ?? found.unit_price ?? 0),
      image_url: found.image_url || "",
      sold_count: Number(found.sold_count || 0),
      toppings: Array.isArray(found.toppings) ? found.toppings : [],
    };

    if (titleEl) titleEl.textContent = selectedDish.name;
    if (crumbEl) crumbEl.textContent = `Trang chủ / Thực đơn / ${selectedDish.name}`;
    if (descEl) descEl.textContent = selectedDish.description;
    const toppingRoot = document.getElementById("dish-topping-options");
    if (toppingRoot) {
      toppingRoot.innerHTML = selectedDish.toppings.length ? selectedDish.toppings.map((item, index) => `<label class="fd-topping"><input type="checkbox" value="${escapeHtml(item.name)}" data-price="${Number(item.price) || 0}"><span>${escapeHtml(item.name)}${Number(item.price) ? ` · +${money(item.price)}` : ""}</span></label>`).join("") : '<p class="ck-hint">Món này chưa có topping tùy chọn.</p>';
      toppingRoot.querySelectorAll("input").forEach((input) => input.addEventListener("change", renderPrice));
    }
    let soldEl = document.getElementById("dish-sold-count");
    if (!soldEl && titleEl) {
      soldEl = document.createElement("p");
      soldEl.id = "dish-sold-count";
      soldEl.className = "dish-sold-count";
      titleEl.insertAdjacentElement("afterend", soldEl);
    }
    if (soldEl) soldEl.textContent = `Đã bán ${selectedDish.sold_count.toLocaleString("vi-VN")}`;
    if (heroImage) heroImage.alt = selectedDish.name;

    if (heroImage && selectedDish.image_url) {
      heroImage.hidden = false;
      heroImage.src = selectedDish.image_url;
      heroImage.onerror = showPlaceholderImage;
      heroImage.onload = () => heroImage.parentElement.querySelector(".no-image")?.remove();
    } else showPlaceholderImage();
    if (addButton) addButton.disabled = selectedDish.price <= 0;
    renderPrice();
  } catch (error) {
    selectedDish = null;
    if (descEl) {
      descEl.textContent = error.message || "Không tải được món ăn từ máy chủ.";
    }
    showPlaceholderImage();
  }
}

loadDish();
