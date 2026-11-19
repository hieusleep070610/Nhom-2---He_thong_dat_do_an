const API_BASE_URL = "http://127.0.0.1:8000/api/menu";
const USE_LOCAL_FALLBACK = true;

let currentDishes = [];

const FALLBACK_DISHES = [
  { id: 1, name: "Cơm gà xối mỡ", price: 45000, description: "Cơm dẻo kèm đùi gà giòn da", is_available: true },
  { id: 2, name: "Bún bò Nam Bộ", price: 50000, description: "Thịt bò xào mềm, lạc rang, rau sống", is_available: true },
];

function getNextDishId() {
  return currentDishes.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
}

function syncDishesUI() {
  renderDishesTable(currentDishes, document.getElementById("dishTableBody"));
  renderDishOptions(currentDishes, document.getElementById("selectDishId"));
}

async function requestApi(path, options = {}, onFallback = null) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.message || "Request failed");
    }
    return { ok: true, data };
  } catch (error) {
    if (USE_LOCAL_FALLBACK && typeof onFallback === "function") {
      return { ok: true, data: onFallback(error), fallback: true };
    }
    return { ok: false, error };
  }
}

async function loadDishes() {
  const res = await requestApi("/dishes", {}, () => {
    if (!currentDishes.length) currentDishes = [...FALLBACK_DISHES];
    return currentDishes;
  });

  if (!res.ok) {
    const tableBody = document.getElementById("dishTableBody");
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="5">Không tải được danh sách món ăn.</td></tr>`;
    }
    return;
  }

  currentDishes = Array.isArray(res.data) ? res.data : (res.data.dishes || res.data.items || []);
  syncDishesUI();
}

function renderDishesTable(dishes, tableBody) {
  if (!tableBody) return;
  if (!dishes.length) {
    tableBody.innerHTML = `<tr><td colspan="5">Chưa có món ăn nào đang hoạt động.</td></tr>`;
    return;
  }

  tableBody.innerHTML = dishes
    .map(
      (dish) => `
      <tr>
        <td>${dish.id}</td>
        <td>${escapeHtml(dish.name)}</td>
        <td>${Number(dish.price).toLocaleString("vi-VN")}</td>
        <td>${escapeHtml(dish.description || "")}</td>
        <td>
          <div class="action-group">
            <button type="button" class="btn btn-edit" onclick="openEditDish(${dish.id})">Sửa</button>
            <button type="button" class="btn btn-danger" onclick="handleDeleteDish(${dish.id})">Xóa</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

function renderDishOptions(dishes, dishSelect) {
  if (!dishSelect) return;
  const defaultOption = `<option value="">-- Chọn món ăn từ hệ thống --</option>`;
  const options = dishes
    .map((dish) => `<option value="${dish.id}">${escapeHtml(dish.name)}</option>`)
    .join("");
  dishSelect.innerHTML = defaultOption + options;
}

function openEditDish(dishId) {
  const dish = currentDishes.find((item) => Number(item.id) === Number(dishId));
  if (!dish) return;

  document.getElementById("editDishId").value = dish.id;
  document.getElementById("editDishName").value = dish.name || "";
  document.getElementById("editDishPrice").value = dish.price || "";
  document.getElementById("editDishDesc").value = dish.description || "";

  const editCard = document.getElementById("editDishCard");
  editCard.classList.remove("hidden");
  editCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditDish() {
  document.getElementById("editDishForm").reset();
  document.getElementById("editDishCard").classList.add("hidden");
}

async function handleEditDish(event) {
  event.preventDefault();
  const dishId = Number(document.getElementById("editDishId").value);
  const name = document.getElementById("editDishName").value.trim();
  const price = Number(document.getElementById("editDishPrice").value);
  const description = document.getElementById("editDishDesc").value.trim();

  if (!dishId || !name || Number.isNaN(price) || price <= 0) {
    alert("Vui lòng nhập đầy đủ tên món và giá tiền lớn hơn 0.");
    return;
  }

  const params = new URLSearchParams({ name, price: String(price), description });
  const res = await requestApi(`/dishes/${dishId}?${params}`, { method: "PUT" }, () => {
    currentDishes = currentDishes.map((item) =>
      Number(item.id) === dishId ? { ...item, name, price, description } : item
    );
    return { message: "Đã cập nhật món ăn thành công!" };
  });

  if (!res.ok) {
    alert(res.error.message || "Không thể cập nhật món ăn.");
    return;
  }

  if (!res.fallback) {
    currentDishes = currentDishes.map((item) =>
      Number(item.id) === dishId ? { ...item, name, price, description } : item
    );
  }
  closeEditDish();
  syncDishesUI();
  alert(res.data.message || "Cập nhật món ăn thành công!");
}

async function handleAddDish(event) {
  event.preventDefault();
  const nameInput = document.getElementById("dishName");
  const priceInput = document.getElementById("dishPrice");
  const descInput = document.getElementById("dishDesc");

  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const description = descInput.value.trim();

  if (!name || Number.isNaN(price) || price <= 0) {
    alert("Vui lòng nhập tên món và giá tiền lớn hơn 0.");
    return;
  }

  const params = new URLSearchParams({ name, price: String(price) });
  if (description) params.append("description", description);

  const localDish = { id: getNextDishId(), name, price, description, is_available: true };
  const res = await requestApi(`/dishes?${params}`, { method: "POST" }, () => {
    currentDishes = [...currentDishes, localDish];
    return { message: "Thêm món ăn thành công!" };
  });

  if (!res.ok) {
    alert(res.error.message || "Lỗi: Không thể thêm món");
    return;
  }

  if (!res.fallback) {
    const createdId = res.data.id || res.data.dish?.id || localDish.id;
    currentDishes = [...currentDishes, { ...localDish, id: createdId }];
  }

  nameInput.value = "";
  priceInput.value = "";
  descInput.value = "";
  syncDishesUI();
  alert(res.data.message || "Thêm món ăn thành công!");
}

async function handleDeleteDish(dishId) {
  const dish = currentDishes.find((item) => Number(item.id) === Number(dishId));
  const label = dish ? `"${dish.name}"` : `ID ${dishId}`;
  if (!window.confirm(`Bạn có chắc chắn muốn xóa món ${label} không?`)) {
    return;
  }

  const res = await requestApi(`/dishes/${dishId}`, { method: "DELETE" }, () => {
    currentDishes = currentDishes.filter((item) => Number(item.id) !== Number(dishId));
    return { message: "Đã xóa món ăn!" };
  });

  if (!res.ok) {
    alert(res.error.message || "Không thể xóa món ăn.");
    return;
  }

  if (!res.fallback) {
    currentDishes = currentDishes.filter((item) => Number(item.id) !== Number(dishId));
  }
  syncDishesUI();
  alert(res.data.message || "Đã xóa món ăn!");
}

async function handleAssignMenu(event) {
  event.preventDefault();
  const menuDate = document.getElementById("menuDate").value;
  const dishId = Number(document.getElementById("selectDishId").value);
  const quantity = Number(document.getElementById("menuQuantity").value);

  if (!menuDate || !dishId || Number.isNaN(quantity) || quantity <= 0) {
    alert("Vui lòng chọn ngày, món ăn và số lượng định mức lớn hơn 0.");
    return;
  }

  const params = new URLSearchParams({
    menu_date: menuDate,
    dish_id: String(dishId),
    quantity: String(quantity),
  });

  const res = await requestApi(`/daily-menus?${params}`, { method: "POST" }, () => {
    const dish = currentDishes.find((item) => Number(item.id) === dishId);
    return { message: `Đã gán món "${dish ? dish.name : dishId}" cho ngày ${menuDate} (SL: ${quantity}).` };
  });

  if (!res.ok) {
    alert(res.error.message || "Không thể gán món vào thực đơn.");
    return;
  }

  alert(res.data.message || "Gán món vào thực đơn thành công!");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  loadDishes();
  document.getElementById("addDishForm")?.addEventListener("submit", handleAddDish);
  document.getElementById("editDishForm")?.addEventListener("submit", handleEditDish);
  document.getElementById("cancelEditBtn")?.addEventListener("click", closeEditDish);
  document.getElementById("assignMenuForm")?.addEventListener("submit", handleAssignMenu);
});