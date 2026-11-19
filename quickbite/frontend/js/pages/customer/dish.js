let BASE_PRICE = 55000;
const FALLBACK_IMAGE = "https://static.vecteezy.com/system/resources/thumbnails/022/059/000/small_2x/no-image-available-icon-vector.jpg";

let dish = {
  name: "Bún bò Huế đặc biệt",
  images: [],
  toppings: [
    { name: "Giò heo", price: 15000, image: "" },
    { name: "Thêm chả", price: 10000, image: "" },
    { name: "Trứng cút", price: 8000, image: "" },
  ],
};

function imageSrc(url) {
  return typeof url === "string" && url.trim() ? url.trim() : FALLBACK_IMAGE;
}

function bindImageFallback(img) {
  img.addEventListener("error", () => {
    if (img.dataset.plate === "1") return;
    img.dataset.plate = "1";
    img.hidden = true;
    const plate = document.createElement("div");
    plate.className = "plate";
    plate.innerHTML = "<span><i></i><i></i><i></i></span>";
    img.parentElement.appendChild(plate);
  });
}

const state = {
  size: "Thường",
  qty: 1,
};

const priceEl = document.getElementById("dish-price");
const addBtn = document.getElementById("btn-add");
const qtyEl = document.getElementById("qty-value");

function dong(value) {
  return Number(value).toLocaleString("vi-VN") + "đ";
}

function toppingTotal() {
  return [...document.querySelectorAll("#dish-toppings input:checked")]
    .reduce((sum, input) => sum + Number(input.value), 0);
}

function lineTotal() {
  return (BASE_PRICE + toppingTotal()) * state.qty;
}

function renderPrice() {
  priceEl.textContent = dong(BASE_PRICE + toppingTotal());
  addBtn.textContent = `Thêm vào giỏ hàng · ${dong(lineTotal())}`;
}

const heroImg = document.getElementById("dish-hero");
const thumbsEl = document.getElementById("dish-thumbs");
const gallery = dish.images.filter((url) => typeof url === "string" && url.trim());
const photos = gallery;

function showPlate(target) {
  target.hidden = true;
  const plate = document.createElement("div");
  plate.className = "plate";
  plate.innerHTML = "<span><i></i><i></i><i></i></span>";
  target.parentElement.appendChild(plate);
}

function showPhoto(index) {
  heroImg.src = imageSrc(photos[index]);
  thumbsEl.querySelectorAll("button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-selected", buttonIndex === index);
  });
}

if (!photos.length) {
  showPlate(heroImg);
} else photos.forEach((url, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `Ảnh ${index + 1}`);
  const img = document.createElement("img");
  img.alt = "";
  img.src = imageSrc(url);
  bindImageFallback(img);
  button.appendChild(img);
  button.addEventListener("click", () => showPhoto(index));
  thumbsEl.appendChild(button);
});

if (photos.length) {
  bindImageFallback(heroImg);
  showPhoto(0);
}

const toppingsEl = document.getElementById("dish-toppings");
dish.toppings.forEach((topping) => {
  const label = document.createElement("label");
  const main = document.createElement("span");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = String(topping.price);
  input.dataset.name = topping.name;
  const img = document.createElement("img");
  img.alt = topping.name;
  img.src = imageSrc(topping.image);
  bindImageFallback(img);
  const name = document.createElement("span");
  name.textContent = topping.name;
  main.append(input, img, name);
  const price = document.createElement("span");
  price.textContent = dong(topping.price);
  label.append(main, price);
  toppingsEl.appendChild(label);
});

document.getElementById("dish-sizes").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-size]");
  if (!button) return;
  state.size = button.dataset.size;
  document.querySelectorAll("#dish-sizes button").forEach((item) => {
    item.classList.toggle("is-selected", item === button);
  });
});

document.getElementById("dish-toppings").addEventListener("change", renderPrice);

document.getElementById("qty-minus").addEventListener("click", () => {
  state.qty = Math.max(1, state.qty - 1);
  qtyEl.textContent = String(state.qty);
  renderPrice();
});

document.getElementById("qty-plus").addEventListener("click", () => {
  state.qty = Math.min(10, state.qty + 1);
  qtyEl.textContent = String(state.qty);
  renderPrice();
});

addBtn.addEventListener("click", () => {
  const toppings = [...document.querySelectorAll("#dish-toppings input:checked")]
    .map((input) => input.dataset.name);
  addToCart({
    dish_id: dish.id,
    name: dish.name,
    size: state.size,
    toppings,
    unitPrice: BASE_PRICE + toppingTotal(),
    qty: state.qty,
    tone: "peach",
  });
  const extra = toppings.length ? `, topping: ${toppings.join(", ")}` : "";
  showToast(`Đã thêm ${state.qty} Bún bò Huế (${state.size})${extra}`);
});

renderPrice();

async function loadDish() {
  addBtn.disabled = true;
  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) {
    addBtn.disabled = true;
    showToast("Món chưa được chọn từ thực đơn.", "error");
    return;
  }
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/menu/dishes`);
    if (!response.ok) throw new Error("API món ăn lỗi");
    const rows = await response.json();
    const selected = Array.isArray(rows) ? rows.find((row) => Number(row.id) === id) : null;
    if (!selected) throw new Error("Không tìm thấy món");
    dish = { ...dish, id, name: selected.name };
    BASE_PRICE = Number(selected.price);
    document.querySelector(".fd-info h1").textContent = selected.name;
    document.querySelector(".fd-crumb").textContent = `Trang chủ / Thực đơn / ${selected.name}`;
    document.getElementById("dish-hero").alt = selected.name;
    renderPrice();
    addBtn.disabled = false;
  } catch (error) {
    addBtn.disabled = true;
    showToast("Không tải được món ăn từ máy chủ.", "error");
  }
}

loadDish();
