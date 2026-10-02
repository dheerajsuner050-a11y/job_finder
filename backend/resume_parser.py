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
# Contact info & Links extraction
# ---------------------------------------------------------------------------

PHONE_REGEX = re.compile(
    r"(?:(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\d{0,3})"
)

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


LINKEDIN_REGEX = re.compile(r"(https?://)?(www\.)?linkedin\.com/in/[a-zA-Z0-9_/\-]+", re.I)
LINKEDIN_GENERIC_REGEX = re.compile(r"(https?://)?(www\.)?linkedin\.com/[a-zA-Z0-9_/\-]+", re.I)

def extract_linkedin(text: str) -> str | None:
    match = LINKEDIN_REGEX.search(text) or LINKEDIN_GENERIC_REGEX.search(text)
    return match.group(0) if match else None


GITHUB_REGEX = re.compile(r"(https?://)?(www\.)?github\.com/[a-zA-Z0-9_/\-]+", re.I)

def extract_github(text: str) -> str | None:
    match = GITHUB_REGEX.search(text)
    return match.group(0) if match else None


# ---------------------------------------------------------------------------
# Candidate Name Extraction
# ---------------------------------------------------------------------------

def extract_candidate_name(text: str, email: str | None = None) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:6]:
        # Ignore common non-name headers
        if re.search(r"resume|curriculum|vitae|page|contact|profile|summary|education", line, re.I):
            continue
        # Name line candidate: 2-4 words, alphabetic
        words = line.split()
        if 2 <= len(words) <= 4 and all(re.match(r"^[a-zA-Z\.\'-]+$", w) for w in words):
            return line
    if email:
        username = email.split("@")[0]
        clean_name = re.sub(r"[0-9_.]+", " ", username).strip().title()
        if len(clean_name.split()) >= 1:
            return clean_name
    return None


# ---------------------------------------------------------------------------
# Location & Education Extraction
# ---------------------------------------------------------------------------

LOCATION_REGEX = re.compile(
    r"(?:location|address|city|residing in|based in)[\s:]*([A-Za-z\s,]{3,30})", re.I
)
COMMON_CITIES = [
    "Mumbai", "Delhi", "Bengaluru", "Bangalore", "Hyderabad", "Pune", "Chennai",
    "Kolkata", "Ahmedabad", "Gurgaon", "Noida", "New York", "San Francisco",
    "London", "Toronto", "Chicago", "Seattle", "Austin", "Remote"
]

def extract_location(text: str) -> str | None:
    match = LOCATION_REGEX.search(text)
    if match:
        loc = match.group(1).strip()
        if len(loc) < 30:
            return loc
    for city in COMMON_CITIES:
        if re.search(r"\b" + re.escape(city) + r"\b", text, re.I):
            return city
    return None


UNIVERSITY_REGEX = re.compile(
    r"([A-Za-z\s&]{3,40}(?:University|Institute|College|School|IIT|NIT|BITS|Polytechnic))", re.I
)

def extract_university(text: str) -> str | None:
    match = UNIVERSITY_REGEX.search(text)
    if match:
        uni = match.group(1).strip()
        return uni[:50]
    return None


DEGREE_REGEX = re.compile(
    r"\b(B\.Tech|B\.E|B\.S|B\.A|B\.Sc|Bachelor|M\.Tech|M\.E|M\.S|M\.A|M\.Sc|Master|Ph\.D|MBA|BCA|MCA|Diploma)\b", re.I
)

def extract_degree(text: str) -> str | None:
    match = DEGREE_REGEX.search(text)
    if match:
        return match.group(0).strip()
    return None


GRAD_YEAR_REGEX = re.compile(r"\b(20\d{2}|19\d{2})\b")

def extract_graduation_year(text: str) -> str | None:
    # Look for year near education keywords
    edu_match = re.search(r"(?:education|degree|graduat|university|college)[\s\S]{0,200}", text, re.I)
    search_text = edu_match.group(0) if edu_match else text
    years = GRAD_YEAR_REGEX.findall(search_text)
    if years:
        return years[-1]
    return None


