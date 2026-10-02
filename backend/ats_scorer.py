"""
ATS (Applicant Tracking System) score simulation.
Weighted scoring breakdown (0-100 total):
- Keywords: 35 max
- Skills match: 25 max
- Formatting: 15 max
- Sections: 10 max
- Experience & Impact: 10 max
- Contact & Readability: 5 max
"""

MAX_SCORE = 100

WEIGHTS = {
    "Keywords": 35,
    "Skills Match": 25,
    "Formatting": 15,
    "Sections": 10,
    "Experience & Impact": 10,
    "Contact & Readability": 5,
}

REQUIRED_SECTIONS = ["education", "experience", "skills"]


def score_keywords(raw_text: str, target_skills: list[str] | None) -> float:
    text_len = len(raw_text)
    if text_len < 200:
        return 5.0
    if target_skills:
        target_set = {s.lower() for s in target_skills}
        if not target_set:
            return 15.0
        found_count = sum(1 for s in target_set if s in raw_text.lower())
        ratio = found_count / len(target_set)
        return round(min(ratio, 1.0) * WEIGHTS["Keywords"], 1)
    
    # Generic keyword density check based on length & word variety
    words = set(raw_text.lower().split())
    ratio = min(len(words) / 180, 1.0)
    return round(ratio * WEIGHTS["Keywords"], 1)


def score_skills_match(skills_found: list[str], target_skills: list[str] | None) -> float:
    if target_skills:
        target_set = {s.lower() for s in target_skills}
        if not target_set:
            return 10.0
        matched = target_set.intersection({s.lower() for s in skills_found})
        ratio = len(matched) / len(target_set)
        return round(min(ratio, 1.0) * WEIGHTS["Skills Match"], 1)

    ratio = min(len(skills_found) / 8, 1.0)
    return round(ratio * WEIGHTS["Skills Match"], 1)


def score_formatting(raw_text: str) -> float:
    # Formatting penalties for bad characters, tables or raw text length
    length = len(raw_text)
    score = WEIGHTS["Formatting"]
    if length < 800 or length > 8000:
        score -= 4
    if "\t" in raw_text:
        score -= 2
    return round(max(3.0, score), 1)


def score_sections(sections_found: list[str]) -> float:
    found_required = [s for s in REQUIRED_SECTIONS if s in [sec.lower() for sec in sections_found]]
    ratio = len(found_required) / len(REQUIRED_SECTIONS)
    return round(ratio * WEIGHTS["Sections"], 1)


def score_experience_impact(years: float, raw_text: str) -> float:
    # Score years + presence of impact metrics (numbers/percentages)
    ratio_years = min(years / 5, 1.0) * 0.6
    has_metrics = bool(re_search_metrics(raw_text))
    impact_bonus = 0.4 if has_metrics else 0.2
    return round((ratio_years + impact_bonus) * WEIGHTS["Experience & Impact"], 1)


def re_search_metrics(text: str) -> bool:
    import re
    return bool(re.search(r"\b(?:\d+%\s*|\$\d+|\d+\s*x|\d+\s*users|\d+\s*projects)\b", text, re.I))


def score_contact_readability(parsed: dict) -> float:
    score = 0.0
    if parsed.get("email"):
        score += 2.0
    if parsed.get("mobile_number"):
        score += 1.5
    if parsed.get("linkedin"):
        score += 1.5
    return round(min(score, WEIGHTS["Contact & Readability"]), 1)


def compute_ats_score(parsed_resume: dict, target_skills: list[str] | None = None) -> dict:
    raw_text = parsed_resume.get("raw_text", "")
    skills_found = parsed_resume.get("skills", [])
    years = parsed_resume.get("experience_years", 0)
    sections_found = parsed_resume.get("sections_found", [])

    kw_score = score_keywords(raw_text, target_skills)
    sk_score = score_skills_match(skills_found, target_skills)
    fmt_score = score_formatting(raw_text)
    sec_score = score_sections(sections_found)
    exp_score = score_experience_impact(years, raw_text)
    cnt_score = score_contact_readability(parsed_resume)

    breakdown = {
        "Keywords": kw_score,
        "Skills Match": sk_score,
        "Formatting": fmt_score,
        "Sections": sec_score,
        "Experience & Impact": exp_score,
        "Contact & Readability": cnt_score,
    }

    total = round(sum(breakdown.values()), 1)

    return {
        "overall_score": min(total, 100.0),
        "max_score": MAX_SCORE,
        "breakdown": breakdown,
        "max_breakdown": WEIGHTS,
        "verdict": get_verdict(total),
    }


def get_verdict(score: float) -> str:
    if score >= 80:
        return "Excellent — high pass rate across top ATS screeners"
    if score >= 60:
        return "Good — passes most ATS screeners with minor fixes"
    if score >= 40:
        return "Fair — needs optimization to pass strict ATS screeners"
    return "Needs Rework — missing critical keywords and sections"
