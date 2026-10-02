import os
import shutil
import tempfile
import sys
from typing import Optional

# Ensure backend directory is in sys.path when starting from repository root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from resume_parser import parse_resume
from ats_scorer import compute_ats_score
from job_search import search_jobs_adzuna
from email_service import send_welcome_email, send_password_reset_email
from auth_store import (
    get_user_by_email,
    save_user,
    update_user_password,
    update_user_profile,
    create_reset_token,
    consume_reset_token,
)

backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env.example"))
load_dotenv()

app = FastAPI(title="PLUTO — Resume Analyzer & Job Suggestion API")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Pydantic Request Schemas ----------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None
    clg_name: Optional[str] = None
    linkedin: Optional[str] = None
    job_search_field: Optional[str] = None
    profile_photo: Optional[str] = None
    saved_jobs: Optional[list] = None


# ---------------- Health Check ----------------

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "PLUTO API is running"}

# ---------------- Auth Endpoints (Signup, Login, Forgot Password, Reset Password) ----------------

@app.post("/api/auth/register")
async def register(req: RegisterRequest, background_tasks: BackgroundTasks, request: Request):
    name_clean = req.name.strip()
    email_clean = req.email.lower().strip()
    
    if not name_clean or not email_clean or not req.password:
        raise HTTPException(status_code=400, detail="Please fill in all fields.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing_user = get_user_by_email(email_clean)
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = save_user(name_clean, email_clean, req.password)

    base_url = str(request.base_url).rstrip("/")
    app_url = os.getenv("APP_URL", base_url)

    # Trigger welcome email in background
    background_tasks.add_task(send_welcome_email, email_clean, name_clean, app_url)

    return {
        "status": "success",
        "message": "Account created successfully! Welcome email sent.",
        "user": {"name": user["name"], "email": user["email"]},
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    email_clean = req.email.lower().strip()
    user = get_user_by_email(email_clean)
    
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=400, detail="Incorrect email or password.")

    return {
        "status": "success",
        "message": "Login successful.",
        "user": {"name": user["name"], "email": user["email"]},
    }


@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, request: Request):
    email_clean = req.email.lower().strip()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Email is required.")

    user = get_user_by_email(email_clean)
    
    # Generate token & link regardless to prevent email enumeration, but send email if user exists
    token = create_reset_token(email_clean)
    base_url = str(request.base_url).rstrip("/")
    app_url = os.getenv("APP_URL", base_url)
    reset_link = f"{app_url}/reset-password.html?token={token}&email={email_clean}"

    if user:
        background_tasks.add_task(send_password_reset_email, email_clean, reset_link, user["name"])

    return {
        "status": "success",
        "message": f"If an account exists for {email_clean}, a password reset link has been sent.",
        "reset_link": reset_link,
    }


@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if not req.token:
        raise HTTPException(status_code=400, detail="Reset token is required.")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    email = consume_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token. Please request a new reset link.")

    success = update_user_password(email, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="User account not found.")

    return {
        "status": "success",
        "message": "Your password has been successfully reset! You can now log in with your new password.",
    }


# ---------------- Profile Management Endpoints ----------------

@app.get("/api/user/profile")
async def get_profile(email: str):
    email_clean = email.lower().strip()
    user = get_user_by_email(email_clean)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Return user profile (exclude password)
    profile = {k: v for k, v in user.items() if k != "password"}
    return {"status": "success", "user": profile}


@app.post("/api/user/profile")
async def update_profile(req: ProfileUpdateRequest):
    email_clean = req.email.lower().strip()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Email is required.")

    update_dict = {k: v for k, v in req.model_dump().items() if v is not None and k != "email"}
    user = update_user_profile(email_clean, update_dict)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    profile = {k: v for k, v in user.items() if k != "password"}
    return {"status": "success", "message": "Profile updated successfully.", "user": profile}


# ---------------- Resume Analysis & Job Search ----------------

@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    target_skills: Optional[str] = Form(None),
    location: Optional[str] = Form(""),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported right now.")

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
    skills: str = Form(...),
    experience_years: float = Form(0),
    location: Optional[str] = Form(""),
):
    skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
    try:
        jobs = search_jobs_adzuna(skill_list, experience_years, location or "")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc))
    return {"job_suggestions": jobs}

# ---------------- Mount Static Frontend Files ----------------

frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
