/* ============================================================
   PLUTO — jobs.js  (runs on jobs.html and job-details.html)
   ============================================================ */

function loadAnalysis() {
  const raw = sessionStorage.getItem("pluto_resumeAnalysis");
  return raw ? JSON.parse(raw) : null;
}

let currentJobsList = [];

/* ---------------- jobs.html ---------------- */
const jobsList = document.getElementById("jobsList");
if (jobsList) {
  const data = loadAnalysis();
  const emptyState = document.getElementById("jobsEmptyState");

  if (!data) {
    jobsList.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  } else {
    currentJobsList = data.job_suggestions || [];
    renderJobs(currentJobsList, data.job_search_error);
    wireJobSearch(currentJobsList);
  }
}

function renderJobs(jobs, error) {
  const container = document.getElementById("jobsList");
  const emptyState = document.getElementById("jobsEmptyState");

  if (error) {
    container.innerHTML = `<div class="form-error-banner show">Job search unavailable: ${error}</div>`;
    return;
  }
  if (!jobs || !jobs.length) {
    container.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  container.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = jobs.map((j, i) => {
    const saved = typeof isJobSaved === "function" ? isJobSaved(j) : false;
    return `
      <div class="job-card">
        <div class="job-card-top">
          <div>
            <div class="job-title">${j.title || "Untitled role"}</div>
            <div class="job-company">${[j.company, j.location].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div class="job-meta-row">
          ${j.salary_min && j.salary_max ? `<span>₹${j.salary_min} – ₹${j.salary_max}</span>` : ""}
          ${j.created ? `<span>Posted ${new Date(j.created).toLocaleDateString()}</span>` : ""}
        </div>
        ${j.description_snippet ? `<p class="job-snippet">${j.description_snippet}…</p>` : ""}
        <div class="job-card-actions">
          <button class="btn btn-outline btn-sm" onclick="viewJobDetails(${i})">View details</button>
          <button class="btn btn-sm ${saved ? 'btn-saved' : 'btn-outline'}" onclick="handleCardSaveToggle(${i}, this)">
            ${saved ? '🔖 Saved' : '🔖 Save'}
          </button>
          ${j.url ? `<a class="btn btn-primary btn-sm" href="${j.url}" target="_blank" rel="noopener">Apply →</a>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function handleCardSaveToggle(index, btnElement) {
  const job = currentJobsList[index];
  if (!job) return;

  if (typeof toggleSaveJob === "function") {
    const nowSaved = toggleSaveJob(job);
    if (nowSaved) {
      btnElement.classList.remove("btn-outline");
      btnElement.classList.add("btn-saved");
      btnElement.textContent = "🔖 Saved";
    } else {
      btnElement.classList.remove("btn-saved");
      btnElement.classList.add("btn-outline");
      btnElement.textContent = "🔖 Save";
    }
  }
}

function wireJobSearch(jobs) {
  const searchInput = document.getElementById("jobSearchInput");
  if (!searchInput) return;

  // Auto-fill from user profile job search field if available
  if (typeof getSession === "function") {
    const user = getSession();
    if (user && user.job_search_field && !searchInput.value) {
      // Don't force strict filter immediately, but hint / placeholder option
    }
  }

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = jobs.filter(j =>
      (j.title || "").toLowerCase().includes(q) ||
      (j.company || "").toLowerCase().includes(q) ||
      (j.location || "").toLowerCase().includes(q)
    );
    renderJobs(filtered);
  });
}

function viewJobDetails(index) {
  const job = currentJobsList[index];
  if (!job) return;
  sessionStorage.setItem("pluto_selectedJob", JSON.stringify(job));
  window.location.href = "job-details.html";
}

/* ---------------- job-details.html ---------------- */
const jobDetailCard = document.getElementById("jobDetailCard");
if (jobDetailCard) {
  const raw = sessionStorage.getItem("pluto_selectedJob");
  const emptyState = document.getElementById("jobDetailEmpty");

  if (!raw) {
    jobDetailCard.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  } else {
    const job = JSON.parse(raw);
    document.getElementById("jobTitle").textContent = job.title || "Untitled role";
    document.getElementById("jobCompany").textContent = job.company || "—";
    document.getElementById("jobLocation").textContent = job.location || "—";
    document.getElementById("jobSalary").textContent =
      job.salary_min && job.salary_max ? `₹${job.salary_min} – ₹${job.salary_max}` : "Not disclosed";
    document.getElementById("jobPosted").textContent =
      job.created ? new Date(job.created).toLocaleDateString() : "—";
    document.getElementById("jobDescription").textContent =
      job.description_snippet || "No description available.";

    const applyLink = document.getElementById("jobApplyLink");
    if (job.url) {
      applyLink.href = job.url;
    } else {
      applyLink.style.display = "none";
    }

    const saveBtn = document.getElementById("jobSaveBtn");
    if (saveBtn) {
      const updateSaveBtnState = () => {
        const saved = typeof isJobSaved === "function" ? isJobSaved(job) : false;
        saveBtn.textContent = saved ? "🔖 Saved" : "🔖 Save job";
        if (saved) {
          saveBtn.classList.remove("btn-outline");
          saveBtn.classList.add("btn-saved");
        } else {
          saveBtn.classList.remove("btn-saved");
          saveBtn.classList.add("btn-outline");
        }
      };

      updateSaveBtnState();

      saveBtn.addEventListener("click", () => {
        if (typeof toggleSaveJob === "function") {
          toggleSaveJob(job);
          updateSaveBtnState();
        }
      });
    }
  }
}
