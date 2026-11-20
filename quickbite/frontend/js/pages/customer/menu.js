const TONES = ["art-peach", "art-green", "art-rose", "art-blue", "art-mint", "art-blush"];
const DRAFT_ORDER_KEY = "quickbite_active_order";
const SHIP_FEE = 15000;
const FREE_SHIP_FROM = 150000;

const grid = document.getElementById("menu-grid");
const priceInput = document.getElementById("menu-price");
let dishes = [];
let loadError = false;
let errorDetail = "";

function dong(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function selectedCategory() {
  const checked = document.querySelector("input[name='category']:checked");
  return checked ? checked.value : "all";
}

function guessCategory(dish) {
  if (dish.category) return dish.category;
  const text = `${dish.name || ""} ${dish.description || ""}`.toLowerCase();
  if (text.includes("cơm")) return "Cơm";
  if (text.includes("salad") || text.includes("healthy")) return "Healthy";
  if (text.includes("trà") || text.includes("nước") || text.includes("cafe") || text.includes("cà phê")) return "Đồ uống";
  if (text.includes("chè") || text.includes("bánh")) return "Tráng miệng";
  return "Món nước";
}

function getCurrentCart() {
  if (typeof readCart === "function") {
    return readCart() || [];
  }
  try {
    return JSON.parse(localStorage.getItem("quickbite_cart")) || [];
  } catch {
    return [];
  }
}

function syncCartToDraftOrder(cart) {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 1),
    0
  );
  const ship = subtotal > 0 && subtotal < FREE_SHIP_FROM ? SHIP_FEE : 0;
  const totalAmount = subtotal + ship;

  let draftOrder = null;
  try {
    draftOrder = JSON.parse(localStorage.getItem(DRAFT_ORDER_KEY));
  } catch {
    draftOrder = null;
  }

  if (!draftOrder || draftOrder.status !== "pending") {
    const id = Date.now();
    draftOrder = {
      id,
      code: `DH-${String(id).slice(-4)}`,
      status: "pending",
      customer_name: "Nguyễn Văn A",
      customer_phone: "0912345678",
      pickup_date: new Date().toISOString().slice(0, 10),
      pickup_slot_id: 1,
      items: [],
      total_amount: 0,
    };
  }

  draftOrder.items = cart.map((item) => {
    const unitPrice = Number(item.unitPrice || 0);
    const qty = Number(item.qty || 1);
    return {
      dish_id: item.dish_id,
      item_name: item.name,
      size: item.size || "Thường",
      toppings: item.toppings || [],
      unit_price: unitPrice,
      quantity: qty,
      line_total: unitPrice * qty,
    };
  });
  draftOrder.subtotal = subtotal;
  draftOrder.ship = ship;
  draftOrder.total_amount = totalAmount;
  draftOrder.updated_at = new Date().toISOString();

  localStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(draftOrder));
  return draftOrder;
}

function visibleDishes() {
  const keyword = document.getElementById("menu-search").value.trim().toLowerCase();
  const category = selectedCategory();
  const maxPrice = Number(priceInput.value);
  const rated = document.getElementById("menu-rating").checked;
  const sort = document.getElementById("menu-sort").value;

  const rows = dishes.filter((dish) => {
    const matchesCategory = category === "all" || dish.category === category;
    const matchesPrice = dish.price <= maxPrice;
    const matchesRating = !rated || dish.rating >= 4.5;
    const matchesSearch =
      !keyword ||
      dish.name.toLowerCase().includes(keyword) ||
      dish.desc.toLowerCase().includes(keyword);
    return matchesCategory && matchesPrice && matchesRating && matchesSearch;
  });

  if (sort === "price-asc") rows.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") rows.sort((a, b) => b.price - a.price);
  return rows;
}

