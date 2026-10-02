# Resume Analyzer & Job Suggestion — Backend

FastAPI backend that:
- Accepts a PDF resume upload
- Extracts: email, mobile number, LinkedIn, skills, years of experience, resume sections
- Computes an **ATS score** (0–100) with a category breakdown, ready to chart
- Fetches **live job suggestions** with apply links via the Adzuna API

## 1. Setup

```bash
cd resume_backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and add your Adzuna credentials:
```
ADZUNA_APP_ID=xxxx
ADZUNA_APP_KEY=xxxx
ADZUNA_COUNTRY=in   # use "us", "gb", etc. as needed
```

Get free Adzuna keys at https://developer.adzuna.com/.

> If your existing key is for **RapidAPI's JSearch** instead of Adzuna,
> open `job_search.py` — there's a ready-made `search_jobs_jsearch()`
> function. Just swap the call in `main.py` (`search_jobs_adzuna` →
> `search_jobs_jsearch`) and set `RAPIDAPI_KEY` in `.env` instead.

## 2. Run

```bash
uvicorn main:app --reload
```

Server runs at `http://localhost:8000`. Interactive API docs (Swagger)
are auto-generated at `http://localhost:8000/docs`.

## 3. API Endpoints

### `POST /analyze-resume`
Main endpoint — upload a resume, get everything back in one call.

**Form-data fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file | ✅ | PDF only |
| `target_skills` | string | ❌ | comma-separated skills from a job description, for more accurate ATS keyword matching |
| `location` | string | ❌ | city/country to bias job search, e.g. `Bhopal` |

**Response:**
```json
{
  "resume_data": {
    "raw_text_length": 3210,
    "email": "jane@example.com",
    "mobile_number": "+91 98765 43210",
    "linkedin": "linkedin.com/in/jane-doe",
    "skills": ["python", "react", "sql", "aws"],
    "experience_years": 3.5,
    "sections_found": ["education", "experience", "skills", "projects"]
  },
  "ats_score": {
    "overall_score": 74.5,
    "max_score": 100,
    "breakdown": {
      "Contact Info": 15,
      "Skills Match": 24.5,
      "Experience": 14,
      "Formatting & Sections": 20,
      "Resume Length": 1
    },
    "max_breakdown": {
      "Contact Info": 15,
      "Skills Match": 35,
      "Experience": 20,
      "Formatting & Sections": 20,
      "Resume Length": 10
    },
    "verdict": "Good — should pass most ATS filters with minor tweaks"
  },
  "job_suggestions": [
    {
      "title": "Python Developer",
      "company": "Acme Corp",
      "location": "Bhopal, India",
      "salary_min": 400000,
      "salary_max": 700000,
      "url": "https://www.adzuna.in/land/ad/....",
      "created": "2026-08-20T10:00:00Z",
      "description_snippet": "We're looking for a Python developer..."
    }
  ],
  "job_search_error": null
}
```

### `POST /job-suggestions`
Standalone job search if you want to re-query after the user edits their
skill list on the frontend, without re-uploading the resume.

**Form-data fields:** `skills` (comma-separated), `experience_years`, `location`

## 4. Frontend integration notes

### Uploading the resume
```js
const formData = new FormData();
formData.append("file", resumeFile);          // <input type="file">
formData.append("location", "Bhopal");         // optional
// formData.append("target_skills", "python,django,aws"); // optional

const res = await fetch("http://localhost:8000/analyze-resume", {
  method: "POST",
  body: formData,
});
const data = await res.json();
```

### Rendering the ATS graph
`ats_score.breakdown` and `ats_score.max_breakdown` are already shaped
for a bar or radar chart. With Chart.js:
```js
new Chart(ctx, {
  type: "bar",
  data: {
    labels: Object.keys(data.ats_score.breakdown),
    datasets: [
      { label: "Your Score", data: Object.values(data.ats_score.breakdown) },
      { label: "Max Possible", data: Object.values(data.ats_score.max_breakdown) },
    ],
  },
});
```
You can also just show `overall_score` in a circular progress /
gauge component (e.g. `react-circular-progressbar`).

### Job suggestions
Map `job_suggestions` to cards, each linking out via `url` (opens the
real job posting to apply).

## 5. Extending

- **Skill extraction accuracy**: edit `skills_db.py` — add more
  keywords relevant to your target industries.
- **ATS scoring weights**: tweak `WEIGHTS` in `ats_scorer.py`.
- **DOCX support**: you said PDF-only for now; if you add DOCX later,
  install `python-docx` and add an extractor function alongside
  `extract_text_from_pdf` in `resume_parser.py`.
- **Better name/experience extraction**: for production-grade accuracy
  consider adding `spaCy` NER, but the current regex-based approach
  works well for most standard resume formats.
