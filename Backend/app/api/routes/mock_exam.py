from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from pydantic import BaseModel
from typing import List, Dict, Optional
import random

from app.core.database import get_db
from app.models.question import Question
from app.models.exam import GeneratedExam, ExamQuestion 
from app.models.attempt import Attempt
from app.api.routes.auth import get_current_user
from app.services.pdf_engine import generate_pdf_bytes 

router = APIRouter()

# --- SCHEMAS ---
class DifficultyDistribution(BaseModel):
    easy: int
    moderate: int
    hard: int

class MockGenerateRequest(BaseModel):
    subject: str
    years: List[str]
    difficulty: DifficultyDistribution
    includeDeleted: bool

class SaveMockRequest(BaseModel):
    title: str
    question_ids: List[str]

class PDFDownloadRequest(BaseModel):
    question_ids: List[str]
    document_type: str 
    page_saving_mode: bool
    show_extra_info: bool

class UpdateTitleRequest(BaseModel):
    exam_id: int
    title: str

# --- 1. METADATA ENDPOINT ---
@router.get("/metadata")
def get_mock_metadata(db: Session = Depends(get_db)):
    subjects = [s[0] for s in db.query(Question.subject).distinct().all() if s[0]]
    years = [str(y[0]) for y in db.query(Question.year).distinct().all() if y[0]]
    years.sort(reverse=True)
    return {"subjects": subjects, "years": years}

# --- 2. PIPELINE GENERATION ENDPOINT ---
@router.post("/generate")
def generate_mock_test(request: MockGenerateRequest, db: Session = Depends(get_db)):
    final_questions = []
    
    difficulty_targets = {
        "Easy": request.difficulty.easy,
        "Moderate": request.difficulty.moderate,
        "Hard": request.difficulty.hard
    }
    
    DELETED_TOPICS = []

    for diff, total_count in difficulty_targets.items():
        if total_count <= 0:
            continue
            
        count_11th = int(total_count * 0.25)
        count_12th = total_count - count_11th
        
        base_filter = [
            Question.subject == request.subject,
            Question.difficulty.ilike(diff)
        ]
        
        if request.years and "all" not in request.years:
            int_years = [int(y) for y in request.years if y.isdigit()]
            if int_years:
                base_filter.append(Question.year.in_(int_years))

        if not request.includeDeleted and DELETED_TOPICS:
            base_filter.append(~Question.topic.in_(DELETED_TOPICS))

        q_11 = db.query(Question).filter(*base_filter, Question.puc_level == "11th")\
                 .order_by(func.random()).limit(count_11th).all()
                 
        q_12 = db.query(Question).filter(*base_filter, Question.puc_level == "12th")\
                 .order_by(func.random()).limit(count_12th).all()
                 
        final_questions.extend(q_11 + q_12)
        
    random.shuffle(final_questions)
    return {"questions": final_questions}

# --- 3. SAVE AS DOCK CARD INSTANCE ---
@router.post("/save")
def save_generated_mock(
    request: SaveMockRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    new_exam = GeneratedExam(
        user_id=current_user.user_id, 
        exam_type="mock",      #   FIXED: Strictly locks as a mock system category
        title=request.title    #   FIXED: Saves custom text to the new title column
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    
    mappings = []
    for idx, q_id in enumerate(request.question_ids):
        mappings.append(
            ExamQuestion(exam_id=new_exam.exam_id, question_id=q_id, sequence_order=idx + 1)
        )
    db.add_all(mappings)
    db.commit()
    return {"status": "success", "exam_id": new_exam.exam_id}

# --- 4. LIST ALL ACTIVE CARDS FOR DASHBOARD ---
@router.get("/list")
def list_mock_exams(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    #   FIXED: Database strictly filters using the exam_type column
    exams = db.query(GeneratedExam).filter(
        GeneratedExam.user_id == current_user.user_id,
        GeneratedExam.exam_type == "mock"
    ).all()
    
    output = []
    for e in exams:
        # Hacky title filtering completely removed!
        
        q_items = db.query(Question).join(ExamQuestion).filter(ExamQuestion.exam_id == e.exam_id).order_by(ExamQuestion.sequence_order).all()
        attempt = db.query(Attempt).filter(Attempt.generated_exam_id == e.exam_id).order_by(Attempt.score.desc()).first()
        
        output.append({
            "id": e.exam_id,
            "name": e.title,   #   FIXED: Safely reads the custom title column for the UI
            "questions": len(q_items),
            "duration": len(q_items), 
            "difficulty": "Mixed Blueprint",
            "attempted": attempt is not None,
            "score": getattr(attempt, 'score', None) if attempt else None,
            "real_questions": q_items
        })
    return output

# --- 5. STREAM REPORTLAB STREAM ---
@router.post("/pdf/download")
def stream_exam_pdf(payload: PDFDownloadRequest, db: Session = Depends(get_db)):
    questions = db.query(Question).filter(Question.question_id.in_(payload.question_ids)).all()
    
    pdf_data = generate_pdf_bytes(
        questions=questions,
        doc_type=payload.document_type,
        two_column=payload.page_saving_mode,
        show_extra_info=payload.show_extra_info
    )
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ExamEngine_{payload.document_type}.pdf"}
    )

# --- 6. UPDATE EXAM TITLE ---
@router.put("/update-title")
def update_mock_exam_title(
    payload: UpdateTitleRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    exam = db.query(GeneratedExam).filter(
        GeneratedExam.exam_id == payload.exam_id,
        GeneratedExam.user_id == current_user.user_id
    ).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam registry not found or access denied.")
    
    #   FIXED: Only overwrites the title column, leaving the system category safe
    setattr(exam, 'title', payload.title)
    db.commit()    
    
    return {"status": "success", "message": "Title synced securely."}