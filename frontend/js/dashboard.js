/* ============================================================
   PLUTO — dashboard.js  (runs on dashboard.html)
   ============================================================ */

requireAuth();

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
});
