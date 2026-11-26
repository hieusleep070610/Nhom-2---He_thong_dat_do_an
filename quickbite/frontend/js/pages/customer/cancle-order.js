(() => {
  const modal = document.getElementById("cancel-order-modal");
  const form = document.getElementById("cancel-order-form");
  if (!modal || !form) return;

  const titleEl = document.getElementById("co-title");
  const noteEl = document.getElementById("co-note");
  const reasonSelect = document.getElementById("co-reason");
  const reasonOther = document.getElementById("co-reason-other");
  const errorEl = document.getElementById("co-error");
  const stockEl = document.getElementById("co-stock");
  const preparedEl = document.getElementById("co-prepared");
  const paymentEl = document.getElementById("co-payment");
  const closeBtn = document.getElementById("co-close");
  const submitBtn = document.getElementById("co-submit");

  let activeOrderId = null;

  function openCancelModal(orderId, orderCode) {
    activeOrderId = orderId;
    form.reset();
    if (reasonOther) reasonOther.hidden = true;
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
    if (titleEl) titleEl.textContent = `Hủy đơn ${orderCode || `#${orderId}`}`;
    if (noteEl) noteEl.textContent = "Đơn hàng chỉ có thể hủy khi chưa bắt đầu chế biến.";
    if (stockEl) stockEl.textContent = "Hoàn lại toàn bộ suất món và nguyên liệu đã giữ chỗ.";
    if (preparedEl) preparedEl.textContent = "Hệ thống sẽ từ chối hủy nếu bếp đã bắt đầu chuẩn bị.";
    if (paymentEl) paymentEl.textContent = "Nếu đã thanh toán qua ví, tiền sẽ được hoàn tự động vào ví.";

    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeCancelModal() {
    activeOrderId = null;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  document.addEventListener("click", (event) => {
    const cancelBtn = event.target.closest(".btn-cancel-order");
    if (!cancelBtn) return;

    event.preventDefault();
    event.stopPropagation();
    const orderId = cancelBtn.dataset.orderId;
    const orderCode = cancelBtn.dataset.orderCode;
    if (orderId) {
      openCancelModal(orderId, orderCode);
    }
  });

  reasonSelect?.addEventListener("change", () => {
    const isOther = reasonSelect.value === "other";
    if (reasonOther) {
      reasonOther.hidden = !isOther;
      if (isOther) reasonOther.focus();
    }
    if (errorEl) errorEl.hidden = true;
  });

  closeBtn?.addEventListener("click", closeCancelModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeCancelModal();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeOrderId) return;

    const selected = (reasonSelect?.value || "").trim();
    const custom = (reasonOther?.value || "").trim();
    const reason = selected === "other" ? custom : selected;

    if (!reason) {
      if (errorEl) {
        errorEl.textContent = "Vui lòng chọn hoặc nhập lý do hủy đơn.";
        errorEl.hidden = false;
      }
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await api.post(`/orders/${encodeURIComponent(activeOrderId)}/cancel`, { reason });
      closeCancelModal();

      const refund = Number(res?.refunded_amount || 0);
      const msg = refund > 0
        ? `Đã hủy đơn thành công và hoàn ${formatMoney(refund)} vào ví.`
        : "Đã hủy đơn hàng thành công.";
      if (typeof showToast === "function") {
        showToast(msg, "success");
      } else {
        alert(msg);
      }

      if (typeof window.reloadCustomerOrders === "function") {
        await window.reloadCustomerOrders();
      } else {
        window.location.reload();
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err?.message || "Không thể hủy đơn hàng.";
        errorEl.hidden = false;
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
})();