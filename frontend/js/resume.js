/* ============================================================
   PLUTO — resume.js  (runs on upload-resume.html)
   ============================================================ */

// Auto-detect backend API URL: use http://localhost:8000 for local dev (file://, port 5500/8000, or local dev server), otherwise relative path for deployment
const API_BASE = (window.location.protocol === "file:" || window.location.port === "5500" || window.location.port === "8000" || window.location.port === "3000")
  ? "http://localhost:8000"
  : "";


const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fnameEl = document.getElementById("fname");
const optToggle = document.getElementById("optToggle");
const optFields = document.getElementById("optFields");
const submitBtn = document.getElementById("submitBtn");
const errorBanner = document.getElementById("uploadError");
const loadingRow = document.getElementById("loadingRow");

let selectedFile = null;

if (dropzone) {
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });

  ["dragover", "dragenter"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
  );
  dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
}

if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
}

function handleFile(f) {
  if (f.type !== "application/pdf") {
    showBanner(errorBanner, "Only PDF resumes are supported right now.");
    return;
  }
  selectedFile = f;
  fnameEl.textContent = f.name;
  hideBanner(errorBanner);
}

if (optToggle) {
  optToggle.addEventListener("click", () => {
    const open = optFields.classList.toggle("open");
    optToggle.textContent = open ? "− add target job details (optional)" : "+ add target job details (optional)";
  });
}

if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showBanner(errorBanner, "Attach a PDF resume first.");
      return;
    }
    hideBanner(errorBanner);

    const targetSkills = document.getElementById("targetSkills")?.value.trim() || "";
    const location = document.getElementById("location")?.value.trim() || "";

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (targetSkills) formData.append("target_skills", targetSkills);
    if (location) formData.append("location", location);

    submitBtn.disabled = true;
    submitBtn.textContent = "Analyzing…";
    loadingRow.style.display = "flex";

    try {
      const res = await fetch(`${API_BASE}/analyze-resume`, { method: "POST", body: formData });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();

      // Save for ats-result.html and jobs.html to read
      sessionStorage.setItem("pluto_resumeAnalysis", JSON.stringify(data));
      sessionStorage.setItem("pluto_resumeFileName", selectedFile.name);

      // Auto-extract and populate user profile fields from resume without asking during login
      if (data.resume_data) {
        const rd = data.resume_data;
        const profileUpdates = {};
        if (rd.phone || rd.mobile_number) profileUpdates.phone = rd.phone || rd.mobile_number;
        if (rd.address || rd.location) profileUpdates.address = rd.address || rd.location;
        if (rd.dob) profileUpdates.dob = rd.dob;
        if (rd.clg_name || rd.university) profileUpdates.clg_name = rd.clg_name || rd.university;
        if (rd.linkedin_id || rd.linkedin) profileUpdates.linkedin = rd.linkedin_id || rd.linkedin;
        if (rd.job_search_field || rd.latest_job_title) profileUpdates.job_search_field = rd.job_search_field || rd.latest_job_title;
        if (rd.name) profileUpdates.name = rd.name;

        if (typeof updateUserProfile === "function") {
          updateUserProfile(profileUpdates);
        }
      }

      window.location.href = "ats-result.html";
    } catch (err) {
      showBanner(errorBanner, err.message || "Could not reach the backend. Check that the server is running and API_BASE is correct.");
    } finally {
      loadingRow.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.textContent = "Analyze Resume";
    }
  });
}
