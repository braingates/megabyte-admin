// Fallback to localhost if developing locally to prevent ERR_NAME_NOT_RESOLVED
const API_BASE = "https://data-bundle-backend.onrender.com/api" || "http://localhost:5001/api" || "http://127.0.0.1:5001/api"

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key": localStorage.getItem("megabyteAdminKey") || ""
  };
}

document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadOrders();
  loadTrends();

  document.getElementById("refreshBtn").addEventListener("click", loadOrders);
  document.getElementById("searchInput").addEventListener("input", debounce(searchOrders, 500));
  document.getElementById("networkFilter").addEventListener("change", filterOrders);
  document.getElementById("statusFilter").addEventListener("change", filterOrders);

  setInterval(() => {
    loadStats();
    loadVendorHealth();
  }, 30000);
});

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Stats error: ${res.status}`);
    }
    const data = await res.json();

    // Map data from the structured backend response (summary and financial objects)
    document.getElementById("total").innerText = data.summary?.total || 0;
    document.getElementById("success").innerText = data.summary?.completed || 0;
    document.getElementById("revenue").innerText = Number(data.financial?.totalRevenue || 0).toFixed(2);
    document.getElementById("profit").innerText = Number(data.financial?.totalProfit || 0).toFixed(2);
  } catch (err) {
    console.error("Stats load failed. Check if backend is running at:", API_BASE, err);
  }
}

async function loadOrders() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 50,
      ...currentFilters
    });

    const res = await fetch(`${API_BASE}/admin/orders?${params}`, { 
      headers: getHeaders() 
    });
    if (!res.ok) throw new Error(`Orders error: ${res.status}`);
    const data = await res.json();

    renderOrders(data.orders || []);
    updatePagination(data.total, data.pages);
  } catch (err) {
    console.error("Orders load failed:", err);
  }
}

async function loadTrends() {
  try {
    const res = await fetch(`${API_BASE}/admin/trends`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Trends error: ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data)) renderChart(data);
  } catch (err) {
    console.error("Trends load failed:", err);
  }
}

async function loadVendorHealth() {
  try {
    const res = await fetch(`${API_BASE}/admin/vendors/health`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Health error: ${res.status}`);
    const data = await res.json();
    
    const getDot = (status) => status === 'up' || status === 'online' ? "<span class='green'>●</span>" : "<span class='red'>●</span>";
    
    document.getElementById("vendorHealth").innerHTML = `
      MTN: ${getDot(data.MTN?.status)} ${data.MTN?.status || 'Offline'} | 
      Telecel: ${getDot(data.Telecel?.status)} ${data.Telecel?.status || 'Offline'} | 
      AirtelTigo: ${getDot(data.AirtelTigo?.status)} ${data.AirtelTigo?.status || 'Offline'}
    `;
  } catch (err) {
    console.error("Health check failed:", err);
  }
}

function getStatusClass(status) {
  const map = {
    success: 'green',
    completed: 'green',
    failed: 'red',
    pending: 'orange',
    processing: 'blue',
    retrying: 'yellow'
  };
  return map[status?.toLowerCase()] || 'gray';
}

/**
 * Safely escapes HTML to prevent XSS
 */
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderOrders(orders) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${escapeHTML(order.reference)}</td>
      <td>${escapeHTML(order.network)}</td>
      <td>${escapeHTML(order.bundle)}</td>
      <td>${escapeHTML(order.phone)}</td>
      <td>GHS ${Number(order.amount).toFixed(2)}</td>
      <td><span class="badge ${getStatusClass(order.paymentStatus)}">${order.paymentStatus}</span></td>
      <td><span class="badge ${getStatusClass(order.vendorStatus)}">${order.vendorStatus}</span></td>
      <td><span class="badge ${getStatusClass(order.orderStatus)}">${order.orderStatus}</span></td>
      <td>${order.retryCount || 0}</td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join("");
}

function updatePagination(total, pages) {
  totalPages = pages || 1;
  document.getElementById("pageInfo").innerText = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= totalPages;
}

function filterOrders() {
  currentFilters = {
    network: document.getElementById("networkFilter").value,
    status: document.getElementById("statusFilter").value
  };
  currentPage = 1;
  loadOrders();
}

function searchOrders() {
  currentFilters.search = document.getElementById("searchInput").value;
  loadOrders();
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function renderChart(data) {
  try {
    const ctx = document.getElementById("trendsChart").getContext("2d");
    if (!ctx) {
      console.error("Chart canvas element not found");
      return;
    }
    
    if (!Array.isArray(data)) {
      console.error("renderChart expected array, got:", typeof data);
      return;
    }

    const labels = data.map(d => d.label);
    const revenue = data.map(d => parseFloat(d.revenue));
    const profit = data.map(d => parseFloat(d.profit));

    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Revenue", data: revenue, borderColor: "#2563eb", tension: 0.3 },
          { label: "Profit", data: profit, borderColor: "#10b981", tension: 0.3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch (err) {
    console.error("Chart rendering error:", err);
  }
}
