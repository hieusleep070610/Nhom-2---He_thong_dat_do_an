let paymentOrders = [];

const $ = (id) => document.getElementById(id);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
  );
const getToken = () => localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || "";
const money = (v) => `${Number(v || 0).toLocaleString("vi-VN")}₫`;
const dateStr = (v) => (v ? new Date(v).toLocaleString("vi-VN") : "Chưa có thời gian");
const txnCode = (o) => `${o.payment_method === "cod" ? "COD" : "TXN"}-${o.id}`;
const methodLabel = (m) => (m === "wallet" ? "Ví Foodie" : m === "cod" ? "Tiền mặt (COD)" : m || "—");

const ORDER_STATUS_VI = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng nhận",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  rejected: "Bị từ chối",
};
const PAY_STATUS_VI = {
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
};

function badgeInfo(status) {
  if (status === "paid") return { cls: "is-available", text: "Đã thanh toán" };
  if (status === "refunded") return { cls: "is-empty", text: "Đã hoàn tiền" };
  if (status === "refund_pending") return { cls: "is-low", text: "Chờ hoàn tiền" };
  return { cls: "is-low", text: "Chưa thanh toán" };
}

function canRefundWalletOrder(o) {
  const status = String(o.status || "").trim().toLowerCase();
  const method = String(o.payment_method || "").trim().toLowerCase();
  const payStatus = String(o.payment_status || "").trim().toLowerCase();
  return ["cancelled", "rejected"].includes(status) && method === "wallet" && payStatus === "paid";
}

function renderSummary(visibleCount) {
  const hasFilter = Boolean($("paymentSearch").value.trim() || $("paymentMethod").value || $("paymentStatus").value);
  const state = $("paymentState");
  state.hidden = visibleCount > 0;
  if (!visibleCount) {
    state.textContent = hasFilter ? "Không tìm thấy giao dịch phù hợp." : "Chưa có giao dịch thanh toán.";
    state.className = "admin-state is-empty";
  }

  $("paymentTotal").textContent = paymentOrders.length;
  $("paymentSuccess").textContent = paymentOrders.filter((o) => o.payment_status === "paid").length;
  $("paymentPending").textContent = paymentOrders.filter(
    (o) => !["paid", "refunded", "refund_pending"].includes(o.payment_status)
  ).length;
  $("paymentRefunded").textContent = paymentOrders.filter((o) => o.payment_status === "refunded").length;
}

