from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base

class Attempt(Base):
    __tablename__ = "attempts"

    attempt_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    generated_exam_id = Column(Integer, ForeignKey("generated_exams.exam_id"), nullable=True) # Null for quick practice
    mode = Column(String, nullable=False) # "mock" or "practice"
    subject = Column(String, nullable=True) # Null if full mock
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    score = Column(Float, default=0.0)

class Response(Base):
    __tablename__ = "responses"

    response_id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.attempt_id"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.question_id"), nullable=False)
    selected_option = Column(String, nullable=True) # A, B, C, D, or Null if skipped
    is_correct = Column(Boolean, nullable=False)
    time_taken_seconds = Column(Integer, nullable=True)