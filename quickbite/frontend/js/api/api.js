class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const http = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function getErrorMessage(data, status) {
  if (data && Array.isArray(data.details) && data.details.length) {
    return data.details
      .map((e) => `${e.field ?? e.loc?.[e.loc.length - 1] ?? "field"}: ${e.msg}`)
      .join("; ");
  }
  if (data && typeof data.message === "string") return data.message;
  if (data && typeof data.detail === "string") return data.detail;
  if (data && Array.isArray(data.detail)) {
    return data.detail.map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join("; ");
  }
  return `Lỗi ${status}`;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      return Promise.reject(new ApiError(getErrorMessage(data, status), status, data));
    }
    return Promise.reject(new ApiError(
      "Không kết nối được backend. Backend đã chạy chưa? Kiểm tra CONFIG.API_BASE_URL.", 0,
    ));
  },
);

const api = {
  get: (path, params) => http.get(path, { params }).then((res) => res.data),
  post: (path, body, config = {}) => http.post(path, body, config).then((res) => res.data),
  put: (path, body) => http.put(path, body).then((res) => res.data),
  patch: (path, body) => http.patch(path, body).then((res) => res.data),
  delete: (path) => http.delete(path).then((res) => res.data),
};

const dishPriceApi = {
  updatePrice: (dishId, newPrice, reason = "") =>
    api.patch(`/menu/dishes/${dishId}/price`, {
      new_price: Number(newPrice),
      reason: reason && reason.trim() ? reason.trim() : null,
    }),
  getPriceHistory: (dishId) => api.get(`/menu/dishes/${dishId}/price-history`),
};