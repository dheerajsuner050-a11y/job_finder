/* ============================================================
   PLUTO — profile.js  (runs on profile.html)
   ============================================================ */

requireAuth();

document.addEventListener("DOMContentLoaded", () => {
  const user = getSession();
  if (!user) return;

  document.getElementById("profileName").value = user.name || "";
  document.getElementById("profileEmail").value = user.email || "";
  document.getElementById("profilePhone").value = user.phone || "";

  const initials = user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const avatarBig = document.getElementById("profileAvatarBig");
  if (avatarBig) avatarBig.textContent = initials;

  const analysisRaw = sessionStorage.getItem("pluto_resumeAnalysis");
  const resumeStatus = document.getElementById("resumeOnFile");
  if (resumeStatus) {
    resumeStatus.textContent = analysisRaw
      ? sessionStorage.getItem("pluto_resumeFileName") || "resume.pdf"
      : "No resume analyzed yet";
  }

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const users = getUsers();
      const idx = users.findIndex(u => u.email === user.email);
      if (idx === -1) return;

      users[idx].name = document.getElementById("profileName").value.trim();
      users[idx].phone = document.getElementById("profilePhone").value.trim();
      saveUsers(users);

      const successBanner = document.getElementById("profileSuccess");
      showBanner(successBanner, "Profile updated.");
      setTimeout(() => hideBanner(successBanner), 2500);
    });
  }
});
