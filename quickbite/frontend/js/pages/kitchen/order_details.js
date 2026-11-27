const API_BASE = "http://127.0.0.1:8000/api";
const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);

function getAuthToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || "";
}

function getSelectedRow() {
  return document.querySelector("#ordersTableBody tr.row-selected")
    || document.querySelector("#ordersTableBody tr");
}

function syncPanelWithRow(row) {
  if (!row) return;
  document.querySelectorAll("#ordersTableBody tr").forEach((tr) => tr.classList.remove("row-selected"));
  row.classList.add("row-selected");

  const orderId = row.dataset.orderId;
  const code = row.dataset.code || `#${orderId}`;
  const pickup = row.dataset.pickup || "";
  const status = row.dataset.status || "";
  const statusLabel = row.dataset.statusLabel || status;
  const paymentLabel = row.dataset.paymentLabel || "";

  const titleEl = document.getElementById("selectedOrderTitle");
  const statusLineEl = document.getElementById("selectedOrderStatusLine");
  const cancelBtn = document.getElementById("cancelSelectedOrderBtn");

  if (titleEl) {
    titleEl.textContent = `Đang chọn ${code}${pickup ? ` · Nhận món ${pickup}` : ""}`;
  }
  if (statusLineEl) {
    statusLineEl.innerHTML = `Đơn hàng: <strong>${statusLabel}</strong> &nbsp;|&nbsp; Thanh toán: <strong>${paymentLabel}</strong>`;
  }
  if (cancelBtn) {
    cancelBtn.dataset.orderId = orderId;
    cancelBtn.disabled = !CANCELLABLE_STATUSES.has(status);
  }
}

async function cancelOrderById(orderId, row) {
  if (!orderId) return;

  const currentStatus = (row?.dataset.status || "").toLowerCase();
  if (currentStatus && !CANCELLABLE_STATUSES.has(currentStatus)) {
    alert("Chỉ có thể hủy đơn khi chưa chế biến (chờ xác nhận / đã xác nhận).");
    return;
  }

  const reason = window.prompt("Nhập lý do hủy đơn (không bắt buộc):", "");
  if (reason === null) return;

  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: reason.trim() || null }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.detail || `Hủy đơn thất bại (HTTP ${res.status})`);
    }

    if (row) {
      row.dataset.status = "cancelled";
      row.dataset.statusLabel = "Đã hủy";
      const orderStatusCell = row.querySelector(".col-order-status");
      if (orderStatusCell) {
        orderStatusCell.innerHTML = `<span class="status status-neutral">Đã hủy</span>`;
      }
      if ((data?.statusCode ? data.data : data)?.payment_status === "refunded") {
        row.dataset.paymentLabel = "Đã hoàn tiền";
        const paymentCell = row.querySelector(".col-payment");
        if (paymentCell) {
          paymentCell.innerHTML = `<span class="status status-neutral">Đã hoàn tiền</span>`;
        }
      }
      syncPanelWithRow(row);
    }

    const refundMsg = Number(data.refunded_amount || 0) > 0
      ? ` · Đã hoàn ${Number(data.refunded_amount).toLocaleString("vi-VN")}đ vào ví`
      : "";
    alert(`Đã hủy đơn ${data.order_code || `#${orderId}`}${refundMsg}.`);
  } catch (err) {
    alert(err.message || "Không thể hủy đơn.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("ordersTableBody");
  const panelCancelBtn = document.getElementById("cancelSelectedOrderBtn");

  syncPanelWithRow(getSelectedRow());

  tbody?.addEventListener("click", (e) => {
    const cancelLink = e.target.closest(".action-cancel");
    const row = e.target.closest("tr");
    if (!row) return;

    syncPanelWithRow(row);

    if (cancelLink) {
      e.preventDefault();
      cancelOrderById(cancelLink.dataset.orderId || row.dataset.orderId, row);
    }
  });

  panelCancelBtn?.addEventListener("click", () => {
    const selectedRow = getSelectedRow();
    const orderId = panelCancelBtn.dataset.orderId || selectedRow?.dataset.orderId;
    cancelOrderById(orderId, selectedRow);
  });
});
