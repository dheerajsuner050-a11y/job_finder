/* ============================================================
   PLUTO — atsProfiles.js
   Configuration and rules engine for per-ATS scores:
   Workday, Greenhouse, Lever, Taleo, iCIMS
   ============================================================ */

const ATS_PROFILES = {
  Workday: {
    id: "workday",
    name: "Workday ATS",
    icon: "💼",
    desc: "Enterprise ATS requiring structured section headers and explicit contact info.",
    evaluate: function(resumeData, breakdown) {
      let score = 0;
      score += (breakdown["Sections"] / 10) * 25;
      score += (breakdown["Contact & Readability"] / 5) * 20;
      score += (breakdown["Keywords"] / 35) * 25;
      score += (breakdown["Skills Match"] / 25) * 15;
      score += (breakdown["Formatting"] / 15) * 15;

      const reasons = [];
      if (resumeData.email && resumeData.mobile_number) {
        reasons.push("Complete contact details parsed cleanly (+15 pts).");
      } else {
        reasons.push("Missing email or mobile contact field (-15 pts penalty).");
      }
      if ((breakdown["Sections"] || 0) >= 8) {
        reasons.push("Standard headers detected (Education, Experience, Skills).");
      } else {
        reasons.push("Missing standard section headers required by Workday.");
      }

      score = Math.min(100, Math.round(score));
      return { score, status: getStatus(score), reasons };
    }
  },

  Greenhouse: {
    id: "greenhouse",
    name: "Greenhouse",
    icon: "🌱",
    desc: "Tech startup favorite that heavily indexes keyword density and skill alignment.",
    evaluate: function(resumeData, breakdown) {
      let score = 0;
      score += (breakdown["Keywords"] / 35) * 40;
      score += (breakdown["Skills Match"] / 25) * 35;
      score += (breakdown["Experience & Impact"] / 10) * 15;
      score += (breakdown["Formatting"] / 15) * 10;

      const reasons = [];
      const skillCount = (resumeData.skills || []).length;
      if (skillCount >= 6) {
        reasons.push(`Strong keyword match: ${skillCount} tech skills identified.`);
      } else {
        reasons.push("Low skill keyword density found; add relevant technical skills.");
      }
      if (resumeData.linkedin) {
        reasons.push("LinkedIn profile URL present for recruiter screening.");
      } else {
        reasons.push("No LinkedIn profile detected (-10 pts penalty).");
      }

      score = Math.min(100, Math.round(score));
      return { score, status: getStatus(score), reasons };
    }
  },

  Lever: {
    id: "lever",
    name: "Lever",
    icon: "⚖️",
    desc: "Candidate-centric ATS focusing on impact metrics, skills, and experience length.",
    evaluate: function(resumeData, breakdown) {
      let score = 0;
      score += (breakdown["Skills Match"] / 25) * 35;
      score += (breakdown["Experience & Impact"] / 10) * 30;
      score += (breakdown["Keywords"] / 35) * 20;
      score += (breakdown["Contact & Readability"] / 5) * 15;

      const reasons = [];
      if ((resumeData.experience_years || 0) > 0) {
        reasons.push(`${resumeData.experience_years} years experience parsed accurately.`);
      } else {
        reasons.push("No quantitative work experience duration detected.");
      }
      if ((breakdown["Experience & Impact"] || 0) >= 7) {
        reasons.push("Quantifiable impact metrics (%, $, numbers) detected.");
      } else {
        reasons.push("Add measurable achievements (e.g. 'Improved efficiency by 30%').");
      }

      score = Math.min(100, Math.round(score));
      return { score, status: getStatus(score), reasons };
    }
  },

  Taleo: {
    id: "taleo",
    name: "Oracle Taleo",
    icon: "🏛️",
    desc: "Strict legacy enterprise system that heavily penalizes complex layouts or tables.",
    evaluate: function(resumeData, breakdown) {
      let score = 0;
      score += (breakdown["Formatting"] / 15) * 35;
      score += (breakdown["Sections"] / 10) * 25;
      score += (breakdown["Keywords"] / 35) * 20;
      score += (breakdown["Skills Match"] / 25) * 20;

      const reasons = [];
      if ((breakdown["Formatting"] || 0) >= 12) {
        reasons.push("Clean single-column structure passes Taleo parser.");
      } else {
        reasons.push("Potential formatting/table conflict detected (-20 pts penalty).");
      }
      if (resumeData.email) {
        reasons.push("Primary contact email parsed successfully.");
      } else {
        reasons.push("Taleo failed to extract contact email.");
      }

      score = Math.min(100, Math.round(score));
      return { score, status: getStatus(score), reasons };
    }
  },

  iCIMS: {
    id: "icims",
    name: "iCIMS",
    icon: "⚙️",
    desc: "Corporate ATS that checks strict section headers, contact info, and education.",
    evaluate: function(resumeData, breakdown) {
      let score = 0;
      score += (breakdown["Keywords"] / 35) * 30;
      score += (breakdown["Sections"] / 10) * 25;
      score += (breakdown["Skills Match"] / 25) * 20;
      score += (breakdown["Contact & Readability"] / 5) * 15;
      score += (breakdown["Formatting"] / 15) * 10;

      const reasons = [];
      if (resumeData.university || resumeData.degree) {
        reasons.push("Education credentials parsed cleanly by iCIMS.");
      } else {
        reasons.push("No explicit degree or university header recognized.");
      }
      if (resumeData.mobile_number) {
        reasons.push("Phone number extracted for recruiter outreach.");
      } else {
        reasons.push("Phone number missing from contact header.");
      }

      score = Math.min(100, Math.round(score));
      return { score, status: getStatus(score), reasons };
    }
  }
};

function getStatus(score) {
  if (score >= 80) return { label: "Pass", class: "status-pass" };
  if (score >= 60) return { label: "Risk", class: "status-risk" };
  return { label: "Fail", class: "status-fail" };
}
