(() => {
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const root = document.createElement("div");
  root.innerHTML = '<div class="admin-modal-backdrop" data-modal-backdrop hidden><section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle"><button class="admin-modal-x" type="button" aria-label="Đóng">×</button><h2 id="adminModalTitle"></h2><p class="admin-modal-subtitle"></p><div class="admin-modal-content"></div><div class="admin-modal-actions"><button class="btn btn-secondary" type="button" data-modal-close>Đóng</button></div></section></div><div class="admin-toast-region" aria-live="polite" aria-atomic="true"></div>';
  document.body.append(root);
  const backdrop = root.querySelector("[data-modal-backdrop]");
  const dialog = root.querySelector(".admin-modal");
  let previousFocus = null;
  let movedNode = null;
  const close = () => { if (movedNode) { const { node, parent, next, wasHidden } = movedNode; parent.insertBefore(node, next); node.hidden = wasHidden; movedNode = null; } backdrop.hidden = true; document.body.classList.remove("admin-modal-open"); previousFocus?.focus?.(); };
  const open = ({ title, subtitle = "", content = "", primary = "", primaryDisabled = false, danger = false, onPrimary = null }) => {
    previousFocus = document.activeElement;
    root.querySelector("#adminModalTitle").textContent = title;
    root.querySelector(".admin-modal-subtitle").textContent = subtitle;
    root.querySelector(".admin-modal-content").innerHTML = content;
    const actions = root.querySelector(".admin-modal-actions");
    actions.innerHTML = '<button class="btn btn-secondary" type="button" data-modal-close>Đóng</button>';
    if (primary) {
      const button = document.createElement("button"); button.type = "button"; button.className = `btn ${danger ? "btn-danger" : "btn-primary"}`; button.textContent = primary; button.disabled = primaryDisabled;
      button.addEventListener("click", async () => { if (!onPrimary) { close(); return; } button.disabled = true; try { const shouldClose = await onPrimary(dialog); if (shouldClose !== false) close(); } catch (error) { notify(error.message || "Đã xảy ra lỗi.", "error"); } finally { button.disabled = false; } });
      actions.append(button);
    }
    backdrop.hidden = false; document.body.classList.add("admin-modal-open"); dialog.querySelector("button").focus();
  };
  const openNode = (options, node) => {
    if (movedNode) close();
    const parent = node.parentNode, next = node.nextSibling, wasHidden = node.hidden;
    open(options); movedNode = { node, parent, next, wasHidden }; node.hidden = false; root.querySelector(".admin-modal-content").replaceChildren(node);
    node.querySelector("input:not([type=hidden]), select, textarea, button")?.focus?.();
  };
  const notify = (message, type = "info") => {
    const toast = document.createElement("div"); toast.className = `admin-toast is-${type}`; toast.textContent = message; root.querySelector(".admin-toast-region").append(toast); setTimeout(() => toast.remove(), 5000);
  };
  const pageState = {};
  const page = (items, key, render, size = 5) => {
    const total = items.length, pages = Math.max(1, Math.ceil(total / size));
    pageState[key] = Math.min(pageState[key] || 1, pages);
    const current = pageState[key], table = document.querySelector(`[data-page-body="${key}"]`);
    if (table) {
      let footer = table.closest(".admin-table-wrap")?.nextElementSibling;
      if (!footer?.classList.contains("admin-pagination")) { footer = document.createElement("div"); footer.className = "admin-pagination"; table.closest(".admin-table-wrap")?.after(footer); }
      const from = total ? (current - 1) * size + 1 : 0, to = Math.min(current * size, total);
      footer.innerHTML = `<span>Hiển thị ${from}–${to} / ${total}</span><div><button class="btn btn-secondary" type="button" data-page-prev="${key}" ${current <= 1 ? "disabled" : ""}>Trước</button><span>${current} / ${pages}</span><button class="btn btn-secondary" type="button" data-page-next="${key}" ${current >= pages ? "disabled" : ""}>Sau</button></div>`;
      footer.querySelector("[data-page-prev]").addEventListener("click", () => { pageState[key] = current - 1; render(); });
      footer.querySelector("[data-page-next]").addEventListener("click", () => { pageState[key] = current + 1; render(); });
    }
    return items.slice((current - 1) * size, current * size);
  };
  root.addEventListener("click", (event) => { if (event.target.closest("[data-modal-close], .admin-modal-x") || event.target === backdrop) close(); });
  document.addEventListener("keydown", (event) => {
    if (backdrop.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "Tab") { const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')]; if (!focusable.length) return; const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
  });
  window.AdminUI = { open, openNode, close, notify, esc, page };
  window.addEventListener("error", (event) => { if (event.message) notify(`Có lỗi giao diện: ${event.message}`, "error"); });
  window.addEventListener("unhandledrejection", (event) => { const reason = event.reason; notify(reason?.message || "Tác vụ gặp lỗi không xác định.", "error"); });
})();
