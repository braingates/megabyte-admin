// ==========================================
// API BASE URL
// ==========================================

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5001"
    : "https://data-bundle-backend.onrender.com";

// ==========================================
// STATE
// ==========================================

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// ==========================================
// HEADERS
// ==========================================

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key": localStorage.getItem("megabyteAdminKey") || ""
  };
}

// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadOrders();
  loadTrends();
  loadVendorHealth();

  document
    .getElementById("refreshBtn")
    ?.addEventListener("click", loadOrders);

  document
    .getElementById("searchInput")
    ?.addEventListener("input", debounce(searchOrders, 500));

  document
    .getElementById("networkFilter")
    ?.addEventListener("change", filterOrders);

  document
    .getElementById("statusFilter")
    ?.addEventListener("change", filterOrders);

  setInterval(() => {
    loadStats();
    loadVendorHealth();
  }, 30000);
});

// ==========================================
// LOAD STATS
// ==========================================

async function loadStats() {
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/dashboard/stats`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include"
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      throw new Error(
        errorData.error || `Stats error: ${res.status}`
      );
    }

    const data = await res.json();

    document.getElementById("total").innerText =
      data.summary?.total || 0;

    document.getElementById("success").innerText =
      data.summary?.completed || 0;

    document.getElementById("revenue").innerText =
      Number(data.financial?.totalRevenue || 0).toFixed(2);

    document.getElementById("profit").innerText =
      Number(data.financial?.totalProfit || 0).toFixed(2);

  } catch (err) {
    console.error(
      "Stats load failed:",
      err.message
    );
  }
}

// ==========================================
// LOAD ORDERS
// ==========================================

async function loadOrders() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 50,
      ...currentFilters
    });

    const res = await fetch(
      `${API_BASE}/api/admin/orders?${params}`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include"
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      throw new Error(
        errorData.error || `Orders error: ${res.status}`
      );
    }

    const data = await res.json();

    renderOrders(data.orders || []);

    updatePagination(
      data.total || 0,
      data.pages || 1
    );

  } catch (err) {
    console.error(
      "Orders load failed:",
      err.message
    );
  }
}

// ==========================================
// LOAD TRENDS
// ==========================================

async function loadTrends() {
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/dashboard/trends`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include"
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      throw new Error(
        errorData.error || `Trends error: ${res.status}`
      );
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      renderChart(data);
    }

  } catch (err) {
    console.error(
      "Trends load failed:",
      err.message
    );
  }
}

// ==========================================
// LOAD VENDOR HEALTH
// ==========================================

async function loadVendorHealth() {
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/vendors/health`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include"
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      throw new Error(
        errorData.error || `Health error: ${res.status}`
      );
    }

    const data = await res.json();

    const getDot = (status) =>
      status === "up" || status === "online"
        ? "<span class='green'>●</span>"
        : "<span class='red'>●</span>";

    document.getElementById("vendorHealth").innerHTML = `
      MTN: ${getDot(data.MTN?.status)} ${data.MTN?.status || "Offline"} |
      Telecel: ${getDot(data.Telecel?.status)} ${data.Telecel?.status || "Offline"} |
      AirtelTigo: ${getDot(data.AirtelTigo?.status)} ${data.AirtelTigo?.status || "Offline"}
    `;

  } catch (err) {
    console.error(
      "Health check failed:",
      err.message
    );
  }
}

// ==========================================
// STATUS COLORS
// ==========================================

function getStatusClass(status) {
  const map = {
    success: "green",
    completed: "green",
    failed: "red",
    pending: "orange",
    processing: "blue",
    retrying: "yellow"
  };

  return map[status?.toLowerCase()] || "gray";
}

// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(str) {
  if (!str) return "";

  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// RENDER ORDERS
// ==========================================

function renderOrders(orders) {
  const tbody = document.getElementById("tableBody");

  if (!tbody) return;

  tbody.innerHTML = orders
    .map(order => `
      <tr>
        <td>${escapeHTML(order.reference)}</td>
        <td>${escapeHTML(order.network)}</td>
        <td>${escapeHTML(order.bundle)}</td>
        <td>${escapeHTML(order.phone)}</td>
        <td>GHS ${Number(order.amount || 0).toFixed(2)}</td>

        <td>
          <span class="badge ${getStatusClass(order.paymentStatus)}">
            ${escapeHTML(order.paymentStatus)}
          </span>
        </td>

        <td>
          <span class="badge ${getStatusClass(order.vendorStatus)}">
            ${escapeHTML(order.vendorStatus)}
          </span>
        </td>

        <td>
          <span class="badge ${getStatusClass(order.orderStatus)}">
            ${escapeHTML(order.orderStatus)}
          </span>
        </td>

        <td>${order.retryCount || 0}</td>

        <td>
          ${order.createdAt
            ? new Date(order.createdAt).toLocaleDateString()
            : "-"}
        </td>
      </tr>
    `)
    .join("");
}

// ==========================================
// PAGINATION
// ==========================================

function updatePagination(total, pages) {
  totalPages = pages || 1;

  document.getElementById(
    "pageInfo"
  ).innerText = `Page ${currentPage} of ${totalPages}`;

  document.getElementById("prevPage").disabled =
    currentPage <= 1;

  document.getElementById("nextPage").disabled =
    currentPage >= totalPages;
}

// ==========================================
// FILTERS
// ==========================================

function filterOrders() {
  currentFilters = {
    network:
      document.getElementById("networkFilter")?.value || "",

    status:
      document.getElementById("statusFilter")?.value || ""
  };

  currentPage = 1;

  loadOrders();
}

// ==========================================
// SEARCH
// ==========================================

function searchOrders() {
  currentFilters.search =
    document.getElementById("searchInput")?.value || "";

  currentPage = 1;

  loadOrders();
}

// ==========================================
// DEBOUNCE
// ==========================================

function debounce(fn, delay) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// ==========================================
// CHART
// ==========================================

let trendsChart = null;

function renderChart(data) {
  try {
    const canvas =
      document.getElementById("trendsChart");

    if (!canvas) {
      console.error("Chart canvas not found");
      return;
    }

    const ctx = canvas.getContext("2d");

    if (trendsChart) {
      trendsChart.destroy();
    }

    const labels = data.map(d => d.label);

    const revenue = data.map(d =>
      Number(d.revenue || 0)
    );

    const profit = data.map(d =>
      Number(d.profit || 0)
    );

    trendsChart = new Chart(ctx, {
      type: "line",

      data: {
        labels,

        datasets: [
          {
            label: "Revenue",
            data: revenue,
            borderColor: "#2563eb",
            tension: 0.3
          },

          {
            label: "Profit",
            data: profit,
            borderColor: "#10b981",
            tension: 0.3
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

  } catch (err) {
    console.error(
      "Chart rendering error:",
      err.message
    );
  }
}
