(() => {
  const pages = [
    ["dashboard", "Tổng quan", "index.html"], ["dishes", "Món ăn", "menu.html"],
    ["categories", "Danh mục", "categories.html"], ["ingredients", "Nguyên liệu", "ingredients.html"],
    ["recipes", "Công thức món", "recipes.html"], ["orders", "Đơn hàng", "orders.html"],
    ["payments", "Thanh toán", "payments.html"], ["users", "Người dùng", "users.html"],
  ];
  const page = document.body.dataset.adminPage || "dashboard";
  const shell = document.querySelector(".admin-shell");
  if (!shell) return;
  const root = "../../";
  const side = shell.querySelector(".admin-side");
  if (side) {
    side.innerHTML = `<a class="admin-brand" href="index.html"><strong>foodie</strong><small>QUẢN TRỊ HỆ THỐNG</small></a><nav class="admin-nav" aria-label="Quản trị">${pages.map(([key, label, href], index) => `<a href="${href}" class="${page === key ? "is-active" : ""}"><span>${String(index + 1).padStart(2, "0")}</span>${label}</a>`).join("")}</nav><div class="admin-branch"><small>CHI NHÁNH</small><strong>Foodie · Quận 1</strong><span>12 Nguyễn Huệ, TP. HCM</span><small class="admin-privacy">Phiên quản trị được bảo mật</small><button class="admin-logout" id="adminLogout" type="button"><span aria-hidden="true">↪</span> Đăng xuất</button></div>`;
    side.querySelector("#adminLogout").addEventListener("click", () => {
      window.AdminUI.open({
        title: "Đăng xuất khỏi trang quản trị?",
        subtitle: "Phiên đăng nhập hiện tại sẽ kết thúc trên thiết bị này.",
        content: "Bạn cần đăng nhập lại để tiếp tục quản lý hệ thống.",
        primary: "Đăng xuất",
        danger: true,
        onPrimary: () => {
          [localStorage, sessionStorage].forEach((store) => {
            store.removeItem("access_token");
            store.removeItem("user");
          });
          window.location.replace("../customer/login.html");
          return true;
        },
      });
    });
  }
  const main = shell.querySelector(".admin-main");
  if (main && !main.querySelector(".admin-topbar")) {
    const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    let user = {};
    try { user = rawUser ? JSON.parse(rawUser) : {}; } catch (_) { user = {}; }
    const name = String(user.full_name || user.username || "Quản trị viên").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
    const topbar = document.createElement("header");
    topbar.className = "admin-topbar";
    topbar.innerHTML = `<div>Foodie <span>/</span> Quản trị vận hành</div><div class="admin-topbar-meta"><time>${date}</time><span>·</span><span>${name}</span><span>/</span><span>Quản trị viên</span></div>`;
    main.prepend(topbar);
  }
})();
