const CATEGORY_API = `${CONFIG.API_BASE_URL}/categories`;
let categories = [];
const categoryToken = () => localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

async function categoryRequest(path = "", options = {}) {
  const token = categoryToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${CATEGORY_API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.message || `Lỗi ${response.status}`);
  return data;
}

function categoryState(message, type = "info") {
  const node = document.getElementById("categoryState"); node.textContent = message; node.className = `admin-state is-${type}`; node.hidden = false;
}
function categoryEscape(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

function renderCategories() {
  const query = document.getElementById("categorySearch").value.trim().toLocaleLowerCase("vi");
  const filteredRows = categories.filter((row) => row.name.toLocaleLowerCase("vi").includes(query));
  const rows = AdminUI.page(filteredRows, "categories", renderCategories);
  document.getElementById("categoryRows").innerHTML = rows.map((row) => `<tr data-category="${row.id}"><td><strong>${categoryEscape(row.name)}</strong></td><td>${categoryEscape(row.description || "—")}</td><td>${Number(row.dish_count || 0)}</td><td><span class="stock-badge is-available">Hiển thị</span></td><td><div class="action-group"><button class="btn btn-edit" data-category-action="edit" data-id="${row.id}">Sửa</button><button class="btn btn-danger" data-category-action="delete" data-id="${row.id}">Xóa</button></div></td></tr>`).join("");
  document.getElementById("categoryState").hidden = rows.length > 0;
  if (!rows.length) categoryState(query ? "Không tìm thấy danh mục phù hợp." : "Chưa có danh mục. Tạo danh mục đầu tiên để phân loại món ăn.", "empty");
  document.getElementById("categoryTotal").textContent = categories.length.toLocaleString("vi-VN");
  document.getElementById("categoryActive").textContent = categories.length.toLocaleString("vi-VN");
  document.getElementById("categoryCountLabel").textContent = `${filteredRows.length} / ${categories.length} danh mục`;
  document.getElementById("categoryUpdated").textContent = new Date().toLocaleDateString("vi-VN");
  document.querySelectorAll("[data-category]").forEach((tr) => tr.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    const item = categories.find((row) => row.id === Number(tr.dataset.category));
    document.getElementById("categoryDetail").innerHTML = `<h2>Danh mục ${categoryEscape(item.name)} · ${Number(item.dish_count || 0)} món</h2><p>${categoryEscape(item.description || "Chưa có mô tả.")}</p><p class="admin-muted">Chỉ xóa danh mục khi không còn món đang gán.</p>`;
  }));
}

async function loadCategories() {
  categoryState("Đang tải danh mục…");
  try {
    categories = await categoryRequest();
    renderCategories();
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/menu/dishes`, { headers: categoryToken() ? { Authorization: `Bearer ${categoryToken()}` } : {} });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const dishes = await response.json();
      document.getElementById("uncategorizedCount").textContent = dishes.filter((dish) => !dish.category_id).length.toLocaleString("vi-VN");
    } catch (_) { document.getElementById("uncategorizedCount").textContent = "—"; }
  }
  catch (error) { categoryState(`${error.message} · Kiểm tra kết nối hoặc quyền admin.`, "error"); }
}

function resetCategoryForm() {
  document.getElementById("categoryForm").reset(); document.getElementById("categoryId").value = "";
  document.getElementById("categoryFormTitle").textContent = "Thêm danh mục";
  document.getElementById("categorySubmit").textContent = "Lưu danh mục";
  document.getElementById("categoryFormMessage").hidden = true;
}

document.getElementById("toggleCategoryForm").addEventListener("click", () => {
  resetCategoryForm(); AdminUI.openNode({ title: "Thêm danh mục", subtitle: "Sắp xếp món ăn theo nhóm để khách dễ tìm." }, document.getElementById("categoryFormPanel"));
});
document.getElementById("categoryCancel").addEventListener("click", () => { resetCategoryForm(); AdminUI.close(); });
document.getElementById("categorySearch").addEventListener("input", renderCategories);
document.getElementById("categoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("categoryId").value;
  const payload = { name: document.getElementById("categoryName").value.trim(), description: document.getElementById("categoryDescription").value.trim() || null };
  const button = document.getElementById("categorySubmit"); button.disabled = true;
  try { await categoryRequest(id ? `/${id}` : "", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }); resetCategoryForm(); AdminUI.close(); await loadCategories(); }
  catch (error) { const message = document.getElementById("categoryFormMessage"); message.textContent = error.message; message.classList.add("is-error"); message.hidden = false; }
  finally { button.disabled = false; }
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-category-action]"); if (!button) return;
  const id = Number(button.dataset.id); const row = categories.find((item) => item.id === id); if (!row) return;
  if (button.dataset.categoryAction === "edit") {
    document.getElementById("categoryId").value = row.id;
    document.getElementById("categoryName").value = row.name; document.getElementById("categoryDescription").value = row.description || "";
    document.getElementById("categoryFormTitle").textContent = `Sửa danh mục: ${row.name}`; document.getElementById("categorySubmit").textContent = "Lưu thay đổi";
    AdminUI.openNode({ title: "Chỉnh sửa danh mục", subtitle: `${categoryEscape(row.name)} · ${Number(row.dish_count || 0)} món đang liên kết.` }, document.getElementById("categoryFormPanel"));
  } else if (Number(row.dish_count || 0) > 0) {
    AdminUI.open({ title: "Chưa thể xóa danh mục", subtitle: `${categoryEscape(row.name)} đang có ${Number(row.dish_count)} món.`, content: '<label class="admin-modal-field">Điều kiện<span>Số món liên kết phải bằng 0.</span></label><label class="admin-modal-field">Phương án an toàn<span>Chuyển món sang danh mục khác trước khi xóa.</span></label>', primary: "Đã hiểu" });
  } else {
    AdminUI.open({ title: `Xóa danh mục “${categoryEscape(row.name)}”?`, subtitle: "Chỉ xóa danh mục rỗng. Backend sẽ kiểm tra lại số món liên kết.", content: '<div class="admin-modal-note">Thao tác này không xóa lịch sử đơn hàng.</div>', primary: "Xác nhận xóa", danger: true, onPrimary: async () => { try { await categoryRequest(`/${id}`, { method: "DELETE" }); await loadCategories(); AdminUI.notify("Đã xóa danh mục.", "success"); return true; } catch (error) { AdminUI.open({ title: "Chưa thể xóa danh mục", subtitle: categoryEscape(row.name), content: `<div class="admin-modal-note">${categoryEscape(error.message)}</div><p>Chuyển các món sang danh mục khác rồi thử lại.</p>` }); return false; } } });
  }
});
loadCategories();
