// ===============================
// Parking Management Dashboard JS
// ===============================

// --- Base URLs ---
const BASE_API = "/parking/api/";
const BASE_SECTION = "/parking/section/";

// --- Elements ---
const mainContent = document.querySelector("#mainContent");
const sidebarNav = document.querySelector("#sidebarNav");

// --- On Load ---
document.addEventListener("DOMContentLoaded", () => {
  attachSidebarListeners();
  setView("overview");
});

// ===================================================
// ============== NAVIGATION / SECTION LOADER =========
// ===================================================
function attachSidebarListeners() {
  sidebarNav?.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;

    sidebarNav.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("nav-active"));
    btn.classList.add("nav-active");

    const view = btn.dataset.view;
    if (view) setView(view);
  });
}

async function setView(viewName) {
  mainContent.innerHTML = `<div class='p-6 text-gray-500'>Loading ${viewName}...</div>`;

  try {
    const res = await fetch(`${BASE_SECTION}${viewName}/`);
    const html = await res.text();
    if (res.ok) {
      mainContent.innerHTML = html;
      initSection(viewName);
    } else {
      mainContent.innerHTML = `<div class='text-red-500 p-6'>Section not found</div>`;
    }
  } catch (err) {
    console.error(err);
    mainContent.innerHTML = `<div class='text-red-500 p-6'>Error loading section</div>`;
  }
}

// ===================================================
// ============== SECTION INITIALIZERS ===============
// ===================================================
function initSection(viewName) {
  switch (viewName) {
    case "overview": loadOverview(); break;
    case "entry-exit": setupEntryExit(); break;
    case "create-pass": setupCreatePass(); break;
    case "manage-passes": loadManagePasses(); break;
    case "pass-history": loadPassHistory(); break;
    case "available-slots": loadSlots(); break;
    case "transactions": loadTransactions(); break;
    case "expiry-alerts": loadExpiryAlerts(); break;
  }
}

// ===================================================
// ================== HELPERS ========================
// ===================================================
function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };
}
function showMessage(id, msg, color = "text-green-600") {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<span class="${color}">${msg}</span>`;
}

// ===================================================
// ================== 1. OVERVIEW ====================
// ===================================================
async function loadOverview() {
  try {
    const [statsRes, txnRes, expRes] = await Promise.all([
      fetch(`${BASE_API}dashboard/stats/`, { headers: authHeaders() }),
      fetch(`${BASE_API}transactions/recent/`, { headers: authHeaders() }),
      fetch(`${BASE_API}expiry/notifications/`, { headers: authHeaders() }),
    ]);

    const stats = await statsRes.json();
    document.querySelectorAll(".stat-card .value")[0].textContent = stats.active_passes_count ?? 0;
    document.querySelectorAll(".stat-card .value")[1].textContent = stats.vehicles_today ?? 0;
    document.querySelectorAll(".stat-card .value")[2].textContent = `₹${stats.earnings_today ?? 0}`;
    document.querySelectorAll(".stat-card .value")[3].textContent = stats.slots_filled ?? "0 / 100";

    // Recent transactions
    const txns = await txnRes.json();
    const txnDiv = document.getElementById("recentTransactionsList");
    txnDiv.innerHTML = txns.length
      ? txns.map(
          (t) => `<div class="flex justify-between border-b py-2 text-sm">
                  <span>${t.vehicle.vehicle_number || t.vehicle_number}</span>
                  <span>₹${t.fees_paid || 0}</span></div>`
        ).join("")
      : "<p class='text-gray-400 text-sm'>No transactions today</p>";

    // Expiry notifications
    const exps = await expRes.json();
    const expDiv = document.getElementById("upcomingExpiries");
    expDiv.innerHTML = exps.length
      ? exps.map(
          (e) => `<div class="border-b py-2">
                    <div class="font-semibold">${e.vehicle_number}</div>
                    <div class="text-sm text-gray-500">${e.days_left} days left</div>
                  </div>`
        ).join("")
      : "<p class='text-gray-400 text-sm'>No upcoming expiries</p>";

  } catch (err) {
    console.error("Overview load error:", err);
  }
}

// ===================================================
// ================== 2. ENTRY / EXIT ================
// ===================================================
function setupEntryExit() {
  document.getElementById("btnEntry")?.addEventListener("click", () => sendEntryExit("entry"));
  document.getElementById("btnExit")?.addEventListener("click", () => sendEntryExit("exit"));
}

async function sendEntryExit(action) {
  const vehicle_no = document.getElementById("ev_vehicleNumber")?.value.trim();
  const vehicle_type = document.getElementById("ev_vehicleType")?.value;
  if (!vehicle_no) return showMessage("ev_feedback", "Enter vehicle number", "text-red-600");

  try {
    const res = await fetch(`${BASE_API}entry-exit/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ vehicle_no, vehicle_type, action }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage("ev_feedback", data.message || "Success!");
      refreshAll();
    } else {
      showMessage("ev_feedback", data.error || "Error occurred", "text-red-600");
    }
  } catch (e) {
    showMessage("ev_feedback", "Network error", "text-red-600");
  }
}

// ===================================================
// ================== 3. CREATE PASS =================
// ===================================================
function setupCreatePass() {
  document.getElementById("btnCreatePass")?.addEventListener("click", createPass);
}

