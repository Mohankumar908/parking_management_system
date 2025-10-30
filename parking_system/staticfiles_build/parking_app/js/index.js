document.addEventListener('DOMContentLoaded', () => {
    // Helper to get CSRF token from meta tag
    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]') ?
               document.querySelector('meta[name="csrf-token"]').getAttribute('content') :
               '';
    }

    // Helper for AJAX requests
    async function fetchData(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest', // Important for Django
            },
        };

        if (method !== 'GET' && method !== 'HEAD') {
            options.headers['X-CSRFToken'] = getCsrfToken();
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Fetch error:", error);
            throw error; // Re-throw to be handled by calling function
        }
    }

    // --- Login Page Logic ---
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetchData('/api/login/', 'POST', { username, password });
                if (response.status === 'success') {
                    loginMessage.className = 'message success';
                    loginMessage.textContent = 'Login successful! Redirecting...';
                    window.location.href = '/dashboard/'; // Redirect to dashboard
                } else {
                    loginMessage.className = 'message error';
                    loginMessage.textContent = response.message || 'Login failed.';
                }
            } catch (error) {
                loginMessage.className = 'message error';
                loginMessage.textContent = error.message || 'An error occurred during login.';
            }
        });
    }

    // --- Dashboard Page Logic ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetchData('/api/logout/', 'POST'); // Changed to POST for logout API
                if (response.status === 'success') {
                    window.location.href = '/login/'; // Redirect to login page
                } else {
                    alert(response.message || 'Logout failed.');
                }
            } catch (error) {
                alert('An error occurred during logout: ' + error.message);
            }
        });
    }

    // Function to display messages in specific sections
    function displayMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `message ${type}`;
        }
    }

    // Load Dashboard Stats
    async function loadDashboardStats() {
        try {
            const stats = await fetchData('/api/dashboard_stats/');
            document.getElementById('activePassesCount').textContent = stats.active_passes_count;
            document.getElementById('vehiclesToday').textContent = stats.vehicles_today;
            document.getElementById('earningsToday').textContent = `$${stats.earnings_today.toFixed(2)}`;
            document.getElementById('slotsFilled').textContent = stats.slots_filled;
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            document.getElementById('activePassesCount').textContent = 'Error';
            document.getElementById('vehiclesToday').textContent = 'Error';
            document.getElementById('earningsToday').textContent = 'Error';
            document.getElementById('slotsFilled').textContent = 'Error';
        }
    }

    // Load Transactions
    async function loadTransactions() {
        try {
            const transactions = await fetchData('/api/transactions/?limit=10'); // Get last 10 transactions
            const tableBody = document.querySelector('#transactionsTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows

            transactions.forEach(t => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = t.vehicle.vehicle_number;
                row.insertCell().textContent = t.vehicle.owner.name;
                row.insertCell().textContent = t.vehicle.vehicle_type;
                row.insertCell().textContent = new Date(t.entry_time).toLocaleString();
                row.insertCell().textContent = t.exit_time ? new Date(t.exit_time).toLocaleString() : 'N/A';
                row.insertCell().textContent = t.fees_paid !== null ? `$${t.fees_paid.toFixed(2)}` : 'N/A';
            });
        } catch (error) {
            console.error('Failed to load transactions:', error);
            const tableBody = document.querySelector('#transactionsTable tbody');
            tableBody.innerHTML = '<tr><td colspan="6">Error loading transactions.</td></tr>';
        }
    }

    // Load Expiring Passes
    async function loadExpiringPasses() {
        try {
            const passes = await fetchData('/api/expiry_notifications/');
            const tableBody = document.querySelector('#expiringPassesTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows

            if (passes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No passes expiring soon.</td></tr>';
                return;
            }

            passes.forEach(p => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = p.owner_name;
                row.insertCell().textContent = p.vehicle_number;
                row.insertCell().textContent = p.pass_type;
                row.insertCell().textContent = new Date(p.expiry_date).toLocaleDateString();
                row.insertCell().textContent = `${p.days_left} day(s)`;
            });
        } catch (error) {
            console.error('Failed to load expiring passes:', error);
            const tableBody = document.querySelector('#expiringPassesTable tbody');
            tableBody.innerHTML = '<tr><td colspan="5">Error loading expiring passes.</td></tr>';
        }
    }

    // Load Slot Data
    async function loadSlotsData() {
        try {
            const data = await fetchData('/api/slots_data/');
            document.getElementById('carsOccupied').textContent = data.cars_occupied;
            document.getElementById('bikesOccupied').textContent = data.bikes_occupied;
            document.getElementById('carSlotsTotal').textContent = data.car_slots_total;
            document.getElementById('bikeSlotsTotal').textContent = data.bike_slots_total;

            const carProgressBar = document.getElementById('carProgressBar');
            const bikeProgressBar = document.getElementById('bikeProgressBar');

            const carPercentage = data.car_slots_total > 0 ? (data.cars_occupied / data.car_slots_total) * 100 : 0;
            const bikePercentage = data.bike_slots_total > 0 ? (data.bikes_occupied / data.bike_slots_total) * 100 : 0;

            carProgressBar.style.width = `${carPercentage}%`;
            bikeProgressBar.style.width = `${bikePercentage}%`;

            // Optionally change color based on occupancy
            carProgressBar.style.backgroundColor = carPercentage > 80 ? '#e74c3c' : '#3498db';
            bikeProgressBar.style.backgroundColor = bikePercentage > 80 ? '#e74c3c' : '#3498db';

        } catch (error) {
            console.error('Failed to load slot data:', error);
            // Fallback for error state
            document.getElementById('carsOccupied').textContent = 'Error';
            document.getElementById('bikesOccupied').textContent = 'Error';
            document.getElementById('carSlotsTotal').textContent = 'Error';
            document.getElementById('bikeSlotsTotal').textContent = 'Error';
        }
    }

    // --- Action Button Handlers ---
    const entryBtn = document.getElementById('entryBtn');
    if (entryBtn) {
        entryBtn.addEventListener('click', async () => {
            const vehicleNumber = document.getElementById('entryVehicleNumber').value.trim();
            const vehicleType = document.getElementById('entryVehicleType').value;
            if (!vehicleNumber) {
                displayMessage('entryMessage', 'Please enter a vehicle number.', 'error');
                return;
            }
            try {
                const response = await fetchData('/api/vehicle_entry/', 'POST', { vehicle_number: vehicleNumber, vehicle_type: vehicleType });
                displayMessage('entryMessage', response.message, 'success');
                document.getElementById('entryVehicleNumber').value = ''; // Clear input
                refreshDashboardData(); // Refresh all data
            } catch (error) {
                displayMessage('entryMessage', error.message || 'Error recording entry.', 'error');
            }
        });
    }

    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', async () => {
            const vehicleNumber = document.getElementById('exitVehicleNumber').value.trim();
            if (!vehicleNumber) {
                displayMessage('exitMessage', 'Please enter a vehicle number.', 'error');
                return;
            }
            try {
                const response = await fetchData('/api/vehicle_exit/', 'POST', { vehicle_number: vehicleNumber });
                displayMessage('exitMessage', response.message, 'success');
                document.getElementById('exitVehicleNumber').value = ''; // Clear input
                refreshDashboardData(); // Refresh all data
            } catch (error) {
                displayMessage('exitMessage', error.message || 'Error recording exit.', 'error');
            }
        });
    }

    const createPassBtn = document.getElementById('createPassBtn');
    if (createPassBtn) {
        createPassBtn.addEventListener('click', async () => {
            const ownerName = document.getElementById('passOwnerName').value.trim();
            const vehicleNumber = document.getElementById('passVehicleNumber').value.trim();
            const vehicleType = document.getElementById('passVehicleType').value;
            const passType = document.getElementById('passType').value;

            if (!ownerName || !vehicleNumber || !passType) {
                displayMessage('passMessage', 'Please fill all pass details.', 'error');
                return;
            }

            try {
                const response = await fetchData('/api/create_pass/', 'POST', {
                    owner_name: ownerName,
                    vehicle_number: vehicleNumber,
                    vehicle_type: vehicleType,
                    pass_type: passType
                });
                displayMessage('passMessage', response.message, 'success');
                document.getElementById('passOwnerName').value = '';
                document.getElementById('passVehicleNumber').value = '';
                // No need to clear vehicle type or pass type dropdowns
                refreshDashboardData(); // Refresh all data
            } catch (error) {
                displayMessage('passMessage', error.message || 'Error creating pass.', 'error');
            }
        });
    }

    // Function to refresh all dashboard data
    function refreshDashboardData() {
        if (document.querySelector('.dashboard-stats')) { // Only run if on dashboard page
            loadDashboardStats();
            loadTransactions();
            loadExpiringPasses();
            loadSlotsData();
        }
    }

    // Initial load for dashboard if elements exist
    if (document.querySelector('.dashboard-stats')) {
        refreshDashboardData();
        // Set up interval to refresh some data periodically (e.g., every 30 seconds)
        setInterval(refreshDashboardData, 30000);
    }
});