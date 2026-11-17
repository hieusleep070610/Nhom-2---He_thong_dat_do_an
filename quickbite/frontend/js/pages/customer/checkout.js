// Customer 05: chọn ngày nhận và khung giờ, mỗi khung cách nhau 30 phút.
// Không gọi API. Giá trị đơn bên phải giữ đúng mẫu trên thiết kế.

const SLOT_START = 10 * 60 + 30;
const SLOT_END = 19 * 60;
const SLOT_STEP = 30;
const LEAD_MINUTES = 30;

const pickupDate = document.getElementById("pickup-date");
const timeSlots = document.getElementById("time-slots");
const slotStatus = document.getElementById("slot-status");
const pickupSummary = document.getElementById("pickup-summary");
const confirmButton = document.getElementById("btn-confirm");

const state = { time: "" };

function todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatSlot(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplayDate(value) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function slotsForDate(dateValue) {
  const isToday = dateValue === todayString();
  const now = new Date();
  const earliest = now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES;
  const slots = [];
  for (let minute = SLOT_START; minute <= SLOT_END; minute += SLOT_STEP) {
    slots.push({
      label: formatSlot(minute),
      disabled: isToday && minute < earliest,
    });
  }
  return slots;
}

function renderSummary() {
  if (!state.time) {
    pickupSummary.textContent = "Chưa chọn";
    return;
  }
  pickupSummary.textContent = `${formatDisplayDate(pickupDate.value)} · ${state.time}`;
}

function renderSlots() {
  const slots = slotsForDate(pickupDate.value);
  if (state.time && !slots.some((slot) => slot.label === state.time && !slot.disabled)) {
    state.time = "";
  }
  const open = slots.filter((slot) => !slot.disabled).length;
  slotStatus.textContent = open
    ? `Chọn khung giờ · ${open} khung còn nhận`
    : "Hết khung giờ trong ngày này. Hãy chọn ngày khác.";

  timeSlots.innerHTML = slots.map((slot) => `
    <button type="button" role="option" class="ck-slot ${slot.label === state.time ? "is-selected" : ""}"
      data-time="${slot.label}" ${slot.disabled ? "disabled" : ""} aria-selected="${slot.label === state.time}">
      ${slot.label}
    </button>`).join("");
  renderSummary();
}

pickupDate.min = todayString();
pickupDate.max = todayString(addDays(new Date(), 7));
pickupDate.value = todayString();
renderSlots();

pickupDate.addEventListener("change", () => {
  if (!pickupDate.value || pickupDate.value < pickupDate.min) pickupDate.value = pickupDate.min;
  renderSlots();
});

timeSlots.addEventListener("click", (event) => {
  const button = event.target.closest("[data-time]");
  if (!button || button.disabled) return;
  state.time = button.dataset.time;
  renderSlots();
});

document.getElementById("pay-methods").addEventListener("change", (event) => {
  document.querySelectorAll(".ck-pay").forEach((row) => {
    row.classList.toggle("is-selected", row.contains(event.target) && event.target.checked);
  });
});

confirmButton.addEventListener("click", () => {
  if (!state.time) {
    showToast("Hãy chọn khung giờ nhận món", "error");
    return;
  }
  if (typeof readCart === "function" && readCart().length) {
    const saved = JSON.parse(localStorage.getItem("foodie_orders") || "[]");
    saved.unshift({
      id: `local-${Date.now()}`,
      title: readCart()[0].name,
      status: "pending",
    });
    localStorage.setItem("foodie_orders", JSON.stringify(saved));
  }
  showToast(`Đã ghi nhận giờ nhận ${formatDisplayDate(pickupDate.value)} lúc ${state.time}`);
});