async function createPass() {
  const owner_name = document.getElementById("cp_ownerName")?.value.trim();
  const vehicle_no = document.getElementById("cp_vehicleNo")?.value.trim();
  const vehicle_type = document.getElementById("cp_vehicleType")?.value;
  const pass_type = document.getElementById("cp_passType")?.value;

  if (!owner_name || !vehicle_no)
    return showMessage("cp_feedback", "All fields required", "text-red-600");

  try {
    const res = await fetch(`${BASE_API}create-pass/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ owner_name, vehicle_no, vehicle_type, pass_type }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage("cp_feedback", data.message || "Pass created!");
      refreshAll();
    } else {
      showMessage("cp_feedback", data.error || "Failed", "text-red-600");
    }
  } catch {
    showMessage("cp_feedback", "Network error", "text-red-600");
  }
}

// ===================================================
// ================== 4. MANAGE PASSES ===============
// ===================================================
async function loadManagePasses() {
  const div = document.getElementById("managePassesList");
  try {
    const res = await fetch(`${BASE_API}passes/`, { headers: authHeaders() });
    if (!res.ok) return (div.innerHTML = "Cannot load passes");
    const passes = await res.json();
    div.innerHTML = passes.length
      ? passes.map(
          (p) => `<div class="border-b py-2">
                    <div class="font-medium">${p.vehicle.vehicle_number}</div>
                    <div class="text-xs text-gray-500">${p.pass_type} | Expires: ${new Date(p.expiry_date).toLocaleDateString()}</div>
                  </div>`
        ).join("")
      : "<p class='text-gray-400 text-sm'>No passes</p>";
  } catch {
    div.innerHTML = "Error loading passes";
  }
}

// ===================================================
// ================== 5. PASS HISTORY ================
// ===================================================
async function loadPassHistory() {
  const div = document.getElementById("passHistoryList");
  try {
    const res = await fetch(`${BASE_API}passes/`, { headers: authHeaders() });
    const passes = await res.json();
    div.innerHTML = passes.length
      ? passes.map(
          (p) => `<div class="border-b py-2">
                    <div class="font-medium">${p.vehicle.vehicle_number}</div>
                    <div class="text-xs text-gray-500">${p.pass_type} | ${new Date(p.issue_date).toLocaleString()}</div>
                  </div>`
        ).join("")
      : "<p class='text-gray-400 text-sm'>No history</p>";
  } catch {
    div.innerHTML = "Error fetching history";
  }
}

// ===================================================
// ================== 6. AVAILABLE SLOTS =============
// ===================================================
async function loadSlots() {
  try {
    const res = await fetch(`${BASE_API}slots/`, { headers: authHeaders() });
    const data = await res.json();
    document.getElementById("carSlots").textContent = `${data.cars.available} free`;
    document.getElementById("bikeSlots").textContent = `${data.bikes.available} free`;
    document.getElementById("carBar").style.width = `${(data.cars.occupied / data.cars.total) * 100}%`;
    document.getElementById("bikeBar").style.width = `${(data.bikes.occupied / data.bikes.total) * 100}%`;
  } catch (e) {
    console.error("Slots error:", e);
  }
}

// ===================================================
// ================== 7. TRANSACTIONS ================
// ===================================================
async function loadTransactions() {
  const div = document.getElementById("transactionsList");
  try {
    const res = await fetch(`${BASE_API}transactions/`, { headers: authHeaders() });
    const txns = await res.json();
    div.innerHTML = txns.length
      ? `<table class="w-full text-sm">
          <thead><tr><th>Vehicle</th><th>Entry</th><th>Exit</th><th>Fee</th><th>Status</th></tr></thead>
          <tbody>${txns
            .map(
              (t) => `<tr>
                      <td>${t.vehicle.vehicle_number}</td>
                      <td>${new Date(t.entry_time).toLocaleString()}</td>
                      <td>${t.exit_time ? new Date(t.exit_time).toLocaleString() : "-"}</td>
                      <td>₹${t.fees_paid || 0}</td>
                      <td>${t.status}</td>
                    </tr>`
            )
            .join("")}</tbody></table>`
      : "<p class='text-gray-400 text-sm'>No transactions</p>";
  } catch {
    div.innerHTML = "Error loading transactions";
  }
}

// ===================================================
// ================== 8. EXPIRY ALERTS ===============
// ===================================================
async function loadExpiryAlerts() {
  const div = document.getElementById("expiryAlertsList");
  try {
    const res = await fetch(`${BASE_API}expiry/notifications/`, { headers: authHeaders() });
    const alerts = await res.json();
    div.innerHTML = alerts.length
      ? alerts.map(
          (a) => `<div class="border-b py-2">
                    <div class="font-medium">${a.vehicle_number}</div>
                    <div class="text-xs text-gray-500">${a.days_left} days left</div>
                  </div>`
        ).join("")
      : "<p class='text-gray-400 text-sm'>No upcoming expiries</p>";
  } catch {
    div.innerHTML = "Error fetching expiry alerts";
  }
}

// ===================================================
// =============== AUTO REFRESH AFTER ACTION =========
// ===================================================
function refreshAll() {
  if (document.querySelector(".nav-active")?.dataset.view === "overview") loadOverview();
  loadTransactions();
  loadSlots();
  loadManagePasses();
}
