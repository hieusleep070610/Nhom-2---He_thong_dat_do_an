
class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

// Tạo Axios instance
const http = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Tự động gửi JWT trong mọi request
http.interceptors.request.use((config) => {
    const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Lấy nội dung lỗi từ Backend
function getErrorMessage(data, status) {
    if (data && typeof data.message === "string") {
        return data.message;
    }

    if (data && typeof data.detail === "string") {
        return data.detail;
    }

    if (data && Array.isArray(data.detail)) {
        return data.detail.map((error) => {
            const field = error.loc?.[error.loc.length - 1] || "field";
            return `${field}: ${error.msg}`;
        }).join("; ");
    }

    if (data && Array.isArray(data.details)) {
        return data.details.map((error) => {
            return `${error.field || "field"}: ${error.msg}`;
        }).join("; ");
    }

    return `Lỗi ${status}`;
}

// Xử lý lỗi chung
http.interceptors.response.use(
    (response) => response,

    (error) => {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            return Promise.reject(
                new ApiError(
                    getErrorMessage(data, status),
                    status,
                    data
                )
            );
        }

        return Promise.reject(
            new ApiError(
                "Không kết nối được Backend. Hãy kiểm tra API URL.",
                0,
                null
            )
        );
    }
);

// Các phương thức gọi API
const api = {
    get: (path, params) =>
        http.get(path, { params }).then(res => res.data),

    post: (path, body) =>
        http.post(path, body).then(res => res.data),

    put: (path, body) =>
        http.put(path, body).then(res => res.data),

    delete: (path) =>
        http.delete(path).then(res => res.data)
};
