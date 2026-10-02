/* ============================================================
   PLUTO — auth.js
   Full authentication system connected to FastAPI backend.
   Sends Welcome Emails on signup and Reset Password emails on request
   from sender address: dheerajsuner6@gmail.com
   ============================================================ */

const PLUTO_USERS_KEY = "pluto_users";
const PLUTO_SESSION_KEY = "pluto_session";

function getUsers() {
  return JSON.parse(localStorage.getItem(PLUTO_USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(PLUTO_USERS_KEY, JSON.stringify(users));
}

function getSession() {
  const email = localStorage.getItem(PLUTO_SESSION_KEY);
  if (!email) return null;
  const user = getUsers().find(u => u.email === email);
  return user || { name: email.split("@")[0], email };
}

function setSession(email, name = "") {
  localStorage.setItem(PLUTO_SESSION_KEY, email);
  const users = getUsers();
  let existing = users.find(u => u.email === email);
  if (!existing) {
    users.push({ name: name || email.split("@")[0], email, createdAt: new Date().toISOString() });
    saveUsers(users);
  } else if (name && !existing.name) {
    existing.name = name;
    saveUsers(users);
  }
}

function clearSession() {
  localStorage.removeItem(PLUTO_SESSION_KEY);
}

/** Redirect to login if not authenticated. */
function requireAuth() {
  if (!getSession()) {
    window.location.href = "login.html";
  }
}

/** Render navbar user chip */
function renderUserChip() {
  const user = getSession();
  const chip = document.getElementById("userChip");
  if (!chip) return;
  if (user && user.name) {
    const initials = user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
    chip.innerHTML = `
      <div class="avatar">${initials}</div>
      <span>${user.name}</span>
    `;
  }
}

function logout() {
  clearSession();
  window.location.href = "login.html";
}

/* ---------------- Register Form ---------------- */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;
    const errorBanner = document.getElementById("registerError");

    hideBanner(errorBanner);

    if (!name || !email || !password) {
      showBanner(errorBanner, "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      showBanner(errorBanner, "Password must be at least 6 characters.");
      return;
    }

    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        showBanner(errorBanner, data.detail || data.message || "Failed to register.");
        return;
      }

      // Save local session
      setSession(email, name);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.warn("Backend auth unavailable, using local fallback:", err);
      // Fallback to local storage demo mode if backend server is not running
      const users = getUsers();
      if (users.some(u => u.email === email)) {
        showBanner(errorBanner, "An account with this email already exists.");
        return;
      }
      users.push({ name, email, password, createdAt: new Date().toISOString() });
      saveUsers(users);
      setSession(email, name);
      window.location.href = "dashboard.html";
    }
  });
}

/* ---------------- Login Form ---------------- */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const errorBanner = document.getElementById("loginError");

    hideBanner(errorBanner);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        showBanner(errorBanner, data.detail || "Incorrect email or password.");
        return;
      }

      setSession(email, data.user ? data.user.name : "");
      window.location.href = "dashboard.html";
    } catch (err) {
      console.warn("Backend auth unavailable, using local fallback:", err);
      const user = getUsers().find(u => u.email === email && u.password === password);
      if (!user) {
        showBanner(errorBanner, "Incorrect email or password.");
        return;
      }
      setSession(email, user.name);
      window.location.href = "dashboard.html";
    }
  });
}

/* ---------------- Forgot Password Form ---------------- */
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
    const successBanner = document.getElementById("forgotSuccess");
    const errorBanner = document.getElementById("forgotError");
    hideBanner(errorBanner);
    hideBanner(successBanner);

    if (!email) {
      showBanner(errorBanner, "Please enter your email address.");
      return;
    }

    try {
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        showBanner(errorBanner, data.detail || "Failed to process request.");
        return;
      }

      let msg = `Reset password email sent to ${email}! Check your inbox.`;
      if (data.reset_link) {
        console.log("Reset password link generated:", data.reset_link);
      }
      showBanner(successBanner, msg);
    } catch (err) {
      console.warn("Backend offline fallback:", err);
      showBanner(successBanner, `A password reset request for ${email} has been created.`);
    }
  });
}

/* ---------------- Reset Password Form ---------------- */
const resetPasswordForm = document.getElementById("resetPasswordForm");
if (resetPasswordForm) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  
  resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const errorBanner = document.getElementById("resetError");
    const successBanner = document.getElementById("resetSuccess");

    hideBanner(errorBanner);
    hideBanner(successBanner);

    if (!token) {
      showBanner(errorBanner, "Missing or invalid reset token link.");
      return;
    }
    if (newPassword.length < 6) {
      showBanner(errorBanner, "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showBanner(errorBanner, "Passwords do not match.");
      return;
    }

    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        showBanner(errorBanner, data.detail || "Failed to reset password.");
        return;
      }

      showBanner(successBanner, "Password successfully updated! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } catch (err) {
      showBanner(errorBanner, "Unable to connect to server. Please try again.");
    }
  });
}

/* ---------------- Shared Banner Helpers ---------------- */
function showBanner(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
}
function hideBanner(el) {
  if (!el) return;
  el.classList.remove("show");
}

/* ---------------- Mobile Nav Toggle ---------------- */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

/* Render user chip + wire logout buttons on every page load */
document.addEventListener("DOMContentLoaded", () => {
  renderUserChip();
  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", logout);
  });
});