function renderPayments() {
  const term = $("paymentSearch").value.trim().toLocaleLowerCase("vi");
  const method = $("paymentMethod").value;
  const status = $("paymentStatus").value;

  const filtered = paymentOrders.filter(
    (o) =>
      (!method || o.payment_method === method) &&
      (!status || o.payment_status === status) &&
      `${o.code || ""} ${o.customer_name || ""}`.toLocaleLowerCase("vi").includes(term)
  );

  const rows = AdminUI.page(filtered, "payments", renderPayments);
  $("paymentRows").innerHTML = rows
    .map((o) => {
      const b = badgeInfo(o.payment_status);
      const btns = [
        AdminUI.button({ label: "Chi tiết", attributes: `data-payment-detail="${o.id}"` }),
        AdminUI.button({ label: "Hoàn tiền", attributes: `data-payment-refund="${o.id}"` }),
      ].join("");

      return `<tr data-payment-id="${o.id}">
        <td>${esc(txnCode(o))}<small class="admin-subcell">${esc(o.created_at ? dateStr(o.created_at) : "")}</small></td>
        <td>${esc(o.code || `#${o.id}`)}</td>
        <td>${money(o.total_amount)}</td>
        <td>${esc(methodLabel(o.payment_method))}</td>
        <td><span class="stock-badge ${b.cls}">${b.text}</span></td>
        <td>${esc(ORDER_STATUS_VI[o.status] || o.status || "—")}</td>
        <td><div class="action-group">${btns}</div></td>
      </tr>`;
    })
    .join("");

  renderSummary(rows.length);
}

/* ===== Hoàn tiền ===== */
const REFUND_REASONS = [
  "Khách yêu cầu hỗ trợ hoàn tiền",
  "Cửa hàng từ chối đơn",
  "Đơn bị hủy sau khi đã thanh toán",
];

function getRefundReason() {
  const sel = $("refundReason");
  if (!sel) return "";
  return sel.value === "__other" ? ($("refundReasonOther")?.value || "").trim() : sel.value;
}

async function requestRefund(orderId) {
  const reason = getRefundReason();
  if (!reason) throw new Error("Vui lòng nhập lý do hoàn tiền.");

  const token = getToken();
  const res = await fetch(`${CONFIG.API_BASE_URL}/orders/${orderId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ reason }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.detail || payload.message || "Không hoàn tiền được.");
  closeAdminModal();
  await paymentLoad();
}

function buildRefundModalContent(order, eligible, warnText) {
  const options = REFUND_REASONS.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("");
  return `
    <label class="admin-modal-field">
      Số tiền tối đa
      <span>${money(order.total_amount)}</span>
    </label>
    <label class="admin-modal-field">
      Lý do
      <select id="refundReason" ${eligible ? "" : "disabled"}>
        ${options}
        <option value="__other">Lý do khác</option>
      </select>
      <textarea id="refundReasonOther" rows="2" maxlength="200" placeholder="Nhập lý do cụ thể..." hidden></textarea>
    </label>
    <label class="admin-modal-field">
      Trạng thái sau yêu cầu
      <span>Chờ hoàn tiền; chỉ hoàn tất khi cổng ví xác nhận.</span>
    </label>
    <label class="admin-modal-field">
      Lưu ý
      <span>Không tự động đổi trạng thái đơn hoặc hoàn nguyên liệu.</span>
    </label>
    ${warnText ? `<div class="admin-modal-note">${esc(warnText)}</div>` : ""}
  `;
}

function openRefundModal(order) {
  const eligible = canRefundWalletOrder(order);
  const warnText = eligible
    ? ""
    : "Chỉ hoàn tiền vào ví cho đơn đã hủy/từ chối và đã thanh toán qua Ví Foodie (chưa hoàn trước đó).";
  const payLine =
    order.payment_method === "wallet" && order.payment_status === "paid"
      ? "Ví Foodie đã xác nhận thanh toán."
      : `${methodLabel(order.payment_method)} · ${PAY_STATUS_VI[order.payment_status] || "Chưa thanh toán"}`;

  AdminUI.open({
    title: "Yêu cầu hoàn tiền",
    subtitle: `${esc(txnCode(order))} · ${esc(order.code || `#${order.id}`)} · ${esc(payLine)}`,
    content: buildRefundModalContent(order, eligible, warnText),
    primary: "Gửi yêu cầu hoàn tiền",
    primaryDisabled: !eligible,
    onPrimary: eligible ? () => requestRefund(order.id) : undefined,
  });
}

/* ===== Chi tiết (hiển thị trong modal) ===== */
const detailField = (label, value) =>
  `<label class="admin-modal-field">${esc(label)}<span>${esc(value)}</span></label>`;

function buildDetailModalContent(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsText = items
    .map((i) => `${i.item_name} ${money(i.unit_price)}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`)
    .join(" + ");
  const hasBreakdown = o.subtotal != null || o.delivery_fee != null;

  return [
    ["Giao dịch", txnCode(o)],
    itemsText && ["Món ăn", itemsText],
    hasBreakdown
      ? ["Tạm tính / Phí giao / Tổng", `${money(o.subtotal)} / ${money(o.delivery_fee)} / ${money(o.total_amount)}`]
      : ["Tổng tiền", money(o.total_amount)],
    ["Đơn hàng", ORDER_STATUS_VI[o.status] || o.status || "—"],
    ["Thanh toán", `${methodLabel(o.payment_method)} · ${PAY_STATUS_VI[o.payment_status] || "Chưa thanh toán"}`],
  ]
    .filter(Boolean)
    .map(([label, value]) => detailField(label, value))
    .join("");
}

function closeAdminModal() {
  if (typeof AdminUI.close === "function") AdminUI.close();
}

function openDetailModal(o) {
  AdminUI.open({
    title: `Chi tiết ${esc(o.code || `#${o.id}`)}`,
    subtitle: [o.customer_name, o.customer_phone, o.pickup_date ? `Nhận ${o.pickup_date}` : ""]
      .filter(Boolean)
      .map(esc)
      .join(" · "),
    content: buildDetailModalContent(o),
    primary: "Đóng chi tiết",
    onPrimary: closeAdminModal,
  });
}

/* ===== Đối soát ===== */
function buildReconcileModalContent(order) {
  const tpl = $("reconcileModalTemplate");
  if (!tpl) return "";
  const methodStatusEl = tpl.querySelector("#reconcileTplMethodStatus");
  const timeStatusEl = tpl.querySelector("#reconcileTplTimeStatus");
  if (methodStatusEl) {
    methodStatusEl.textContent = `${methodLabel(order.payment_method)} · ${PAY_STATUS_VI[order.payment_status] || "Chưa thanh toán"}`;
  }
  if (timeStatusEl) {
    timeStatusEl.textContent = `${dateStr(order.created_at)} · ${ORDER_STATUS_VI[order.status] || order.status || "—"}`;
  }
  return tpl.innerHTML;
}

function openReconcileModal(order) {
  AdminUI.open({
    title: `Đối soát ${esc(txnCode(order))}`,
    subtitle: `${esc(order.code || `#${order.id}`)} · ${money(order.total_amount)}`,
    content: buildReconcileModalContent(order),
    primary: "Kiểm tra lại",
    primaryDisabled: true,
  });
}

/* ===== Tải dữ liệu / xuất CSV ===== */
async function paymentLoad() {
  const state = $("paymentState");
  state.textContent = "Đang tải giao dịch…";
  state.className = "admin-state";
  state.hidden = false;

  const token = getToken();
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || `Lỗi ${res.status}`);
    paymentOrders = Array.isArray(data) ? data : data.data || [];
    renderPayments();
  } catch (err) {
    state.textContent = `${err.message} · Không tải được giao dịch.`;
    state.className = "admin-state is-error";
  }
}

