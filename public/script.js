const API_URL = '/api/escalations';

// State
const CONFIG = {
    branches: ["BLR", "AP", "CHN", "DELHI", "HYD", "MP", "MUM_THN", "PUNE", "RAJ", "RO KAR", "RO TEL", "RO TN", "ROM", "UP (EAST)", "UP (WEST)", "UP", "WB"],
    storageKey: "escalation_dashboard_v1" // Keeping for auth, though data is now in DB
};
let appState = {
    user: null,
    data: [],
    charts: {}
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('fDate');
    if (dateField) dateField.value = today;

    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) currentDateEl.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Populate Branch Select
    const bSel = document.getElementById('fBranch');
    if (bSel) {
        CONFIG.branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b; opt.innerText = b;
            bSel.appendChild(opt);
        });
    }

    // Check Auth (simple simulation)
    const savedUser = sessionStorage.getItem('appUser');
    if (savedUser) {
        appState.user = JSON.parse(savedUser);
        loadApp();
    }
});

// Auth Functions
function handleLogin() {
    const u = document.getElementById('loginUser').value.trim().toUpperCase();
    const p = document.getElementById('loginPass').value;
    const err = document.getElementById('loginError');

    if ((u === "ADMIN" && p === "1234") || (p === "456" && CONFIG.branches.includes(u))) {
        appState.user = { role: u, name: u === "ADMIN" ? "Administrator" : `Branch Manager (${u})` };
        sessionStorage.setItem('appUser', JSON.stringify(appState.user));
        loadApp();
    } else {
        err.style.display = 'block';
        shake(document.querySelector('.login-card'));
    }
}

function logout() {
    sessionStorage.removeItem('appUser');
    location.reload();
}

function loadApp() {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('app');

    if (loginScreen) loginScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');

    document.getElementById('userName').innerText = appState.user.role;
    document.getElementById('userAvatar').innerText = appState.user.role[0];

    // If not admin, restrict branch selection
    const bSel = document.getElementById('fBranch');
    const bFilter = document.getElementById('branchFilter');

    // Populate Filter
    if (bFilter && bFilter.options.length <= 1) { // Prevent duplicates
        CONFIG.branches.forEach(b => {
            bFilter.add(new Option(b, b));
        });
    }

    if (appState.user.role !== "ADMIN") {
        if (bSel) {
            bSel.value = appState.user.role;
            bSel.disabled = true;
        }

        // Hide or lock branch filter for non-admins
        if (bFilter) {
            bFilter.value = appState.user.role;
            bFilter.style.display = 'none';
        }
    }

    loadData();
    initCharts();
}

// Data Functions
async function loadData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        appState.data = data;

        renderTable();
        updateStats();
        updateCharts();
    } catch (error) {
        console.error("Error loading data:", error);
        showToast("Error loading data from server", "error");
        appState.data = [];
        renderTable();
    }
}

async function createEscalation(data) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Unknown server error' }));
            throw new Error(err.message || `Server error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Could not connect to the server. Please ensure the backend is running.');
        }
        throw error;
    }
}

async function updateEscalation(id, data) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Unknown server error' }));
            throw new Error(err.message || `Server error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Could not connect to the server. Please ensure the backend is running.');
        }
        throw error;
    }
}

async function saveEntry() {
    const editId = document.getElementById('fEditingId').value;
    const form = {
        date: document.getElementById('fDate').value,
        id: document.getElementById('fId').value,
        branch: document.getElementById('fBranch').value,
        brand: document.getElementById('fBrand').value,
        reason: document.getElementById('fReason').value,
        city: document.getElementById('fCity').value,
        aging: parseInt(document.getElementById('fAging').value) || 0,
        status: document.getElementById('fStatus').value,
        remark: document.getElementById('fRemark').value,
    };

    try {
        if (editId) {
            await updateEscalation(editId, form);
            showToast("Data updated successfully", "success");
        } else {
            await createEscalation(form);
            showToast("Data saved successfully", "success");
        }
        closeModal();
        document.getElementById('escForm').reset();

        // Reset defaults
        document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
        if (appState.user.role !== "ADMIN") document.getElementById('fBranch').value = appState.user.role;

        loadData(); // Reload to get new ID/data

    } catch (error) {
        console.error("Error saving data:", error);
        showToast(`Save failed: ${error.message}`, "error");
    }
}

