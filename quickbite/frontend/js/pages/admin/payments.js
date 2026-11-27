let paymentOrders = [];

const paymentEscape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function getPaymentToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || "";
}

function canRefundWalletOrder(order) {
  const status = String(order.status || "").trim().toLowerCase();
  const method = String(order.payment_method || "").trim().toLowerCase();
  const payStatus = String(order.payment_status || "").trim().toLowerCase();
  return ["cancelled", "rejected"].includes(status) && method === "wallet" && payStatus === "paid";
}

function renderPaymentDetailSection(order) {
  const detailEl = document.getElementById("paymentDetail");
  if (!detailEl) return;
  if (!order) {
    detailEl.innerHTML = `<h2>Chọn giao dịch để xem chi tiết</h2><p class="admin-muted">Thông tin thanh toán được lấy từ đơn hàng; không thay đổi trạng thái khi chưa có xác nhận nghiệp vụ.</p>`;
    return;
  }
  const txn = `${order.payment_method === "cod" ? "COD" : "TXN"}-${order.id}`;
  detailEl.innerHTML = `
    <h2>Chi tiết giao dịch ${paymentEscape(txn)}</h2>
    <p>Mã đơn: <strong>${paymentEscape(order.code || `#${order.id}`)}</strong> · Khách hàng: <strong>${paymentEscape(order.customer_name || "—")}</strong></p>
    <p>Số tiền: <strong>${Number(order.total_amount || 0).toLocaleString("vi-VN")}₫</strong> · Phương thức: <strong>${paymentEscape(order.payment_method || "—")}</strong></p>
    <p>Trạng thái thanh toán: <strong>${paymentEscape(order.payment_status || "unpaid")}</strong> · Trạng thái đơn: <strong>${paymentEscape(order.status || "—")}</strong></p>
    <p class="admin-muted">Thông tin thanh toán được lấy từ đơn hàng; chưa có bảng/API giao dịch độc lập hoặc đối soát ngân hàng.</p>
  `;
}

async function paymentLoad() {
  const state = document.getElementById("paymentState");
  state.textContent = "Đang tải giao dịch…";
  state.className = "admin-state";
  state.hidden = false;

  const token = getPaymentToken();
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`);
    const rows = data?.statusCode ? data.data : data;
    paymentOrders = Array.isArray(rows) ? rows : (rows?.data || []);
    renderPayments();
  } catch (error) {
    state.textContent = `${error.message} · Không tải được giao dịch.`;
    state.className = "admin-state is-error";
  }
}

