let isSubmitting = false;

async function fetchWalletInfo() {
    const walletIdInput = document.getElementById("input-wallet-id");
    const errorEl = document.getElementById("wallet-error-message");
    const infoBox = document.getElementById("wallet-info-box");
    
    errorEl.textContent = "";
    walletIdInput.style.borderColor = "#ccc";
    infoBox.style.display = "none";

    const rawValue = walletIdInput.value.trim();
    if (!rawValue || isNaN(rawValue)) {
        errorEl.textContent = "Vui lòng nhập ID ví là một số hợp lệ!";
        walletIdInput.style.borderColor = "red";
        return;
    }

    const walletId = parseInt(rawValue, 10);

    try {
        const wallet = await api.get(`/wallets/${walletId}`);

        walletIdInput.style.borderColor = "#28a745";
        document.getElementById("lbl-user-id").textContent = wallet.user_id;
        document.getElementById("lbl-balance").textContent = formatMoney(wallet.balance);
        document.getElementById("lbl-status").textContent = wallet.status === 'active' ? 'Hoạt động (Active)' : 'Đã khóa';
        infoBox.style.display = "block";

    } catch (err) {
        walletIdInput.style.borderColor = "red";
        errorEl.textContent = err.message || "Không tìm thấy mã ví này hoặc lỗi kết nối API!";
    }
}

async function payOrder() {
    if (isSubmitting) return;

    const rawWalletId = document.getElementById("input-wallet-id").value.trim();
    const amountInput = document.getElementById("input-pay-amount");
    const payErrorEl = document.getElementById("pay-error-message");
    const payButton = document.getElementById("btn-pay");
    
    payErrorEl.textContent = "";
    amountInput.style.borderColor = "#ccc";

    if (!rawWalletId || isNaN(rawWalletId)) {
        payErrorEl.textContent = "Vui lòng tra cứu và nhập ID ví hợp lệ ở mục trên trước!";
        document.getElementById("input-wallet-id").style.borderColor = "red";
        return;
    }

    const walletId = parseInt(rawWalletId, 10);
    const amount = parseInt(amountInput.value, 10);

    if (!amount || amount <= 0 || isNaN(amount)) {
        payErrorEl.textContent = "Vui lòng nhập số tiền thanh toán hợp lệ!";
        amountInput.style.borderColor = "red";
        return;
    }

    const fakeOrderId = Math.floor(Math.random() * 100000);

    isSubmitting = true;
    const originalText = payButton.textContent;
    payButton.textContent = "Đang xử lý giao dịch...";
    payButton.style.opacity = "0.6";
    payButton.style.cursor = "not-allowed";

    try {
        const result = await api.post("/wallets/pay", {
            wallet_id: walletId,
            amount: amount,
            order_id: fakeOrderId
        });

        showToast(result.message || "Thanh toán thành công!", "success");
        amountInput.style.borderColor = "#28a745";
        
        fetchWalletInfo();
        amountInput.value = "";

    } catch (err) {
        payErrorEl.textContent = err.message || "Lỗi khi thực hiện giao dịch thanh toán!";
        amountInput.style.borderColor = "red";
    } finally {
        isSubmitting = false;
        payButton.textContent = originalText;
        payButton.style.opacity = "1";
        payButton.style.cursor = "pointer";
    }
}

async function checkDatabaseStatus() {
    const statusBadge = document.getElementById("db-status-badge");
    if (!statusBadge) return;

    try {
        const data = await api.get("/health");
        
        if (data && data.status === "ok" && data.database === "connected") {
            statusBadge.textContent = "Đã kết nối Database";
            statusBadge.style.background = "#d4edda";
            statusBadge.style.color = "#155724";
        } else {
            statusBadge.textContent = "Lỗi kết nối Database";
            statusBadge.style.background = "#f8d7da";
            statusBadge.style.color = "#721c24";
        }
    } catch (err) {
        statusBadge.textContent = "Không thể kết nối Database";
        statusBadge.style.background = "#f8d7da";
        statusBadge.style.color = "#721c24";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkDatabaseStatus();
});