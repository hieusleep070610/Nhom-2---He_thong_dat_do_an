const API_BASE_URL = `${CONFIG.API_BASE_URL}/menu`;
const state = { dishes: [], dailyMenus: [], categories: [] };
let dishPage = 1;
const DISH_PAGE_SIZE = 5;
let imagePreviewUrl = null;
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function authHeaders(json = false) {
  const headers = {};
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`);
  return data?.statusCode ? data.data : data;
}

function setState(id, message, kind = "info") {
  const node = document.getElementById(id);
  node.textContent = message;
  node.className = `admin-state is-${kind}`;
  node.hidden = false;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDishPriceInput(input) {
  const digitsBeforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length;
  const digits = input.value.replace(/\D/g, "");
  input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  let caret = 0, seen = 0;
  while (caret < input.value.length && seen < digitsBeforeCaret) {
    if (/\d/.test(input.value[caret])) seen++;
    caret++;
  }
  input.setSelectionRange(caret, caret);
}

function parseDishPrice(value) {
  return Number(String(value ?? "").replace(/\D/g, ""));
}

function syncDishSelect() {
  const select = document.getElementById("selectDishId");
  select.innerHTML = '<option value="">Chọn món ăn</option>' + state.dishes.map((dish) => `<option value="${dish.id}">${escapeHtml(dish.name)}</option>`).join("");
  select.disabled = !state.dishes.length;
}

function renderDishes() {
  const query = document.getElementById("dishSearch").value.trim().toLocaleLowerCase("vi");
  const categoryId = document.getElementById("dishCategoryFilter").value;
  const availability = document.getElementById("dishAvailabilityFilter").value;
  document.getElementById("clearDishFilters").hidden = !(query || categoryId || availability);
  const filtered = state.dishes.filter((dish) => `${dish.name} MON-${String(dish.id).padStart(3, "0")}`.toLocaleLowerCase("vi").includes(query) && (!categoryId || Number(dish.category_id) === Number(categoryId)) && (!availability || String(Boolean(dish.is_available)) === availability));
  const pageCount = Math.max(1, Math.ceil(filtered.length / DISH_PAGE_SIZE));
  dishPage = Math.min(dishPage, pageCount);
  const rows = filtered.slice((dishPage - 1) * DISH_PAGE_SIZE, dishPage * DISH_PAGE_SIZE);
  const body = document.getElementById("dishTableBody");
  document.getElementById("dishCount").textContent = `${filtered.length.toLocaleString("vi-VN")} món${query || categoryId || availability ? " phù hợp bộ lọc" : " đang được kinh doanh"}.`;
  document.getElementById("dishMetricTotal").textContent = state.dishes.length.toLocaleString("vi-VN");
  document.getElementById("dishMetricAvailable").textContent = state.dishes.filter((dish) => dish.is_available).length.toLocaleString("vi-VN");
  document.getElementById("dishMetricImages").textContent = state.dishes.filter((dish) => dish.image_url).length.toLocaleString("vi-VN");
  document.getElementById("dishMetricCategories").textContent = state.categories.length.toLocaleString("vi-VN");
  body.innerHTML = rows.map((dish) => `<tr>
    <td>${dish.image_url ? `<img class="dish-thumbnail" src="${escapeHtml(dish.image_url)}" alt="Ảnh ${escapeHtml(dish.name)}" loading="lazy">` : '<span class="admin-no-image" aria-label="Chưa có ảnh">＋</span>'}</td>
    <td><strong>${escapeHtml(dish.name)}</strong><small class="admin-subcell">MON-${String(dish.id).padStart(3, "0")}</small></td><td>${escapeHtml(dish.category_name || "Chưa phân loại")}</td><td class="dish-price">${Number(dish.price).toLocaleString("vi-VN")}₫</td><td><span class="stock-badge ${dish.is_available ? "is-available" : "is-low"}"><i aria-hidden="true"></i>${dish.is_available ? "Đang bán" : "Tạm hết hàng"}</span></td>
    <td><div class="dish-actions"><button type="button" class="dish-action" data-action="edit-dish" data-id="${dish.id}">Sửa</button><button type="button" class="dish-action" data-action="view-recipe" data-id="${dish.id}">Công thức</button><button type="button" class="dish-action is-danger" data-action="delete-dish" data-id="${dish.id}">Xóa</button></div></td>
  </tr>`).join("");
  document.getElementById("dishState").hidden = filtered.length > 0;
  if (!filtered.length) setState("dishState", state.dishes.length ? "Không tìm thấy món phù hợp. Thử đổi từ khóa hoặc bộ lọc." : "Chưa có món ăn. Thêm món đầu tiên để bắt đầu thực đơn.", "empty");
  document.getElementById("dishPageLabel").textContent = filtered.length ? `Hiển thị ${(dishPage - 1) * DISH_PAGE_SIZE + 1}–${Math.min(dishPage * DISH_PAGE_SIZE, filtered.length)} / ${filtered.length} món ăn` : "0 món ăn";
  document.getElementById("dishPageNumber").textContent = `${dishPage} / ${pageCount}`;
  document.getElementById("dishPrev").disabled = dishPage <= 1;
  document.getElementById("dishNext").disabled = dishPage >= pageCount;
  body.querySelectorAll("img").forEach((image) => image.addEventListener("error", () => image.replaceWith(Object.assign(document.createElement("span"), { className: "admin-no-image", textContent: "Ảnh không tải được" })), { once: true }));
}

async function loadDishes() {
  setState("dishState", "Đang tải danh sách món…");
  const body = document.getElementById("dishTableBody");
  const reload = document.getElementById("reloadDishes");
  body.setAttribute("aria-busy", "true");
  reload.disabled = true;
  try {
    state.dishes = await apiRequest("/dishes");
    renderDishes();
    syncDishSelect();
    document.getElementById("dishUpdatedAt").textContent = `Cập nhật ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${new Date().toLocaleDateString("vi-VN")}`;
  } catch (error) {
    body.replaceChildren();
    ["dishMetricTotal", "dishMetricAvailable", "dishMetricImages", "dishMetricCategories"].forEach((id) => { document.getElementById(id).textContent = "—"; });
    document.getElementById("dishPrev").disabled = true;
    document.getElementById("dishNext").disabled = true;
    document.getElementById("dishPageLabel").textContent = "";
    document.getElementById("dishPageNumber").textContent = "";
    setState("dishState", `${error.message} · Tải lại trang để thử lại.`, "error");
  } finally {
    body.removeAttribute("aria-busy");
    reload.disabled = false;
  }
}

async function loadDishCategories() {
  const select = document.getElementById("dishCategory");
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/categories`, { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`);
    state.categories = data?.statusCode ? data.data : data;
    select.innerHTML = '<option value="">Chưa phân loại</option>' + state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("");
    const filter = document.getElementById("dishCategoryFilter");
    filter.innerHTML = '<option value="">Tất cả danh mục</option>' + state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("");
    document.getElementById("dishMetricCategories").textContent = state.categories.length.toLocaleString("vi-VN");
  } catch (error) {
    select.innerHTML = '<option value="">Danh mục chưa tải được</option>';
    select.title = error.message;
    const message = document.getElementById("dishFormMessage");
    message.textContent = `Không tải được danh mục: ${error.message}`;
    message.className = "admin-inline-message is-error";
    message.hidden = false;
    AdminUI.notify(`Không tải được danh mục: ${error.message}`, "error");
  }
}

function renderDailyMenus() {
  const body = document.getElementById("dailyMenuTableBody");
  const rows = AdminUI.page(state.dailyMenus, "dish-daily-menus", renderDailyMenus);
  body.innerHTML = rows.map((item) => `<tr>
    <td>${escapeHtml(new Date(`${item.menu_date}T00:00:00`).toLocaleDateString("vi-VN"))}</td><td><div class="admin-dish-cell">${item.image_url ? `<img class="dish-thumbnail" src="${escapeHtml(item.image_url)}" alt="" loading="lazy">` : ""}<strong>${escapeHtml(item.dish_name)}</strong></div></td>
    <td>${Number(item.quantity).toLocaleString("vi-VN")}</td><td><div class="action-group"><button class="btn btn-edit" type="button" data-action="edit-daily" data-id="${item.id}">Sửa</button><button class="btn btn-danger" type="button" data-action="delete-daily" data-id="${item.id}">Xóa</button></div></td>
  </tr>`).join("");
  document.getElementById("dailyMenuState").hidden = state.dailyMenus.length > 0;
  if (!state.dailyMenus.length) setState("dailyMenuState", "Chưa có món nào trong ngày này. Hãy gán món bằng biểu mẫu phía trên.", "empty");
}

async function loadDailyMenus() {
  setState("dailyMenuState", "Đang tải thực đơn…");
  const date = document.getElementById("menuDateFilter").value;
  try {
    state.dailyMenus = await apiRequest(`/daily-menus${date ? `?menu_date=${encodeURIComponent(date)}` : ""}`);
    renderDailyMenus();
  } catch (error) {
    document.getElementById("dailyMenuTableBody").replaceChildren();
    AdminUI.page([], "dish-daily-menus", renderDailyMenus);
    setState("dailyMenuState", `${error.message} · Tải lại để thử lại.`, "error");
  }
}

function resetDailyForm() {
  document.getElementById("dailyMenuForm").reset();
  document.getElementById("menuDate").value = localDateValue();
  document.getElementById("dailyMenuId").value = "";
  document.getElementById("dailyMenuSubmit").textContent = "Gán vào thực đơn";
  document.getElementById("cancelDailyEdit").hidden = true;
}

function startEditDish(id) {
  const dish = state.dishes.find((item) => Number(item.id) === Number(id));
  if (!dish) return;
  document.getElementById("dishName").value = dish.name;
  document.getElementById("dishPrice").value = Number(dish.price).toLocaleString("vi-VN");
  document.getElementById("dishDesc").value = dish.description || "";
  document.getElementById("dishCategory").value = dish.category_id || "";
  document.getElementById("dishToppings").value = (dish.toppings || []).map((item) => `${item.name}${Number(item.price) ? ` | ${Number(item.price)}` : ""}`).join("\n");
  document.getElementById("dishFormMessage").textContent = "Đang sửa món này. Lưu để cập nhật; để trống ảnh nếu muốn giữ ảnh hiện tại.";
  document.getElementById("dishFormMessage").hidden = false;
  const form = document.getElementById("addDishForm");
  form.dataset.editId = String(id);
  form.querySelector("button[type=submit]").textContent = "Lưu thay đổi";
  document.getElementById("dish-form-heading").textContent = `Sửa món ăn · ${dish.name}`;
  const preview = document.getElementById("dishImagePreview");
  if (dish.image_url) {
    preview.innerHTML = `<img src="${escapeHtml(dish.image_url)}" alt="Ảnh hiện tại của ${escapeHtml(dish.name)}"><span class="field-hint">Ảnh hiện tại · Chọn ảnh mới nếu muốn thay.</span>`;
    preview.hidden = false;
  }
  AdminUI.openNode({ title: "Chỉnh sửa món ăn", subtitle: `${dish.name} · MON-${String(dish.id).padStart(3, "0")}` }, document.getElementById("dishFormPanel"));
}

function resetDishForm() {
  const form = document.getElementById("addDishForm");
  form.reset();
  delete form.dataset.editId;
  form.querySelector("button[type=submit]").textContent = "Thêm món ăn";
  document.getElementById("dish-form-heading").textContent = "Thêm món mới";
  document.getElementById("dishFormPanel").hidden = true;
  document.getElementById("dishFormMessage").hidden = true;
  const preview = document.getElementById("dishImagePreview");
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = null;
  preview.replaceChildren(); preview.hidden = true;
}

async function uploadImage(dishId, file) {
  const data = new FormData();
  data.append("image", file);
  return apiRequest(`/dishes/${dishId}/image`, { method: "POST", body: data });
}

async function submitDish(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const editId = form.dataset.editId;
  const name = document.getElementById("dishName").value.trim();
  const price = parseDishPrice(document.getElementById("dishPrice").value);
  const description = document.getElementById("dishDesc").value.trim();
  const categoryId = document.getElementById("dishCategory").value;
  const toppings = document.getElementById("dishToppings").value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, rawPrice = ""] = line.split("|");
    return { name: label.trim(), price: Number(rawPrice.replace(/\D/g, "")) || 0 };
  });
  const image = document.getElementById("dishImage").files[0];
  const button = form.querySelector("button[type=submit]");
  const message = document.getElementById("dishFormMessage");
  if (toppings.some((item) => !item.name) || new Set(toppings.map((item) => item.name.toLocaleLowerCase("vi"))).size !== toppings.length) {
    message.textContent = "Topping cần có tên và không được trùng nhau."; message.className = "admin-inline-message is-error"; message.hidden = false; return;
  }
  if (image && (!/^image\/(jpeg|png|webp)$/.test(image.type) || image.size > 10 * 1024 * 1024)) {
    message.textContent = "Ảnh phải là JPG, PNG hoặc WebP và có dung lượng tối đa 10 MB.";
    message.className = "admin-inline-message is-error";
    message.hidden = false;
    return;
  }
  if (!Number.isSafeInteger(price) || price < 1 || price > 999999999999) {
    message.textContent = "Giá bán phải là số nguyên dương, tối đa 999.999.999.999₫.";
    message.className = "admin-inline-message is-error";
    message.hidden = false;
    return;
  }
  button.disabled = true;
  try {
    let dishId;
    if (editId) {
      const params = new URLSearchParams({ name, price: String(price), description });
      if (categoryId) params.set("category_id", categoryId);
      await apiRequest(`/dishes/${editId}?${params}`, { method: "PUT" });
      dishId = Number(editId);
    } else {
      const params = new URLSearchParams({ name, price: String(price), description });
      if (categoryId) params.set("category_id", categoryId);
      const result = await apiRequest(`/dishes?${params}`, { method: "POST" });
      dishId = result.dish?.id || result.id;
    }
    if (dishId) {
      await apiRequest(`/dishes/${dishId}/toppings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toppings }) });
      form.dataset.editId = String(dishId);
      form.querySelector("button[type=submit]").textContent = "Lưu thay đổi";
    }
    if (image && dishId) {
      try { await uploadImage(dishId, image); }
      catch (error) {
        message.textContent = `Món đã được lưu, nhưng ảnh chưa tải lên được: ${error.message}. Chọn lại ảnh để thử lần nữa.`;
        message.className = "admin-inline-message is-error";
        message.hidden = false;
        await loadDishes();
        return;
      }
    }
    form.reset();
    delete form.dataset.editId;
    button.textContent = "Thêm món ăn";
    document.getElementById("dishFormPanel").hidden = true;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
    document.getElementById("dishImagePreview").replaceChildren();
    document.getElementById("dishImagePreview").hidden = true;
    AdminUI.close();
    document.getElementById("dishFormMessage").hidden = true;
    await loadDishes();
    AdminUI.notify(editId ? "Đã cập nhật món ăn." : "Đã thêm món ăn.", "success");
  } catch (error) {
    message.textContent = error.message;
    message.className = "admin-inline-message is-error";
    message.hidden = false;
    AdminUI.notify(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function submitDailyMenu(event) {
  event.preventDefault();
  const id = document.getElementById("dailyMenuId").value;
  const params = new URLSearchParams({
    menu_date: document.getElementById("menuDate").value,
    dish_id: document.getElementById("selectDishId").value,
    quantity: document.getElementById("menuQuantity").value,
  });
  const button = document.getElementById("dailyMenuSubmit");
  button.disabled = true;
  try {
    await apiRequest(id ? `/daily-menus/${id}?${params}` : `/daily-menus?${params}`, { method: id ? "PUT" : "POST" });
    resetDailyForm();
    await loadDailyMenus();
    AdminUI.notify(id ? "Đã cập nhật thực đơn ngày." : "Đã thêm món vào thực đơn ngày.", "success");
  } catch (error) {
    setState("dailyMenuState", error.message, "error");
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "view-recipe") { window.location.href = `recipes.html?dish_id=${id}`; return; }
  if (button.dataset.action === "edit-dish") return startEditDish(id);
  if (button.dataset.action === "edit-daily") {
    const item = state.dailyMenus.find((row) => Number(row.id) === id);
    if (!item) return;
    document.getElementById("dailyMenuId").value = item.id;
    document.getElementById("menuDate").value = item.menu_date;
    document.getElementById("selectDishId").value = item.dish_id;
    document.getElementById("menuQuantity").value = item.quantity;
    document.getElementById("dailyMenuSubmit").textContent = "Lưu thay đổi";
    document.getElementById("cancelDailyEdit").hidden = false;
    document.getElementById("dailyMenuForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (button.dataset.action === "delete-dish" || button.dataset.action === "delete-daily") {
    const dish = state.dishes.find((row) => Number(row.id) === id);
    const menu = state.dailyMenus.find((row) => Number(row.id) === id);
    const label = dish?.name || menu?.dish_name || "mục này";
    AdminUI.open({ title: `Xóa ${escapeHtml(label)}?`, subtitle: "Lịch sử đơn hàng được giữ nguyên.", content: '<div class="admin-modal-note">Xóa món sẽ gỡ món khỏi thực đơn; thao tác không thể hoàn tác. Backend sẽ kiểm tra các ràng buộc liên quan.</div>', primary: "Xác nhận xóa", danger: true, onPrimary: async () => { try { await apiRequest(button.dataset.action === "delete-dish" ? `/dishes/${id}` : `/daily-menus/${id}`, { method: "DELETE" }); if (button.dataset.action === "delete-dish") await loadDishes(); else await loadDailyMenus(); AdminUI.notify("Đã xóa mục.", "success"); return true; } catch (error) { setState(button.dataset.action === "delete-dish" ? "dishState" : "dailyMenuState", error.message, "error"); throw error; } } });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addDishToggle").addEventListener("click", () => { resetDishForm(); AdminUI.openNode({ title: "Thêm món ăn", subtitle: "Tạo món mới trong thực đơn. Ảnh sẽ được lưu trên Cloudinary." }, document.getElementById("dishFormPanel")); });
  document.getElementById("dishCancel").addEventListener("click", () => { resetDishForm(); AdminUI.close(); });
  document.getElementById("addDishForm").addEventListener("submit", submitDish);
  document.getElementById("dishPrice").addEventListener("input", (event) => formatDishPriceInput(event.currentTarget));
  document.getElementById("dailyMenuForm").addEventListener("submit", submitDailyMenu);
  document.getElementById("dishSearch").addEventListener("input", () => { dishPage = 1; renderDishes(); });
  document.getElementById("dishCategoryFilter").addEventListener("change", () => { dishPage = 1; renderDishes(); });
  document.getElementById("dishAvailabilityFilter").addEventListener("change", () => { dishPage = 1; renderDishes(); });
  document.getElementById("dishPrev").addEventListener("click", () => { dishPage--; renderDishes(); });
  document.getElementById("dishNext").addEventListener("click", () => { dishPage++; renderDishes(); });
  document.getElementById("reloadDishes").addEventListener("click", () => { loadDishes(); loadDishCategories(); loadDailyMenus(); });
  document.getElementById("clearDishFilters").addEventListener("click", () => {
    document.getElementById("dishSearch").value = "";
    document.getElementById("dishCategoryFilter").value = "";
    document.getElementById("dishAvailabilityFilter").value = "";
    dishPage = 1;
    renderDishes();
  });
  document.getElementById("menuDateFilter").addEventListener("change", () => { AdminUI.page([], "dish-daily-menus", renderDailyMenus); loadDailyMenus(); });
  document.getElementById("cancelDailyEdit").addEventListener("click", resetDailyForm);
  document.getElementById("dishImage").addEventListener("change", (event) => {
    const preview = document.getElementById("dishImagePreview");
    const file = event.target.files[0];
    if (!file) { preview.hidden = true; preview.replaceChildren(); return; }
    const img = document.createElement("img");
    img.alt = "Xem trước ảnh món";
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = URL.createObjectURL(file);
    img.src = imagePreviewUrl;
    preview.replaceChildren(img, Object.assign(document.createElement("span"), { className: "field-hint", textContent: `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` }));
    preview.hidden = false;
  });
  document.getElementById("menuDate").value = localDateValue();
  document.getElementById("menuDateFilter").value = localDateValue();
  loadDishes();
  loadDishCategories();
  loadDailyMenus();
});
