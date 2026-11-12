
// ==========================================
// 1. LẤY CÁC PHẦN TỬ HTML
// ==========================================

const loginForm = document.getElementById("authLoginForm");

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");

const identifierInput = document.getElementById("identifierInput");
const passwordInput = document.getElementById("passwordInput");

const rememberMe = document.getElementById("rememberMeCheckbox");

const identifierError = document.getElementById("identifierError");
const passwordError = document.getElementById("passwordError");

const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const btnArrow = document.getElementById("btnArrow");
const btnSpinner = document.getElementById("btnSpinner");

const dynamicRoleMenu = document.getElementById("dynamicRoleMenu");


// ==========================================
// 2. ÁNH XẠ ROLE_ID THEO MYSQL
// ==========================================

const ROLE_ID_MAP = {
    1: "admin",
    2: "customer",
    3: "restaurant_owner",
    4: "staff"
};


// ==========================================
// 3. CẤU HÌNH MENU THEO ROLE
// ==========================================

const ROLE_CONFIG = {

    admin: {
        name: "Quản trị viên",

        welcome: "Chào mừng Quản trị viên đến với hệ thống QuickBite.",

        menus: [
            {
                icon: "layout-dashboard",
                title: "Tổng quan",
                description: "Theo dõi hoạt động toàn hệ thống.",
                url: "../index.html"
            },
            {
                icon: "users",
                title: "Quản lý người dùng",
                description: "Quản lý tài khoản người dùng.",
                url: "users.html"
            },
            {
                icon: "store",
                title: "Quản lý nhà hàng",
                description: "Quản lý các nhà hàng trong hệ thống.",
                url: "#"
            },
            {
                icon: "utensils",
                title: "Quản lý thực đơn",
                description: "Quản lý các món ăn.",
                url: "#"
            },
            {
                icon: "shopping-cart",
                title: "Quản lý đơn hàng",
                description: "Theo dõi đơn hàng toàn hệ thống.",
                url: "#"
            }
        ]
    },


    customer: {
        name: "Khách hàng",

        welcome: "Chào mừng bạn đến với QuickBite. Hãy khám phá các món ăn yêu thích.",

        menus: [
            {
                icon: "utensils",
                title: "Thực đơn",
                description: "Khám phá các món ăn.",
                url: "../index.html"
            },
            {
                icon: "shopping-cart",
                title: "Đơn hàng của tôi",
                description: "Theo dõi các đơn hàng đã đặt.",
                url: "#"
            },
            {
                icon: "wallet",
                title: "Ví điện tử",
                description: "Kiểm tra số dư ví.",
                url: "#"
            },
            {
                icon: "user",
                title: "Thông tin cá nhân",
                description: "Quản lý thông tin tài khoản.",
                url: "#"
            }
        ]
    },


    restaurant_owner: {
        name: "Chủ nhà hàng",

        welcome: "Chào mừng Chủ nhà hàng đến với hệ thống quản lý QuickBite.",

        menus: [
            {
                icon: "store",
                title: "Nhà hàng của tôi",
                description: "Quản lý thông tin nhà hàng.",
                url: "#"
            },
            {
                icon: "utensils",
                title: "Quản lý món ăn",
                description: "Thêm, sửa và xóa món ăn.",
                url: "#"
            },
            {
                icon: "clipboard-list",
                title: "Quản lý đơn hàng",
                description: "Theo dõi và xử lý đơn hàng.",
                url: "#"
            },
            {
                icon: "boxes",
                title: "Quản lý nguyên liệu",
                description: "Kiểm soát nguyên liệu nhà hàng.",
                url: "#"
            }
        ]
    },


    staff: {
        name: "Nhân viên",

        welcome: "Chào mừng Nhân viên đến với hệ thống QuickBite.",

        menus: [
            {
                icon: "clipboard-list",
                title: "Đơn hàng",
                description: "Theo dõi và cập nhật trạng thái đơn hàng.",
                url: "#"
            },
            {
                icon: "utensils",
                title: "Thực đơn",
                description: "Theo dõi danh sách món ăn.",
                url: "#"
            },
            {
                icon: "boxes",
                title: "Nguyên liệu",
                description: "Kiểm tra nguyên liệu.",
                url: "#"
            }
        ]
    }

};


// ==========================================
// 4. LẤY VÀ LƯU TOKEN
// ==========================================

function getAccessToken() {
    return localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");
}


function saveAccessToken(token) {

    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");

    if (rememberMe && rememberMe.checked) {
        localStorage.setItem("access_token", token);
    } else {
        sessionStorage.setItem("access_token", token);
    }

}


// ==========================================
// 5. LẤY THÔNG TIN USER ĐÃ LƯU
// ==========================================

function getCurrentUser() {

    const userData =
        localStorage.getItem("current_user") ||
        sessionStorage.getItem("current_user");

    if (!userData) {
        return null;
    }

    try {
        return JSON.parse(userData);
    } catch (error) {
        return null;
    }

}


