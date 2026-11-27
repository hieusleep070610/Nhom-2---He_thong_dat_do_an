const TONES = ["art-peach", "art-green", "art-rose", "art-blue", "art-mint", "art-blush"];
const grid = document.getElementById("menu-grid");
const priceInput = document.getElementById("menu-price");
let dishes = [];
let loadError = false;
let selectedCategory = "";

function dong(value) {
  return Number(value).toLocaleString("vi-VN") + "đ";
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function noImageMarkup() {
  return '<div class="no-image" role="img" aria-label="No image"><span aria-hidden="true">▧</span><small>No image</small></div>';
}

function visibleDishes() {
  const keyword = document.getElementById("menu-search").value.trim().toLowerCase();
  const maxPrice = Number(priceInput.value);
  const sort = document.getElementById("menu-sort").value;
  const category = selectedCategory;
  const rows = dishes.filter((dish) => {
    const matchesPrice = dish.price >= 20000 && dish.price <= maxPrice;
    const matchesSearch = !keyword || dish.name.toLowerCase().includes(keyword) || dish.desc.toLowerCase().includes(keyword);
    return matchesPrice && matchesSearch && (!category || String(dish.category_id) === category);
  });
  if (sort === "price-asc") rows.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") rows.sort((a, b) => b.price - a.price);
  if (sort === "popular") rows.sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0));
  return rows;
}

function render() {
  document.getElementById("menu-price-label").textContent = `20.000đ — ${dong(priceInput.value)}`;
  const rows = visibleDishes();
  document.getElementById("menu-count").textContent = `Hiển thị ${rows.length} món ăn`;
  if (loadError) { grid.innerHTML = '<p class="cart-empty">Không tải được thực đơn. Vui lòng thử tải lại trang.</p>'; return; }
  if (!rows.length) {
    grid.innerHTML = '<p class="cart-empty">Không có món phù hợp bộ lọc.</p>';
    return;
  }
  grid.innerHTML = rows.map((dish, index) => `
    <article class="menu-card">
      <a href="dish.html?id=${encodeURIComponent(dish.id)}">
        <div class="art ${dish.tone}">${dish.image_url ? `<img class="dish-photo" src="${escapeHtml(dish.image_url)}" alt="${escapeHtml(dish.name)}" loading="lazy">` : noImageMarkup()}</div>
        <h3>${escapeHtml(dish.name)}</h3>
        <p>${escapeHtml(dish.desc)}</p>
        <small class="menu-sold">Đã bán ${Number(dish.sold_count || 0).toLocaleString("vi-VN")}</small>
      </a>
      <div class="menu-foot">
        <strong>${dong(dish.price)}</strong>
        <button type="button" class="menu-add" data-add="${index}" aria-label="Thêm ${escapeHtml(dish.name)}">+</button>
      </div>
    </article>`).join("");
  grid.querySelectorAll(".dish-photo").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = document.createElement("div");
      fallback.className = "no-image";
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", "No image");
      fallback.innerHTML = '<span aria-hidden="true">▧</span><small>No image</small>';
      image.replaceWith(fallback);
    }, { once: true });
  });
  grid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const dish = rows[Number(button.dataset.add)];
      addToCart({
        dish_id: dish.id,
        name: dish.name,
        size: "medium",
        toppings: [],
        unitPrice: dish.price,
        image_url: dish.image_url,
        qty: 1,
        tone: dish.tone.includes("green") || dish.tone.includes("mint") ? "green" : "peach",
      });
      showToast(`Đã thêm ${dish.name} vào giỏ hàng`);
    });
  });
}

priceInput.addEventListener("input", render);
document.getElementById("menu-search").addEventListener("input", render);
document.getElementById("menu-sort").addEventListener("change", render);

document.getElementById("menu-clear").addEventListener("click", () => {
  priceInput.value = "100000";
  selectedCategory = "";
  document.querySelectorAll("[data-menu-category]").forEach((input) => { input.checked = !input.value; });
  document.getElementById("menu-search").value = "";
  document.getElementById("menu-sort").value = "popular";
  render();
});

async function loadDishes() {
  try {
    const rows = await api.get("/menu/dishes");
    if (!Array.isArray(rows)) throw new Error("Dữ liệu thực đơn không hợp lệ");
    dishes = rows.map((dish, index) => ({
      id: Number(dish.id),
      name: dish.name,
      desc: dish.description || "Món trong thực đơn hôm nay",
      price: Number(dish.price) || 0,
      image_url: dish.image_url || "",
      category_id: dish.category_id,
      sold_count: Number(dish.sold_count || 0),
      tone: TONES[index % TONES.length],
    })).filter((dish) => Number.isInteger(dish.id) && dish.id > 0);
  } catch (error) {
    loadError = true;
  }
  render();
}

async function loadCategories() {
  try {
    const categories = await api.get("/categories/public");
    const holder = document.getElementById("menu-category-options");
    if (!holder || !Array.isArray(categories)) return;
    holder.innerHTML = `<label><input type="radio" name="menu-category" data-menu-category value="" checked> Tất cả danh mục</label>` + categories.map((category) => `<label><input type="radio" name="menu-category" data-menu-category value="${category.id}"> ${escapeHtml(category.name)}</label>`).join("");
    selectedCategory = new URLSearchParams(location.search).get("category_id") || "";
    const selectedInput = holder.querySelector(`[value="${CSS.escape(selectedCategory)}"]`);
    if (selectedInput) selectedInput.checked = true;
    if (selectedCategory && !selectedInput) selectedCategory = "";
    render();
    holder.addEventListener("change", (event) => {
      if (!event.target.matches("[data-menu-category]")) return;
      selectedCategory = event.target.value;
      render();
    });
  } catch { /* Bộ lọc giá và tìm kiếm vẫn dùng được nếu API danh mục lỗi */ }
}

render();
loadDishes();
loadCategories();
