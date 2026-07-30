# for test interface

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional, List

from app.core.database import get_db
from app.models.question import Question
from app.models.attempt import Attempt, Response as DBResponse

#    IMPORT AUTH DEPENDENCY
from app.api.routes.auth import get_current_user

router = APIRouter()

class UniversalTestSubmission(BaseModel):
    mode: str  # "question_bank", "mock", or "practice"
    exam_id: Optional[int] = None 
    answers: Dict[str, int] 

@router.post("/submit")
def submit_universal_test(
    payload: UniversalTestSubmission, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) #    SWAPPED HARDCODED PARAMETER FOR DYNAMIC AUTH
):
    """Global endpoint to catch test submissions from ANY tab."""
    
    # 1. Create a brand new Attempt record
    new_attempt = Attempt(
        user_id=current_user.user_id, #    EXTRACT DYNAMIC USER ID
        mode=payload.mode,
        generated_exam_id=payload.exam_id
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)

    if not payload.answers:
        return {"message": "Test submitted empty.", "attempt_id": new_attempt.attempt_id}

    # 2. Fetch all relevant questions
    question_ids = list(payload.answers.keys())
    questions = db.query(Question).filter(Question.question_id.in_(question_ids)).all()
    
    # FIXED: Map the map once outside the loop securely!
    question_map = {str(q.question_id): q for q in questions}

    # 3. Grade and map responses
    responses_to_add = []
    score = 0

    for q_id, selected_idx in payload.answers.items():
        question = question_map.get(str(q_id))
        if not question:
            continue 
            
        option_letter = chr(65 + selected_idx)
        is_correct = bool(option_letter == getattr(question, 'correct_option'))
        if is_correct:
            score += 1

        responses_to_add.append(
            DBResponse(
                attempt_id=new_attempt.attempt_id,
                question_id=q_id,
                selected_option=str(option_letter),
                is_correct=is_correct
            )
        )

    # 4. Save score and responses
    setattr(new_attempt, 'score', score)
    db.add_all(responses_to_add)
    db.commit()

    return {"message": "Test successfully evaluated and saved!", "score": score}