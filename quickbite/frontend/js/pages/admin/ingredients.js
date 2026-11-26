const INGREDIENTS_API = `${CONFIG.API_BASE_URL}/ingredients`;
let ingredients = [];

const ingredientForm = document.getElementById("ingredientForm");
ingredientForm.innerHTML =
  '<input type="hidden" id="ingredientId">' +
  AdminUI.formField({ label: "Tên nguyên liệu", id: "ingredientName", name: "name", placeholder: "Ví dụ: Gạo tấm", required: true, attributes: 'maxlength="100"' }) +
  AdminUI.formField({ label: "Đơn vị", id: "ingredientUnit", name: "unit", placeholder: "kg, lít, gói", required: true, attributes: 'maxlength="20"' }) +
  AdminUI.formField({ label: "Số lượng tồn", id: "ingredientStock", name: "stock_quantity", type: "number", required: true, attributes: 'min="0" step="0.001"' }) +
  AdminUI.formField({ label: "Cảnh báo khi còn dưới", id: "ingredientMin", name: "min_stock", type: "number", value: "0", required: true, attributes: 'min="0" step="0.001"' }) +
  `<div class="admin-form-actions admin-form-wide">${AdminUI.button({ label: "Thêm nguyên liệu", variant: "primary", type: "submit", attributes: 'id="ingredientSubmit"' })}${AdminUI.button({ label: "Hủy", attributes: 'id="ingredientCancel"' })}</div>`;

async function ingredientRequest(path = "", options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${INGREDIENTS_API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((err) => `${err.loc?.[err.loc.length - 1] || "Dữ liệu"}: ${err.msg}`).join("; ")
      : data.detail;
    throw new Error(detail || data.message || `Lỗi ${response.status}`);
  }
  return data;
}