function saveCurrentUser(user) {

    localStorage.removeItem("current_user");
    sessionStorage.removeItem("current_user");

    const storage = rememberMe && rememberMe.checked
        ? localStorage
        : sessionStorage;

    storage.setItem("current_user", JSON.stringify(user));

}


// ==========================================
// 6. XÓA PHIÊN ĐĂNG NHẬP
// ==========================================

function clearAuth() {

    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");

    localStorage.removeItem("current_user");
    sessionStorage.removeItem("current_user");

}


// ==========================================
// 7. HIỂN THỊ VÀ XÓA LỖI
// ==========================================

function showError(element, message) {

    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");

}


function clearErrors() {

    if (identifierError) {
        identifierError.textContent = "";
        identifierError.classList.add("hidden");
    }

    if (passwordError) {
        passwordError.textContent = "";
        passwordError.classList.add("hidden");
    }

}


// ==========================================
// 8. VALIDATE ĐĂNG NHẬP
// ==========================================

function validateLogin() {

    clearErrors();

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    let isValid = true;

    // Kiểm tra Username hoặc số điện thoại
    if (identifier === "") {

        showError(
            identifierError,
            "Vui lòng nhập tên đăng nhập hoặc số điện thoại."
        );

        isValid = false;

    } else {

        const phoneRegex = /^(0|\+84)[0-9]{9}$/;

        if (
            /^[0-9+]+$/.test(identifier) &&
            !phoneRegex.test(identifier)
        ) {

            showError(
                identifierError,
                "Số điện thoại không đúng định dạng."
            );

            isValid = false;

        }

    }

    // Kiểm tra mật khẩu
    if (password.trim() === "") {

        showError(
            passwordError,
            "Vui lòng nhập mật khẩu."
        );

        isValid = false;

    } else if (password.length < 6) {

        showError(
            passwordError,
            "Mật khẩu phải có ít nhất 6 ký tự."
        );

        isValid = false;

    }

    return isValid;

}


// ==========================================
// 9. HIỂN THỊ LOADING
// ==========================================

function setLoading(isLoading) {

    if (submitBtn) {
        submitBtn.disabled = isLoading;
    }

    if (btnText) {
        btnText.textContent = isLoading
            ? "Đang xác thực..."
            : "Đăng nhập";
    }

    if (btnArrow) {
        btnArrow.classList.toggle("hidden", isLoading);
    }

    if (btnSpinner) {
        btnSpinner.classList.toggle("hidden", !isLoading);
    }

}


// ==========================================
// 10. HIỂN THỊ THÔNG BÁO
// ==========================================

function showLoginToast(message, type = "success") {

    const toast = document.getElementById("toastNotification");
    const toastMsg = document.getElementById("toastMsg");

    if (!toast || !toastMsg) {
        alert(message);
        return;
    }

    toastMsg.textContent = message;

    toast.classList.remove(
        "translate-x-96",
        "opacity-0",
        "border-emerald-500",
        "border-rose-500"
    );

    toast.classList.add(
        type === "success"
            ? "border-emerald-500"
            : "border-rose-500"
    );

    toast.classList.add("opacity-100");

    setTimeout(() => {
        toast.classList.add("translate-x-96", "opacity-0");
    }, 3000);

}


// ==========================================
// 11. CHUYỂN ĐỔI ROLE TỪ BACKEND
// ==========================================

function getRole(user) {

    // Ưu tiên Role_ID
    const roleId = user.role_id ?? user.Role_ID;

    if (roleId !== undefined && roleId !== null) {
        return ROLE_ID_MAP[roleId];
    }

    // Nếu Backend trả về tên Role
    const roleName =
        user.role_name ??
        user.Role_Name ??
        user.role?.role_name ??
        user.role?.Role_Name ??
        user.role;

    if (typeof roleName === "string") {

        const normalized = roleName.toLowerCase();

        const roleNameMap = {
            admin: "admin",
            customer: "customer",
            restaurant_owner: "restaurant_owner",
            staff: "staff"
        };

        return roleNameMap[normalized];
    }

    return null;

}


// ==========================================
// 12. XỬ LÝ DỮ LIỆU RESPONSE
// ==========================================

function normalizeLoginResponse(result) {

    let data = result;

    // Hỗ trợ BaseResponse có trường data
    if (data && data.data) {
        data = data.data;
    }

    // Một số API trả dữ liệu bên trong result
    if (data && data.result) {
        data = data.result;
    }

    return data;

}


// ==========================================
// 13. XỬ LÝ ĐĂNG NHẬP
// ==========================================

