// --- CONSTANTS ---
export const TOTAL_SLOTS = { car: 50, bike: 50 };
const VehicleType = { CAR: 'car', BIKE: 'bike', OTHER: 'other' };
const PassType = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };


// --- MOCK DATABASE (self-contained in a closure) ---
// api.js - CORRECTED VERSION
export const api = {
    postLogin: async (username, password) => {
        const response = await fetch('/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        return await response.json();
    },
    
    getDashboardStats: async () => {
        const response = await fetch('/api/dashboard-stats/');
        return await response.json();
    },
    
    getRecentTransactions: async () => {
        const response = await fetch('/api/transactions/?limit=5');
        return await response.json();
    },
    
    getAllTransactions: async () => {
        const response = await fetch('/api/transactions/');
        return await response.json();
    },
    
    getExpiryNotifications: async () => {
        const response = await fetch('/api/expiry-notifications/');
        return await response.json();
    },
    
    getAllPasses: async () => {
        const response = await fetch('/api/passes/');
        return await response.json();
    },
    
    getSlotsData: async () => {
        const response = await fetch('/api/slots/');
        return await response.json();
    },
    
    postCreatePass: async (details) => {
        const response = await fetch('/api/create-pass/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        return await response.json();
    },
    
    postVehicleEntry: async (vehicle_number, vehicle_type) => {
        const response = await fetch('/api/vehicle-entry/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicle_number, vehicle_type }),
        });
        return await response.json();
    },
    
    postVehicleExit: async (vehicle_number) => {
        const response = await fetch('/api/vehicle-exit/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicle_number }),
        });
        return await response.json();
    },
};


// let db = getMockDatabase();


// // --- MOCK API FUNCTIONS ---
// const simulateDelay = (data) => new Promise(resolve => setTimeout(() => resolve(data), 300));

