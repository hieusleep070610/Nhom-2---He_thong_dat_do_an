const TOKEN_KEY = "access_token";
const USER_KEY = "user";

function saveSession(payload, remember) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
  store.setItem(TOKEN_KEY, payload.access_token);
  store.setItem(USER_KEY, JSON.stringify(payload.user));
}

function getPostLoginPage(user) {
  const role = String(user?.role || user?.role_name || "").trim().toLowerCase();
  const roles = Array.isArray(user?.roles) ? user.roles.map((item) => String(item).toLowerCase()) : [];
  if (Number(user?.role_id) === 1 || role === "admin" || role === "administrator" || roles.includes("admin")) {
    return "../admin/index.html";
  }
  return "profile.html";
}

function showError(id, message) {
  const box = document.getElementById(id);
  if (!box) return;
  box.hidden = !message;
  box.textContent = message || "";
}

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "Hiện" : "Ẩn";
  });
});

const forgot = document.getElementById("forgot-password");
if (forgot) {
  forgot.addEventListener("click", (event) => {
    event.preventDefault();
    showError("login-error", "Chức năng quên mật khẩu chưa được bật. Hãy dùng mật khẩu đã đăng ký.");
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("login-error", "");
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const payload = await api.post("/auth/login", {
        account: document.getElementById("login-account").value.trim(),
        password: document.getElementById("login-password").value,
      });
      saveSession(payload, document.getElementById("login-remember").checked);
      window.location.href = getPostLoginPage(payload.user);
    } catch (error) {
      showError("login-error", error.message || "Đăng nhập thất bại");
      button.disabled = false;
    }
  });
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("register-error", "");
    const password = document.getElementById("register-password").value;
    const confirm = document.getElementById("register-confirm").value;
    const phone = document.getElementById("register-phone").value.replace(/\s/g, "");
    if (!/^0\d{8,10}$/.test(phone)) {
      showError("register-error", "Số điện thoại cần bắt đầu bằng 0 và có 9–11 chữ số.");
      return;
    }
    if (password.length < 8) {
      showError("register-error", "Mật khẩu cần ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      showError("register-error", "Mật khẩu nhập lại chưa khớp.");
      return;
    }
    const button = registerForm.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const payload = await api.post("/auth/register", {
        full_name: document.getElementById("register-name").value.trim(),
        email: document.getElementById("register-email").value.trim(),
        phone,
        password,
      });
      saveSession(payload, true);
      window.location.href = "profile.html";
    } catch (error) {
      showError("register-error", error.message || "Đăng ký thất bại");
      button.disabled = false;
    }
  });
}