CGPA_REGEX = re.compile(r"\b(?:cgpa|gpa|score|percentage)[\s:]*([0-9]\.[0-9]{1,2}|10\.0|[0-9]{2}(?:\.[0-9])?%?)\b", re.I)

def extract_cgpa(text: str) -> str | None:
    match = CGPA_REGEX.search(text)
    if match:
        val = match.group(1).strip()
        return val if val.startswith(("CGPA", "GPA")) else f"CGPA: {val}"
    return None


# ---------------------------------------------------------------------------
# Skills extraction
# ---------------------------------------------------------------------------

def extract_skills(text: str) -> list[str]:
    lower_text = text.lower()
    found = []
    for skill in SKILLS_DB:
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(skill) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, lower_text):
            found.append(skill)
    return sorted(set(found))


# ---------------------------------------------------------------------------
# Experience & Job Title Extraction
# ---------------------------------------------------------------------------

YEAR_RANGE_REGEX = re.compile(
    r"(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(present|current|20\d{2}|19\d{2})",
    re.IGNORECASE,
)

EXPLICIT_EXPERIENCE_REGEX = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience",
    re.IGNORECASE,
)

JOB_TITLE_REGEX = re.compile(
    r"\b(Software Engineer|Full Stack Developer|Frontend Developer|Backend Developer|Data Scientist|Data Analyst|DevOps Engineer|Product Manager|Project Manager|UI/UX Designer|System Architect|Cloud Engineer|Quality Assurance Engineer|QA Analyst|Business Analyst|Marketing Specialist|Sales Executive)\b",
    re.I
)

def extract_experience_years(text: str) -> float:
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


def extract_latest_job_title(text: str) -> str | None:
    match = JOB_TITLE_REGEX.search(text)
    if match:
        return match.group(0).strip()
    return None


# ---------------------------------------------------------------------------
# Section detection & Certifications / Projects
# ---------------------------------------------------------------------------

SECTION_HEADERS = [
    "education", "experience", "work experience", "employment history",
    "skills", "projects", "certifications", "summary", "objective",
    "achievements", "publications",
]

def detect_sections(text: str) -> list[str]:
    lower_text = text.lower()
    return [header for header in SECTION_HEADERS if header in lower_text]


def extract_certifications(text: str) -> list[str]:
    certs = []
    cert_keywords = ["AWS", "Azure", "Google Cloud", "PMP", "Scrum Master", "CISSP", "Docker", "Kubernetes", "Certified"]
    for cert in cert_keywords:
        if re.search(r"\b" + re.escape(cert) + r"\b", text, re.I):
            certs.append(cert)
    return certs


def extract_projects_count(text: str) -> int:
    projects_match = re.search(r"(?:projects|key projects|academic projects)[\s\S]{0,500}", text, re.I)
    if projects_match:
        content = projects_match.group(0)
        bullets = re.findall(r"(?:•|\*|-|\d+\.)", content)
        return max(len(bullets), 1)
    return 0


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def parse_resume(file_path: str) -> dict:
    text = extract_text_from_pdf(file_path)
    email = extract_email(text)
    all_skills = extract_skills(text)

    return {
        "raw_text_length": len(text),
        "name": extract_candidate_name(text, email),
        "email": email,
        "mobile_number": extract_mobile_number(text),
        "linkedin": extract_linkedin(text),
        "github": extract_github(text),
        "location": extract_location(text),
        "university": extract_university(text),
        "degree": extract_degree(text),
        "graduation_year": extract_graduation_year(text),
        "cgpa": extract_cgpa(text),
        "skills": all_skills,
        "top_skills": all_skills[:6] if all_skills else [],
        "experience_years": extract_experience_years(text),
        "latest_job_title": extract_latest_job_title(text),
        "sections_found": detect_sections(text),
        "certifications": extract_certifications(text),
        "projects_count": extract_projects_count(text),
        "raw_text": text,
    }
