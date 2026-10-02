import os
import shutil
import tempfile
import sys
from typing import Optional

# Ensure backend directory is in sys.path when starting from repository root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException

from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from resume_parser import parse_resume
from ats_scorer import compute_ats_score
from job_search import search_jobs_adzuna

from fastapi.staticfiles import StaticFiles

load_dotenv()

app = FastAPI(title="Resume Analyzer & Job Suggestion API")

# Allow your frontend (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Resume Analyzer API is running"}



@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    target_skills: Optional[str] = Form(None),  # comma-separated, from a job description
    location: Optional[str] = Form(""),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported right now.")

    # Save upload to a temp file so pdfplumber can read it
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        parsed = parse_resume(tmp_path)
    finally:
        os.remove(tmp_path)

    target_skill_list = None
    if target_skills:
        target_skill_list = [s.strip().lower() for s in target_skills.split(",") if s.strip()]

    ats_result = compute_ats_score(parsed, target_skill_list)

    # Don't leak the full raw resume text back to the client
    parsed_public = {k: v for k, v in parsed.items() if k != "raw_text"}

    jobs = []
    job_search_error = None
    try:
        jobs = search_jobs_adzuna(
            skills=parsed["skills"],
            experience_years=parsed["experience_years"],
            location=location or "",
        )
    except Exception as exc:  # noqa: BLE001
        job_search_error = str(exc)

    return {
        "resume_data": parsed_public,
        "ats_score": ats_result,
        "job_suggestions": jobs,
        "job_search_error": job_search_error,
    }


@app.post("/job-suggestions")
async def job_suggestions(
    skills: str = Form(...),  # comma-separated
    experience_years: float = Form(0),
    location: Optional[str] = Form(""),
):
    """Standalone endpoint to re-fetch jobs, e.g. if the user edits their skill list."""
    skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
    try:
        jobs = search_jobs_adzuna(skill_list, experience_years, location or "")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc))
    return {"job_suggestions": jobs}


# Mount frontend static files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

