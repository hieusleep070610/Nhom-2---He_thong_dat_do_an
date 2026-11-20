let BASE_PRICE = 55000;
const FALLBACK_IMAGE = "https://static.vecteezy.com/system/resources/thumbnails/022/059/000/small_2x/no-image-available-icon-vector.jpg";
const DISH_CART_KEY = typeof CART_KEY !== "undefined" ? CART_KEY : "quickbite_cart";
const DISH_ORDER_KEY = typeof DRAFT_ORDER_KEY !== "undefined" ? DRAFT_ORDER_KEY : "quickbite_active_order";

let dish = {
  id: 1,
  name: "Bún bò Huế đặc biệt",
  toppings: [
    { name: "Giò heo", price: 15000, image: "" },
    { name: "Thêm chả", price: 10000, image: "" },
    { name: "Trứng cút", price: 8000, image: "" },
  ],
};

const state = { size: "Thường", qty: 1 };
const priceEl = document.getElementById("dish-price");
const addBtn = document.getElementById("btn-add");
const qtyEl = document.getElementById("qty-value");
const heroImg = document.getElementById("dish-hero");
const toppingsEl = document.getElementById("dish-toppings");

const dong = (v) => Number(v || 0).toLocaleString("vi-VN") + "đ";
const toast = (msg, type = "success") =>
  typeof showToast === "function" ? showToast(msg, type) : alert(msg);

function showPlate(img) {
  if (!img || img.dataset.plate === "1") return;
  img.dataset.plate = "1";
  img.hidden = true;
  img.parentElement.insertAdjacentHTML("beforeend", '<div class="plate"><span><i></i><i></i><i></i></span></div>');
}

const toppingTotal = () =>
  [...document.querySelectorAll("#dish-toppings input:checked")].reduce((s, el) => s + Number(el.value || 0), 0);

function renderPrice() {
  const unit = BASE_PRICE + toppingTotal();
  priceEl.textContent = dong(unit);
  addBtn.textContent = `Thêm vào giỏ hàng · ${dong(unit * state.qty)}`;
}

function saveAndSyncOrder(newItem) {
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(DISH_CART_KEY) || "[]");
    if (!Array.isArray(cart)) cart = [];
  } catch { cart = []; }

  const keyOf = (it) => `${it.dish_id}|${it.size}|${[...(it.toppings || [])].sort().join(",")}`;
  const existing = cart.find((it) => keyOf(it) === keyOf(newItem));
  if (existing) {
    existing.qty = Math.min(99, Number(existing.qty || 0) + newItem.qty);
    existing.unitPrice = newItem.unitPrice;
  } else {
    cart.push(newItem);
  }
  localStorage.setItem(DISH_CART_KEY, JSON.stringify(cart));

  const subtotal = cart.reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 1), 0);
  const ship = subtotal > 0 && subtotal < 150000 ? 15000 : 0;
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DISH_ORDER_KEY) || "null"); } catch {}
  if (!draft || draft.status !== "pending") {
    const id = Date.now();
    draft = { id, code: `DH-${String(id).slice(-4)}`, status: "pending" };
  }
  draft.items = cart.map((it) => ({
    dish_id: it.dish_id,
    item_name: it.name,
    size: it.size,
    toppings: it.toppings || [],
    unit_price: it.unitPrice,
    quantity: it.qty,
    line_total: it.unitPrice * it.qty,
  }));
  draft.subtotal = subtotal;
  draft.ship = ship;
  draft.total_amount = subtotal + ship;
  draft.title = `${draft.code} — ${draft.items.map((i) => `${i.item_name} ×${i.quantity}`).join(", ")}`;
  localStorage.setItem(DISH_ORDER_KEY, JSON.stringify(draft));
  return draft;
}

showPlate(heroImg);
dish.toppings.forEach((t) => {
  const label = document.createElement("label");
  label.innerHTML = `
    <span>
      <input type="checkbox" value="${t.price}" data-name="${t.name}">
      <img src="${t.image || FALLBACK_IMAGE}" alt="${t.name}">
      <span>${t.name}</span>
    </span>
    <span>${dong(t.price)}</span>`;
  label.querySelector("img").addEventListener("error", (e) => showPlate(e.target));
  toppingsEl.appendChild(label);
});

document.getElementById("dish-sizes").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-size]");
  if (!btn) return;
  state.size = btn.dataset.size;
  document.querySelectorAll("#dish-sizes button").forEach((b) => b.classList.toggle("is-selected", b === btn));
});

toppingsEl.addEventListener("change", renderPrice);
document.getElementById("qty-minus").addEventListener("click", () => {
  qtyEl.textContent = String(state.qty = Math.max(1, state.qty - 1));
  renderPrice();
});
document.getElementById("qty-plus").addEventListener("click", () => {
  qtyEl.textContent = String(state.qty = Math.min(10, state.qty + 1));
  renderPrice();
});

addBtn.addEventListener("click", () => {
  const toppings = [...document.querySelectorAll("#dish-toppings input:checked")].map((i) => i.dataset.name);
  const order = saveAndSyncOrder({
    dish_id: dish.id,
    name: dish.name,
    size: state.size,
    toppings,
    unitPrice: BASE_PRICE + toppingTotal(),
    qty: state.qty,
    tone: "peach",
  });
  toast(`Đã thêm ${state.qty} ${dish.name} (${state.size}) vào giỏ & đơn #${order.code}`);
});

async function loadDish() {
  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) return;
  try {
    const base = (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL ? CONFIG.API_BASE_URL : "http://127.0.0.1:8000/api").replace(/\/+$/, "");
    const res = await fetch(`${base}/menu/dishes`);
    if (!res.ok) return;
    const raw = await res.json();
    const rows = Array.isArray(raw) ? raw : raw.items || raw.dishes || raw.data || [];
    const selected = rows.find((r) => Number(r.id) === id);
    if (!selected) return;

    dish = { ...dish, id, name: selected.name };
    if (Number(selected.price) > 0) BASE_PRICE = Number(selected.price);
    document.querySelector(".fd-info h1").textContent = selected.name;
    document.querySelector(".fd-crumb").textContent = `Trang chủ / Thực đơn / ${selected.name}`;
    if (selected.description) document.querySelector(".fd-desc").textContent = selected.description;
    renderPrice();
  } catch {}
}

renderPrice();
loadDish();