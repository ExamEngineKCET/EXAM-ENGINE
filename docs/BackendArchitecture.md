# Backend file str

KCET-EXAM-PLATFORM/          ← Master Project Folder
│
├── backend/                 ← FastAPI Project
│   ├── app/
│   │   ├── [main.py]
│   │   │
│   │   ├── api/             ← API Endpoints (Controllers)
│   │   │   ├── [dependencies.py]
│   │   │   └── routes/
│   │   │       ├── [auth.py]
│   │   │       ├── [questions.py]     ← Search, filter, preview
│   │   │       ├── [exams.py]      ← Handles Mock & Practice attempts
│   │   │       ├── [analytics.py]    ← Calculates streaks, scores, accuracy
│   │   │       ├── [feedback.py]     ← App feedback & Question reports
│   │   │       └── [pdf.py]         ← Offline PDF generation
│   │   │
│   │   ├── core/            ← App Configuration
│   │   │   ├── [config.py]
│   │   │   ├── [database.py]
│   │   │   └── [security.py]      ← Password hashing, JWT tokens
│   │   │
│   │   ├── models/          ← SQLAlchemy DB Models (The schema we just built)
│   │   │   ├── [user.py]
│   │   │   ├── [question.py]
│   │   │   ├── [views.py]    ← NEW: SQLAlchemy models that read from your SQL Views 
│   │   │   ├── [attempt.py]       ← attempts & responses
│   │   │   └── [interactions.py] ← question_reports & app_feedback
│   │   │
│   │   ├── schemas/         ← Pydantic Validation Models
│   │   │   ├── user_schema.py
│   │   │   ├── question_schema.py
│   │   │   ├── exam_schema.py
│   │   │   └── analytics_schema.py
│   │   │
│   │   ├── services/        ← Core Business Logic Engine
│   │   │   ├── exam_engine.py       ← Test generation, difficulty scaling
│   │   │   ├── analytics_engine.py  ← Number crunching for the dashboard
│   │   │   └── pdf_engine.py        ← PDF compilation
│   │   │
│   │   ├── utils/           ← Helper Functions
│   │   │   └── [filters.py]
│   │   │
│   │   └── db/
│   │       └── exam_engine.db   ← Your SQLite database
│   │
│   ├── data/                ← Your raw JSON datasets go here
│   ├── scripts/
│   │   └── seed_db.py       ← Script to ingest JSONs into SQLite
│   │
│   ├── requirements.txt
│   └── .env
│
│
├── frontend/                ← PLUG YOUR VITE/REACT FOLDER RIGHT HERE
│   ├── src/                 ← (This is where your app/components/tests... lives)
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
│
└── [README.md]