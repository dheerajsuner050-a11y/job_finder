/* ============================================================
   PLUTO — ats.js  (runs on ats-result.html)
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
  renderGauge(data.ats_score);
  renderBreakdown(data.ats_score);
  renderFields(data.resume_data);
  renderSkills(data.resume_data);
})();

function tierColor(score, max) {
  const ratio = score / max;
  const styles = getComputedStyle(document.documentElement);
  if (ratio >= 0.7) return styles.getPropertyValue("--success").trim();
  if (ratio >= 0.4) return styles.getPropertyValue("--warning").trim();
  return styles.getPropertyValue("--danger").trim();
}

function renderGauge(ats) {
  const score = ats.overall_score ?? 0;
  const max = ats.max_score ?? 100;
  const color = tierColor(score, max);

  const circumference = 2 * Math.PI * 66;
  const fg = document.getElementById("gaugeFg");
  fg.style.stroke = color;
  fg.style.strokeDasharray = `${circumference}`;
  fg.style.strokeDashoffset = `${circumference}`;

  document.getElementById("gaugeNum").textContent = Math.round(score);
  document.getElementById("gaugeNum").style.color = color;

  const wrap = document.getElementById("gaugeWrap");
  wrap.classList.add("scanning");
  setTimeout(() => wrap.classList.remove("scanning"), 1700);

  requestAnimationFrame(() => {
    const offset = circumference - (score / max) * circumference;
    fg.style.strokeDashoffset = `${offset}`;
  });

  const verdictPill = document.getElementById("verdictPill");
  verdictPill.style.background = color;
  verdictPill.style.color = "#fff";
  document.getElementById("verdictText").textContent = ats.verdict || "";

  if (score >= 80) verdictPill.textContent = "Cleared";
  else if (score >= 60) verdictPill.textContent = "Cleared — minor fixes";
  else if (score >= 40) verdictPill.textContent = "On hold";
  else verdictPill.textContent = "Needs rework";
}

function renderBreakdown(ats) {
  const container = document.getElementById("breakdownBars");
  const breakdown = ats.breakdown || {};
  const maxBreakdown = ats.max_breakdown || {};

  container.innerHTML = Object.keys(breakdown).map(key => {
    const val = breakdown[key];
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
      const val = breakdown[key];
      const cap = maxBreakdown[key] || 1;
      const bar = container.querySelectorAll("[data-fill]")[i];
      if (bar) bar.style.width = `${(val / cap) * 100}%`;
    });
  });
}

function renderFields(rd) {
  const grid = document.getElementById("fieldsGrid");
  const fields = [
    ["Mobile number", rd.mobile_number],
    ["Email", rd.email],
    ["LinkedIn", rd.linkedin],
    ["Experience", rd.experience_years != null ? `${rd.experience_years} years` : null],
  ];
  grid.innerHTML = fields.map(([k, v]) => `
    <div class="field-item">
      <div class="k">${k}</div>
      <div class="v ${v ? "" : "missing"}">${v || "not found"}</div>
    </div>
  `).join("");
}

function renderSkills(rd) {
  const chipList = document.getElementById("skillsChips");
  const skills = rd.skills || [];
  chipList.innerHTML = skills.length
    ? skills.map(s => `<span class="chip">${s}</span>`).join("")
    : `<span class="chip" style="color:var(--danger); border-color:var(--danger);">no recognized skills found</span>`;
}
