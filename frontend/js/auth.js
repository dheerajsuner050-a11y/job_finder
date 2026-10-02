/* ============================================================
   PLUTO — auth.js
   NOTE: This is a FRONTEND-ONLY demo auth system using
   localStorage. Your FastAPI backend does not have login/
   register endpoints yet — this lets the UI flow work end to
   end (register -> login -> dashboard -> logout) until you
   build real auth on the backend and swap these functions
   for real fetch() calls.
   ============================================================ */

const PLUTO_USERS_KEY = "pluto_users";       // list of registered demo users
const PLUTO_SESSION_KEY = "pluto_session";   // currently logged-in user's email

function getUsers() {
  return JSON.parse(localStorage.getItem(PLUTO_USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(PLUTO_USERS_KEY, JSON.stringify(users));
}

function getSession() {
  const email = localStorage.getItem(PLUTO_SESSION_KEY);
  if (!email) return null;
  return getUsers().find(u => u.email === email) || null;
}

function setSession(email) {
  localStorage.setItem(PLUTO_SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(PLUTO_SESSION_KEY);
}

/** Redirect to login if not authenticated. Call at the top of protected pages. */
function requireAuth() {
  if (!getSession()) {
    window.location.href = "login.html";
  }
}

/** Fill in navbar/sidebar user chip if elements with these IDs exist on the page. */
function renderUserChip() {
  const user = getSession();
  const chip = document.getElementById("userChip");
  if (!chip) return;
  if (user) {
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

/* ---------------- Register form ---------------- */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
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

    const users = getUsers();
    if (users.some(u => u.email === email)) {
      showBanner(errorBanner, "An account with this email already exists. Try logging in.");
      return;
    }

    users.push({ name, email, password, phone: "", createdAt: new Date().toISOString() });
    saveUsers(users);
    setSession(email);
    window.location.href = "dashboard.html";
  });
}

/* ---------------- Login form ---------------- */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const errorBanner = document.getElementById("loginError");

    hideBanner(errorBanner);

    const user = getUsers().find(u => u.email === email && u.password === password);
    if (!user) {
      showBanner(errorBanner, "Incorrect email or password.");
      return;
    }

    setSession(email);
    window.location.href = "dashboard.html";
  });
}

/* ---------------- Forgot password form ---------------- */
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
    const successBanner = document.getElementById("forgotSuccess");
    const errorBanner = document.getElementById("forgotError");
    hideBanner(errorBanner);

    const user = getUsers().find(u => u.email === email);
    if (!user) {
      showBanner(errorBanner, "No account found with that email.");
      return;
    }

    // Demo only — a real backend would email a reset link here.
    showBanner(successBanner, "If this were connected to a mail server, a reset link would be sent now.");
  });
}

/* ---------------- Shared banner helpers ---------------- */
function showBanner(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
}
function hideBanner(el) {
  if (!el) return;
  el.classList.remove("show");
}

/* ---------------- Mobile nav toggle ---------------- */
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
