from pydantic import BaseModel
from typing import Optional

class QuestionBase(BaseModel):
    question_id: str
    exam: str
    year: int
    subject: str
    chapter: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: Optional[str] = None
    question_text: str
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    has_image: bool = False
    image_path: Optional[str] = None
    image2_path: Optional[str] = None

class QuestionResponse(QuestionBase):
    # We include the correct option and solution here. 
    # Later, we can create a "QuestionStudentView" schema that hides these during a live mock test!
    correct_option: Optional[str] = None
    solution_text: Optional[str] = None

    class Config:
        from_attributes = True  # Tells Pydantic to read directly from the SQLAlchemy model