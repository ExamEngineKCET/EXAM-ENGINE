from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
import os
from typing import Optional

from app.core.database import get_db
from app.models.interactions import AppFeedback, QuestionReport
#   IMPORT YOUR AUTH DEPENDENCY (Adjust path based on your real auth file setup)
from app.api.routes.auth import get_current_user 

router = APIRouter()

class FeedbackCreate(BaseModel):
    feedback: str

class ReportCreate(BaseModel):
    question_id: str 
    issue_type: str
    description: str

FEEDBACK_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
REPORT_WEBHOOK_URL = os.getenv("DISCORD_REPORT_WEBHOOK_URL")

async def send_discord_notification(url: Optional[str], payload: dict):
    if not url:
        return
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload)
        except Exception as e:
            print(f"Discord notification channel failed to stream: {e}")


# --- SUBMIT APP FEEDBACK ---
@router.post("/feedback")
async def submit_feedback(
    data: FeedbackCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) #   INJECT CURRENT LOGGED-IN USER
):
    try:
        clean_msg = data.feedback.strip()
        if not clean_msg:
            raise HTTPException(status_code=400, detail="Feedback field cannot be blank.")

        #   FIXED: Dynamically pulls the true database integer primary key of the sender
        user_id = current_user.user_id 

        new_feedback = AppFeedback(
            user_id=user_id,
            message=clean_msg 
        )
        db.add(new_feedback)
        db.commit()

        payload = {
            "embeds": [{
                "title": "💬 New Feedback Received!",
                "description": f"**User:** {current_user.name} (ID: {user_id})\n**Message:** {clean_msg}",
                "color": 3066993 
            }]
        }
        await send_discord_notification(FEEDBACK_WEBHOOK_URL, payload)
        return {"status": "success", "message": "Feedback delivered successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ CRITICAL BACKEND ERROR INSIDE /feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operational error.")


# --- SUBMIT QUESTION REPORT ---
@router.post("/reports")
async def submit_question_report(
    data: ReportCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) #   INJECT CURRENT LOGGED-IN USER
):
    try:
        #   FIXED: Dynamically pulls the database key
        user_id = current_user.user_id 
        
        new_report = QuestionReport(
            user_id=user_id,
            question_id=data.question_id,
            issue_type=data.issue_type,
            description=data.description,
            status="Pending"
        )
        db.add(new_report)
        db.commit()

        payload = {
            "embeds": [{
                "title": "🚨 Question Anomaly Report Filed!",
                "description": (
                    f"**Reported By:** {current_user.name} (ID: {user_id})\n"
                    f"**Question ID Reference:** `{data.question_id}`\n"
                    f"**Issue Category:** *{data.issue_type}*\n"
                    f"**Detailed Breakdown:** {data.description}"
                ),
                "color": 15158332,
                "footer": {"text": "Exam Engine Security Tracker"}
            }]
        }
        await send_discord_notification(REPORT_WEBHOOK_URL, payload)
        return {"status": "success", "message": "Anomaly logged successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ CRITICAL BACKEND ERROR INSIDE /reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operational error.")