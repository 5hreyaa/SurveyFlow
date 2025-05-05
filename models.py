from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Question(BaseModel):
    text: str
    options: Optional[List[str]] = None  # Only for multiple-choice questions

class SurveyCreate(BaseModel):
    title: str
    question_type: str  # "fillup" or "multiple_choice"
    questions: List[Question]  # List of questions with optional options
    recipient_email: str

class SurveyResponse(BaseModel):
    id: int
    title: str
    form_url: str
    status: str
    created_at: datetime
    recipient_email: str
    question_type: str
    questions: List[Question]

    class Config:
        from_attributes = True  # Enable ORM mode for compatibility with SQLite models

class SurveyListResponse(BaseModel):
    id: int
    title: str
    form_url: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode