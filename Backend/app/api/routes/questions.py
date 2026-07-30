from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

# Import our database connection, models, and schemas
from app.core.database import get_db
from app.models.question import Question
from app.schemas.question_schema import QuestionResponse

#rg1<
from pydantic import BaseModel
from app.models.attempt import Attempt, Response as DBResponse

#>

# Import your auth dependency here
from app.api.routes.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[QuestionResponse])
def get_questions(
    subject: List[str] = Query(default=[]),     # <-- 2. USE Query() HERE
    chapter: Optional[str] = None,
    difficulty: List[str] = Query(default=[]),  # <-- 3. USE Query() HERE
    year: List[int] = Query(default=[]),        # <-- 4. USE Query() HERE
    search_query: Optional[str] = None,
    limit: int = 900,
    db: Session = Depends(get_db)
):
    """
    Fetch questions with optional filters. 
    Perfect for the 'Practice Mode' screens.
    """
    # Start with a base query
    query = db.query(Question)

    # Apply filters using len() to check if the lists have items
    if len(subject) > 0:
        query = query.filter(Question.subject.in_(subject))
    if chapter:
        query = query.filter(Question.chapter == chapter)
    if len(difficulty) > 0:
        query = query.filter(Question.difficulty.in_(difficulty))
    if len(year) > 0:
        query = query.filter(Question.year.in_(year))
    if search_query:
        query = query.filter(Question.question_text.ilike(f"%{search_query}%"))

    # Execute the query with a limit so we don't crash the browser
    questions = query.limit(limit).all()
    return questions


#rg1
class QuickAttempt(BaseModel):
    selected_option: int  # 0, 1, 2, 3 for A, B, C, D


#rg1<


# --- NEW: Get User's Saved Answers ---
@router.get("/user/answers", response_model=Dict[str, int])
def get_user_answers(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Fetch ALL saved answers for this specific user across ALL tests/modes"""
    
    #   PERFORM A SQL JOIN: Link Responses to Attempts, then filter by the secure logged-in user
    user_responses = (
        db.query(DBResponse)
        .join(Attempt, DBResponse.attempt_id == Attempt.attempt_id)
        .filter(Attempt.user_id == current_user.user_id)
        .order_by(DBResponse.response_id.asc()) # Ensures the most recent answer overwrites older ones
        .all()
    )
    
    mapping = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
    
    # Builds a secure dictionary of every question this user has EVER answered
    return {
        str(r.question_id): mapping.get(str(r.selected_option), 0) 
        for r in user_responses 
        if r.selected_option is not None
    }

# --- NEW: Save an Answer ---
@router.post("/{question_id}/answer")
def save_answer(question_id: str, payload: QuickAttempt, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    #   FIXED: Swapped out hardcoded user_id for current_user dependency
    attempt = db.query(Attempt).filter(Attempt.user_id == current_user.user_id, Attempt.mode == "question_bank").first()
    if not attempt:
        attempt = Attempt(user_id=current_user.user_id, mode="question_bank")
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    question = db.query(Question).filter(Question.question_id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    option_letter = chr(65 + payload.selected_option)
    # Cast to bool just in case
    is_correct = bool(option_letter == question.correct_option)

    db_response = db.query(DBResponse).filter(
        DBResponse.attempt_id == attempt.attempt_id, 
        DBResponse.question_id == question_id
    ).first()

    if db_response:
        # FIX: Pylance might still complain here, but standard practice in SQLAlchemy 
        # is to use setattr() to bypass strict type checker warnings on assignments.
        setattr(db_response, 'selected_option', str(option_letter))
        setattr(db_response, 'is_correct', is_correct)
    else:
        new_response = DBResponse(
            attempt_id=attempt.attempt_id,
            question_id=question_id,
            selected_option=str(option_letter), # Cast to string
            is_correct=is_correct               # Cast to bool
        )
        db.add(new_response)
    
    db.commit()
    return {"message": "Saved", "is_correct": is_correct}
    # return {"message": "Saved", "is_correct": is_correct}

    

# --- NEW: Clear All Attempts ---
@router.delete("/user/answers/clear")
def clear_answers(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    #   FIXED: Swapped out hardcoded user_id for current_user dependency
    attempt = db.query(Attempt).filter(Attempt.user_id == current_user.user_id, Attempt.mode == "question_bank").first()
    if attempt:
        # Delete all responses linked to this attempt
        db.query(DBResponse).filter(DBResponse.attempt_id == attempt.attempt_id).delete()
        db.commit()
    return {"message": "All attempts cleared!"}


# MOVED TO THE BOTTOM: Dynamic paths must always go last!
@router.get("/{question_id}", response_model=QuestionResponse)
def get_single_question(question_id: str, db: Session = Depends(get_db)):
    """
    Fetch a specific question by its ID.
    """
    question = db.query(Question).filter(Question.question_id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question
#>