// === BASE CONFIG ===
const BASE_SECTION_URL = "/parking/section/";
const BASE_API_URL = "/parking/api/";

// === SELECTORS ===
const sidebarNav = document.querySelector("#sidebarNav");
const mainContent = document.querySelector("#mainContent");

// === INIT DASHBOARD ===
function initDashboard() {
  // Sidebar navigation click
  sidebarNav?.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;

    // Highlight active button
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("bg-indigo-100"));
    btn.classList.add("bg-indigo-100");

    const view = btn.dataset.view;
    if (view) setView(view);
  });

  // Refresh button
  document.querySelector("#refreshBtn")?.addEventListener("click", () => {
    const activeView = document.querySelector(".nav-btn.bg-indigo-100")?.dataset.view || "overview";
    setView(activeView);
  });

  // Default section load
  setView("overview");
}

// === LOAD SECTION VIEW ===
async function setView(viewName) {
  try {
    mainContent.innerHTML = `<div class='p-6 text-gray-500'>Loading ${viewName}...</div>`;
    const res = await fetch(`${BASE_SECTION_URL}${viewName}/`);
    if (!res.ok) throw new Error(`Failed to load ${viewName}`);
    const html = await res.text();
    mainContent.innerHTML = html;

    // Trigger JS for section
    switch (viewName) {
      case "overview": loadDashboardOverview(); break;
      case "entry-exit": loadEntryExitView(); break;
      case "create-pass": loadCreatePassView(); break;
      case "manage-passes": loadManagePassesView(); break;
      case "pass-history": loadPassHistoryView(); break;
      case "available-slots": loadSlotsView(); break;
      case "transactions": loadTransactionsView(); break;
      case "expiry-alerts": loadExpiryAlertsView(); break;
    }
  } catch (err) {
    console.error(err);
    mainContent.innerHTML = `<div class='text-red-500 p-6'>Error loading section.</div>`;
  }
}

// === DASHBOARD OVERVIEW ===
async function loadDashboardOverview() {
  const token = localStorage.getItem("authToken");
  const res = await fetch(`${BASE_API_URL}dashboard/stats/`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) return console.error("Failed to load dashboard stats");
  const data = await res.json();

  // Update Stats
  const cards = document.querySelectorAll(".stat-card .value");
  if (cards.length >= 4) {
    cards[0].textContent = data.active_passes_count ?? 0;
    cards[1].textContent = data.vehicles_today ?? 0;
    cards[2].textContent = `₹${data.earnings_today ?? 0}`;
    cards[3].textContent = data.slots_filled ?? "0 / 100";
  }

  // Load recent transactions
  const txnRes = await fetch(`${BASE_API_URL}transactions/recent/`, {
    headers: { Authorization: `Token ${token}` },
  });
  const txnData = await txnRes.json();

  const txnList = document.querySelector("#recentTransactionsList");
  txnList.innerHTML = txnData.length
    ? txnData.map(
        (t) => `
      <div class="border-b py-2 flex justify-between text-sm">
        <span>${t.vehicle_number}</span>
        <span>₹${t.fees_paid || 0}</span>
      </div>`
      ).join("")
    : "<p class='text-gray-400 text-sm'>No recent transactions.</p>";
}

// === OTHER SECTIONS ===
function loadEntryExitView() {
  console.log("Entry/Exit Section Loaded");
}
function loadCreatePassView() {
  console.log("Create Pass Loaded");
}
function loadManagePassesView() {
  console.log("Manage Passes Loaded");
}
function loadPassHistoryView() {
  console.log("Pass History Loaded");
}
function loadSlotsView() {
  console.log("Slots Loaded");
}
function loadTransactionsView() {
  console.log("Transactions Loaded");
}
function loadExpiryAlertsView() {
  console.log("Expiry Alerts Loaded");
}

// === INITIALIZE ===
document.addEventListener("DOMContentLoaded", initDashboard);

