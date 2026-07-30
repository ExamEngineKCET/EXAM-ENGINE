from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base

class QuestionReport(Base):
    __tablename__ = "question_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.question_id"), nullable=False, index=True)
    issue_type = Column(String, nullable=False) # e.g., "Wrong Option", "Typo"
    description = Column(String, nullable=True)
    status = Column(String, default="Pending") # "Pending" or "Resolved"
    created_at = Column(DateTime, default=datetime.utcnow)

class AppFeedback(Base):
    __tablename__ = "app_feedback"

    feedback_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)