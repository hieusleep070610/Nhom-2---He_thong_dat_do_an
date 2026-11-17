const MENU = [
  { name: "Bún bò Huế", desc: "Đậm đà chuẩn vị cố đô", price: 55000, category: "Món nước", tone: "art-peach", rating: 4.9 },
  { name: "Cơm gà xối mỡ", desc: "Da giòn, cơm thơm", price: 49000, category: "Cơm", tone: "art-green", rating: 4.8 },
  { name: "Salad cá hồi", desc: "Tươi ngon, giàu dinh dưỡng", price: 69000, category: "Healthy", tone: "art-rose", rating: 4.7 },
  { name: "Mì Ý bò bằm", desc: "Sốt cà chua đặc biệt", price: 65000, category: "Món nước", tone: "art-blue", rating: 4.6 },
  { name: "Gỏi cuốn tôm thịt", desc: "Tươi mát mỗi ngày", price: 39000, category: "Healthy", tone: "art-mint", rating: 4.8 },
  { name: "Bánh mì đặc biệt", desc: "Giòn rụm, đầy đặn", price: 32000, category: "Cơm", tone: "art-blush", rating: 4.5 },
];

const TONES = ["art-peach", "art-green", "art-rose", "art-blue", "art-mint", "art-blush"];
const grid = document.getElementById("menu-grid");
const priceInput = document.getElementById("menu-price");
let dishes = MENU.slice();

function dong(value) {
  return Number(value).toLocaleString("vi-VN") + "đ";
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function selectedCategory() {
  return document.querySelector("input[name='category']:checked").value;
}

function visibleDishes() {
  const keyword = document.getElementById("menu-search").value.trim().toLowerCase();
  const category = selectedCategory();
  const maxPrice = Number(priceInput.value);
  const rated = document.getElementById("menu-rating").checked;
  const sort = document.getElementById("menu-sort").value;
  const rows = dishes.filter((dish) => {
    const matchesCategory = category === "all" || dish.category === category;
    const matchesPrice = dish.price >= 20000 && dish.price <= maxPrice;
    const matchesRating = !rated || dish.rating >= 4.5;
    const matchesSearch = !keyword || dish.name.toLowerCase().includes(keyword) || dish.desc.toLowerCase().includes(keyword);
    return matchesCategory && matchesPrice && matchesRating && matchesSearch;
  });
  if (sort === "price-asc") rows.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") rows.sort((a, b) => b.price - a.price);
  return rows;
}

function render() {
  document.getElementById("menu-price-label").textContent = `20.000đ — ${dong(priceInput.value)}`;
  const rows = visibleDishes();
  document.getElementById("menu-count").textContent = `Hiển thị ${rows.length} món ăn`;
  if (!rows.length) {
    grid.innerHTML = '<p class="cart-empty">Không có món phù hợp bộ lọc.</p>';
    return;
  }
  grid.innerHTML = rows.map((dish, index) => `
    <article class="menu-card">
      <a href="dish.html">
        <div class="art ${dish.tone}"><div class="plate"><span><i></i><i></i><i></i></span></div></div>
        <h3>${escapeHtml(dish.name)}</h3>
        <p>${escapeHtml(dish.desc)}</p>
      </a>
      <div class="menu-foot">
        <strong>${dong(dish.price)}</strong>
        <button type="button" class="menu-add" data-add="${index}" aria-label="Thêm ${escapeHtml(dish.name)}">+</button>
      </div>
    </article>`).join("");
  grid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const dish = rows[Number(button.dataset.add)];
      addToCart({
        name: dish.name,
        size: "Thường",
        toppings: [],
        unitPrice: dish.price,
        qty: 1,
        tone: dish.tone.includes("green") || dish.tone.includes("mint") ? "green" : "peach",
      });
      showToast(`Đã thêm ${dish.name} vào giỏ hàng`);
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
  try {
    const response = await fetch("http://127.0.0.1:8000/api/menu/dishes");
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return;
    dishes = rows.map((dish, index) => ({
      name: dish.name,
      desc: dish.description || "Món trong thực đơn hôm nay",
      price: Number(dish.price) || 0,
      category: "Món nước",
      tone: TONES[index % TONES.length],
      rating: 4.8,
    }));
  } catch (error) {
    dishes = MENU.slice();
  }
  render();
}

render();
loadDishes();
