/* ============================================================
   PLUTO — profile.js  (runs on profile.html)
   ============================================================ */

requireAuth();

document.addEventListener("DOMContentLoaded", () => {
  const user = getSession();
  if (!user) return;

  loadProfileFields(user);
  setupPhotoUpload();
  renderSavedJobs();

  // Handle profile form submit
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const updatedData = {
        name: document.getElementById("profileName").value.trim(),
        phone: document.getElementById("profilePhone").value.trim(),
        address: document.getElementById("profileAddress").value.trim(),
        dob: document.getElementById("profileDob").value.trim(),
        clg_name: document.getElementById("profileClgName").value.trim(),
        linkedin: document.getElementById("profileLinkedin").value.trim(),
        job_search_field: document.getElementById("profileJobSearchField").value.trim()
      };

      const updatedUser = updateUserProfile(updatedData);

      // Re-render display names and chips
      if (updatedUser) {
        loadProfileFields(updatedUser);
      }
      if (typeof renderUserChip === "function") {
        renderUserChip();
      }

      const successBanner = document.getElementById("profileSuccess");
      showBanner(successBanner, "Profile details updated successfully.");
      setTimeout(() => hideBanner(successBanner), 3000);
    });
  }
});

function loadProfileFields(user) {
  if (!user) return;

  document.getElementById("profileName").value = user.name || "";
  document.getElementById("profileEmail").value = user.email || "";
  document.getElementById("profilePhone").value = user.phone || user.mobile_number || "";
  document.getElementById("profileAddress").value = user.address || user.location || "";
  document.getElementById("profileDob").value = user.dob || "";
  document.getElementById("profileClgName").value = user.clg_name || user.university || "";
  document.getElementById("profileLinkedin").value = user.linkedin || user.linkedin_id || "";
  document.getElementById("profileJobSearchField").value = user.job_search_field || user.latest_job_title || "";

  // Left column display name and email
  const nameDisplay = document.getElementById("profileNameDisplay");
  const emailDisplay = document.getElementById("profileEmailDisplay");
  if (nameDisplay) nameDisplay.textContent = user.name || user.email.split("@")[0];
  if (emailDisplay) emailDisplay.textContent = user.email;

  // Render Avatar Image vs Initials
  const avatarBig = document.getElementById("profileAvatarBig");
  const avatarImg = document.getElementById("profileAvatarImg");

  if (user.profile_photo) {
    if (avatarImg) {
      avatarImg.src = user.profile_photo;
      avatarImg.style.display = "block";
    }
    if (avatarBig) avatarBig.style.display = "none";
  } else {
    if (avatarImg) avatarImg.style.display = "none";
    if (avatarBig) {
      avatarBig.style.display = "flex";
      const initials = (user.name || user.email.split("@")[0])
        .split(" ")
        .map(p => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      avatarBig.textContent = initials;
    }
  }

  // Resume status badge
  const analysisRaw = sessionStorage.getItem("pluto_resumeAnalysis");
  const resumeStatus = document.getElementById("resumeOnFile");
  const autoBadge = document.getElementById("autoExtractedBadge");
  if (resumeStatus) {
    if (analysisRaw) {
      resumeStatus.textContent = sessionStorage.getItem("pluto_resumeFileName") || "resume.pdf";
      resumeStatus.className = "badge badge-success";
      if (autoBadge) autoBadge.style.display = "block";
    } else {
      resumeStatus.textContent = "No resume analyzed yet";
      if (autoBadge) autoBadge.style.display = "none";
    }
  }
}

function setupPhotoUpload() {
  const uploadBtn = document.getElementById("uploadPhotoBtn");
  const photoInput = document.getElementById("photoInput");

  if (uploadBtn && photoInput) {
    uploadBtn.addEventListener("click", () => photoInput.click());

    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const photoDataUrl = event.target.result;
        updateUserProfile({ profile_photo: photoDataUrl });
        const user = getSession();
        loadProfileFields(user);
        if (typeof renderUserChip === "function") {
          renderUserChip();
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

function renderSavedJobs() {
  const savedJobsList = document.getElementById("savedJobsList");
  const savedJobsEmpty = document.getElementById("savedJobsEmpty");
  if (!savedJobsList) return;

  const saved = getSavedJobs();

  if (!saved || saved.length === 0) {
    savedJobsList.style.display = "none";
    if (savedJobsEmpty) savedJobsEmpty.style.display = "block";
    return;
  }

  savedJobsList.style.display = "grid";
  if (savedJobsEmpty) savedJobsEmpty.style.display = "none";

  savedJobsList.innerHTML = saved.map((j, i) => `
    <div class="job-card">
      <div class="job-card-top">
        <div>
          <div class="job-title">${j.title || "Untitled role"}</div>
          <div class="job-company">${[j.company, j.location].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <div class="job-meta-row">
        ${j.salary_min && j.salary_max ? `<span>₹${j.salary_min} – ₹${j.salary_max}</span>` : ""}
        ${j.created ? `<span>Saved ${new Date(j.created).toLocaleDateString()}</span>` : ""}
      </div>
      ${j.description_snippet ? `<p class="job-snippet">${j.description_snippet}…</p>` : ""}
      <div class="job-card-actions">
        ${j.url ? `<a class="btn btn-primary btn-sm" href="${j.url}" target="_blank" rel="noopener">Apply →</a>` : ""}
        <button class="btn btn-outline btn-sm btn-remove-saved" onclick="removeSavedJob(${i})">Unsave</button>
      </div>
    </div>
  `).join("");
}

function removeSavedJob(index) {
  const saved = getSavedJobs();
  if (saved && saved[index]) {
    toggleSaveJob(saved[index]);
    renderSavedJobs();
  }
}
