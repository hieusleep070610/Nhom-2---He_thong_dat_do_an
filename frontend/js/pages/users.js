const form = document.getElementById("user-form");
const tableBody = document.getElementById("user-table-body");
const searchInput = document.getElementById("search-input");
const submitButton = document.getElementById("btn-submit");

async function loadUsers() {
  tableBody.innerHTML = `<tr><td colspan="4" class="muted">Đang tải...</td></tr>`;
  try {
    const keyword = searchInput.value.trim();
    const users = await api.get("/users", keyword ? { q: keyword } : undefined);
    renderUsers(users);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-error">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderUsers(users) {
  if (users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="muted">Chưa có người dùng</td></tr>`;
    return;
  }
  tableBody.innerHTML = users.map((user) => `
    <tr>
      <td>${user.id}</td>
      <td><strong>${escapeHtml(user.full_name)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${formatDateTime(user.created_at)}</td>
    </tr>`).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = {
    full_name: form.full_name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
  };

  submitButton.disabled = true;
  try {
    await api.post("/users", data);
    showToast("Đã thêm người dùng");
    form.reset();
    loadUsers();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadUsers, 300);
});

loadUsers();
