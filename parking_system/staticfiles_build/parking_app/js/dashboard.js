// ===============================
// 🚗 Parking Management Dashboard
// ===============================

const BASE_URL = "http://127.0.0.1:8000/api";
let token = localStorage.getItem("authToken") || null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const logoutButton = document.getElementById("logoutButton");

  navButtons.forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  logoutButton.addEventListener("click", handleLogout);

  setView("dashboard");
}

// ===============================
// 🔐 AUTH
// ===============================
async function handleLogout() {
  try {
    await fetch(`${BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: { "Authorization": `Token ${token}` },
    });
  } catch (e) { console.error(e); }
  localStorage.removeItem("authToken");
  window.location.href = "/login/";
}

// ===============================
// 🔐 AUTH LOGOUT
// ===============================
async function handleLogout() {
  try {
    await fetch("http://127.0.0.1:8000/api/auth/logout/", {
      method: "POST",
      headers: {
        "Authorization": `Token ${localStorage.getItem("authToken")}`,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("Logout failed:", e);
  } finally {
    localStorage.removeItem("authToken");
    window.location.href = "/login/";
  }
}

// ===============================
// 🧩 VIEW MANAGEMENT
// ===============================
async function setView(view) {
  const viewContainer = document.getElementById("viewContainer");
  switch (view) {
    case "dashboard":
      await loadDashboard(viewContainer);
      break;
    case "vehicles":
      await loadVehicles(viewContainer);
      break;
    case "passes":
      await loadPasses(viewContainer);
      break;
    case "transactions":
      await loadTransactions(viewContainer);
      break;
  }
}

// ===============================
// ⚙️ HELPERS
// ===============================
async function fetchData(endpoint, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  if (!res.ok) throw new Error(`API Error ${res.status}`);
  return res.json();
}

function showMessage(msg, type = "info") {
  const alertBox = document.getElementById("alertBox");
  if (alertBox) {
    alertBox.innerHTML = `<div class="p-3 rounded text-white ${type === "error" ? "bg-red-500" : "bg-green-500"}">${msg}</div>`;
    setTimeout(() => (alertBox.innerHTML = ""), 3000);
  } else {
    alert(msg);
  }
}

// ===============================
// 📊 DASHBOARD VIEW
// ===============================
async function loadDashboard(container) {
  const stats = await fetchData("/dashboard-stats/");
  const slots = await fetchData("/available-slots/");
  const expiring = await fetchData("/passes/expiring/");

  container.innerHTML = `
    <h1 class="text-2xl font-bold">Dashboard Overview</h1>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div class="card"><h2 class="text-gray-600">Active Passes</h2><p class="text-3xl font-bold">${stats.active_passes_count}</p></div>
      <div class="card"><h2 class="text-gray-600">Vehicles Today</h2><p class="text-3xl font-bold">${stats.vehicles_today}</p></div>
      <div class="card"><h2 class="text-gray-600">Earnings</h2><p class="text-3xl font-bold">₹${stats.earnings_today}</p></div>
    </div>

    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-gray-700 mb-2 font-semibold">Slots Status</h2>
        <p>Cars: ${slots.cars_occupied}/${slots.total_car_slots}</p>
        <p>Bikes: ${slots.bikes_occupied}/${slots.total_bike_slots}</p>
      </div>
      <div class="card">
        <h2 class="text-gray-700 mb-2 font-semibold">Passes Expiring Soon</h2>
        ${expiring.length ? expiring.map(p => `
          <p>🚨 ${p.vehicle_number} (${p.owner_name}) - ${p.days_left} days left</p>
        `).join("") : "<p>✅ No expiring passes</p>"}
      </div>
    </div>
  `;
}

// ===============================
// 🚘 VEHICLES VIEW
// ===============================
async function loadVehicles(container) {
  const data = await fetchData("/vehicles/");
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">Registered Vehicles</h1>
    <table class="min-w-full bg-white rounded shadow">
      <thead class="table-header"><tr>
        <th class="p-2">Owner</th><th>Vehicle No</th><th>Type</th>
      </tr></thead>
      <tbody>
        ${data.map(v => `
          <tr class="table-row border-b">
            <td class="p-2">${v.owner.name}</td>
            <td>${v.vehicle_number}</td>
            <td>${v.vehicle_type}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ===============================
// 🎫 PASSES VIEW
// ===============================
async function loadPasses(container) {
  const data = await fetchData("/passes/");
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">All Passes</h1>
    <table class="min-w-full bg-white rounded shadow">
      <thead class="table-header">
        <tr><th>Vehicle</th><th>Type</th><th>Issued</th><th>Expiry</th></tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr class="table-row border-b">
            <td class="p-2">${p.vehicle.vehicle_number}</td>
            <td>${p.pass_type}</td>
            <td>${new Date(p.issue_date).toLocaleDateString()}</td>
            <td>${new Date(p.expiry_date).toLocaleDateString()}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ===============================
// 💰 TRANSACTIONS VIEW
// ===============================
async function loadTransactions(container) {
  const data = await fetchData("/transactions/");
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">Transaction History</h1>
    <table class="min-w-full bg-white rounded shadow">
      <thead class="table-header"><tr>
        <th class="p-2">Vehicle</th><th>Owner</th><th>Amount</th><th>Date</th>
      </tr></thead>
      <tbody>
        ${data.map(t => `
          <tr class="table-row border-b">
            <td class="p-2">${t.vehicle.vehicle_number}</td>
            <td>${t.owner.name}</td>
            <td>₹${t.amount}</td>
            <td>${new Date(t.timestamp).toLocaleString()}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}