async function deleteRow(id) {
    if (confirm("Are you sure you want to delete this case?")) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete');

            showToast("Case deleted successfully", "success");
            loadData();
        } catch (error) {
            console.error("Error deleting data:", error);
            showToast("Error deleting case", "error");
        }
    }
}

function editRow(id) {
    const row = appState.data.find(d => d._id === id);
    if (!row) return;

    document.getElementById('modalTitle').innerText = "Edit Case";
    document.getElementById('fEditingId').value = row._id;
    document.getElementById('fDate').value = row.date;
    document.getElementById('fId').value = row.id;
    document.getElementById('fBranch').value = row.branch;
    document.getElementById('fBrand').value = row.brand || "";
    document.getElementById('fCity').value = row.city || "";
    document.getElementById('fReason').value = row.reason || "";
    document.getElementById('fAging').value = row.aging;
    document.getElementById('fStatus').value = row.status;
    document.getElementById('fRemark').value = row.remark || "";

    openModal();
}

async function confirmClear() {
    if (confirm("CRITICAL: Are you sure you want to DELETE ALL records from the database? This cannot be undone.")) {
        try {
            const response = await fetch(`${API_URL}/all`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to clear data');

            showToast("All data cleared successfully", "success");
            loadData();
        } catch (error) {
            console.error("Error clearing data:", error);
            showToast("Error clearing data: " + error.message, "error");
        }
    }
}

// Import Functions
function handleImport(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        reader.onload = function (e) {
            const text = e.target.result;
            try {
                processCSV(text);
                input.value = ''; // Reset input
            } catch (err) {
                showToast("Error importing CSV: " + err.message, "error");
                console.error(err);
            }
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            try {
                processExcel(data);
                input.value = ''; // Reset input
            } catch (err) {
                showToast("Error importing Excel: " + err.message, "error");
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        showToast("Unsupported file type. Please upload .csv or .xlsx", "error");
        input.value = '';
    }
}

// Helper for header mapping
const HEADER_MAP = {
    "date": "date", "date logged": "date", "logged date": "date",
    "id": "id", "reference id": "id", "case id": "id", "id": "id",
    "branch": "branch", "location": "branch", "branch / location": "branch",
    "brand": "brand", "model": "brand", "brand / model": "brand", "product": "brand",
    "reason": "reason", "issue": "reason", "primary issue": "reason", "reason": "reason",
    "city": "city", "region": "city", "location": "city",
    "aging": "aging", "aging (days)": "aging", "days": "aging",
    "status": "status", "current status": "status",
    "remark": "remark", "remarks": "remark", "technician remarks": "remark", "note": "remark"
};

async function processExcel(data) {
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of objects
        // Header row is assumed to be the first row
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) return showToast("Excel is empty or invalid", "error");

        const fileHeaders = rows[0].map(h => String(h || "").trim().toLowerCase());
        const colMap = {};

        // Map detected headers to our keys
        fileHeaders.forEach((h, idx) => {
            if (HEADER_MAP[h]) colMap[HEADER_MAP[h]] = idx;
        });

        let successCount = 0;
        const required = ["date", "id", "branch"];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const entry = {};
            Object.keys(HEADER_MAP).forEach(key => {
                const targetKey = HEADER_MAP[key];
                if (colMap[targetKey] !== undefined) {
                    let val = row[colMap[targetKey]];
                    // Handle date conversion if it's an Excel date number
                    if (targetKey === 'date' && typeof val === 'number') {
                        // Try to format it as a string date YYYY-MM-DD
                        const date = XLSX.utils.format_cell({ v: val, t: 'd' });
                        entry[targetKey] = date;
                    } else {
                        entry[targetKey] = val !== undefined && val !== null ? String(val).trim() : "";
                    }
                }
            });

            // Ensure basics
            if (!entry.date || !entry.id || !entry.branch) continue;

            // Validate and Type Convert
            entry.aging = parseInt(entry.aging) || 0;

            // Permission Check
            if (appState.user.role !== "ADMIN" && entry.branch !== appState.user.role) {
                continue; // Skip rows not belonging to user
            }

            try {
                await createEscalation(entry);
                successCount++;
            } catch (e) {
                console.error("Failed to import row:", entry, e);
            }
        }

        if (successCount > 0) {
            showToast(`Imported ${successCount} cases successfully`, "success");
            loadData(); // This updates table, stats, and charts
        } else {
            showToast("No valid rows imported or headers mismatch", "warning");
        }
    } catch (err) {
        showToast("Error processing Excel file", "error");
        console.error(err);
    }
}

