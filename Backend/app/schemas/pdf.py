from pydantic import BaseModel
from typing import List

class PDFRequest(BaseModel):
    question_ids: List[str]
    document_type: str # 'Questions', 'Keys', or 'Solutions'
    page_saving_mode: bool # True = Split A4 (2 columns), False = Normal
    show_extra_info: bool = False