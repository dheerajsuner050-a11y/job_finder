"""
ATS (Applicant Tracking System) score simulation.

Real ATS engines are proprietary, so this gives a realistic, explainable
approximation split into weighted categories. The breakdown is what you
feed into a chart (bar / radar) on the frontend.
"""

from skills_db import SKILLS_DB

MAX_SCORE = 100

WEIGHTS = {
    "contact_info": 15,
    "skills_match": 35,
    "experience": 20,
    "formatting_sections": 20,
    "resume_length": 10,
}

REQUIRED_SECTIONS = ["education", "experience", "skills"]


def score_contact_info(email: str | None, mobile: str | None) -> float:
    score = 0
    if email:
        score += WEIGHTS["contact_info"] * 0.5
    if mobile:
        score += WEIGHTS["contact_info"] * 0.5
    return round(score, 1)


def score_skills_match(skills_found: list[str], target_skills: list[str] | None) -> float:
    """
    If the user supplies a target job description / skill list, score against
    that (real-world ATS keyword matching). Otherwise score against the
    breadth of skills found relative to the general skills database, capped.
    """
    if target_skills:
        target_set = {s.lower() for s in target_skills}
        if not target_set:
            return 0.0
        matched = target_set.intersection(set(skills_found))
        ratio = len(matched) / len(target_set)
        return round(min(ratio, 1.0) * WEIGHTS["skills_match"], 1)

    # No JD supplied — reward having a solid, varied skill set (10+ skills = full marks)
    ratio = min(len(skills_found) / 10, 1.0)
    return round(ratio * WEIGHTS["skills_match"], 1)


def score_experience(years: float) -> float:
    # 5+ years = full marks, scaled linearly below that
    ratio = min(years / 5, 1.0)
    return round(ratio * WEIGHTS["experience"], 1)


def score_formatting_sections(sections_found: list[str]) -> float:
    found_required = [s for s in REQUIRED_SECTIONS if s in sections_found]
    ratio = len(found_required) / len(REQUIRED_SECTIONS)
    return round(ratio * WEIGHTS["formatting_sections"], 1)


def score_resume_length(raw_text_length: int) -> float:
    # Ideal resume: roughly 1500–6000 characters of text (~1-2 pages)
    if 1500 <= raw_text_length <= 6000:
        return WEIGHTS["resume_length"]
    if raw_text_length < 1500:
        ratio = raw_text_length / 1500
    else:
        ratio = max(0, 1 - (raw_text_length - 6000) / 6000)
    return round(max(0, ratio) * WEIGHTS["resume_length"], 1)


def compute_ats_score(parsed_resume: dict, target_skills: list[str] | None = None) -> dict:
    contact_score = score_contact_info(parsed_resume.get("email"), parsed_resume.get("mobile_number"))
    skills_score = score_skills_match(parsed_resume.get("skills", []), target_skills)
    experience_score = score_experience(parsed_resume.get("experience_years", 0))
    formatting_score = score_formatting_sections(parsed_resume.get("sections_found", []))
    length_score = score_resume_length(parsed_resume.get("raw_text_length", 0))

    breakdown = {
        "Contact Info": contact_score,
        "Skills Match": skills_score,
        "Experience": experience_score,
        "Formatting & Sections": formatting_score,
        "Resume Length": length_score,
    }

    total = round(sum(breakdown.values()), 1)

    return {
        "overall_score": total,
        "max_score": MAX_SCORE,
        "breakdown": breakdown,
        "max_breakdown": WEIGHTS,
        "verdict": get_verdict(total),
    }


def get_verdict(score: float) -> str:
    if score >= 80:
        return "Excellent — highly likely to pass ATS filters"
    if score >= 60:
        return "Good — should pass most ATS filters with minor tweaks"
    if score >= 40:
        return "Fair — needs improvement to reliably pass ATS filters"
    return "Poor — significant revisions recommended"
