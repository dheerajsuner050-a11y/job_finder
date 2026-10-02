import re
from datetime import datetime
import pdfplumber

from skills_db import SKILLS_DB

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF resume."""
    text_chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_chunks.append(page_text)
    return "\n".join(text_chunks)


# ---------------------------------------------------------------------------
# Contact info extraction
# ---------------------------------------------------------------------------

PHONE_REGEX = re.compile(
    r"(?:(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\d{0,3})"
)

# Stricter secondary check: a valid phone-like number needs 10-13 digits total
def extract_mobile_number(text: str) -> str | None:
    candidates = PHONE_REGEX.findall(text)
    for candidate in candidates:
        digits = re.sub(r"\D", "", candidate)
        if 10 <= len(digits) <= 13:
            return candidate.strip()
    return None


EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

def extract_email(text: str) -> str | None:
    match = EMAIL_REGEX.search(text)
    return match.group(0) if match else None


LINKEDIN_REGEX = re.compile(r"(https?://)?(www\.)?linkedin\.com/[a-zA-Z0-9_/\-]+")

def extract_linkedin(text: str) -> str | None:
    match = LINKEDIN_REGEX.search(text)
    return match.group(0) if match else None


# ---------------------------------------------------------------------------
# Skills extraction
# ---------------------------------------------------------------------------

def extract_skills(text: str) -> list[str]:
    lower_text = text.lower()
    found = []
    for skill in SKILLS_DB:
        # word-boundary-ish match so "r" doesn't match inside "prepare" etc.
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(skill) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, lower_text):
            found.append(skill)
    return sorted(set(found))


# ---------------------------------------------------------------------------
# Experience extraction
# ---------------------------------------------------------------------------

YEAR_RANGE_REGEX = re.compile(
    r"(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(present|current|20\d{2}|19\d{2})",
    re.IGNORECASE,
)

EXPLICIT_EXPERIENCE_REGEX = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience",
    re.IGNORECASE,
)


def extract_experience_years(text: str) -> float:
    """
    Try two strategies:
    1. Look for an explicit "X years of experience" statement.
    2. Otherwise, sum up date ranges found in the work-history section.
    """
    explicit = EXPLICIT_EXPERIENCE_REGEX.search(text)
    if explicit:
        try:
            return float(explicit.group(1))
        except ValueError:
            pass

    total_months = 0
    current_year = datetime.now().year
    for start, end in YEAR_RANGE_REGEX.findall(text):
        start_year = int(start)
        end_year = current_year if end.lower() in ("present", "current") else int(end)
        if end_year >= start_year:
            total_months += (end_year - start_year) * 12

    return round(total_months / 12, 1) if total_months else 0.0


# ---------------------------------------------------------------------------
# Section detection (used later for ATS formatting score)
# ---------------------------------------------------------------------------

SECTION_HEADERS = [
    "education", "experience", "work experience", "employment history",
    "skills", "projects", "certifications", "summary", "objective",
    "achievements", "publications",
]


def detect_sections(text: str) -> list[str]:
    lower_text = text.lower()
    return [header for header in SECTION_HEADERS if header in lower_text]


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def parse_resume(file_path: str) -> dict:
    text = extract_text_from_pdf(file_path)

    return {
        "raw_text_length": len(text),
        "email": extract_email(text),
        "mobile_number": extract_mobile_number(text),
        "linkedin": extract_linkedin(text),
        "skills": extract_skills(text),
        "experience_years": extract_experience_years(text),
        "sections_found": detect_sections(text),
        "raw_text": text,  # kept for downstream ATS scoring / job search
    }
