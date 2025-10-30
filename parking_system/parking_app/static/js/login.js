// ============================
// 🚪 Admin Login Script
// ============================
console.log("Login script loaded");

const BASE_URL = "http://127.0.0.1:8000/api/auth/login/";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      showError("Please enter both username and password.");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem("authToken", data.token);
        window.location.href = "/dashboard/"; // Redirect to dashboard
      } else {
        showError(data.message || "Invalid credentials. Try again.");
      }
    } catch (err) {
      showError("Server error. Please try again later.");
      console.error(err);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign In";
    }
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }
});

fetch("/api/auth/login/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password })
})
.then(res => res.json())
.then(data => {
  if (data.token) {
    localStorage.setItem("authToken", data.token);
    window.location.href = "/dashboard/";
  } else {
    alert("Login failed: " + data.message);
  }
});
