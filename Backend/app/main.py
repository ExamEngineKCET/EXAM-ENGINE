from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import questions, auth, exams, attempts #r1

from app.models.attempt import Attempt, Response
from app.models.exam import GeneratedExam, ExamQuestion
from app.models.interactions import QuestionReport, AppFeedback
from app.api.routes import mock_exam
from app.api.routes import practice
from app.api.routes import interactions

# Initialize the FastAPI app
app = FastAPI(title="KCET Exam Engine API", version="1.0.0")

# Configure CORS (Crucial for connecting to your React frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port. Adjust if yours is different.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint just to check if the server is alive
# Root endpoint just to check if the server is alive
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "KCET Exam Engine API is running smoothly!"}

app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# --- ADD THIS LINE ---
# app.include_router(exams.router, prefix="/api/exams", tags=["Mock Exams"])
app.include_router(attempts.router, prefix="/api/attempts", tags=["Attempts"]) 

app.include_router(mock_exam.router, prefix="/api/mock", tags=["Mock Engine"])

app.include_router(practice.router, prefix="/api/practice", tags=["Practice"])
#r3
app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions Engine"])