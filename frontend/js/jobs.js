/* ============================================================
   PLUTO — jobs.js  (runs on jobs.html and job-details.html)
   ============================================================ */

function loadAnalysis() {
  const raw = sessionStorage.getItem("pluto_resumeAnalysis");
  return raw ? JSON.parse(raw) : null;
}

/* ---------------- jobs.html ---------------- */
const jobsList = document.getElementById("jobsList");
if (jobsList) {
  const data = loadAnalysis();
  const emptyState = document.getElementById("jobsEmptyState");

  if (!data) {
    jobsList.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  } else {
    renderJobs(data.job_suggestions || [], data.job_search_error);
    wireJobSearch(data.job_suggestions || []);
  }
}

function renderJobs(jobs, error) {
  const container = document.getElementById("jobsList");
  const emptyState = document.getElementById("jobsEmptyState");

  if (error) {
    container.innerHTML = `<div class="form-error-banner show">Job search unavailable: ${error}</div>`;
    return;
  }
  if (!jobs.length) {
    container.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  container.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = jobs.map((j, i) => `
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
        ${j.url ? `<a class="btn btn-primary btn-sm" href="${j.url}" target="_blank" rel="noopener">Apply →</a>` : ""}
      </div>
    </div>
  `).join("");
}

function wireJobSearch(jobs) {
  const searchInput = document.getElementById("jobSearchInput");
  if (!searchInput) return;
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
  const data = loadAnalysis();
  if (!data) return;
  sessionStorage.setItem("pluto_selectedJob", JSON.stringify(data.job_suggestions[index]));
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
  }
}
