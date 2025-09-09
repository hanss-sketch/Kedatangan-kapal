// Global variables
let ships = []; // Initialize as empty array, will load from localStorage
let editIndex = -1;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let filteredShips = [];
let currentSort = { field: null, direction: 'asc' };
let pendingAction = null;

// Chart instances
let arrivalChartInstance = null;
let documentChartInstance = null;
let trendChartInstance = null; // For Analytics section (only trend chart remains)

// DOM Elements (cached for performance)
const DOMElements = {};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    cacheDOMElements();
    initializeApp();
});

function cacheDOMElements() {
    DOMElements.loadingScreen = document.getElementById('loadingScreen');
    DOMElements.sidebar = document.getElementById('sidebar');
    DOMElements.sidebarToggle = document.getElementById('sidebarToggle');
    DOMElements.menuItems = document.querySelectorAll('.menu-item');
    DOMElements.contentSections = document.querySelectorAll('.content-section');
    DOMElements.pageTitle = document.getElementById('pageTitle');
    DOMElements.searchInput = document.getElementById('searchInput');
    DOMElements.statusFilter = document.getElementById('statusFilter');
    DOMElements.dateFilter = document.getElementById('dateFilter');
    DOMElements.sortableHeaders = document.querySelectorAll('[data-sort]');
    DOMElements.shipTableBody = document.getElementById('shipTableBody');
    DOMElements.currentPageSpan = document.getElementById('currentPage');
    DOMElements.totalPagesSpan = document.getElementById('totalPages');
    DOMElements.paginationBtns = document.querySelectorAll('.pagination-btn');
    DOMElements.shipForm = document.getElementById('shipForm');
    DOMElements.notification = document.getElementById('notification');
    DOMElements.notificationMessage = document.getElementById('notificationMessage');
    DOMElements.confirmModal = document.getElementById('confirmModal');
    DOMElements.confirmMessage = document.getElementById('confirmMessage');
    DOMElements.activityList = document.getElementById('activityList');
    DOMElements.mainContent = document.getElementById('mainContent'); // Added for print functionality

    // Stat cards
    DOMElements.totalShips = document.getElementById('totalShips');
    DOMElements.todayArrivals = document.getElementById('todayArrivals');
    DOMElements.pendingDocs = document.getElementById('pendingDocs'); // This will now represent 'Tidak Lengkap'
    DOMElements.activeShips = document.getElementById('activeShips');

    // Chart canvases
    DOMElements.arrivalChartCanvas = document.getElementById('arrivalChart');
    DOMElements.documentChartCanvas = document.getElementById('documentChart');
    DOMElements.trendChartCanvas = document.getElementById('trendChart');
}

function initializeApp() {
    // Load data from localStorage first
    ships = JSON.parse(localStorage.getItem('ships')) || [];
    filteredShips = [...ships]; // Initialize filteredShips with all ships

    setupEventListeners();
    loadInitialData();
    initializeCharts(); // Initialize charts after data is loaded
    hideLoadingScreen(); // Hide loading screen after everything is set up
    resetForm(); // Set default date for the form
}

function hideLoadingScreen() {
    if (DOMElements.loadingScreen) {
        DOMElements.loadingScreen.classList.add('hidden');
        // Optional: Remove element from DOM after transition for accessibility/performance
        DOMElements.loadingScreen.addEventListener('transitionend', () => {
            if (DOMElements.loadingScreen) {
                DOMElements.loadingScreen.style.display = 'none';
            }
        }, { once: true });
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    if (DOMElements.sidebarToggle) {
        DOMElements.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    DOMElements.menuItems.forEach(item => {
        item.addEventListener('click', () => {
            switchSection(item.dataset.target);
        });
    });
    
    if (DOMElements.searchInput) DOMElements.searchInput.addEventListener('input', applyFilters);
    if (DOMElements.statusFilter) DOMElements.statusFilter.addEventListener('change', applyFilters);
    if (DOMElements.dateFilter) DOMElements.dateFilter.addEventListener('change', applyFilters);
    
    DOMElements.sortableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            sortTable(th.dataset.sort);
        });
    });
    
    if (DOMElements.shipForm) {
        DOMElements.shipForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission
            saveShip();
        });
    }

    // Pagination buttons - Re-attach event listeners correctly
    // It's better to attach these once if the buttons themselves are not re-rendered
    // If they are re-rendered, this needs to be called after renderTable
    // For simplicity, keeping the inline onclick for now as it's already there,
    // but for a cleaner approach, you'd select them here and add listeners.
}

