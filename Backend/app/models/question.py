from sqlalchemy import Column, String, Integer, Boolean
from app.core.database import Base

class Question(Base):
    __tablename__ = "questions"

    question_id = Column(String, primary_key=True, index=True) # e.g., 'KCET-2023-PHY-Q1'
    exam = Column(String, default="KCET")
    year = Column(Integer)
    subject = Column(String, index=True)
    topic = Column(String, index=True)
    chapter = Column(String, index=True)   # <--- NEWLY ADDED
    puc_level = Column(String)
    difficulty = Column(String)
    question_type = Column(String)
    question_text = Column(String, nullable=False)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_option = Column(String)  # 'A', 'B', 'C', or 'D'
    solution_text = Column(String)
    has_image = Column(Boolean, default=False)
    image_path = Column(String, nullable=True)
    image2_path = Column(String, nullable=True)