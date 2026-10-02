/* ============================================================
   PLUTO — ats.js (runs on ats-result.html)
   ============================================================ */

(function () {
  const raw = sessionStorage.getItem("pluto_resumeAnalysis");
  const emptyState = document.getElementById("emptyState");
  const resultBody = document.getElementById("resultBody");

  if (!raw) {
    if (emptyState) emptyState.style.display = "block";
    if (resultBody) resultBody.style.display = "none";
    return;
  }

  const data = JSON.parse(raw);
  const fileName = sessionStorage.getItem("pluto_resumeFileName") || "your resume";

  if (emptyState) emptyState.style.display = "none";
  if (resultBody) resultBody.style.display = "block";

  document.getElementById("resultFileName").textContent = fileName;

  const atsScore = data.ats_score || {};
  const resumeData = data.resume_data || {};
  const jobSuggestions = data.job_suggestions || [];

  renderGauge(atsScore);
  renderBreakdown(atsScore);
  renderATSEngines(resumeData, atsScore.breakdown || {});
  renderFields(resumeData);
  renderSkillsComparison(resumeData);
  renderImprovementTips(resumeData, atsScore);
  renderJobSuggestions(jobSuggestions, atsScore.overall_score || 75);
})();

function tierColor(score, max) {
  const ratio = score / max;
  const styles = getComputedStyle(document.documentElement);
  if (ratio >= 0.7) return styles.getPropertyValue("--success").trim() || "#1F9D55";
  if (ratio >= 0.4) return styles.getPropertyValue("--warning").trim() || "#E0A100";
  return styles.getPropertyValue("--danger").trim() || "#D64545";
}

function renderGauge(ats) {
  const score = ats.overall_score ?? 0;
  const max = ats.max_score ?? 100;
  const color = tierColor(score, max);

  const circumference = 2 * Math.PI * 66;
  const fg = document.getElementById("gaugeFg");
  if (fg) {
    fg.style.stroke = color;
    fg.style.strokeDasharray = `${circumference}`;
    fg.style.strokeDashoffset = `${circumference}`;
    requestAnimationFrame(() => {
      const offset = circumference - (score / max) * circumference;
      fg.style.strokeDashoffset = `${offset}`;
    });
  }

  const numEl = document.getElementById("gaugeNum");
  if (numEl) {
    numEl.textContent = Math.round(score);
    numEl.style.color = color;
  }

  const wrap = document.getElementById("gaugeWrap");
  if (wrap) {
    wrap.classList.add("scanning");
    setTimeout(() => wrap.classList.remove("scanning"), 1700);
  }

  const verdictPill = document.getElementById("verdictPill");
  if (verdictPill) {
    verdictPill.style.background = color;
    verdictPill.style.color = "#fff";
    if (score >= 80) verdictPill.textContent = "Pass — High ATS Match";
    else if (score >= 60) verdictPill.textContent = "Risk — Needs Minor Tweaks";
    else verdictPill.textContent = "Fail — Requires Optimization";
  }

  const verdictText = document.getElementById("verdictText");
  if (verdictText) verdictText.textContent = ats.verdict || "";
}

function renderBreakdown(ats) {
  const container = document.getElementById("breakdownBars");
  if (!container) return;

  const breakdown = ats.breakdown || {
    "Keywords": 25,
    "Skills Match": 20,
    "Formatting": 12,
    "Sections": 8,
    "Experience & Impact": 7,
    "Contact & Readability": 4
  };
  const maxBreakdown = ats.max_breakdown || {
    "Keywords": 35,
    "Skills Match": 25,
    "Formatting": 15,
    "Sections": 10,
    "Experience & Impact": 10,
    "Contact & Readability": 5
  };

  container.innerHTML = Object.keys(breakdown).map(key => {
    const val = breakdown[key] || 0;
    const cap = maxBreakdown[key] || 1;
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${key}</span><span>${val} / ${cap}</span></div>
        <div class="bar-track"><div class="bar-fill" data-fill style="background:${tierColor(val, cap)}"></div></div>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    Object.keys(breakdown).forEach((key, i) => {
      const val = breakdown[key] || 0;
      const cap = maxBreakdown[key] || 1;
      const bar = container.querySelectorAll("[data-fill]")[i];
      if (bar) bar.style.width = `${Math.min((val / cap) * 100, 100)}%`;
    });
  });
}

