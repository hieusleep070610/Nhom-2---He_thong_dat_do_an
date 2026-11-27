const RECIPE_API = `${CONFIG.API_BASE_URL}/recipes`;
let recipes = []; let recipeIngredients = []; let selectedRecipe = null;
const recipeAuth = () => { const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token"); return token ? { Authorization: `Bearer ${token}` } : {}; };
async function recipeRequest(path = "", options = {}) {
  const headers = { ...recipeAuth(), ...(options.body ? { "Content-Type": "application/json" } : {}) };
  const response = await fetch(`${RECIPE_API}${path}`, { ...options, headers }); const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`); return data?.statusCode ? data.data : data;
}
function recipeStatus(text, type = "info") { const el = document.getElementById("recipeState"); el.textContent = text; el.className = `admin-state is-${type}`; el.hidden = false; }
const recipeEscape = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function renderRecipes() {
  const term = document.getElementById("recipeSearch").value.trim().toLocaleLowerCase("vi"); const status = document.getElementById("recipeStatusFilter").value;
  const filteredRows = recipes.filter((r) => r.dish_name.toLocaleLowerCase("vi").includes(term) && (!status || (status === "configured" ? r.has_recipe : status === "missing" ? !r.has_recipe : r.has_recipe && !r.stock_ok)));
  const rows = AdminUI.page(filteredRows, "recipes", renderRecipes);
  document.getElementById("recipeRows").innerHTML = rows.map((r) => `<tr><td><strong>${recipeEscape(r.dish_name)}</strong><small class="admin-subcell">${r.has_recipe ? `${r.ingredient_count} nguyên liệu · 1 phần` : "Chưa có công thức"}</small></td><td>${r.ingredient_count} nguyên liệu</td><td>${Number(r.price).toLocaleString("vi-VN")}₫</td><td><span class="stock-badge ${r.has_recipe && r.stock_ok ? "is-available" : "is-low"}">${!r.has_recipe ? "Chưa cấu hình" : r.stock_ok ? "Đủ nguyên liệu" : "Thiếu tồn kho"}</span></td><td><button class="btn btn-secondary" data-recipe-cost="${r.dish_id}" type="button">Giá vốn</button> <button class="btn btn-edit" data-recipe="${r.dish_id}" type="button">Định lượng</button></td></tr>`).join("");
  document.getElementById("recipeState").hidden = rows.length > 0;
  if (!rows.length) recipeStatus(term ? "Không tìm thấy món phù hợp." : "Chưa có món ăn để cấu hình công thức.", "empty");
  document.getElementById("recipeTotal").textContent = recipes.length;
  document.getElementById("recipeConfigured").textContent = recipes.filter((r) => r.has_recipe).length;
  document.getElementById("recipeMissing").textContent = recipes.filter((r) => !r.has_recipe || !r.stock_ok).length;
  document.getElementById("recipeDishes").textContent = recipes.length;
}
async function loadRecipes() { recipeStatus("Đang tải danh sách công thức…"); try { recipes = await recipeRequest(); renderRecipes(); } catch (error) { recipeStatus(`${error.message} · Kiểm tra backend và quyền admin.`, "error"); } }
function addLine(item = {}) {
  const row = document.createElement("div"); row.className = "recipe-line";
  row.innerHTML = `<label>Nguyên liệu<select aria-label="Nguyên liệu" required><option value="">Chọn nguyên liệu</option>${recipeIngredients.map((i) => `<option value="${i.id}" ${Number(item.ingredient_id) === Number(i.id) ? "selected" : ""}>${recipeEscape(i.name)}</option>`).join("")}</select></label><label>Định lượng / phần<span class="recipe-quantity-field"><input aria-label="Định lượng trên mỗi phần" type="number" min="0.001" step="0.001" required placeholder="Ví dụ: 150" value="${item.quantity ?? ""}"><span class="recipe-unit">${recipeEscape(item.unit || "Đơn vị")}</span></span></label><button type="button" class="recipe-remove-line" aria-label="Xóa nguyên liệu">×</button>`;
  const ingredientSelect = row.querySelector("select");
  ingredientSelect.addEventListener("change", () => {
    const selected = recipeIngredients.find((ingredient) => Number(ingredient.id) === Number(ingredientSelect.value));
    row.querySelector(".recipe-unit").textContent = selected?.unit || "Đơn vị";
  });
  row.querySelector("button").addEventListener("click", () => {
    const lines = document.querySelectorAll("#recipeLines .recipe-line");
    if (lines.length === 1) { row.querySelector("select").value = ""; row.querySelector("input").value = ""; row.querySelector(".recipe-unit").textContent = "Đơn vị"; }
    else row.remove();
  });
  document.getElementById("recipeLines").append(row);
}
function renderRecipeLines(recipe) {
  const lines = document.getElementById("recipeLines"); lines.replaceChildren();
  (recipe.ingredients?.length ? recipe.ingredients : [{}]).forEach(addLine);
}
async function openRecipe(dishId, isNew = false) {
  selectedRecipe = recipes.find((r) => r.dish_id === dishId); if (!selectedRecipe) return;
  try {
    recipeIngredients = await recipeRequest("/ingredients");
    document.getElementById("recipeEditorTitle").textContent = `Định lượng · ${selectedRecipe.dish_name} / 1 khẩu phần`;
    const dishField = document.getElementById("recipeDishField"); const dishSelect = document.getElementById("recipeDishSelect");
    dishField.hidden = !isNew; dishSelect.required = isNew;
    if (isNew) {
      dishSelect.innerHTML = recipes.filter((recipe) => !recipe.has_recipe).map((recipe) => `<option value="${recipe.dish_id}">${recipeEscape(recipe.dish_name)}</option>`).join("");
      dishSelect.value = String(selectedRecipe.dish_id);
    } else dishSelect.value = "";
    document.getElementById("deleteRecipe").hidden = isNew || !selectedRecipe.has_recipe;
    document.getElementById("saveRecipe").textContent = isNew ? "Lưu công thức" : "Lưu thay đổi";
    document.getElementById("recipeMessage").hidden = true; document.getElementById("recipeMessage").classList.remove("is-error");
    renderRecipeLines(selectedRecipe);
    AdminUI.openNode({ title: isNew ? "Thêm công thức" : "Định lượng công thức", subtitle: `${selectedRecipe.dish_name} · Nguyên liệu tính cho 1 khẩu phần.` }, document.getElementById("recipeEditor"));
  } catch (error) { recipeStatus(error.message, "error"); }
}
document.getElementById("recipeRows").addEventListener("click", (event) => { const costButton = event.target.closest("[data-recipe-cost]"); if (costButton) { const recipe = recipes.find((item) => item.dish_id === Number(costButton.dataset.recipeCost)); if (!recipe) return; const ingredients = (recipe.ingredients || []).map((item) => `<label class="admin-modal-field">${recipeEscape(item.ingredient_name || item.name || `Nguyên liệu #${item.ingredient_id}`)}<span>${Number(item.quantity).toLocaleString("vi-VN")} ${recipeEscape(item.unit || "")}</span></label>`).join("") || "<p>Chưa có định lượng để hiển thị.</p>"; AdminUI.open({ title: "Định lượng & giá vốn", subtitle: `${recipeEscape(recipe.dish_name)} · 1 khẩu phần`, content: `${ingredients}<div class="admin-modal-note">Backend chưa lưu đơn giá nguyên liệu, nên chưa thể tính giá vốn. Tồn kho hiện chỉ dùng để kiểm tra khả năng phục vụ.</div>`, primary: "Tính lại giá vốn", primaryDisabled: true }); return; } const button = event.target.closest("[data-recipe]"); if (button) openRecipe(Number(button.dataset.recipe)); });
document.getElementById("addRecipe").addEventListener("click", () => { const first = recipes.find((r) => !r.has_recipe); if (first) openRecipe(first.dish_id, true); else recipeStatus("Mọi món đang hiển thị đều đã có công thức.", "empty"); });
document.getElementById("recipeDishSelect").addEventListener("change", (event) => {
  const next = recipes.find((recipe) => recipe.dish_id === Number(event.currentTarget.value) && !recipe.has_recipe);
  if (!next) return;
  selectedRecipe = next;
  document.getElementById("recipeEditorTitle").textContent = `Định lượng · ${next.dish_name} / 1 khẩu phần`;
  document.querySelector(".admin-modal-subtitle").textContent = `${next.dish_name} · Nguyên liệu tính cho 1 khẩu phần.`;
  document.getElementById("recipeMessage").hidden = true;
  renderRecipeLines(next);
});
document.getElementById("addRecipeLine").addEventListener("click", () => addLine());
document.getElementById("closeRecipeEditor").addEventListener("click", () => { document.getElementById("recipeEditor").hidden = true; AdminUI.close(); });
document.getElementById("recipeSearch").addEventListener("input", renderRecipes); document.getElementById("recipeStatusFilter").addEventListener("change", renderRecipes);
document.getElementById("recipeForm").addEventListener("submit", async (event) => {
  event.preventDefault(); if (!selectedRecipe) return;
  const ingredients = [...document.querySelectorAll("#recipeLines .recipe-line")].map((line) => ({ ingredient_id: Number(line.querySelector("select").value), quantity: Number(line.querySelector("input").value) }));
  const ids = ingredients.map((ingredient) => ingredient.ingredient_id);
  const message = document.getElementById("recipeMessage");
  if (new Set(ids).size !== ids.length) { message.textContent = "Mỗi nguyên liệu chỉ được thêm một lần trong công thức."; message.classList.add("is-error"); message.hidden = false; return; }
  try { await recipeRequest(`/${selectedRecipe.dish_id}`, { method: "PUT", body: JSON.stringify({ ingredients }) }); document.getElementById("recipeEditor").hidden = true; AdminUI.close(); await loadRecipes(); AdminUI.notify("Đã lưu công thức.", "success"); }
  catch (error) { message.textContent = error.message; message.classList.add("is-error"); message.hidden = false; }
});
document.getElementById("deleteRecipe").addEventListener("click", () => {
  if (!selectedRecipe || !selectedRecipe.has_recipe) return;
  AdminUI.open({ title: "Xóa định lượng công thức?", subtitle: selectedRecipe.dish_name, content: '<div class="admin-modal-note">Thao tác sẽ xóa các thành phần của công thức này. Backend sẽ thực hiện xóa.</div>', primary: "Xác nhận xóa", danger: true, onPrimary: async () => { await recipeRequest(`/${selectedRecipe.dish_id}`, { method: "DELETE" }); document.getElementById("recipeEditor").hidden = true; AdminUI.close(); await loadRecipes(); AdminUI.notify("Đã xóa công thức.", "success"); return true; } });
});
loadRecipes().then(() => {
  const dishId = Number(new URLSearchParams(location.search).get("dish_id"));
  if (dishId) openRecipe(dishId);
});
