const BASE_PRICE = 55000;
const FALLBACK_IMAGE = "https://static.vecteezy.com/system/resources/thumbnails/022/059/000/small_2x/no-image-available-icon-vector.jpg";

const dish = {
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
    if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
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
const photos = gallery.length ? gallery : [""];

function showPhoto(index) {
  heroImg.src = imageSrc(photos[index]);
  thumbsEl.querySelectorAll("button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-selected", buttonIndex === index);
  });
}

photos.forEach((url, index) => {
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

bindImageFallback(heroImg);
showPhoto(0);

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
  const extra = toppings.length ? `, topping: ${toppings.join(", ")}` : "";
  showToast(`Đã thêm ${state.qty} Bún bò Huế (${state.size})${extra}`);
});

renderPrice();
