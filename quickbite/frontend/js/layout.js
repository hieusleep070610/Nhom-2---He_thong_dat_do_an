const FALLBACK_ROLE_NAVIGATION = {
  customer: [
    { label: "Trang chủ", href: "index.html" },
    { label: "Thực đơn", href: "pages/customer/menu.html" },
    { label: "Đơn hàng", href: "pages/customer/orders.html" },
    { label: "Ví", href: "pages/customer/wallet.html" },
  ],
  kitchen: [
    { label: "Bếp", href: "pages/kitchen/index.html" },
    { label: "Đơn hàng", href: "pages/customer/orders.html" },
  ],
  admin: [
    { label: "Tổng quan", href: "pages/admin/index.html" },
    { label: "Thực đơn", href: "pages/customer/menu.html" },
    { label: "Đơn hàng", href: "pages/customer/orders.html" },
  ],
};

function getStoredUser() {
  const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.warn("Không thể đọc thông tin tài khoản đã lưu:", error);
    return null;
  }
}

function getLayoutRole(user) {
  const pageRole = document.body.dataset.role;
  if (pageRole === "admin" || pageRole === "kitchen" || pageRole === "customer") {
    return pageRole;
  }

  const path = window.location.pathname;
  if (path.includes("/pages/admin/")) return "admin";
  if (path.includes("/pages/kitchen/")) return "kitchen";

  const role = String((user && (user.role || user.role_name || user.user_type)) || "")
    .trim()
    .toLowerCase();
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((item) => String(item).trim().toLowerCase())
    : [];
  if (Number(user?.role_id) === 1 || role === "admin" || role === "administrator" || roles.includes("admin")) {
    return "admin";
  }
  if (Number(user?.role_id) === 2 || role === "kitchen" || role === "chef" || roles.includes("kitchen")) {
    return "kitchen";
  }
  return "customer";
}

function isActiveLink(href, currentPath) {
  return (
    currentPath.endsWith("/" + href) ||
    (href === "index.html" && (currentPath.endsWith("/") || currentPath.endsWith("/index.html")))
  );
}

function renderLayout() {
  const root =
    document.body.dataset.root ||
    (window.location.pathname.includes("/pages/") ? "../../" : "./");
  const user = getStoredUser();
  const role = getLayoutRole(user);
  let header = document.querySelector(".fd-header");

  if (!header) {
    header = document.createElement("header");
    header.className = "fd-header";
    const mount = document.querySelector(".admin-shell, main") || document.body.firstChild;
    document.body.insertBefore(header, mount || null);
  }

  document.body.dataset.layoutRole = role;
  const currentPath = window.location.pathname;

  const navSource =
    (typeof ROLE_NAVIGATION !== "undefined" && ROLE_NAVIGATION) || FALLBACK_ROLE_NAVIGATION;
  const roleItems = navSource[role] || FALLBACK_ROLE_NAVIGATION.customer;

  const navigation = roleItems
    .map((item) => {
      if (item.disabled) {
        return `<span class="fd-nav-disabled" aria-disabled="true">${item.label}</span>`;
      }

      const activeClass = isActiveLink(item.href, currentPath) ? " is-active" : "";
      return `<a class="${activeClass.trim()}" href="${root}${item.href}">${item.label}</a>`;
    })
    .join("");

  const displayName = user && (user.full_name || user.username);
  const accountLabel = displayName ? `Xin chào, ${displayName}` : "Đăng nhập";
  const accountHref = displayName
    ? `${root}pages/customer/profile.html`
    : `${root}pages/customer/login.html`;
  const cart =
    role === "customer"
      ? `<a class="fd-cart" href="${root}pages/customer/cart.html" aria-label="Giỏ hàng">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 11H7L6 7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      </a>`
      : "";

  header.innerHTML = `
    <div class="fd-header-inner">
      <a class="fd-logo" href="${root}index.html" aria-label="QuickBite - Trang chủ">
        <img src="${root}assets/images/logo.png" alt="" width="40" height="40">
        <span class="fd-logo-name">QuickBite</span>
      </a>
      <label class="fd-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <input type="search" placeholder="Tìm món ăn, nhà hàng..." aria-label="Tìm món ăn, nhà hàng">
      </label>
      <button class="fd-nav-toggle" type="button" aria-expanded="false" aria-controls="app-navigation">
        <span class="sr-only">Mở điều hướng</span>
        <span aria-hidden="true">☰</span>
      </button>
      <nav class="fd-nav" id="app-navigation" aria-label="Điều hướng chính">${navigation}</nav>
      <div class="fd-header-actions">
        ${cart}
        <div class="fd-notifications">
          <button class="fd-notification-toggle" type="button" aria-expanded="false" aria-controls="notification-panel" aria-label="Thông báo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <section class="fd-notification-panel" id="notification-panel" aria-label="Thông báo" hidden>
            <h2>Thông báo</h2>
            <p role="status">Bạn chưa có thông báo mới.</p>
          </section>
        </div>
        <a class="fd-user" id="home-account" href="${accountHref}">
          <span class="fd-user-name" id="header-username"></span>
          <span class="fd-avatar" id="header-avatar" aria-hidden="true"></span>
          <span class="sr-only" id="home-account-name"></span>
          <span class="sr-only" id="home-account-avatar"></span>
        </a>
      </div>
    </div>`;

  const initial = displayName ? String(displayName).trim().charAt(0).toUpperCase() : "?";
  header.querySelector("#header-username").textContent = accountLabel;
  header.querySelector("#header-avatar").textContent = initial;
  header.querySelector("#home-account-name").textContent = accountLabel;
  header.querySelector("#home-account-avatar").textContent = initial;

  const navToggle = header.querySelector(".fd-nav-toggle");
  const nav = header.querySelector(".fd-nav");
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("is-open", !expanded);
  });

  const notificationToggle = header.querySelector(".fd-notification-toggle");
  const notificationPanel = header.querySelector(".fd-notification-panel");
  notificationToggle.addEventListener("click", () => {
    const expanded = notificationToggle.getAttribute("aria-expanded") === "true";
    notificationToggle.setAttribute("aria-expanded", String(!expanded));
    notificationPanel.hidden = expanded;
  });

  document.addEventListener("click", (event) => {
    if (!header.querySelector(".fd-notifications").contains(event.target)) {
      notificationPanel.hidden = true;
      notificationToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      notificationPanel.hidden = true;
      notificationToggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

renderLayout();