let selectedDish = null;
let quantity = 1;

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

function renderPrice() {
  if (!selectedDish) return;
  const unitPrice = Number(selectedDish.price ?? selectedDish.unit_price ?? 0);
  if (priceEl) priceEl.textContent = money(unitPrice);
  if (addButton) {
    addButton.textContent = `Thêm ${quantity} suất · ${money(unitPrice * quantity)}`;
  }
  if (quantityEl) quantityEl.textContent = String(quantity);
}

function showPlaceholderImage() {
  if (!heroImage) return;
  heroImage.hidden = true;
  if (heroImage.parentElement && !heroImage.parentElement.querySelector(".plate")) {
    const plate = document.createElement("div");
    plate.className = "plate";
    plate.innerHTML = "<span><i></i><i></i><i></i></span>";
    heroImage.parentElement.appendChild(plate);
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
    const unitPrice =
      Number(selectedDish?.price ?? selectedDish?.unit_price) ||
      Number((priceEl?.textContent || "").replace(/\D/g, "")) ||
      0;

    if (unitPrice <= 0) return;

    saveDishToCart({
      dish_id: dishId,
      name: dishName,
      unitPrice,
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
    };

    if (titleEl) titleEl.textContent = selectedDish.name;
    if (crumbEl) crumbEl.textContent = `Trang chủ / Thực đơn / ${selectedDish.name}`;
    if (descEl) descEl.textContent = selectedDish.description;
    if (heroImage) heroImage.alt = selectedDish.name;

    showPlaceholderImage();
    renderPrice();
  } catch (error) {
    if (descEl) {
      descEl.textContent = error.message || "Không tải được món ăn từ máy chủ.";
    }
    showPlaceholderImage();
  }
}

loadDish();