function renderATSEngines(resumeData, breakdown) {
  const grid = document.getElementById("atsEngineGrid");
  if (!grid || typeof ATS_PROFILES === "undefined") return;

  grid.innerHTML = Object.keys(ATS_PROFILES).map(key => {
    const profile = ATS_PROFILES[key];
    const result = profile.evaluate(resumeData, breakdown);
    return `
      <div class="ats-card">
        <div class="ats-card-head">
          <div class="ats-icon">${profile.icon}</div>
          <div class="ats-title-wrap">
            <div class="ats-name">${profile.name}</div>
            <div class="ats-score-badge">${result.score}/100</div>
          </div>
          <div class="ats-status-pill ${result.status.class}">${result.status.label}</div>
        </div>
        <p class="ats-desc">${profile.desc}</p>
        <ul class="ats-reasons-list">
          ${result.reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;
  }).join("");
}

function renderFields(rd) {
  const grid = document.getElementById("fieldsGrid");
  if (!grid) return;

  const fields = [
    ["Candidate Name", rd.name],
    ["Mobile Number", rd.mobile_number],
    ["Email Address", rd.email],
    ["LinkedIn Profile", rd.linkedin],
    ["GitHub / Portfolio", rd.github],
    ["Location", rd.location],
    ["University / College", rd.university],
    ["Degree", rd.degree],
    ["Graduation Year", rd.graduation_year],
    ["CGPA / Score", rd.cgpa],
    ["Total Experience", rd.experience_years != null ? `${rd.experience_years} years` : null],
    ["Latest Job Title", rd.latest_job_title],
  ];

  grid.innerHTML = fields.map(([k, v]) => `
    <div class="field-item">
      <div class="k">${k}</div>
      <div class="v ${v ? "" : "missing"}" title="${v || 'Not found'}">${v || "Not found"}</div>
    </div>
  `).join("");
}

function renderSkillsComparison(rd) {
  const matchedContainer = document.getElementById("matchedSkillsChips");
  const missingContainer = document.getElementById("missingSkillsChips");
  if (!matchedContainer || !missingContainer) return;

  const resumeSkills = (rd.skills || []).map(s => s.toLowerCase());
  
  // Standard target benchmark skills if none specified
  const recommendedSkills = [
    "python", "javascript", "sql", "git", "react", "fastapi", "docker",
    "rest api", "data analysis", "problem solving", "communication", "agile"
  ];

  const matched = [];
  const missing = [];

  resumeSkills.forEach(s => matched.push(s));

  recommendedSkills.forEach(s => {
    if (!resumeSkills.includes(s) && !matched.includes(s)) {
      missing.push(s);
    }
  });

  matchedContainer.innerHTML = matched.length
    ? matched.map(s => `<span class="chip chip-matched">✓ ${s}</span>`).join("")
    : `<span class="chip missing">No skills extracted</span>`;

  missingContainer.innerHTML = missing.length
    ? missing.map(s => `
        <span class="chip chip-missing">
          ${s}
          <button class="chip-copy-btn" onclick="copySkillToClipboard('${s}')" title="Copy missing skill">+ Add</button>
        </span>
      `).join("")
    : `<span class="chip chip-matched">✓ Great job! All target skills found.</span>`;
}

function copySkillToClipboard(skill) {
  navigator.clipboard.writeText(skill).then(() => {
    showToast(`Copied "${skill}" to clipboard!`);
  }).catch(() => {
    showToast(`Skill "${skill}" copied!`);
  });
}

function showToast(msg) {
  const toast = document.getElementById("toastMessage");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function renderImprovementTips(rd, ats) {
  const tipsList = document.getElementById("tipsList");
  const previewScoreEl = document.getElementById("previewScoreNum");
  if (!tipsList) return;

  const baseScore = Math.round(ats.overall_score || 70);
  if (previewScoreEl) previewScoreEl.textContent = baseScore;

  const tips = [];

  if (!rd.email) {
    tips.push({
      id: "tip_email",
      priority: "HIGH",
      points: 8,
      issue: "Missing Contact Email",
      why: "ATS parsers reject applications without a recognized primary email address.",
      fix: "Add your email (e.g. name@domain.com) at the top of your resume contact header.",
      before: "John Doe | 9876543210 | City, Country",
      after: "John Doe | john.doe@gmail.com | 9876543210 | City, Country"
    });
  }

  if (!rd.linkedin) {
    tips.push({
      id: "tip_linkedin",
      priority: "HIGH",
      points: 7,
      issue: "Missing LinkedIn Profile URL",
      why: "Recruiters and modern ATS engines filter candidates by verified LinkedIn links.",
      fix: "Include a clean LinkedIn URL (linkedin.com/in/username) in your contact header.",
      before: "Jane Smith | jane@email.com | Software Engineer",
      after: "Jane Smith | linkedin.com/in/janesmith | jane@email.com"
    });
  }

  if ((rd.skills || []).length < 8) {
    tips.push({
      id: "tip_skills",
      priority: "HIGH",
      points: 10,
      issue: "Low Technical Skill Density",
      why: "ATS search filters rank candidates higher when core technical keywords are explicitly listed.",
      fix: "Create a dedicated 'Technical Skills' section grouping tools, languages, and frameworks.",
      before: "Skills: Coding, Web Development, Databases",
      after: "Skills: Python, JavaScript, React, SQL, FastAPI, Docker, REST APIs, Git"
    });
  }

  if ((ats.breakdown && ats.breakdown["Experience & Impact"] < 7)) {
    tips.push({
      id: "tip_impact",
      priority: "MEDIUM",
      points: 8,
      issue: "Missing Quantifiable Achievement Metrics",
      why: "Impact-driven bullet points score 40% higher in resume screening algorithms.",
      fix: "Add metrics, percentages, or numbers to bullet points (e.g. %, $, X users).",
      before: "Developed backend APIs for web application.",
      after: "Developed 12+ FastAPI backend microservices, reducing API latency by 35%."
    });
  }

  if (!rd.degree || !rd.university) {
    tips.push({
      id: "tip_education",
      priority: "MEDIUM",
      points: 5,
      issue: "Unclear Education Degree Header",
      why: "ATS parsers look for explicit degree keywords (B.Tech, B.S., Master) and university names.",
      fix: "Format education section clearly with Degree, Institution Name, and Graduation Year.",
      before: "Studied Computer Science 2020-2024",
      after: "B.Tech in Computer Science — ABC University (2024)"
    });
  }

  tips.push({
    id: "tip_keywords",
    priority: "LOW",
    points: 4,
    issue: "Optimize Keyword Action Verbs",
    why: "Action verbs at the start of bullet points pass NLP verb extractors.",
    fix: "Start bullet points with strong verbs: 'Architected', 'Implemented', 'Optimized', 'Engineered'.",
    before: "Responsible for managing software updates.",
    after: "Architected automated CI/CD pipeline, streamlining deployment speed by 50%."
  });

  tipsList.innerHTML = tips.map(tip => `
    <div class="tip-card" id="card_${tip.id}">
      <div class="tip-top">
        <label class="tip-checkbox-label">
          <input type="checkbox" class="tip-checkbox" data-points="${tip.points}" onchange="updateScorePreview(${baseScore})" />
          <span class="tip-priority badge-${tip.priority.toLowerCase()}">${tip.priority} PRIORITY</span>
          <span class="tip-points-boost">+${tip.points} pts</span>
        </label>
      </div>
      <div class="tip-title">${tip.issue}</div>
      <p class="tip-desc"><strong>Why it matters:</strong> ${tip.why}</p>
      <p class="tip-desc"><strong>How to fix:</strong> ${tip.fix}</p>
      <div class="tip-example-box">
        <div class="ex-label ex-before">❌ BEFORE</div>
        <div class="ex-code">${tip.before}</div>
        <div class="ex-label ex-after">✓ AFTER</div>
        <div class="ex-code">${tip.after}</div>
      </div>
    </div>
  `).join("");
}

function updateScorePreview(baseScore) {
  const checkboxes = document.querySelectorAll(".tip-checkbox");
  let addedPoints = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      addedPoints += parseInt(cb.getAttribute("data-points") || "0", 10);
    }
  });
  const newScore = Math.min(100, baseScore + addedPoints);
  const previewScoreEl = document.getElementById("previewScoreNum");
  if (previewScoreEl) {
    previewScoreEl.textContent = newScore;
  }
}

function renderJobSuggestions(jobs, currentScore) {
  const grid = document.getElementById("jobSuggestionsGrid");
  if (!grid) return;

  if (!jobs || !jobs.length) {
    grid.innerHTML = `<p class="hint">No direct job matches returned yet. Explore all open jobs on the Jobs tab.</p>`;
    return;
  }

  const savedJobs = getSavedJobs();

  grid.innerHTML = jobs.slice(0, 4).map((j, idx) => {
    const isSaved = savedJobs.some(sj => sj.id === (j.id || `${j.company}_${j.title}`));
    return `
      <div class="job-card">
        <div class="job-card-top">
          <div>
            <div class="job-title">${j.title || "Software Engineer"}</div>
            <div class="job-company">${j.company || "Tech Corp"} — ${j.location || "Remote"}</div>
          </div>
          <button class="btn-bookmark ${isSaved ? 'saved' : ''}" onclick="toggleSaveJob(this, '${escapeQuotes(j.title)}', '${escapeQuotes(j.company)}', '${escapeQuotes(j.location)}', '${j.redirect_url || '#'}', ${currentScore})">
            ${isSaved ? '★ Saved' : '☆ Save Job'}
          </button>
        </div>
        <div class="job-snippet">${j.description ? j.description.slice(0, 120) + "..." : "Matching candidate skills and experience profile."}</div>
        <div class="job-card-actions">
          <a href="${j.redirect_url || 'jobs.html'}" target="_blank" class="btn btn-outline btn-sm">Apply Now ↗</a>
        </div>
      </div>
    `;
  }).join("");
}

function getSavedJobs() {
  try {
    return JSON.parse(localStorage.getItem("pluto_savedJobs") || "[]");
  } catch (e) {
    return [];
  }
}

function saveSavedJobs(jobs) {
  localStorage.setItem("pluto_savedJobs", JSON.stringify(jobs));
}

function toggleSaveJob(btn, title, company, location, link, score) {
  const savedJobs = getSavedJobs();
  const id = `${company}_${title}`;
  const index = savedJobs.findIndex(j => j.id === id);

  if (index >= 0) {
    savedJobs.splice(index, 1);
    btn.classList.remove("saved");
    btn.textContent = "☆ Save Job";
    showToast("Job removed from saved bookmarks.");
  } else {
    savedJobs.push({
      id,
      title,
      company,
      location,
      link,
      score: Math.round(score),
      savedAt: new Date().toISOString()
    });
    btn.classList.add("saved");
    btn.textContent = "★ Saved";
    showToast("Job bookmarked successfully!");
  }
  saveSavedJobs(savedJobs);
}

function escapeQuotes(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
