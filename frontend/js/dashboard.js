/* ============================================================
   PLUTO — dashboard.js (runs on dashboard.html)
   ============================================================ */

requireAuth();

let editModeActive = false;

document.addEventListener("DOMContentLoaded", () => {
  const user = getSession();
  if (user) {
    const nameEl = document.getElementById("welcomeName");
    if (nameEl) nameEl.textContent = user.name.split(" ")[0];
  }

  const raw = sessionStorage.getItem("pluto_resumeAnalysis");
  const scoreEl = document.getElementById("statAtsScore");
  const skillsEl = document.getElementById("statSkillsFound");
  const jobsEl = document.getElementById("statJobsMatched");
  const statusEl = document.getElementById("statResumeStatus");
  const recentCard = document.getElementById("recentAnalysisCard");
  const noAnalysisCard = document.getElementById("noAnalysisCard");

  if (raw) {
    const data = JSON.parse(raw);
    if (scoreEl) scoreEl.textContent = Math.round(data.ats_score?.overall_score ?? 0);
    if (skillsEl) skillsEl.textContent = (data.resume_data?.skills || []).length;
    if (jobsEl) jobsEl.textContent = (data.job_suggestions || []).length;
    if (statusEl) statusEl.textContent = "Analyzed";
    if (recentCard) recentCard.style.display = "block";
    if (noAnalysisCard) noAnalysisCard.style.display = "none";

    const fileNameEl = document.getElementById("recentFileName");
    if (fileNameEl) fileNameEl.textContent = sessionStorage.getItem("pluto_resumeFileName") || "resume.pdf";
  } else {
    if (scoreEl) scoreEl.textContent = "—";
    if (skillsEl) skillsEl.textContent = "—";
    if (jobsEl) jobsEl.textContent = "—";
    if (statusEl) statusEl.textContent = "Not uploaded";
    if (recentCard) recentCard.style.display = "none";
    if (noAnalysisCard) noAnalysisCard.style.display = "block";
  }

  renderCandidateProfile();
  renderSavedJobs();
});

function getParsedResumeData() {
  const raw = sessionStorage.getItem("pluto_resumeAnalysis");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed.resume_data || {};
  } catch (e) {
    return {};
  }
}

function renderCandidateProfile() {
  const container = document.getElementById("candidateProfileGrid");
  if (!container) return;

  const rd = getParsedResumeData();

  const fields = [
    { key: "name", label: "Candidate Name", val: rd.name },
    { key: "email", label: "Email Address", val: rd.email },
    { key: "mobile_number", label: "Mobile Phone", val: rd.mobile_number },
    { key: "linkedin", label: "LinkedIn URL", val: rd.linkedin },
    { key: "github", label: "GitHub / Portfolio", val: rd.github },
    { key: "location", label: "Location / City", val: rd.location },
    { key: "university", label: "College / University", val: rd.university },
    { key: "degree", label: "Degree Credentials", val: rd.degree },
    { key: "graduation_year", label: "Graduation Year", val: rd.graduation_year },
    { key: "cgpa", label: "CGPA / Grade", val: rd.cgpa },
    { key: "experience_years", label: "Total Experience", val: rd.experience_years != null ? `${rd.experience_years} years` : null },
    { key: "latest_job_title", label: "Latest Job Title", val: rd.latest_job_title },
    { key: "top_skills", label: "Top Skills", val: (rd.top_skills || rd.skills || []).slice(0, 5).join(", ") },
    { key: "certifications", label: "Certifications", val: (rd.certifications || []).join(", ") },
  ];

  container.innerHTML = fields.map(f => {
    const displayVal = f.val ? f.val : "Not found";
    const isMissing = !f.val;
    return `
      <div class="field-item">
        <div class="k">${f.label}</div>
        ${
          editModeActive
            ? `<input type="text" class="field-edit-input" data-key="${f.key}" value="${f.val || ''}" placeholder="Enter ${f.label}" />`
            : `<div class="v ${isMissing ? 'missing' : ''}">${displayVal}</div>`
        }
      </div>
    `;
  }).join("");
}

function toggleEditMode() {
  editModeActive = !editModeActive;
  const btn = document.getElementById("editProfileToggleBtn");
  if (editModeActive) {
    if (btn) btn.textContent = "💾 Save Fields";
  } else {
    saveProfileEdits();
    if (btn) btn.textContent = "✏️ Edit Fields";
  }
  renderCandidateProfile();
}

function saveProfileEdits() {
  const inputs = document.querySelectorAll(".field-edit-input");
  if (!inputs.length) return;

  const raw = sessionStorage.getItem("pluto_resumeAnalysis");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    data.resume_data = data.resume_data || {};
    inputs.forEach(inp => {
      const key = inp.getAttribute("data-key");
      const val = inp.value.trim();
      if (key) {
        data.resume_data[key] = val || null;
      }
    });
    sessionStorage.setItem("pluto_resumeAnalysis", JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save profile edits:", e);
  }
}

/* ---------------- Saved Jobs Section ---------------- */

function getSavedJobs() {
  try {
    return JSON.parse(localStorage.getItem("pluto_savedJobs") || "[]");
  } catch (e) {
    return [];
  }
}

function renderSavedJobs() {
  const container = document.getElementById("savedJobsContainer");
  const sortSelect = document.getElementById("savedJobsSort");
  if (!container) return;

  let savedJobs = getSavedJobs();

  if (!savedJobs.length) {
    container.innerHTML = `
      <div class="empty-saved-jobs" style="grid-column: 1 / -1; text-align:center; padding:24px; color:var(--ink-soft);">
        <p style="margin:0;">No bookmarked jobs yet. Save jobs from the ATS Result or Jobs page to track them here!</p>
      </div>
    `;
    return;
  }

  const sortBy = sortSelect ? sortSelect.value : "score";
  if (sortBy === "score") {
    savedJobs.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (sortBy === "date") {
    savedJobs.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  }

  container.innerHTML = savedJobs.map(j => `
    <div class="saved-job-card">
      <div class="saved-job-top">
        <div>
          <div class="job-title">${j.title}</div>
          <div class="job-company">${j.company} — ${j.location || 'Remote'}</div>
        </div>
        <div class="score-badge">${j.score || 75}% Match</div>
      </div>
      <div class="saved-job-footer">
        <span class="saved-date">Saved ${new Date(j.savedAt || Date.now()).toLocaleDateString()}</span>
        <div class="actions">
          <a href="${j.link || 'jobs.html'}" target="_blank" class="btn btn-primary btn-sm">Apply ↗</a>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="removeSavedJob('${j.id}')">Remove</button>
        </div>
      </div>
    </div>
  `).join("");
}

function removeSavedJob(id) {
  let savedJobs = getSavedJobs();
  savedJobs = savedJobs.filter(j => j.id !== id);
  localStorage.setItem("pluto_savedJobs", JSON.stringify(savedJobs));
  renderSavedJobs();
}