async function processCSV(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    if (lines.length < 2) return showToast("CSV is empty or invalid", "error");

    const fileHeaders = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const colMap = {};
    fileHeaders.forEach((h, idx) => {
        if (HEADER_MAP[h]) colMap[HEADER_MAP[h]] = idx;
    });

    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let cols = [];

        // Simple regex for CSV parsing (handles quotes)
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (matches) {
            cols = matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
        } else {
            cols = line.split(",");
        }

        const entry = {};
        Object.keys(HEADER_MAP).forEach(key => {
            const targetKey = HEADER_MAP[key];
            if (colMap[targetKey] !== undefined) {
                entry[targetKey] = cols[colMap[targetKey]] ? cols[colMap[targetKey]].trim() : "";
            }
        });

        if (!entry.date || !entry.id || !entry.branch) continue;
        // Validate and Type Convert
        entry.aging = parseInt(entry.aging) || 0;

        // Permission Check
        if (appState.user.role !== "ADMIN" && entry.branch !== appState.user.role) {
            continue; // Skip rows not belonging to user
        }

        try {
            await createEscalation(entry);
            successCount++;
        } catch (e) {
            console.error("Failed to import row:", entry, e);
        }
    }

    if (successCount > 0) {
        showToast(`Imported ${successCount} cases successfully`, "success");
        loadData();
    } else {
        showToast("No valid rows imported", "warning");
    }
}