function exportPaymentsCsv() {
  const csv = [
    ["Mã giao dịch", "Mã đơn", "Số tiền", "Phương thức", "Thanh toán"],
    ...paymentOrders.map((o) => [
      `${o.payment_method}-${o.id}`,
      o.code,
      o.total_amount,
      o.payment_method,
      o.payment_status,
    ]),
  ]
    .map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\r\n");

  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "quickbite-payments.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ===== Events ===== */
$("paymentRows").addEventListener("click", (event) => {
  const row = event.target.closest("[data-payment-id]");
  if (!row) return;
  const order = paymentOrders.find((o) => o.id === Number(row.dataset.paymentId));
  if (!order) return;

  if (event.target.closest("[data-payment-refund]")) {
    openRefundModal(order);
    return;
  }
  if (event.target.closest("[data-payment-detail]")) {
    openDetailModal(order);
    return;
  }
  openReconcileModal(order);
});

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "refundReason") {
    const other = $("refundReasonOther");
    if (other) {
      other.hidden = e.target.value !== "__other";
      if (!other.hidden) other.focus();
    }
  }
});

$("paymentSearch").addEventListener("input", renderPayments);
$("paymentMethod").addEventListener("change", renderPayments);
$("paymentStatus").addEventListener("change", renderPayments);
$("paymentReload").addEventListener("click", paymentLoad);
$("paymentsExport").addEventListener("click", exportPaymentsCsv);

$("paymentSearch").value = "";
paymentLoad();