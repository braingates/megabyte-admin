/**
 * Admin Login Handler
 * Handles authentication and redirection to the dashboard
 */

// Environment-aware API base selection to prevent Mixed Content errors
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? `http://${window.location.hostname}:5001/api`
  : "https://data-bundle-backend.onrender.com/api";

console.log("🔌 Auth API Base:", API_BASE);

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitBtn");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("password").value;

    // UI State: Loading
    submitBtn.disabled = true;
    submitBtn.textContent = "Authenticating...";
    errorMsg.style.display = "none";

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password }),
        // Ensure credentials are included so the HttpOnly cookie is saved
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = "admin.html";
      } else {
        errorMsg.textContent = data.error || "Invalid credentials. Please try again.";
        errorMsg.style.display = "block";
      }
    } catch (err) {
      console.error("Login error:", err);
      errorMsg.textContent = "Connection error: Could not reach the authentication server.";
      errorMsg.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login to Dashboard";
    }
  });
}