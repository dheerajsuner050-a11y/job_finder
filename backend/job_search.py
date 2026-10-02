"""
Live job suggestions via the Adzuna API (https://developer.adzuna.com/).

Adzuna was picked because it has a generous free tier and simple auth
(app_id + app_key as query params — no OAuth dance). If you already have
a different provider's key (e.g. RapidAPI's JSearch), see the
`search_jobs_jsearch` fallback function below and swap the call in
main.py.
"""

import os
import requests

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "e7971393")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "e9cb8d103c0a92c1a4e49a720016d006")
ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "in")  # in, us, gb, etc.

ADZUNA_BASE_URL = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/search/1"


def build_search_query(skills: list[str], experience_years: float) -> str:
    """Pick the top few skills to build a concise, relevant search query."""
    if not skills:
        return "software developer"
    top_skills = skills[:3]
    return " ".join(top_skills)


def search_jobs_adzuna(skills: list[str], experience_years: float = 0, location: str = "") -> list[dict]:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        raise RuntimeError(
            "Missing Adzuna credentials. Set ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables."
        )

    query = build_search_query(skills, experience_years)

    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": query,
        "results_per_page": 10,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location

    response = requests.get(ADZUNA_BASE_URL, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    jobs = []
    for item in data.get("results", []):
        jobs.append({
            "title": item.get("title"),
            "company": (item.get("company") or {}).get("display_name"),
            "location": (item.get("location") or {}).get("display_name"),
            "salary_min": item.get("salary_min"),
            "salary_max": item.get("salary_max"),
            "url": item.get("redirect_url"),
            "created": item.get("created"),
            "description_snippet": (item.get("description") or "")[:200],
        })
    return jobs


# ---------------------------------------------------------------------------
# Fallback: RapidAPI JSearch (uncomment/use if that's the key you have instead)
# ---------------------------------------------------------------------------

def search_jobs_jsearch(skills: list[str], experience_years: float = 0, location: str = "") -> list[dict]:
    rapidapi_key = os.getenv("RAPIDAPI_KEY", "")
    if not rapidapi_key:
        raise RuntimeError("Missing RAPIDAPI_KEY environment variable.")

    query = build_search_query(skills, experience_years)
    if location:
        query += f" in {location}"

    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {"query": query, "page": "1", "num_pages": "1"}

    response = requests.get(url, headers=headers, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    jobs = []
    for item in data.get("data", []):
        jobs.append({
            "title": item.get("job_title"),
            "company": item.get("employer_name"),
            "location": item.get("job_city") or item.get("job_country"),
            "salary_min": item.get("job_min_salary"),
            "salary_max": item.get("job_max_salary"),
            "url": item.get("job_apply_link"),
            "created": item.get("job_posted_at_datetime_utc"),
            "description_snippet": (item.get("job_description") or "")[:200],
        })
    return jobs