// export const api = {
//     postLogin: (username, password) => {
//         if (username === 'admin' && password === 'password') return simulateDelay({ status: 'success', message: 'Login successful!' });
//         return simulateDelay({ status: 'error', message: 'Invalid username or password.' });
//     },
//     getDashboardStats: () => {
//         const active_passes_count = db.passes.filter(p => new Date(p.expiry_date) > new Date()).length;
//         const today = new Date().toISOString().slice(0, 10);
//         const todayTransactions = db.transactions.filter(t => t.entry_time.startsWith(today));
//         const vehicles_today = new Set(todayTransactions.map(t => t.vehicle.vehicle_number)).size;
//         const earnings_today = todayTransactions.reduce((sum, t) => sum + (t.fees_paid || 0), 0);
//         const occupiedSlots = db.transactions.filter(t => t.exit_time === null).length;
//         return simulateDelay({ active_passes_count, vehicles_today, earnings_today, slots_filled: `${occupiedSlots} / ${TOTAL_SLOTS.car + TOTAL_SLOTS.bike}` });
//     },
//     getRecentTransactions: () => simulateDelay([...db.transactions].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()).slice(0, 5)),
//     getAllTransactions: () => simulateDelay([...db.transactions].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())),
//     getExpiryNotifications: () => {
//         const sevenDaysFromNow = new Date();
//         sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
//         const expiring = db.passes.filter(p => {
//             const expiry = new Date(p.expiry_date);
//             return expiry > new Date() && expiry <= sevenDaysFromNow;
//         }).map(p => {
//             const days_left = Math.ceil((new Date(p.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
//             return { pass: p, owner_name: p.vehicle.owner.name, vehicle_number: p.vehicle.vehicle_number, days_left };
//         }).sort((a, b) => a.days_left - b.days_left);
//         return simulateDelay(expiring);
//     },
//     getSlotsData: () => {
//         const parked = db.transactions.filter(t => !t.exit_time);
//         const cars_occupied = parked.filter(t => [VehicleType.CAR, VehicleType.OTHER].includes(t.vehicle.vehicle_type)).length;
//         const bikes_occupied = parked.filter(t => t.vehicle.vehicle_type === VehicleType.BIKE).length;
//         return simulateDelay({ cars_occupied, bikes_occupied });
//     },
//     postCreatePass: (details) => {
//         let owner = db.owners.find(o => o.name.toLowerCase() === details.owner_name.toLowerCase()) || (db.owners.push({ id: db.nextOwnerId++, name: details.owner_name }), db.owners[db.owners.length - 1]);
//         let vehicle = db.vehicles.find(v => v.vehicle_number === details.vehicle_number);
//         if (!vehicle) {
//             vehicle = { id: db.nextVehicleId++, owner, vehicle_number: details.vehicle_number, vehicle_type: details.vehicle_type };
//             db.vehicles.push(vehicle);
//         }
//         if (db.passes.some(p => p.vehicle.id === vehicle?.id && new Date(p.expiry_date) > new Date())) {
//             return simulateDelay({ status: 'error', message: 'Vehicle already has an active pass.' });
//         }
//         const issue_date = new Date(); let expiry_date = new Date(issue_date);
//         if (details.pass_type === PassType.DAILY) expiry_date.setDate(issue_date.getDate() + 1);
//         if (details.pass_type === PassType.WEEKLY) expiry_date.setDate(issue_date.getDate() + 7);
//         if (details.pass_type === PassType.MONTHLY) expiry_date.setMonth(issue_date.getMonth() + 1);
//         if (details.pass_type === PassType.YEARLY) expiry_date.setFullYear(issue_date.getFullYear() + 1);
//         const newPass = { id: db.nextPassId++, vehicle, pass_type: details.pass_type, issue_date: issue_date.toISOString(), expiry_date: expiry_date.toISOString() };
//         db.passes.push(newPass);
//         return simulateDelay({ status: 'success', message: `Pass for ${details.vehicle_number} created successfully!` });
//     },
//     postVehicleEntry: (vehicle_number, vehicle_type) => {
//         let vehicle = db.vehicles.find(v => v.vehicle_number === vehicle_number);
//         if (!vehicle) {
//             let guestOwner = db.owners.find(o => o.name === 'Guest') || (db.owners.push({ id: db.nextOwnerId++, name: 'Guest' }), db.owners[db.owners.length - 1]);
//             vehicle = { id: db.nextVehicleId++, owner: guestOwner, vehicle_number, vehicle_type };
//             db.vehicles.push(vehicle);
//         }
//         if (db.transactions.some(t => t.vehicle.id === vehicle?.id && !t.exit_time)) {
//             return simulateDelay({ status: 'error', message: 'Vehicle is already parked inside.' });
//         }
//         db.transactions.push({ id: db.nextTransactionId++, vehicle, entry_time: new Date().toISOString(), exit_time: null, fees_paid: null });
//         return simulateDelay({ status: 'success', message: `Vehicle ${vehicle_number} entered.` });
//     },
//     postVehicleExit: (vehicle_number) => {
//         const transaction = db.transactions.find(t => t.vehicle.vehicle_number === vehicle_number && !t.exit_time);
//         if (!transaction) return simulateDelay({ status: 'error', message: 'No active entry for this vehicle.' });
        
//         transaction.exit_time = new Date().toISOString();
//         const activePass = db.passes.some(p => p.vehicle.id === transaction.vehicle.id && new Date(p.expiry_date) > new Date());
//         let message = `Vehicle ${vehicle_number} exited.`;

//         if (!activePass) {
//             const hours = (new Date(transaction.exit_time).getTime() - new Date(transaction.entry_time).getTime()) / 36e5;
//             const rate = [VehicleType.CAR, VehicleType.OTHER].includes(transaction.vehicle.vehicle_type) ? 5.00 : 2.00;
//             const fees = Math.max(rate, Math.round(hours * rate * 100) / 100);
//             transaction.fees_paid = fees;
//             message += ` Fees: $${fees.toFixed(2)}`;
//         }
//         return simulateDelay({ status: 'success', message });
//     },
//     getAllPasses: () => simulateDelay([...db.passes].sort((a,b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())),
// };
