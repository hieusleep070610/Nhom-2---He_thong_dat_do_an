/**
 * refund-dialog.js — dialog "Yêu cầu hoàn tiền"
 * Dùng: RefundDialog.open(orderId, () => loadOrders());
 * Cần đối tượng global `api` (api.get / api.post) như orders.js.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    typeof window.formatMoney === 'function'
      ? window.formatMoney(n)
      : new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';

  let modal, form, reasonSel, reasonOther, errBox, submitBtn;
  let currentId = null, onDone = null, lastFocus = null;

  function showError(msg) { errBox.textContent = msg; errBox.hidden = !msg; }
  const getReason = () => (reasonSel.value === 'other' ? reasonOther.value.trim() : reasonSel.value);

  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  async function open(orderId, callback) {
    currentId = orderId;
    onDone = callback;
    lastFocus = document.activeElement;

    form.reset();
    reasonOther.hidden = true;
    showError('');
    $('rf-sub').textContent = 'Đang tải thông tin...';
    $('rf-amount').textContent = '—';
    submitBtn.disabled = true;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    try {
      const info = await api.get(`/orders/${encodeURIComponent(orderId)}/refund-info`);
      $('rf-sub').textContent = [
        info.payment_txn_code,
        `#${info.order_code}`,
        info.wallet_paid ? 'Ví Foodie đã xác nhận thanh toán.' : 'Đơn không thanh toán bằng Ví Foodie.',
      ].filter(Boolean).join(' · ');
      $('rf-amount').textContent = money(info.max_amount);

      if (info.refund && info.refund.status !== 'failed') {
        showError(info.refund.status === 'completed'
          ? `Đơn đã được hoàn ${money(info.refund.amount)} (${info.refund.code}).`
          : `Đã có yêu cầu hoàn tiền ${info.refund.code} đang chờ xác nhận.`);
      } else if (!info.wallet_paid) {
        showError('Đơn này không có khoản thanh toán qua ví để hoàn.');
      } else if (!info.can_request) {
        showError('Chỉ hoàn tiền cho đơn đã hủy hoặc bị từ chối.');
      }
      submitBtn.disabled = !info.can_request;
    } catch (err) {
      $('rf-sub').textContent = '';
      showError(err.message || 'Không tải được thông tin hoàn tiền.');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const reason = getReason();
    if (!reason) { showError('Vui lòng nhập lý do hoàn tiền.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';
    try {
      await api.post(`/orders/${encodeURIComponent(currentId)}/refund`, { reason });
      const cb = onDone;
      close();
      if (typeof cb === 'function') cb();
    } catch (err) {
      showError(err.message || 'Không gửi được yêu cầu hoàn tiền.');
      submitBtn.disabled = false;
    } finally {
      submitBtn.textContent = 'Gửi yêu cầu hoàn tiền';
    }
  }

  function init() {
    modal = $('refund-modal');
    form = $('refund-form');
    reasonSel = $('rf-reason');
    reasonOther = $('rf-reason-other');
    errBox = $('rf-error');
    submitBtn = $('rf-submit');

    reasonSel.addEventListener('change', () => {
      reasonOther.hidden = reasonSel.value !== 'other';
      if (!reasonOther.hidden) reasonOther.focus();
      showError('');
    });
    form.addEventListener('submit', onSubmit);
    $('rf-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.RefundDialog = { open, close };
})();
