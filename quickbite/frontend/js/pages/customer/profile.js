
// Cấu hình
const LOGIN_URL = "login.html";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

// Lấy các phần tử HTML
const loading = document.getElementById("profile-loading");
const errorBox = document.getElementById("profile-error");
const profileContent = document.getElementById("profile-content");
const logoutButton = document.getElementById("btn-logout");

// Biến quản lý bộ đếm hết hạn token
let expiryTimer = null;


// ============================================
// 1. GIẢI MÃ JWT
// ============================================

function decodeToken(token) {
    try {
        const parts = token.split(".");

        if (parts.length !== 3) {
            return null;
        }

        let payload = parts[1];

        // Chuyển Base64 URL sang Base64 thông thường
        payload = payload.replace(/-/g, "+").replace(/_/g, "/");

        while (payload.length % 4 !== 0) {
            payload += "=";
        }

        return JSON.parse(atob(payload));

    } catch (error) {
        return null;
    }
}


// ============================================
// 2. XÓA PHIÊN ĐĂNG NHẬP
// ============================================

function logout(message = "Bạn đã đăng xuất!") {

    // Xóa bộ đếm hết hạn
    if (expiryTimer) {
        clearTimeout(expiryTimer);
        expiryTimer = null;
    }

    // Xóa dữ liệu đăng nhập
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    // Thông báo
    sessionStorage.setItem("logout_message", message);

    // Chuyển về trang đăng nhập
    window.location.replace(LOGIN_URL);
}


// ============================================
// 3. KIỂM TRA TOKEN HẾT HẠN
// ============================================

function checkTokenExpiration() {

    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
        logout("Vui lòng đăng nhập để tiếp tục!");
        return false;
    }

    const payload = decodeToken(token);

    // Token không hợp lệ
    if (!payload) {
        logout("Phiên đăng nhập không hợp lệ!");
        return false;
    }

    // JWT sử dụng exp tính theo giây
    if (payload.exp) {

        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.exp <= currentTime) {
            logout("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            return false;
        }

        // Tính thời gian còn lại
        const remainingTime = payload.exp * 1000 - Date.now();

        // Tự động kiểm tra khi đến thời điểm hết hạn
        if (expiryTimer) {
            clearTimeout(expiryTimer);
        }

        expiryTimer = setTimeout(() => {
            checkTokenExpiration();
        }, Math.min(remainingTime + 100, 2147480000));
    }

    return true;
}


// ============================================
// 4. KIỂM TRA KHI QUAY LẠI TAB
// ============================================

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {
        checkTokenExpiration();
    }

});


// ============================================
// 5. HIỂN THỊ THÔNG TIN TÀI KHOẢN
// ============================================

function renderProfile(user) {

    // Họ tên
    const fullName = user.full_name || user.username || "Chưa cập nhật";

    // Email
    const email = user.email || "Chưa cập nhật";

    // Số điện thoại
    const phone = user.phone_number || user.phone || "Chưa cập nhật";

    // Địa chỉ
    const address = user.address || "Chưa cập nhật";

    // Hiển thị dữ liệu
    document.getElementById("profile-name").textContent = fullName;

    document.getElementById("profile-email").textContent = email;

    document.getElementById("profile-phone").textContent = phone;

    document.getElementById("profile-address").textContent = address;
    document.getElementById("profile-address-input").value = user.address || "";

    // Hiển thị tên trên Header
    document.getElementById("header-username").textContent =
        "Xin chào, " + fullName;

    // Lấy chữ cái đầu của tên
    document.getElementById("header-avatar").textContent =
        fullName.trim().charAt(0).toUpperCase();

    // Hiển thị nội dung
    loading.hidden = true;
    errorBox.hidden = true;
    profileContent.hidden = false;
}

document.getElementById("btn-edit-address").addEventListener("click", () => {
    const form = document.getElementById("profile-address-form");
    form.hidden = !form.hidden;
    document.getElementById("profile-address-status").textContent = "";
});

document.getElementById("btn-cancel-address").addEventListener("click", () => {
    document.getElementById("profile-address-form").hidden = true;
    document.getElementById("profile-address-status").textContent = "";
});

document.getElementById("profile-address-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const address = document.getElementById("profile-address-input").value.trim();
    const status = document.getElementById("profile-address-status");
    const saveButton = document.getElementById("btn-save-profile-address");
    if (!address) { status.textContent = "Vui lòng nhập địa chỉ."; return; }
    saveButton.disabled = true;
    try {
        const user = await api.put("/auth/me", { address });
        document.getElementById("profile-address").textContent = user.address || "Chưa cập nhật";
        document.getElementById("profile-address-input").value = user.address || "";
        status.textContent = "Địa chỉ đã được cập nhật.";
    } catch (error) {
        status.textContent = error.message || "Không thể cập nhật địa chỉ.";
    } finally { saveButton.disabled = false; }
});


// ============================================
// 6. LẤY THÔNG TIN TỪ BACKEND
// ============================================

async function fetchProfile() {

    // Kiểm tra token trước khi gọi API
    if (!checkTokenExpiration()) {
        return;
    }

    try {
        const result = await api.get("/auth/me");

        // Hỗ trợ cả response JSON trực tiếp
        // và response có dạng { data: {...} }
        const user = result.data || result.user || result;

        if (!user || typeof user !== "object") {
            throw new Error("Dữ liệu tài khoản không hợp lệ!");
        }

        // Kiểm tra lại token trước khi hiển thị
        if (!checkTokenExpiration()) {
            return;
        }

        // Lưu thông tin người dùng
        const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        store.setItem(USER_KEY, JSON.stringify(user));

        // Hiển thị thông tin
        renderProfile(user);

    } catch (error) {

        if (error.status === 401) {
            logout("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            return;
        }

        console.error("Profile error:", error);

        loading.hidden = true;

        errorBox.hidden = false;

        errorBox.textContent =
            error.message || "Có lỗi xảy ra khi tải thông tin tài khoản.";
    }
}


// ============================================
// 7. NÚT ĐĂNG XUẤT
// ============================================

logoutButton.addEventListener("click", () => {

    const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất?");

    if (confirmLogout) {
        logout("Bạn đã đăng xuất thành công!");
    }

});


// ============================================
// 8. KHỞI CHẠY TRANG TÀI KHOẢN
// ============================================

fetchProfile();