// --- Sidebar & Section Management ---
function toggleSidebar() {
    DOMElements.sidebar.classList.toggle('active');
}

function switchSection(sectionId) {
    DOMElements.contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    DOMElements.menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const targetMenuItem = document.querySelector(`[data-target="${sectionId}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
        const titleSpan = targetMenuItem.querySelector('span');
        if (DOMElements.pageTitle && titleSpan) {
            DOMElements.pageTitle.textContent = titleSpan.textContent;
        }
    }

    // Update charts when switching to analytics section
    if (sectionId === 'analytics') {
        updateAnalyticsCharts();
    }
}

// --- Data Loading & Display ---
function loadInitialData() {
    updateStats();
    renderTable();
    loadRecentActivities();
    updateCharts(); // Update dashboard charts with initial data
}

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayArrivals = ships.filter(ship => ship.arrivalDate === today).length;
    const pendingDocs = ships.filter(ship => ship.documentStatus === 'Tidak Lengkap').length; // Changed to 'Tidak Lengkap'
    const activeShips = ships.filter(ship => ship.phoneStatus === 'Aktif').length;
    
    if (DOMElements.totalShips) DOMElements.totalShips.textContent = ships.length;
    if (DOMElements.todayArrivals) DOMElements.todayArrivals.textContent = todayArrivals;
    if (DOMElements.pendingDocs) DOMElements.pendingDocs.textContent = pendingDocs;
    if (DOMElements.activeShips) DOMElements.activeShips.textContent = activeShips;
}

function renderTable() {
    if (!DOMElements.shipTableBody) return;

    DOMElements.shipTableBody.innerHTML = '';
    
    if (filteredShips.length === 0) {
        DOMElements.shipTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center"> <!-- Adjusted colspan -->
                    <i class="fas fa-ship" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                    <p style="color: var(--secondary); font-weight: 500;">Tidak ada data kapal</p>
                    <p style="color: var(--gray); font-size: 0.875rem;">Silakan tambahkan data kedatangan kapal</p>
                </td>
            </tr>
        `;
        updatePagination(); // Still update pagination even if empty
        return;
    }
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = filteredShips.slice(startIndex, endIndex);
    
    currentItems.forEach((ship, index) => {
        // Find the original index in the 'ships' array for editing/deleting
        // This is crucial because filteredShips might be a subset or reordered
        const globalIndex = ships.findIndex(s => 
            s.shipName === ship.shipName && 
            s.arrivalDate === ship.arrivalDate && 
            s.arrivalTime === ship.arrivalTime &&
            s.grossTonnage === ship.grossTonnage &&
            s.shipOwner === ship.shipOwner &&
            s.captain === ship.captain
        );
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="editShip(${globalIndex})" class="btn btn-sm btn-info">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="confirmDelete(${globalIndex})" class="btn btn-sm btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
            <td>${ship.shipName}</td>
            <td>${ship.grossTonnage} GT</td>
            <td>${ship.shipOwner}</td>
            <td>${ship.captain}</td>
            <td>
                ${formatDate(ship.arrivalDate)}<br>
                <span style="color: var(--secondary); font-size: 0.875rem;">${ship.arrivalTime}</span>
            </td>
            <td>${ship.phoneNumber || '-'}</td> <!-- Display '-' if no phone number -->
            <td>
                <span class="badge ${ship.phoneStatus === 'Aktif' ? 'badge-success' : 'badge-danger'}">
                    ${ship.phoneStatus}
                </span>
            </td>
            <td>
                <span class="badge ${getDocumentStatusClass(ship.documentStatus)}">
                    ${ship.documentStatus}
                </span>
            </td>
        `;
        DOMElements.shipTableBody.appendChild(row);
    });
    
    updatePagination();
}

function getDocumentStatusClass(status) {
    const classes = {
        'Lengkap': 'badge-success',
        'Tidak Lengkap': 'badge-danger',
        'Pasca': 'badge-warning', // New status
        'Daerah Lengkap': 'badge-info', // New status
        'Siup Pusat': 'badge-primary' // New status
    };
    return classes[status] || 'badge-secondary';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// --- Filtering & Sorting ---
function applyFilters() {
    const searchTerm = DOMElements.searchInput ? DOMElements.searchInput.value.toLowerCase() : '';
    const statusFilter = DOMElements.statusFilter ? DOMElements.statusFilter.value : '';
    const dateFilter = DOMElements.dateFilter ? DOMElements.dateFilter.value : '';
    
    filteredShips = ships.filter(ship => {
        const matchesSearch = ship.shipName.toLowerCase().includes(searchTerm) || 
                           ship.captain.toLowerCase().includes(searchTerm) ||
                           (ship.phoneNumber && ship.phoneNumber.toLowerCase().includes(searchTerm)); // Search by phone number too
        const matchesStatus = !statusFilter || ship.documentStatus === statusFilter;
        const matchesDate = !dateFilter || ship.arrivalDate === dateFilter;
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    currentPage = 1;
    renderTable();
}

function clearFilters() {
    if (DOMElements.searchInput) DOMElements.searchInput.value = '';
    if (DOMElements.statusFilter) DOMElements.statusFilter.value = '';
    if (DOMElements.dateFilter) DOMElements.dateFilter.value = '';
    applyFilters(); // Re-apply filters to show all ships
    showNotification('Filter telah direset', 'info');
}

function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    filteredShips.sort((a, b) => {
        let valueA = a[field];
        let valueB = b[field];
        
        if (field === 'arrivalDate') {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        } else if (field === 'grossTonnage') {
            valueA = Number(valueA);
            valueB = Number(valueB);
        } else if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }
        
        if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderTable();
}

// --- Pagination ---
function updatePagination() {
    const totalPages = Math.ceil(filteredShips.length / ITEMS_PER_PAGE);
    if (DOMElements.currentPageSpan) DOMElements.currentPageSpan.textContent = currentPage;
    if (DOMElements.totalPagesSpan) DOMElements.totalPagesSpan.textContent = totalPages || 1;
    
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');

    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredShips.length / ITEMS_PER_PAGE);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- Ship Data Management (CRUD) ---
function saveShip() {
    const shipName = document.getElementById('shipName').value.trim();
    const grossTonnage = document.getElementById('grossTonnage').value;
    const shipOwner = document.getElementById('shipOwner').value.trim();
    const captain = document.getElementById('captain').value.trim();
    const arrivalDate = document.getElementById('arrivalDate').value;
    const arrivalTime = document.getElementById('arrivalTime').value;
    const phoneNumber = document.getElementById('phoneNumber').value.trim(); // No longer required
    const phoneStatus = document.getElementById('phoneStatus').value;
    const documentStatus = document.getElementById('documentStatus').value;
    // const origin = document.getElementById('origin').value.trim(); // Removed

    const formData = {
        shipName, grossTonnage, shipOwner, captain, arrivalDate, arrivalTime,
        phoneNumber: phoneNumber || null, // Store as null if empty
        phoneStatus, documentStatus
    };
    
    if (!validateForm(formData)) {
        showNotification('Harap isi semua field yang wajib diisi (kecuali No. HP)!', 'danger');
        return;
    }

    // Specific validation for grossTonnage
    if (isNaN(grossTonnage) || Number(grossTonnage) <= 0) {
        showNotification('Gross Tonnage harus angka positif!', 'danger');
        return;
    }
    
    if (editIndex === -1) {
        ships.push(formData);
        showNotification('Data kapal berhasil disimpan!');
    } else {
        ships[editIndex] = formData;
        editIndex = -1;
        showNotification('Data kapal berhasil diupdate!');
    }
    
    saveData();
    closeModal('addShipModal');
    resetForm();
}

function validateForm(data) {
    // 'phoneNumber' and 'origin' are no longer required
    const required = ['shipName', 'grossTonnage', 'shipOwner', 'captain', 'arrivalDate', 'arrivalTime'];
    return required.every(field => data[field] && String(data[field]).trim() !== '');
}

function editShip(index) {
    const ship = ships[index];
    if (!ship) {
        showNotification('Data kapal tidak ditemukan!', 'danger');
        return;
    }
    
    document.getElementById('shipName').value = ship.shipName;
    document.getElementById('grossTonnage').value = ship.grossTonnage;
    document.getElementById('shipOwner').value = ship.shipOwner;
    document.getElementById('captain').value = ship.captain;
    document.getElementById('arrivalDate').value = ship.arrivalDate;
    document.getElementById('arrivalTime').value = ship.arrivalTime;
    document.getElementById('phoneNumber').value = ship.phoneNumber || ''; // Set to empty string if null
    document.getElementById('phoneStatus').value = ship.phoneStatus;
    document.getElementById('documentStatus').value = ship.documentStatus;
    // document.getElementById('origin').value = ship.origin; // Removed
    
    editIndex = index;
    openModal('addShipModal');
}

function confirmDelete(index) {
    pendingAction = { type: 'delete', index };
    if (DOMElements.confirmMessage) {
        DOMElements.confirmMessage.textContent = 'Apakah Anda yakin ingin menghapus data kapal ini?';
    }
    openModal('confirmModal');
}

function confirmAction() {
    if (pendingAction && pendingAction.type === 'delete') {
        ships.splice(pendingAction.index, 1);
        saveData();
        showNotification('Data kapal berhasil dihapus!', 'success');
    }
    
    closeModal('confirmModal');
    pendingAction = null;
}

function saveData() {
    localStorage.setItem('ships', JSON.stringify(ships));
    applyFilters(); // Re-apply filters to update filteredShips and re-render table
    updateStats();
    loadRecentActivities();
    updateCharts(); // Update dashboard charts
    updateAnalyticsCharts(); // Update analytics charts
}

function resetForm() {
    if (DOMElements.shipForm) {
        DOMElements.shipForm.reset();
        // Set default date to today for convenience
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('arrivalDate').value = `${yyyy}-${mm}-${dd}`;
    }
    editIndex = -1;
}

// --- Modal Management ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// --- Notification System ---
function showNotification(message, type = 'success') {
    if (!DOMElements.notification || !DOMElements.notificationMessage) return;

    DOMElements.notificationMessage.textContent = message;
    
    // Reset background color first to ensure transition works for type changes
    DOMElements.notification.style.background = ''; 
    DOMElements.notification.style.backgroundColor = `var(--${type})`; // Use backgroundColor for direct assignment
    DOMElements.notification.classList.add('active');
    
    setTimeout(() => {
        DOMElements.notification.classList.remove('active');
    }, 3000);
}

// --- Recent Activities ---
function loadRecentActivities() {
    if (!DOMElements.activityList) return;

    DOMElements.activityList.innerHTML = '';
    
    const recentShips = ships.slice().sort((a, b) => {
        const dateA = new Date(`${a.arrivalDate}T${a.arrivalTime}`);
        const dateB = new Date(`${b.arrivalDate}T${b.arrivalTime}`);
        return dateB - dateA; // Sort descending by date/time
    }).slice(0, 5); // Get most recent 5
    
    if (recentShips.length === 0) {
        DOMElements.activityList.innerHTML = `
            <div class="text-center" style="color: var(--secondary); padding: 1rem;">
                <i class="fas fa-info-circle"></i>
                <p>Tidak ada aktivitas terbaru</p>
            </div>
        `;
        return;
    }
    
    recentShips.forEach(ship => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-ship"></i>
            </div>
            <div class="activity-content">
                <p><strong>${ship.shipName}</strong> tiba</p> <!-- Removed 'dari ${ship.origin}' -->
                <span>${formatDate(ship.arrivalDate)} ${ship.arrivalTime}</span>
            </div>
            <div class="activity-status">
                <span class="badge ${getDocumentStatusClass(ship.documentStatus)}">
                    ${ship.documentStatus}
                </span>
            </div>
        `;
        DOMElements.activityList.appendChild(activityItem);
    });
}

