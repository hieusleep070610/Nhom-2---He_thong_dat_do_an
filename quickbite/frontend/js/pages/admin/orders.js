let adminOrders = [];
const orderApi = async (path = "", options = {}) => {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const response = await fetch(`${CONFIG.API_BASE_URL}/orders${path}`, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { "Content-Type": "application/json" } : {}) } });
  const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`); return data?.statusCode ? data.data : data;
};
const orderEscape = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const orderLocalDate = (value) => { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const statusNames = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", preparing: "Đang chuẩn bị", ready: "Sẵn sàng", completed: "Hoàn tất", cancelled: "Đã hủy" };
function orderState(text, type = "info") { const el = document.getElementById("ordersState"); el.textContent = text; el.className = `admin-state is-${type}`; el.hidden = false; }
function renderOrders() {
  const term = document.getElementById("orderSearch").value.trim().toLocaleLowerCase("vi"); const status = document.getElementById("orderStatusFilter").value; const day = document.getElementById("orderDateFilter").value;
  const filteredRows = adminOrders.filter((o) => (!status || o.status === status) && (!day || (o.created_at && orderLocalDate(o.created_at) === day)) && `${o.code} ${o.customer_name} ${o.title}`.toLocaleLowerCase("vi").includes(term));
  const rows = AdminUI.page(filteredRows, "orders", renderOrders);
  document.getElementById("orderRows").innerHTML = rows.map((o) => `<tr data-order-id="${o.id}"><td><strong>${orderEscape(o.code || `#${o.id}`)}</strong><small class="admin-subcell">${o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : ""}</small></td><td>${orderEscape(o.customer_name || "—")}</td><td>${orderEscape(o.title || "—")}</td><td>${Number(o.total_amount).toLocaleString("vi-VN")}₫</td><td>${orderEscape(o.payment_method || "—")}</td><td>${orderEscape(o.payment_status || "unpaid")}</td><td><span class="stock-badge ${o.status === "completed" ? "is-available" : o.status === "cancelled" ? "is-empty" : "is-low"}">${statusNames[o.status] || orderEscape(o.status)}</span></td><td><div class="action-group">${AdminUI.button({ label: "Chi tiết", attributes: `data-order-detail="${o.id}"` })}<select class="order-status-select" data-set-status="${o.id}" aria-label="Cập nhật trạng thái đơn"><option value="">Cập nhật</option>${Object.entries(statusNames).map(([key, label]) => `<option value="${key}" ${key === o.status ? "disabled" : ""}>${label}</option>`).join("")}</select></div></td></tr>`).join("");
  document.getElementById("ordersState").hidden = rows.length > 0; if (!rows.length) orderState(term || status ? "Không tìm thấy đơn hàng phù hợp." : "Chưa có đơn hàng.", "empty");
  document.getElementById("ordersTotal").textContent = adminOrders.length;
  document.getElementById("ordersPending").textContent = adminOrders.filter((o) => o.status === "pending").length;
  document.getElementById("ordersPreparing").textContent = adminOrders.filter((o) => o.status === "preparing").length;
  document.getElementById("ordersReady").textContent = adminOrders.filter((o) => o.status === "ready").length;
}
async function loadOrders() { orderState("Đang tải danh sách đơn hàng…"); try { adminOrders = await orderApi(); renderOrders(); } catch (error) { orderState(`${error.message} · Không tải được đơn hàng.`, "error"); } }
document.getElementById("orderRows").addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-order-id]"); if (!row || event.target.matches("select")) return;
  const order = adminOrders.find((o) => o.id === Number(row.dataset.orderId)); if (!order) return;
  AdminUI.open({ title: `Chi tiết ${orderEscape(order.code || `#${order.id}`)}`, subtitle: `${orderEscape(order.customer_name || "Khách hàng")} · ${order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "Thời gian chưa có"}`, content: `<label class="admin-modal-field">Món đã đặt<span>${orderEscape(order.title || "Chưa có dữ liệu món")}</span></label><label class="admin-modal-field">Tổng tiền<span>${Number(order.total_amount).toLocaleString("vi-VN")}₫</span></label><label class="admin-modal-field">Trạng thái đơn / thanh toán<span>${orderEscape(statusNames[order.status] || order.status)} · ${orderEscape(order.payment_method || "—")} · ${orderEscape(order.payment_status || "Chưa rõ")}</span></label><div class="admin-modal-note">API hiện chưa trả về từng món/số lượng, phí giao hàng, số điện thoại hoặc ngày/khung giờ nhận. Chi tiết dưới đây chỉ gồm dữ liệu backend đang cung cấp.</div>`, primary: ["pending", "confirmed"].includes(order.status) ? "Hủy đơn" : "", danger: true, onPrimary: async () => { AdminUI.open({ title: `Hủy đơn ${orderEscape(order.code || `#${order.id}`)}?`, subtitle: `${orderEscape(statusNames[order.status] || order.status)} · Backend sẽ áp dụng quy tắc nghiệp vụ hiện hành.`, content: `<label class="admin-modal-field">Đơn hàng<span>${orderEscape(order.title || "Món đã đặt")}</span></label><div class="admin-modal-note">Không thay đổi tồn kho hoặc thanh toán từ giao diện. Backend sẽ từ chối trạng thái không hợp lệ.</div>`, primary: "Xác nhận hủy đơn", danger: true, onPrimary: async () => { await orderApi(`/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ new_status: "cancelled" }) }); await loadOrders(); AdminUI.notify("Backend đã chấp nhận cập nhật trạng thái đơn.", "success"); return true; } }); return false; } });
});
document.getElementById("orderRows").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-set-status]"); if (!select || !select.value) return;
  const id = Number(select.dataset.setStatus); const requested = select.value; select.disabled = true;
  try { await orderApi(`/${id}/status`, { method: "PATCH", body: JSON.stringify({ new_status: requested }) }); await loadOrders(); }
  catch (error) { select.value = ""; orderState(error.message, "error"); }
  finally { select.disabled = false; }
});
document.getElementById("orderSearch").addEventListener("input", renderOrders); document.getElementById("orderStatusFilter").addEventListener("change", renderOrders); document.getElementById("orderDateFilter").addEventListener("change", renderOrders); document.getElementById("reloadOrders").addEventListener("click", loadOrders);
document.getElementById("ordersExport").addEventListener("click", () => {
  const csv = [["Mã đơn", "Khách hàng", "Món", "Tổng tiền", "Thanh toán", "Trạng thái"], ...adminOrders.map((o) => [o.code, o.customer_name, o.title, o.total_amount, o.payment_status, o.status])].map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "quickbite-orders.csv"; a.click(); URL.revokeObjectURL(url);
});
loadOrders();