function renderPayments() {
  const term = document.getElementById("paymentSearch").value.trim().toLocaleLowerCase("vi");
  const method = document.getElementById("paymentMethod").value;
  const status = document.getElementById("paymentStatus").value;

  const filteredRows = paymentOrders.filter(
    (o) =>
      (!method || o.payment_method === method) &&
      (!status || o.payment_status === status) &&
      `${o.code || ""} ${o.customer_name || ""}`.toLocaleLowerCase("vi").includes(term)
  );

  const rows = AdminUI.page(filteredRows, "payments", renderPayments);
  document.getElementById("paymentRows").innerHTML = rows
    .map((o) => {
      const txn = `${o.payment_method === "cod" ? "COD" : "TXN"}-${o.id}`;
      const badgeClass =
        o.payment_status === "paid"
          ? "is-available"
          : o.payment_status === "refunded"
            ? "is-empty"
            : "is-low";
      const badgeText =
        o.payment_status === "paid"
          ? "Đã thanh toán"
          : o.payment_status === "refunded"
            ? "Đã hoàn tiền"
            : "Chưa thanh toán";
      const methodText =
        o.payment_method === "wallet"
          ? "Ví Foodie"
          : o.payment_method === "cod"
            ? "Tiền mặt (COD)"
            : o.payment_method || "—";

      return `<tr data-payment-id="${o.id}">
        <td>${paymentEscape(txn)}<small class="admin-subcell">${o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : ""}</small></td>
        <td>${paymentEscape(o.code || `#${o.id}`)}</td>
        <td>${Number(o.total_amount || 0).toLocaleString("vi-VN")}₫</td>
        <td>${paymentEscape(methodText)}</td>
        <td><span class="stock-badge ${badgeClass}">${badgeText}</span></td>
        <td>${paymentEscape(o.status || "—")}</td>
        <td><div class="action-group">${AdminUI.button({ label: "Chi tiết", attributes: `data-payment-detail="${o.id}"` })}${AdminUI.button({ label: "Hoàn tiền", attributes: `data-payment-refund="${o.id}"` })}</div></td>
      </tr>`;
    })
    .join("");

  const state = document.getElementById("paymentState");
  state.hidden = rows.length > 0;
  if (!rows.length) {
    state.textContent =
      term || method || status ? "Không tìm thấy giao dịch phù hợp." : "Chưa có giao dịch thanh toán.";
    state.className = "admin-state is-empty";
  }

  document.getElementById("paymentTotal").textContent = paymentOrders.length;
  document.getElementById("paymentSuccess").textContent = paymentOrders.filter(
    (o) => o.payment_status === "paid"
  ).length;
  document.getElementById("paymentPending").textContent = paymentOrders.filter(
    (o) => !["paid", "refunded"].includes(o.payment_status)
  ).length;
  document.getElementById("paymentRefunded").textContent = paymentOrders.filter(
    (o) => o.payment_status === "refunded"
  ).length;
}

document.getElementById("paymentRows").addEventListener("click", async (event) => {
  const row = event.target.closest("[data-payment-id]");
  if (!row) return;
  const order = paymentOrders.find((o) => o.id === Number(row.dataset.paymentId));
  if (!order) return;

  renderPaymentDetailSection(order);

  if (event.target.closest("[data-payment-refund]")) {
    const eligible = canRefundWalletOrder(order);
    const noteText = eligible
      ? "Đơn đã hủy/từ chối và thanh toán qua Ví Foodie. Xác nhận hoàn tiền vào ví khách hàng."
      : "Chỉ hoàn tiền tự động vào ví cho đơn đã hủy/từ chối và đã thanh toán qua Ví Foodie. Chưa có API đối soát chuyển khoản/biên lai riêng.";

    AdminUI.open({
      title: "Yêu cầu hoàn tiền",
      subtitle: `${paymentEscape(order.code || `#${order.id}`)} · ${Number(order.total_amount || 0).toLocaleString("vi-VN")}₫`,
      content: `<label class="admin-modal-field">Trạng thái thanh toán<span>${paymentEscape(order.payment_status || "Chưa thanh toán")}</span></label><div class="admin-modal-note">${paymentEscape(noteText)}</div>`,
      primary: "Gửi yêu cầu hoàn tiền",
      primaryDisabled: !eligible,
      onPrimary: eligible
        ? async () => {
            const token = getPaymentToken();
            const res = await fetch(`${CONFIG.API_BASE_URL}/orders/${order.id}/refund`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ reason: "Admin hoàn tiền đơn đã hủy/từ chối" }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(payload.message || "Không hoàn tiền được.");
            }
            await paymentLoad();
          }
        : undefined,
    });
    return;
  }

  const txn = `${order.payment_method === "cod" ? "COD" : "TXN"}-${order.id}`;
  AdminUI.open({
    title: `Đối soát ${txn}`,
    subtitle: `${paymentEscape(order.code || `#${order.id}`)} · ${Number(order.total_amount || 0).toLocaleString("vi-VN")}₫`,
    content: `<label class="admin-modal-field">Phương thức / trạng thái<span>${paymentEscape(order.payment_method || "—")} · ${paymentEscape(order.payment_status || "Chưa thanh toán")}</span></label><label class="admin-modal-field">Thời gian / trạng thái đơn<span>${order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "Chưa có thời gian"} · ${paymentEscape(order.status || "—")}</span></label><div class="admin-modal-note">Backend hiện chưa có bảng/API giao dịch độc lập hoặc đối soát ngân hàng. Đây là trạng thái thanh toán trên đơn; không thể xác minh giao dịch từ ảnh biên lai.</div>`,
    primary: "Kiểm tra lại",
    primaryDisabled: true,
  });
});

document.getElementById("paymentSearch").addEventListener("input", renderPayments);
document.getElementById("paymentMethod").addEventListener("change", renderPayments);
document.getElementById("paymentStatus").addEventListener("change", renderPayments);
document.getElementById("paymentReload").addEventListener("click", paymentLoad);

document.getElementById("paymentsExport").addEventListener("click", () => {
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
});

document.getElementById("paymentSearch").value = "";
paymentLoad();