// UI Functions
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const branchFilter = document.getElementById('branchFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const agingFilter = document.getElementById('agingFilter').value;

    tbody.innerHTML = '';

    let filtered = appState.data;

    // Role Filtering (Base security)
    if (appState.user && appState.user.role !== "ADMIN") {
        filtered = filtered.filter(d => d.branch === appState.user.role);
    }

    // Search & Filters
    filtered = filtered.filter(d => {
        const matchesSearch = Object.values(d).some(v => String(v).toLowerCase().includes(search));
        const matchesStatus = statusFilter === "" || d.status === statusFilter;
        const matchesBranch = branchFilter === "" || d.branch === branchFilter;
        const matchesDate = dateFilter === "" || d.date === dateFilter;

        let matchesAging = true;
        if (agingFilter === "0-5") matchesAging = d.aging <= 5;
        else if (agingFilter === "6-10") matchesAging = d.aging >= 6 && d.aging <= 10;
        else if (agingFilter === "11+") matchesAging = d.aging > 10;

        return matchesSearch && matchesStatus && matchesBranch && matchesDate && matchesAging;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 4rem 2rem; color: var(--text-muted);">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🔍</div>
            <p style="font-size: 1.1rem; font-weight: 500;">No records found</p>
            <p style="font-size: 0.9rem;">Try adjusting your filters or search query.</p>
         </td></tr>`;
        return;
    }

    filtered.forEach((row) => {
        // Use _id for deletion
        const tr = document.createElement('tr');
        const badgeClass = row.status === 'Open' ? 'badge-open' : row.status === 'In Progress' ? 'badge-progress' : 'badge-closed';

        tr.innerHTML = `
            <td>${row.date}</td>
            <td><span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${row.id}</span></td>
            <td><span style="font-weight: 500;">${row.branch}</span></td>
            <td>${row.brand || '<span style="color: #cbd5e1">-</span>'}</td>
            <td>${row.reason || '<span style="color: #cbd5e1">-</span>'}</td>
            <td>${row.aging} Days</td>
            <td><span class="badge ${badgeClass}">${row.status}</span></td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button onclick="editRow('${row._id}')" class="btn-sm" title="Edit Case" 
                        style="color: var(--primary); border: 1px solid transparent; background: transparent; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">
                        <span style="font-size: 1.1rem; line-height: 1;">✎</span>
                    </button>
                    <button onclick="deleteRow('${row._id}')" class="btn-sm" title="Delete Case" 
                        style="color: var(--danger); border: 1px solid transparent; background: transparent; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">
                        <span style="font-size: 1.2rem; line-height: 1;">&times;</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats() {
    if (!appState.user) return;

    const relevantData = appState.user.role === "ADMIN" ? appState.data : appState.data.filter(d => d.branch === appState.user.role);

    const stats = {
        total: relevantData.length,
        open: relevantData.filter(d => d.status === "Open").length,
        aging: relevantData.filter(d => d.status !== "Closed" && d.aging > 5).length,
        closed: relevantData.filter(d => d.status === "Closed").length
    };

    animateValue("totalVal", parseInt(document.getElementById("totalVal").innerText), stats.total, 500);
    animateValue("openVal", parseInt(document.getElementById("openVal").innerText), stats.open, 500);
    animateValue("agingVal", parseInt(document.getElementById("agingVal").innerText), stats.aging, 500);
    animateValue("closedVal", parseInt(document.getElementById("closedVal").innerText), stats.closed, 500);
}

// Charts
function initCharts() {
    const ctxBranch = document.getElementById('branchChart').getContext('2d');
    const ctxStatus = document.getElementById('statusChart').getContext('2d');

    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#64748b";

    // Gradient for Bar Chart
    const gradientBranch = ctxBranch.createLinearGradient(0, 0, 0, 400);
    gradientBranch.addColorStop(0, '#6366f1');
    gradientBranch.addColorStop(1, '#818cf8');

    appState.charts.branch = new Chart(ctxBranch, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Cases', data: [], backgroundColor: gradientBranch, borderRadius: 8, hoverBackgroundColor: '#4338ca' }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#e2e8f0', drawBorder: false } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });

    appState.charts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Open/New', 'Aging (>5 Days)', 'Closed'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } }
            },
            cutout: '75%',
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

function updateCharts() {
    const relevantData = appState.user.role === "ADMIN" ? appState.data : appState.data.filter(d => d.branch === appState.user.role);

    // Status Chart
    const sData = [
        relevantData.filter(d => d.status !== "Closed" && d.aging <= 5).length, // Open/New (including In Progress if <= 5 days)
        relevantData.filter(d => d.status !== "Closed" && d.aging > 5).length,  // Aging
        relevantData.filter(d => d.status === "Closed").length
    ];
    if (appState.charts.status) {
        appState.charts.status.data.datasets[0].data = sData;
        appState.charts.status.update();
    }

    // Branch Chart (Top 10 by volume)
    const bCounts = {};
    relevantData.forEach(d => { bCounts[d.branch] = (bCounts[d.branch] || 0) + 1; });
    const sortedB = Object.entries(bCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (appState.charts.branch) {
        appState.charts.branch.data.labels = sortedB.map(i => i[0]);
        appState.charts.branch.data.datasets[0].data = sortedB.map(i => i[1]);
        appState.charts.branch.update();
    }
}

// Utilities
function openModal() { document.getElementById('entryModal').classList.add('open'); }
function closeModal() {
    document.getElementById('entryModal').classList.remove('open');
    document.getElementById('fEditingId').value = "";
    document.getElementById('modalTitle').innerText = "New Case";
    document.getElementById('escForm').reset();
    // Re-set date to today
    document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
    if (appState.user && appState.user.role !== "ADMIN") {
        document.getElementById('fBranch').value = appState.user.role;
    }
}

function showToast(msg, type = "info") {
    const cont = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span> <div>${msg}</div>`;
    cont.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);
    const timer = setInterval(function () {
        current += increment;
        obj.innerHTML = current;
        if (current == end) clearInterval(timer);
    }, stepTime > 0 ? stepTime : 10);
}

function shake(element) {
    element.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
    ], { duration: 300 });
}

// View Navigation
function showView(viewName) {
    // Update Nav State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${viewName}`).classList.add('active');

    // Toggle Views
    if (viewName === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('view-reports').classList.add('hidden');
        document.getElementById('pageTitle').innerText = 'Overview';
        renderTable(); // Refresh
    } else {
        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-reports').classList.remove('hidden');
        document.getElementById('pageTitle').innerText = 'Reports';
        renderReports();
    }
}

function renderReports() {
    const tbody = document.getElementById('reportBody');
    tbody.innerHTML = '';

    // Aggregate Data
    const reportData = {};
    const relevantData = appState.user.role === "ADMIN" ? appState.data : appState.data.filter(d => d.branch === appState.user.role);
    const rDate = document.getElementById('reportDateFilter').value;

    const filteredData = rDate ? relevantData.filter(d => d.date === rDate) : relevantData;

    // Init buckets
    CONFIG.branches.forEach(b => {
        // For non-admin, only show their branch
        if (appState.user.role !== "ADMIN" && b !== appState.user.role) return;

        reportData[b] = { total: 0, open: 0, closed: 0, totalAging: 0 };
    });

    relevantData.forEach(d => {
        if (!reportData[d.branch]) return; // Should not happen if config aligns

        const r = reportData[d.branch];
        r.total++;
        r.totalAging += (d.aging || 0);

        if (d.status === "Open") r.open++;
        else if (d.status === "Closed") r.closed++;
    });

    // Render
    Object.keys(reportData).sort().forEach(branch => {
        const r = reportData[branch];
        if (r.total === 0 && appState.user.role !== "ADMIN") return; // Skip empty if desired, but good to show 0

        const avgAging = r.total > 0 ? (r.totalAging / r.total).toFixed(1) : "0.0";
        const compliance = r.total > 0 ? Math.round((r.closed / r.total) * 100) : 0;

        // Colorize compliance
        const compColor = compliance >= 80 ? 'var(--success)' : compliance >= 50 ? 'var(--warning)' : 'var(--danger)';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${branch}</td>
            <td>${r.total}</td>
            <td>${r.open}</td>
            <td>${r.closed}</td>
            <td>${avgAging}</td>
            <td><span style="color: ${compColor}; font-weight: 700;">${compliance}%</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function exportReport() {
    // Re-calc data (reusing logic, ideal to separate but short enough)
    const reportData = {};
    const relevantData = appState.user.role === "ADMIN" ? appState.data : appState.data.filter(d => d.branch === appState.user.role);
    const rDate = document.getElementById('reportDateFilter').value;
    const filteredData = rDate ? relevantData.filter(d => d.date === rDate) : relevantData;

    CONFIG.branches.forEach(b => {
        if (appState.user.role !== "ADMIN" && b !== appState.user.role) return;
        reportData[b] = { total: 0, open: 0, closed: 0, totalAging: 0 };
    });
    filteredData.forEach(d => {
        if (reportData[d.branch]) {
            const r = reportData[d.branch];
            r.total++;
            r.totalAging += (d.aging || 0);
            if (d.status === "Open") r.open++;
            else if (d.status === "Closed") r.closed++;
        }
    });

    let csv = "Branch,Total Cases,Open,Closed,Avg Aging,Compliance %\n";
    Object.keys(reportData).sort().forEach(branch => {
        const r = reportData[branch];
        const avgAging = r.total > 0 ? (r.totalAging / r.total).toFixed(1) : "0.0";
        const compliance = r.total > 0 ? Math.round((r.closed / r.total) * 100) : 0;
        csv += `${branch},${r.total},${r.open},${r.closed},${avgAging},${compliance}%\n`;
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = "branch_performance_report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function exportCSV() {
    const relevantData = appState.user.role === "ADMIN" ? appState.data : appState.data.filter(d => d.branch === appState.user.role);
    if (relevantData.length === 0) return showToast("No data to export", "info");

    // Define consistent column order
    const columns = ["date", "id", "branch", "brand", "reason", "city", "aging", "status", "remark"];
    const headers = ["Date", "ID", "Branch", "Brand", "Reason", "City", "Aging", "Status", "Remark"];

    const csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + relevantData.map(row => columns.map(col => {
            let val = row[col] || "";
            // Escape quotes and commas
            if (String(val).includes(",") || String(val).includes('"')) {
                val = `"${String(val).replace(/"/g, '""')}"`;
            }
            return val;
        }).join(",")).join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "escalations_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
}