// --- Chart Management ---
function initializeCharts() {
    // Destroy existing chart instances if they exist
    if (arrivalChartInstance) arrivalChartInstance.destroy();
    if (documentChartInstance) documentChartInstance.destroy();
    if (trendChartInstance) trendChartInstance.destroy();

    // Dashboard Charts
    if (DOMElements.arrivalChartCanvas) {
        const arrivalCtx = DOMElements.arrivalChartCanvas.getContext('2d');
        arrivalChartInstance = new Chart(arrivalCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [{
                    label: 'Jumlah Kedatangan',
                    data: calculateMonthlyData(),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0 // Ensure integer ticks
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    if (DOMElements.documentChartCanvas) {
        const documentCtx = DOMElements.documentChartCanvas.getContext('2d');
        documentChartInstance = new Chart(documentCtx, {
            type: 'doughnut',
            data: {
            labels: ['Lengkap', 'Tidak Lengkap', 'Pasca', 'Daerah Lengkap', 'Siup Pusat'], // Updated labels
                datasets: [{
                    data: calculateStatusData(),
                    backgroundColor: [
                        'rgba(5, 150, 105, 0.8)', // Lengkap (Success)
                        'rgba(220, 38, 38, 0.8)',  // Tidak Lengkap (Danger)
                        'rgba(217, 119, 6, 0.8)',  // Pasca (Warning)
                        'rgba(37, 99, 235, 0.8)',  // Daerah Lengkap (Primary)
                        'rgba(136, 19, 55, 0.8)'   // Siup Pusat (Custom color)
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 10
                        }
                    }
                }
            }
        });
    }

    // Analytics Charts (initialized but updated only when section is active)
    if (DOMElements.trendChartCanvas) {
        const trendCtx = DOMElements.trendChartCanvas.getContext('2d');
        trendChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [{
                    label: 'Trend Kedatangan',
                    data: calculateMonthlyData(), // Re-use monthly data for trend
                    borderColor: 'rgba(37, 99, 235, 1)',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function updateCharts() {
    // Update Dashboard Charts
    if (arrivalChartInstance) {
        arrivalChartInstance.data.datasets[0].data = calculateMonthlyData();
        arrivalChartInstance.update();
    }
    
    if (documentChartInstance) {
        documentChartInstance.data.datasets[0].data = calculateStatusData();
        documentChartInstance.update();
    }
}

function updateAnalyticsCharts() {
    // Update Analytics Charts (only if they are initialized)
    if (trendChartInstance) {
        trendChartInstance.data.datasets[0].data = calculateMonthlyData(); // Or more specific trend data
        trendChartInstance.update();
    }
}

function calculateMonthlyData() {
    const monthlyCounts = new Array(12).fill(0); // For 12 months
    ships.forEach(ship => {
        const arrivalMonth = new Date(ship.arrivalDate).getMonth(); // 0-indexed
        if (monthlyCounts[arrivalMonth] !== undefined) {
            monthlyCounts[arrivalMonth]++;
        }
    });
    return monthlyCounts;
}

function calculateStatusData() {
    const statusCount = {
        'Lengkap': 0,
        'Tidak Lengkap': 0,
        'Pasca': 0,
        'Daerah Lengkap': 0,
        'Siup Pusat': 0,
    };
    
    ships.forEach(ship => {
        if (statusCount.hasOwnProperty(ship.documentStatus)) {
            statusCount[ship.documentStatus]++;
        }
    });
    
    return Object.values(statusCount);
}

// --- Data Export/Import ---
function exportToCSV() {
    if (ships.length === 0) {
        showNotification('Tidak ada data untuk diekspor!', 'warning');
        return;
    }
    
    const headers = ['Nama Kapal', 'Gross Tonnage', 'Pemilik', 'Nahkoda', 'Tanggal', 'Jam', 'No. HP', 'Status HP', 'Status Dokumen']; // Removed 'Asal'
    const csv = [
        headers.map(h => `"${h}"`).join(','), // Quote headers
        ...ships.map(ship => [
            `"${ship.shipName.replace(/"/g, '""')}"`, // Escape double quotes
            ship.grossTonnage,
            `"${ship.shipOwner.replace(/"/g, '""')}"`,
            `"${ship.captain.replace(/"/g, '""')}"`,
            ship.arrivalDate,
            ship.arrivalTime,
            `"${(ship.phoneNumber || '').replace(/"/g, '""')}"`, // Handle null phone number
            ship.phoneStatus,
            ship.documentStatus,
        ].join(','))
    ].join('\n');
    
    downloadFile(csv, 'laporan-kapal.csv', 'text/csv');
    showNotification('Data berhasil diekspor ke CSV!', 'success');
}

function backupData() {
    if (ships.length === 0) {
        showNotification('Tidak ada data untuk dibackup!', 'warning');
        return;
    }
    
    const data = JSON.stringify(ships, null, 2);
    downloadFile(data, `backup-kapal-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showNotification('Backup data berhasil!', 'success');
}

function restoreData() {
    const fileInput = document.getElementById('backupFile');
    const file = fileInput ? fileInput.files[0] : null;
    
    if (!file) {
        showNotification('Pilih file backup terlebih dahulu!', 'danger');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const restoredData = JSON.parse(e.target.result);
            if (Array.isArray(restoredData)) {
                ships = restoredData;
                saveData(); // This will re-render table, update stats, and charts
                closeModal('restoreModal');
                showNotification('Data berhasil direstore!', 'success');
            } else {
                showNotification('Format file backup tidak valid! Harap pilih file JSON yang berisi array.', 'danger');
            }
        } catch (error) {
            console.error('Error reading or parsing backup file:', error);
            showNotification('Error membaca atau memproses file backup! Pastikan itu adalah file JSON yang valid.', 'danger');
        }
    };
    reader.onerror = function() {
        showNotification('Gagal membaca file.', 'danger');
    };
    reader.readAsText(file);
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Print Functionality ---
function printReportTable() {
    // Ensure we are on the reports section
    switchSection('reports');

    // Hide elements not needed for print
    DOMElements.sidebar.classList.add('no-print');
    document.querySelector('.main-header').classList.add('no-print');
    document.querySelector('.section-actions').classList.add('no-print'); // Hide Add/Print buttons
    document.querySelector('.filters-container').classList.add('no-print'); // Hide filters
    document.querySelector('.pagination').classList.add('no-print'); // Hide pagination

    // Add a class to the main content to adjust layout for print
    DOMElements.mainContent.classList.add('print-mode');

    // Set a timeout to ensure DOM updates before printing
    setTimeout(() => {
        window.print();
    }, 100); // Small delay to allow CSS to apply

    // Restore elements after print dialog is closed
    window.onafterprint = function() {
        DOMElements.sidebar.classList.remove('no-print');
        document.querySelector('.main-header').classList.remove('no-print');
        document.querySelector('.section-actions').classList.remove('no-print');
        document.querySelector('.filters-container').classList.remove('no-print');
        document.querySelector('.pagination').classList.remove('no-print');
        DOMElements.mainContent.classList.remove('print-mode');
        window.onafterprint = null; // Clear the event listener
    };
}

// --- Other Functions ---
function showRestoreModal() {
    openModal('restoreModal');
}