let selectedDish = null;
let quantity = 1;

const priceEl = document.getElementById("dish-price");
const addButton = document.getElementById("btn-add");
const quantityEl = document.getElementById("qty-value");
const heroImage = document.getElementById("dish-hero");

function money(value) { return `${Number(value).toLocaleString("vi-VN")}đ`; }

function renderPrice() {
  if (!selectedDish) return;
  priceEl.textContent = money(selectedDish.price);
  addButton.textContent = `Thêm ${quantity} suất · ${money(selectedDish.price * quantity)}`;
  quantityEl.textContent = String(quantity);
}

function showPlaceholderImage() {
  heroImage.hidden = true;
  const plate = document.createElement("div");
  plate.className = "plate";
  plate.innerHTML = "<span><i></i><i></i><i></i></span>";
  heroImage.parentElement.appendChild(plate);
}

document.getElementById("qty-minus").addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  renderPrice();
});
document.getElementById("qty-plus").addEventListener("click", () => {
  quantity = Math.min(10, quantity + 1);
  renderPrice();
});

addButton.addEventListener("click", () => {
  if (!selectedDish) return;
  addToCart({
    dish_id: selectedDish.id,
    name: selectedDish.name,
    unitPrice: selectedDish.price,
    qty: quantity,
    tone: "peach",
  });
  showToast(`Đã thêm ${quantity} suất ${selectedDish.name} vào giỏ hàng.`);
});

async function loadDish() {
  addButton.disabled = true;
  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) {
    document.getElementById("dish-description").textContent = "Hãy mở món ăn từ thực đơn.";
    showPlaceholderImage();
    return;
  }
  try {
    const rows = await api.get("/menu/dishes");
    selectedDish = Array.isArray(rows)
      ? rows.find((dish) => Number(dish.id) === id && dish.is_available)
      : null;
    if (!selectedDish) throw new Error("Không tìm thấy món hoặc món đã ngừng bán.");
    selectedDish = {
      id: Number(selectedDish.id),
      name: selectedDish.name,
      description: selectedDish.description || "Chưa có mô tả cho món ăn này.",
      price: Number(selectedDish.price),
    };
    document.querySelector(".fd-info h1").textContent = selectedDish.name;
    document.querySelector(".fd-crumb").textContent = `Trang chủ / Thực đơn / ${selectedDish.name}`;
    document.getElementById("dish-description").textContent = selectedDish.description;
    heroImage.alt = selectedDish.name;
    showPlaceholderImage();
    addButton.disabled = false;
    renderPrice();
  } catch (error) {
    document.getElementById("dish-description").textContent = error.message || "Không tải được món ăn từ máy chủ.";
    showPlaceholderImage();
  }
}

loadDish();