function render() {
  document.getElementById("menu-price-label").textContent = `20.000đ — ${dong(priceInput.value)}`;

  if (loadError) {
    document.getElementById("menu-count").textContent = "Hiển thị 0 món ăn";
    grid.innerHTML = `<p class="cart-empty">Không tải được thực đơn (${escapeHtml(errorDetail || "kiểm tra API / CORS")}).</p>`;
    return;
  }

  const rows = visibleDishes();
  document.getElementById("menu-count").textContent = `Hiển thị ${rows.length} món ăn`;

  if (!rows.length) {
    grid.innerHTML = '<p class="cart-empty">Không có món phù hợp bộ lọc.</p>';
    return;
  }

  grid.innerHTML = rows
    .map(
      (dish, index) => `
    <article class="menu-card">
      <a href="dish.html?id=${encodeURIComponent(dish.id)}">
        <div class="art ${dish.tone}"><div class="plate"><span><i></i><i></i><i></i></span></div></div>
        <h3>${escapeHtml(dish.name)}</h3>
        <p>${escapeHtml(dish.desc)}</p>
      </a>
      <div class="menu-foot">
        <strong>${dong(dish.price)}</strong>
        <button type="button" class="menu-add" data-add="${index}" aria-label="Thêm ${escapeHtml(dish.name)}">+</button>
      </div>
    </article>`
    )
    .join("");

  grid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const dish = rows[Number(button.dataset.add)];
      if (!dish) return;

      if (typeof addToCart === "function") {
        addToCart({
          dish_id: dish.id,
          name: dish.name,
          size: "Thường",
          toppings: [],
          unitPrice: dish.price,
          qty: 1,
          tone: dish.tone.includes("green") || dish.tone.includes("mint") ? "green" : "peach",
        });
      }

      const order = qbAddOneAndSyncOrder({
        dish_id: dish.id,
        name: dish.name,
        size: "Thường",
        toppings: [],
        unitPrice: dish.price,
        qty: 1,
        tone: dish.tone.includes("green") || dish.tone.includes("mint") ? "green" : "peach",
      });
      if (typeof showToast === "function") {
        showToast(`Đã thêm ${dish.name} vào giỏ & đơn đang xử lý #${order.code}`);
      }
    });
  });
}

document.getElementById("menu-categories").addEventListener("change", render);
priceInput.addEventListener("input", render);
document.getElementById("menu-rating").addEventListener("change", render);
document.getElementById("menu-search").addEventListener("input", render);
document.getElementById("menu-sort").addEventListener("change", render);

document.getElementById("menu-clear").addEventListener("click", () => {
  document.querySelector("input[name='category'][value='all']").checked = true;
  priceInput.value = "100000";
  document.getElementById("menu-rating").checked = false;
  document.getElementById("menu-search").value = "";
  document.getElementById("menu-sort").value = "popular";
  render();
});

async function loadDishes() {
  loadError = false;
  errorDetail = "";
  try {
    const baseUrl =
      typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL
        ? CONFIG.API_BASE_URL
        : "http://127.0.0.1:8000/api";
    const url = `${baseUrl.replace(/\/+$/, "")}/menu/dishes`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const raw = await response.json();
    const rows = Array.isArray(raw) ? raw : raw.items || raw.dishes || raw.data || [];
    if (!Array.isArray(rows)) {
      throw new Error("Sai định dạng danh sách");
    }

    dishes = rows
      .map((dish, index) => ({
        id: Number(dish.id),
        name: dish.name || "Món ăn",
        desc: dish.description || "Món trong thực đơn hôm nay",
        price: Number(dish.price) || 0,
        category: guessCategory(dish),
        tone: TONES[index % TONES.length],
        rating: Number(dish.rating) || 4.8,
      }))
      .filter((dish) => Number.isInteger(dish.id) && dish.id > 0);
  } catch (error) {
    console.error("Lỗi tải thực đơn:", error);
    loadError = true;
    errorDetail = error.message || String(error);
  }
  render();
}

render();
loadDishes();