function ingredientState(message, type = "info") {
  const node = document.getElementById("ingredientState");
  node.textContent = message;
  node.className = `admin-state is-${type}`;
  node.hidden = false;
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStockStatus(item) {
  const stock = Number(item.stock_quantity || 0);
  const minimum = Number(item.min_stock || 0);
  if (stock <= 0) return "empty";
  if (stock <= minimum || item.is_low) return "low";
  return "available";
}

function openEditModal(item) {
  document.getElementById("ingredientId").value = item.id;
  document.getElementById("ingredientName").value = item.name;
  document.getElementById("ingredientUnit").value = item.unit;
  document.getElementById("ingredientStock").value = item.stock_quantity ?? 0;
  document.getElementById("ingredientMin").value = item.min_stock ?? 0;
  document.getElementById("ingredientMessage").hidden = true;
  document.getElementById("ingredientMessage").classList.remove("is-error");
  document.getElementById("ingredientFormTitle").textContent = `Sửa nguyên liệu: ${item.name}`;
  document.getElementById("ingredientSubmit").textContent = "Lưu thay đổi";
  document.getElementById("ingredientCancel").textContent = "Hủy";
  AdminUI.openNode(
    {
      title: "Sửa nguyên liệu",
      subtitle: `${item.name} · Tồn hiện tại ${Number(item.stock_quantity || 0).toLocaleString("vi-VN")} ${safeText(item.unit)}`,
    },
    document.getElementById("ingredientFormPanel"),
  );
}

function renderLowStockAlerts() {
  const alertBox = document.getElementById("inventoryAlertSection");
  if (!alertBox) return;

  const emptyItems = ingredients.filter((item) => getStockStatus(item) === "empty");
  const lowItems = ingredients.filter((item) => getStockStatus(item) === "low");
  const alertItems = [...emptyItems, ...lowItems];

  if (!alertItems.length) {
    alertBox.hidden = true;
    alertBox.innerHTML = "";
    return;
  }

  alertBox.classList.toggle("has-empty", emptyItems.length > 0);
  const summaryParts = [];
  if (emptyItems.length) summaryParts.push(`${emptyItems.length} hết hàng`);
  if (lowItems.length) summaryParts.push(`${lowItems.length} sắp hết`);

  const previewItems = alertItems.slice(0, 6).map((item) => {
    const isEmpty = getStockStatus(item) === "empty";
    const stock = Number(item.stock_quantity || 0).toLocaleString("vi-VN");
    const min = Number(item.min_stock || 0).toLocaleString("vi-VN");
    return `
      <div class="inventory-alert-item">
        <div>
          <strong>${safeText(item.name)}</strong>
          <small>Còn ${stock}/${min} ${safeText(item.unit)} · <span class="stock-badge ${isEmpty ? "is-empty" : "is-low"}">${isEmpty ? "Hết hàng" : "Sắp hết"}</span></small>
        </div>
        ${AdminUI.button({ label: "Cập nhật", attributes: `data-action="edit" data-id="${item.id}"` })}
      </div>
    `;
  }).join("");

  alertBox.innerHTML = `
    <div class="inventory-alert-header">
      <div>
        <h2>Cảnh báo tồn kho (${summaryParts.join(" · ")})</h2>
        <p>Các nguyên liệu dưới đây đã chạm hoặc vượt dưới ngưỡng tối thiểu, cần kiểm tra để bổ sung kịp thời.</p>
      </div>
      <div class="inventory-alert-actions">
        ${emptyItems.length ? AdminUI.button({ label: `Lọc hết hàng (${emptyItems.length})`, attributes: 'data-quick-filter="empty"' }) : ""}
        ${lowItems.length ? AdminUI.button({ label: `Lọc sắp hết (${lowItems.length})`, attributes: 'data-quick-filter="low"' }) : ""}
      </div>
    </div>
    <div class="inventory-alert-list">${previewItems}</div>
  `;
  alertBox.hidden = false;
}

function renderIngredients() {
  const search = document.getElementById("ingredientSearch").value.trim().toLocaleLowerCase("vi");
  const status = document.getElementById("ingredientStatusFilter").value;
  const filteredRows = ingredients.filter((item) => {
    const itemStatus = getStockStatus(item);
    return item.name.toLocaleLowerCase("vi").includes(search) && (!status || status === itemStatus);
  });

  renderLowStockAlerts();

  const rows = AdminUI.page(filteredRows, "ingredients", renderIngredients);
  const tableRows = rows.map((item) => {
    const stock = Number(item.stock_quantity || 0);
    const minimum = Number(item.min_stock || 0);
    const itemStatus = getStockStatus(item);
    const badgeClass = itemStatus === "empty" ? "is-empty" : itemStatus === "low" ? "is-low" : "is-available";
    const badgeText = itemStatus === "empty" ? "Hết hàng" : itemStatus === "low" ? "Sắp hết" : "Đủ hàng";
    return `<tr><td><strong>${safeText(item.name)}</strong><small class="admin-subcell">NL-${String(item.id).padStart(3, "0")}</small></td><td>${safeText(item.unit)}</td><td>${stock.toLocaleString("vi-VN")}</td><td>${minimum.toLocaleString("vi-VN")}</td><td><span class="stock-badge ${badgeClass}">${badgeText}</span></td><td><div class="action-group">${AdminUI.button({ label: "Nhập kho", attributes: `data-stock-action="in" data-id="${item.id}"` })}${AdminUI.button({ label: "Điều chỉnh", attributes: `data-stock-action="adjust" data-id="${item.id}"` })}${AdminUI.button({ label: "Lịch sử", attributes: `data-stock-action="history" data-id="${item.id}"` })}${AdminUI.button({ label: "Sửa", variant: "edit", attributes: `data-action="edit" data-id="${item.id}"` })}${AdminUI.button({ label: "Xóa", variant: "danger", attributes: `data-action="delete" data-id="${item.id}"` })}</div></td></tr>`;
  });

  document.getElementById("ingredientTable").innerHTML = AdminUI.table({
    headers: ["Nguyên liệu", "Đơn vị", "Tồn kho", "Tối thiểu", "Trạng thái", "Thao tác"],
    rows: tableRows,
    bodyAttributes: 'id="ingredientTableBody" data-page-body="ingredients"',
  });

  document.getElementById("ingredientState").hidden = rows.length > 0;
  if (!rows.length) {
    ingredientState(
      search || status
        ? "Không tìm thấy nguyên liệu phù hợp với bộ lọc hiện tại."
        : "Kho chưa có nguyên liệu. Thêm nguyên liệu đầu tiên bằng nút phía trên.",
      "empty",
    );
  }

  document.getElementById("ingredientTotal").textContent = ingredients.length.toLocaleString("vi-VN");
  document.getElementById("ingredientLow").textContent = ingredients
    .filter((i) => getStockStatus(i) === "low")
    .length.toLocaleString("vi-VN");
  document.getElementById("ingredientEmpty").textContent = ingredients
    .filter((i) => getStockStatus(i) === "empty")
    .length.toLocaleString("vi-VN");
}

async function loadIngredients() {
  ingredientState("Đang tải dữ liệu kho…");
  try {
    ingredients = await ingredientRequest();
    renderIngredients();
  } catch (error) {
    ingredientState(`${error.message} · Kiểm tra kết nối rồi tải lại trang.`, "error");
  }
}

function resetIngredientForm() {
  document.getElementById("ingredientForm").reset();
  document.getElementById("ingredientId").value = "";
  document.getElementById("ingredientMin").value = "0";
  document.getElementById("ingredientFormTitle").textContent = "Thêm nguyên liệu";
  document.getElementById("ingredientSubmit").textContent = "Thêm nguyên liệu";
  document.getElementById("ingredientCancel").textContent = "Hủy";
  document.getElementById("ingredientMessage").hidden = true;
  document.getElementById("ingredientMessage").classList.remove("is-error");
}

document.getElementById("addIngredient").addEventListener("click", () => {
  resetIngredientForm();
  AdminUI.openNode(
    { title: "Thêm nguyên liệu", subtitle: "Nhập tên, đơn vị, lượng tồn và ngưỡng cảnh báo." },
    document.getElementById("ingredientFormPanel"),
  );
});

document.getElementById("ingredientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("ingredientId").value;
  const payload = {
    name: document.getElementById("ingredientName").value.trim(),
    unit: document.getElementById("ingredientUnit").value.trim(),
    stock_quantity: Number(document.getElementById("ingredientStock").value),
    min_stock: Number(document.getElementById("ingredientMin").value),
  };
  const submit = document.getElementById("ingredientSubmit");
  submit.disabled = true;
  try {
    await ingredientRequest(id ? `/${id}` : "", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetIngredientForm();
    AdminUI.close();
    await loadIngredients();
    AdminUI.notify(id ? "Đã cập nhật nguyên liệu." : "Đã thêm nguyên liệu.", "success");
  } catch (error) {
    const message = document.getElementById("ingredientMessage");
    message.textContent = error.message;
    message.classList.add("is-error");
    message.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

document.addEventListener("click", async (event) => {
  const quickFilterButton = event.target.closest("[data-quick-filter]");
  if (quickFilterButton) {
    const statusSelect = document.getElementById("ingredientStatusFilter");
    statusSelect.value = quickFilterButton.dataset.quickFilter;
    renderIngredients();
    statusSelect.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  const stockButton = event.target.closest("[data-stock-action]");
  if (stockButton) {
    const item = ingredients.find((row) => Number(row.id) === Number(stockButton.dataset.id));
    if (!item) return;
    const action = stockButton.dataset.stockAction;
    const label =
      action === "in"
        ? "Nhập kho nguyên liệu"
        : action === "adjust"
          ? "Điều chỉnh kho · Cần phê duyệt"
          : "Lịch sử nhập / xuất";
    const note =
      action === "history"
        ? "Backend chưa có API nhật ký nhập/xuất, nên lịch sử giao dịch chưa thể tải."
        : action === "adjust"
          ? "API hiện chỉ hỗ trợ cập nhật tồn trực tiếp qua nút Sửa. Chưa có quy trình phê duyệt điều chỉnh nên thao tác này đang tạm khóa."
          : "Backend chưa có API phiếu nhập kho, đơn giá hoặc nhà cung cấp trên nhánh này. Bạn có thể cập nhật nhanh số lượng qua nút Sửa.";
    AdminUI.open({
      title: label,
      subtitle: `${item.name} · NL-${String(item.id).padStart(3, "0")} · Tồn hiện tại ${Number(item.stock_quantity || 0).toLocaleString("vi-VN")} ${safeText(item.unit)}`,
      content: `<div class="admin-modal-note" role="status">${note}</div><label class="admin-modal-field">${action === "history" ? "Nhật ký" : action === "adjust" ? "Điều chỉnh / Tồn dự kiến" : "Số lượng / Đơn vị"}<span>${action === "history" ? "Chưa có dữ liệu nhật ký từ backend." : "Lưu giao dịch đang tắt cho đến khi backend bổ sung endpoint kho."}</span></label>`,
      primary: action === "in" ? "Xác nhận nhập kho" : action === "adjust" ? "Yêu cầu phê duyệt" : "Đóng lịch sử",
      primaryDisabled: true,
    });
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const item = ingredients.find((row) => Number(row.id) === id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openEditModal(item);
    return;
  }

  if (button.dataset.action === "delete") {
    AdminUI.open({
      title: "Ngừng theo dõi nguyên liệu?",
      subtitle: `${item.name} · NL-${String(item.id).padStart(3, "0")}`,
      content: `<p>Nguyên liệu <strong>${safeText(item.name)}</strong> sẽ bị ẩn khỏi danh sách quản lý tồn kho. Nếu nguyên liệu đang có trong công thức món ăn, hệ thống sẽ từ chối xóa.</p>`,
      primary: "Xác nhận xóa",
      danger: true,
      onPrimary: async () => {
        await ingredientRequest(`/${id}`, { method: "DELETE" });
        await loadIngredients();
        AdminUI.notify(`Đã ngừng theo dõi “${item.name}”.`, "success");
        return true;
      },
    });
  }
});

document.getElementById("ingredientSearch").addEventListener("input", renderIngredients);
document.getElementById("ingredientStatusFilter").addEventListener("change", renderIngredients);
document.getElementById("ingredientCancel").addEventListener("click", () => {
  resetIngredientForm();
  AdminUI.close();
});

loadIngredients();