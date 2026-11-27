(() => {
  const tones = ["art-peach", "art-green", "art-mint", "art-blue", "art-rose", "art-blush"];
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  const noImage = (compact = false) => `<div class="no-image${compact ? " no-image--compact" : ""}" role="img" aria-label="No image"><span aria-hidden="true">▧</span><small>No image</small></div>`;
  const dishHref = (id) => `pages/customer/dish.html?id=${encodeURIComponent(id)}`;
  const menuHref = (categoryId) => `pages/customer/menu.html${categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : ""}`;
  const card = (dish, index) => `<a class="food-card" href="${dishHref(dish.id)}">
    <div class="art ${tones[index % tones.length]}">${dish.image_url ? `<img class="dish-photo" src="${escapeHtml(dish.image_url)}" alt="${escapeHtml(dish.name)}" loading="lazy">` : noImage()}</div>
    <div class="food-card-body"><h3>${escapeHtml(dish.name)}</h3><p>${escapeHtml(dish.description || "Món ngon mỗi ngày")}</p><div class="food-card-foot"><strong>${money(dish.price)}</strong><small>Đã bán ${Number(dish.sold_count || 0).toLocaleString("vi-VN")}</small></div></div>
  </a>`;
  const hookImageFallbacks = (root) => root.querySelectorAll(".dish-photo").forEach((img) => img.addEventListener("error", () => {
    const fallback = document.createElement("div"); fallback.className = "no-image"; fallback.setAttribute("role", "img"); fallback.setAttribute("aria-label", "No image"); fallback.innerHTML = '<span aria-hidden="true">▧</span><small>No image</small>'; img.replaceWith(fallback);
  }, { once: true }));
  const renderCarousel = (id, dishes) => {
    const items = dishes.slice(0, 6);
    if (!items.length) return '<p class="home-empty">Danh mục này chưa có món ăn.</p>';
    return `<div class="home-carousel" data-carousel>
      <button class="carousel-arrow" type="button" data-direction="prev" aria-label="Hiện món trước" disabled>‹</button>
      <div class="home-carousel-viewport"><div class="home-carousel-track">${items.map(card).join("")}</div></div>
      <button class="carousel-arrow" type="button" data-direction="next" aria-label="Hiện món tiếp theo" ${items.length <= 4 ? "disabled" : ""}>›</button>
    </div>`;
  };
  async function load() {
    const catsEl = document.getElementById("home-categories");
    const favoritesEl = document.getElementById("home-favorites");
    try {
      const [dishes, categories] = await Promise.all([api.get("/menu/dishes"), api.get("/categories/public")]);
      if (!Array.isArray(dishes)) throw new Error("Dữ liệu món ăn không hợp lệ.");
      const available = dishes.filter((dish) => dish.is_available !== false);
      const heroImages = available.filter((dish) => typeof dish.image_url === "string" && dish.image_url.trim());
      if (heroImages.length) {
        const selectedDish = heroImages[Math.floor(Math.random() * heroImages.length)];
        const hero = document.querySelector(".home-art");
        const image = document.createElement("img");
        image.src = selectedDish.image_url;
        image.alt = `Món ${selectedDish.name}`;
        image.fetchPriority = "high";
        image.addEventListener("load", () => hero.querySelector(".no-image")?.remove(), { once: true });
        image.addEventListener("error", () => image.remove(), { once: true });
        hero.appendChild(image);
      }
      if (Array.isArray(categories)) {
        const featuredCategories = categories.slice(0, 5);
        catsEl.innerHTML = featuredCategories.length ? featuredCategories.map((category, index) => `<a class="cat-card" href="${menuHref(category.id)}"><span>${["🍜", "🍚", "🥗", "🍰", "🥤"][index % 5]}</span>${escapeHtml(category.name)}</a>`).join("") : '<p class="home-empty">Chưa có danh mục món ăn.</p>';
        document.getElementById("home-category-dishes").innerHTML = featuredCategories.map((category) => {
          const rows = available.filter((dish) => Number(dish.category_id) === Number(category.id));
          if (!rows.length) return "";
          return `<section class="home-category-section"><div class="home-head"><h2>${escapeHtml(category.name)}</h2><a href="${menuHref(category.id)}">Xem tất cả →</a></div>${renderCarousel(category.id, rows)}</section>`;
        }).join("");
      }
      favoritesEl.innerHTML = available.slice().sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0)).slice(0, 4).map(card).join("") || '<p class="home-empty">Chưa có món ăn đang bán.</p>';
      hookImageFallbacks(document);
      document.querySelectorAll("[data-carousel]").forEach((carousel) => {
        let offset = 0;
        const track = carousel.querySelector(".home-carousel-track");
        const cards = [...track.children];
        const visibleCount = () => window.matchMedia("(max-width: 640px)").matches ? 2 : 4;
        const update = () => {
          offset = Math.min(offset, Math.max(0, cards.length - visibleCount()));
          const cardWidth = cards[0]?.getBoundingClientRect().width || 0;
          const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          track.style.justifyContent = "flex-start";
          track.style.transform = `translateX(-${offset * (cardWidth + gap)}px)`;
          carousel.querySelector('[data-direction="prev"]').disabled = offset === 0;
          carousel.querySelector('[data-direction="next"]').disabled = offset >= Math.max(0, cards.length - visibleCount());
        };
        carousel.addEventListener("click", (event) => {
          const button = event.target.closest("[data-direction]"); if (!button) return;
          offset = Math.max(0, Math.min(Math.max(0, cards.length - visibleCount()), offset + (button.dataset.direction === "next" ? 1 : -1))); update();
        });
        window.addEventListener("resize", update); update();
      });
    } catch (error) {
      catsEl.innerHTML = '<p class="home-empty">Không tải được danh mục.</p>';
      favoritesEl.innerHTML = `<p class="home-empty">${escapeHtml(error.message || "Không tải được món ăn.")}</p>`;
    }
  }
  load();
})();
