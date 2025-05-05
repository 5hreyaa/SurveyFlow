import sqlite3
from datetime import datetime
import enum
import json

class SurveyStatus(enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    DELETED = "deleted"

class Survey:
    def __init__(self, id, title, question_type=None, questions=None, recipient_email=None, form_id=None, form_url=None, status=None, created_at=None):
        self.id = id
        self.title = title
        # Handle legacy data: if question_type is missing, default to "fillup"
        self.question_type = question_type or "fillup"
        # Handle legacy data: if questions is a string, convert to new format
        if isinstance(questions, str) and questions.startswith("["):
            try:
                self.questions = json.loads(questions)
            except json.JSONDecodeError:
                # If JSON parsing fails, assume it's a newline-separated string
                question_texts = [q.strip() for q in questions.split("\n") if q.strip()]
                self.questions = [{"text": q, "options": None} for q in question_texts]
        elif isinstance(questions, str):
            # Legacy format: newline-separated questions
            question_texts = [q.strip() for q in questions.split("\n") if q.strip()]
            self.questions = [{"text": q, "options": None} for q in question_texts]
        else:
            self.questions = questions or []
        self.recipient_email = recipient_email or ""
        self.form_id = form_id or ""
        self.form_url = form_url or ""
        self.status = SurveyStatus(status) if status else SurveyStatus.DRAFT
        try:
            self.created_at = datetime.fromisoformat(created_at) if isinstance(created_at, str) else created_at or datetime.utcnow()
        except (ValueError, TypeError):
            self.created_at = datetime.utcnow()

    @classmethod
    def create(cls, title, question_type, questions, recipient_email, form_id, form_url, status):
        conn = sqlite3.connect("survey_system.db")
        cursor = conn.cursor()
        created_at = datetime.utcnow()
        questions_json = json.dumps(questions)
        cursor.execute(
            """
            INSERT INTO surveys (title, question_type, questions, recipient_email, form_id, form_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (title, question_type, questions_json, recipient_email, form_id, form_url, status.value, created_at)
        )
        conn.commit()
        survey_id = cursor.lastrowid
        conn.close()
        return cls(survey_id, title, question_type, questions, recipient_email, form_id, form_url, status, created_at)

    @classmethod
    def get_all(cls):
        conn = sqlite3.connect("survey_system.db")
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM surveys")
        rows = cursor.fetchall()
        conn.close()
        return [cls(*row) for row in rows]

    @classmethod
    def get_by_id(cls, survey_id):
        conn = sqlite3.connect("survey_system.db")
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM surveys WHERE id = ?", (survey_id,))
        row = cursor.fetchone()
        conn.close()
        return cls(*row) if row else None

    def approve(self):
        conn = sqlite3.connect("survey_system.db")
        cursor = conn.cursor()
        cursor.execute("UPDATE surveys SET status = ? WHERE id = ?", (SurveyStatus.APPROVED.value, self.id))
        conn.commit()
        conn.close()
        self.status = SurveyStatus.APPROVED

    def delete(self):
        conn = sqlite3.connect("survey_system.db")
        cursor = conn.cursor()
        cursor.execute("UPDATE surveys SET status = ? WHERE id = ?", (SurveyStatus.DELETED.value, self.id))
        conn.commit()
        conn.close()
        self.status = SurveyStatus.DELETED

def create_tables():
    conn = sqlite3.connect("survey_system.db")
    cursor = conn.cursor()
    # Drop the existing table to ensure schema consistency (development only)
    cursor.execute("DROP TABLE IF EXISTS surveys")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS surveys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            question_type TEXT NOT NULL,  -- "fillup" or "multiple_choice"
            questions TEXT NOT NULL,  -- JSON string of questions list
            recipient_email TEXT NOT NULL,
            form_id TEXT NOT NULL,
            form_url TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()