async function handleLoginSubmit(event) {

    event.preventDefault();

    if (!validateLogin()) {
        return;
    }

    const data = {
        identifier: identifierInput.value.trim(),
        password: passwordInput.value
    };

    setLoading(true);

    try {

        // Gọi API đăng nhập
        const result = await api.post("/auth/login", data);

        const responseData = normalizeLoginResponse(result);

        // Lấy JWT
        const token = responseData.access_token;

        if (!token) {
            throw new Error("Backend không trả về Access Token.");
        }

        // Lấy User
        const user = responseData.user;

        if (!user) {
            throw new Error("Backend không trả về thông tin User.");
        }

        // Xác định Role
        const role = getRole(user);

        if (!role || !ROLE_CONFIG[role]) {
            throw new Error("Role của người dùng không hợp lệ.");
        }

        // Chuẩn hóa dữ liệu
        const userData = {

            id: user.user_id ?? user.User_ID,

            username: user.username ?? user.Username,

            full_name: user.fullname ?? user.Fullname,

            phone_number:
                user.phone_number ?? user.Phone_Number,

            address:
                user.address ?? user.Address,

            role_id: user.role_id ?? user.Role_ID,

            role: role

        };

        // Lưu Token và User
        saveAccessToken(token);
        saveCurrentUser(userData);

        // Hiển thị Dashboard
        renderDashboard(userData, token);

        showLoginToast("Đăng nhập thành công!");

    } catch (error) {

        showLoginToast(
            error.message || "Đăng nhập thất bại.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


// ==========================================
// 14. HIỂN THỊ DASHBOARD
// ==========================================

function renderDashboard(user, token) {

    const role = user.role;

    const config = ROLE_CONFIG[role];

    if (!config) {
        clearAuth();
        return;
    }

    if (loginView) {
        loginView.classList.add("hidden");
    }

    if (dashboardView) {
        dashboardView.classList.remove("hidden");
    }

    const name = user.full_name || user.username || "Người dùng";

    const currentUserName =
        document.getElementById("currentUserName");

    const userAvatarBadge =
        document.getElementById("userAvatarBadge");

    const currentUserRoleBadge =
        document.getElementById("currentUserRoleBadge");

    const currentUserTokenSnippet =
        document.getElementById("currentUserTokenSnippet");

    const roleWelcomeContent =
        document.getElementById("roleWelcomeContent");

    if (currentUserName) {
        currentUserName.textContent = name;
    }

    if (userAvatarBadge) {
        userAvatarBadge.textContent =
            name.substring(0, 2).toUpperCase();
    }

    if (currentUserRoleBadge) {
        currentUserRoleBadge.textContent = config.name;
    }

    if (currentUserTokenSnippet) {
        currentUserTokenSnippet.textContent =
            "Token: " + token.substring(0, 18) + "...";
    }

    if (roleWelcomeContent) {
        roleWelcomeContent.textContent = config.welcome;
    }

    renderRoleMenu(config.menus);

}


// ==========================================
// 15. HIỂN THỊ MENU THEO ROLE
// ==========================================

function renderRoleMenu(menus) {

    if (!dynamicRoleMenu) return;

    dynamicRoleMenu.innerHTML = menus.map((menu) => {

        return `
            <a href="${menu.url}"
               class="block p-5 rounded-2xl bg-[#171d1a]
               border border-white/5 hover:border-emerald-500/50
               hover:bg-emerald-500/5 transition">

                <div class="w-10 h-10 rounded-xl bg-emerald-500/10
                flex items-center justify-center text-emerald-400 mb-4">

                    <i data-lucide="${menu.icon}" class="w-5 h-5"></i>

                </div>

                <h5 class="font-bold text-white text-sm mb-2">
                    ${menu.title}
                </h5>

                <p class="text-xs text-slate-400 leading-relaxed">
                    ${menu.description}
                </p>

            </a>
        `;

    }).join("");

    if (window.lucide) {
        lucide.createIcons();
    }

}


// ==========================================
// 16. ĐĂNG XUẤT
// ==========================================

function handleLogout() {

    clearAuth();

    if (dashboardView) {
        dashboardView.classList.add("hidden");
    }

    if (loginView) {
        loginView.classList.remove("hidden");
    }

    if (loginForm) {
        loginForm.reset();
    }

    clearErrors();

    showLoginToast("Bạn đã đăng xuất thành công.");

}


// ==========================================
// 17. TÀI KHOẢN MẪU
// ==========================================

const ROLE_PRESETS = {

    admin: "admin_system",

    customer: "nguyena",

    restaurant_owner: "owner_b",

    staff: "staff_c"

};


function selectRolePreset(role) {

    const username = ROLE_PRESETS[role];

    if (!username) return;

    identifierInput.value = username;

    passwordInput.value = "";

    clearErrors();

    passwordInput.focus();

}


// ==========================================
// 18. KHÔI PHỤC PHIÊN ĐĂNG NHẬP
// ==========================================

function checkExistingLogin() {

    const token = getAccessToken();

    const user = getCurrentUser();

    if (!token || !user) {

        clearAuth();

        return;

    }

    if (!ROLE_CONFIG[user.role]) {

        clearAuth();

        return;

    }

    renderDashboard(user, token);

}


// ==========================================
// 19. GẮN SỰ KIỆN
// ==========================================

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        handleLoginSubmit
    );
}

if (identifierInput) {
    identifierInput.addEventListener("input", clearErrors);
}

if (passwordInput) {
    passwordInput.addEventListener("input", clearErrors);
}

// Khôi phục đăng nhập
checkExistingLogin();

// Khởi tạo Icon
if (window.lucide) {
    lucide.createIcons();
}
