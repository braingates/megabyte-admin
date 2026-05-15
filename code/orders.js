import { OrderService, formatMoney } from "./api.js";

const scroller = document.querySelector("#ordersCardScroller"); // Removed CUSTOMER_REFRESH_MS
const emptyState = document.querySelector("#ordersEmptyState");
const input = document.querySelector("#ordersSearchInput");
const button = document.querySelector("#ordersSearchBtn");
const savedLookup = localStorage.getItem("megabyteStationCustomerLookup") || "";

input.value = savedLookup;

function statusClass(status) {
  return `status ${String(status || "pending").toLowerCase()}`;
}

async function renderOrders() {
  const query = input.value.trim();
  
  // If user entered a phone or reference, fetch customer's orders for that phone
  if (query) { // If there's a query, always attempt to fetch from backend
    // OrderService.fetchOrders(query) will use the /api/orders?search=... endpoint
    // for customer-specific searches.
    await OrderService.fetchOrders(query);
    localStorage.setItem("megabyteStationCustomerLookup", query);
  } else {
    // If no query, clear local orders and display empty state for customer view.
    // This prevents accidentally fetching admin orders or stale data.
    OrderService.writeOrders([]); // Clear local storage for customer view
    localStorage.removeItem("megabyteStationCustomerLookup"); // Clear lookup
  }
  
  const orders = query ? OrderService.search(query) : [];

  if (!orders.length) {
    emptyState.textContent = query
      ? "Empty. No recent orders found for this customer."
      : "Empty. Enter your phone number or order reference to view your recent orders.";
    emptyState.style.display = "block";
    scroller.innerHTML = "";
    return;
  }

  emptyState.style.display = "none";
  scroller.innerHTML = orders.map((order) => `
    <article class="customer-order-card">
      <div class="customer-order-top">
        <span class="order-network">${order.network}</span>
        <span class="${statusClass(order.paymentStatus)}">${order.paymentStatus}</span>
      </div>

      <h2>${order.bundle}</h2>

      <dl>
        <div>
          <dt>Recipient</dt>
          <dd>${order.phone}</dd>
        </div>
        <div>
          <dt>Amount Paid</dt>
          <dd>${formatMoney(order.amount)}</dd>
        </div>
        <div>
          <dt>Order Status</dt>
          <dd class="${statusClass(order.orderStatus)}">${order.orderStatus}</dd>
        </div>
        <div>
          <dt>Vendor Status</dt>
          <dd class="${statusClass(order.vendorStatus)}">${order.vendorStatus}</dd>
        </div>
      </dl>

      <footer>
        <div class="order-ids" style="display: flex; flex-direction: column; gap: 2px;">
          <span>Ref: ${order.reference}</span>
          <span class="tracking-id">Track ID: <strong>${order.vendorReference || order.trackingId || 'N/A'}</strong></span>
        </div>
        <time style="margin-top: 5px; display: block;">${new Date(order.createdAt).toLocaleString()}</time>
      </footer>
    </article>
  `).join("");
}

button.addEventListener("click", renderOrders);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") renderOrders();
});

renderOrders();
window.setInterval(renderOrders, 15000); // Re-added customer refresh, but now it fetches from backend
