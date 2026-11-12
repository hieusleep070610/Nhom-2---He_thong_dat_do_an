let isSubmitting = false;

async function fetchWalletInfo() {
    const walletIdInput = document.getElementById("input-wallet-id");
    const errorEl = document.getElementById("wallet-error-message");
    const infoBox = document.getElementById("wallet-info-box");
    
    errorEl.textContent = "";
    infoBox.style.display = "none";

    const rawValue = walletIdInput.value.trim();
    if (!rawValue || isNaN(rawValue)) {
        errorEl.textContent = "Vui lòng nhập ID ví là một số hợp lệ!";
        return;
    }

    const walletId = parseInt(rawValue, 10);

    try {
        const wallet = await api.get(`/wallets/${walletId}`);

        document.getElementById("lbl-user-id").textContent = wallet.user_id;
        document.getElementById("lbl-balance").textContent = formatMoney(wallet.balance);
        document.getElementById("lbl-status").textContent = wallet.status === 'active' ? 'Hoạt động (Active)' : 'Đã khóa';
        infoBox.style.display = "block";

    } catch (err) {
        errorEl.textContent = err.message || "Không tìm thấy mã ví này!";
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
        return;
    }

    const walletId = parseInt(rawWalletId, 10);
    const amount = parseInt(amountInput.value, 10);

    if (!amount || amount <= 0 || isNaN(amount)) {
        payErrorEl.textContent = "Vui lòng nhập số tiền thanh toán hợp lệ!";
        amountInput.style.borderColor = "red";
        return;
    }

    // Tự sinh một order_id ngẫu nhiên kiểu số nguyên nếu giao diện chưa có ô nhập order_id
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
            order_id: fakeOrderId // Đảm bảo gửi lên dưới dạng số nguyên int
        });

        showToast(result.message || "Thanh toán thành công!", "success");
        
        fetchWalletInfo();
        amountInput.value = "";

    } catch (err) {
        payErrorEl.textContent = err.message || "Lỗi khi thực hiện thanh toán!";
        amountInput.style.borderColor = "red";
    } finally {
        isSubmitting = false;
        payButton.textContent = originalText;
        payButton.style.opacity = "1";
        payButton.style.cursor = "pointer";
    }
}