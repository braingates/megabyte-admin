const API_BASE = "megabyte-admin.vercel.app" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? `http://${window.location.hostname}:5001/api`
  : "https://data-bundle-backend.onrender.com/api";

const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    
    // UI State
    submitBtn.disabled = true;
    submitBtn.innerText = 'Authenticating...';
    errorMsg.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            // credentials: "include" is required so the browser accepts the Set-Cookie header
            credentials: "include"
        });

        if (res.ok) {
            // Redirect back to admin dashboard on success
            window.location.href = 'megabyte-admin.vercel.app';
        } else {
            const data = await res.json().catch(() => ({}));
            errorMsg.innerText = data.error || 'Invalid Admin Key';
            errorMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerText = 'Login to Dashboard';
        }
    } catch (err) {
        errorMsg.innerText = 'Connection error. Is the backend running?';
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerText = 'Login to Dashboard';
    }
});
