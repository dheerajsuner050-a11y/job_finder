"""
A curated list of common tech / business skills used for:
1. Extracting skills mentioned in a resume
2. Scoring ATS keyword relevance

Extend this list freely — the more complete it is, the better the
extraction and scoring will be for your target job market.
"""

SKILLS_DB = [
    # Programming languages
    "python", "java", "javascript", "typescript", "c++", "c#", "c",
    "go", "golang", "rust", "kotlin", "swift", "php", "ruby", "scala",
    "r", "matlab", "perl", "dart",

    # Web / frontend
    "html", "css", "sass", "tailwind", "bootstrap", "react", "reactjs",
    "angular", "vue", "vuejs", "next.js", "nextjs", "redux", "jquery",
    "webpack", "vite",

    # Backend / frameworks
    "node.js", "nodejs", "express", "express.js", "django", "flask",
    "fastapi", "spring", "spring boot", ".net", "asp.net", "laravel",
    "rails", "ruby on rails", "graphql", "rest api", "restful api",

    # Databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "sqlite",
    "redis", "oracle", "cassandra", "dynamodb", "firebase", "elasticsearch",

    # Cloud / devops
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "jenkins", "ci/cd", "terraform", "ansible", "linux", "git", "github",
    "gitlab", "bitbucket", "nginx", "apache",

    # Data / ML
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
    "data analysis", "data science", "data visualization", "tableau",
    "power bi", "excel", "spark", "hadoop", "airflow", "etl",

    # Mobile
    "android", "ios", "flutter", "react native", "swift ui", "kotlin multiplatform",

    # Testing
    "selenium", "junit", "pytest", "jest", "cypress", "unit testing",
    "test automation", "manual testing", "qa",

    # Soft / business skills
    "project management", "agile", "scrum", "kanban", "jira",
    "communication", "leadership", "problem solving", "team management",
    "stakeholder management", "business analysis", "product management",

    # Design
    "figma", "adobe xd", "photoshop", "illustrator", "ui/ux", "ui design",
    "ux design", "wireframing", "prototyping",

    # Misc
    "seo", "digital marketing", "content writing", "salesforce", "sap",
    "blockchain", "solidity", "cybersecurity", "networking", "linux administration",
]

# Normalize once for fast matching
SKILLS_DB = sorted(set(s.lower() for s in SKILLS_DB), key=len, reverse=True)
