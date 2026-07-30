from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class GeneratedExam(Base):
    __tablename__ = "generated_exams"
    
    exam_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    
    #  SEPARATED RESPONSIBILITIES
    exam_type = Column(String) # Will now STRICTLY hold "mock" or "practice"
    title = Column(String)     # Will hold the user-editable name ("Chemistry Set", "My Quiz", etc.)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    
    mapping_id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("generated_exams.exam_id"))
    question_id = Column(String, ForeignKey("questions.question_id"))
    sequence_order = Column(Integer)