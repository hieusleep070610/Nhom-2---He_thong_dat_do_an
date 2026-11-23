async function loadMyWallet() {
  const message = document.getElementById("wallet-message");
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  if (!token) {
    message.innerHTML = 'Hãy <a href="login.html">đăng nhập</a> để xem ví của bạn.';
    return;
  }

  try {
    const [wallet, user] = await Promise.all([api.get("/wallets/mine"), api.get("/auth/me")]);
    document.getElementById("lbl-balance").textContent = formatMoney(wallet.balance);
    document.getElementById("lbl-status").textContent = wallet.status?.toLowerCase() === "active" ? "Hoạt động" : "Đã khóa";
    document.getElementById("lbl-owner").textContent = user.full_name;
    message.textContent = "Số dư ví sẽ được trừ khi bạn đặt đơn bằng phương thức Ví Foodie.";
  } catch (error) {
    message.textContent = error.status === 404
      ? "Tài khoản chưa có ví. Hãy liên hệ quản trị viên để được cấp ví."
      : error.message || "Không tải được thông tin ví.";
  }
}

loadMyWallet();
