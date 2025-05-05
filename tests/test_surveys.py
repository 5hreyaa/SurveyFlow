import unittest
import sqlite3
import os
import sys
import tempfile
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add the parent directory to the path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import Survey, SurveyStatus, create_tables
from services.google_forms import GoogleFormsService
from services.email_service import EmailService

class TestSurveyModel(unittest.TestCase):
    """Test cases for the Survey model."""
    
    def setUp(self):
        """Set up a test database."""
        # Create a temporary database
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp()
        
        # Override the database path in the models module
        self.original_db_path = os.environ.get('DB_PATH')
        os.environ['DB_PATH'] = self.temp_db_path
        
        # Create tables in the test database
        conn = sqlite3.connect(self.temp_db_path)
        conn.row_factory = sqlite3.Row
        
        conn.execute('''
        CREATE TABLE IF NOT EXISTS surveys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            questions TEXT NOT NULL,
            recipient_email TEXT NOT NULL,
            form_id TEXT NOT NULL,
            form_url TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def tearDown(self):
        """Clean up after each test."""
        # Close and remove the temporary database
        os.close(self.temp_db_fd)
        os.unlink(self.temp_db_path)
        
        # Restore the original database path
        if self.original_db_path:
            os.environ['DB_PATH'] = self.original_db_path
        else:
            del os.environ['DB_PATH']
    
    def test_create_survey(self):
        """Test creating a new survey."""
        survey = Survey.create(
            title="Test Survey",
            questions="Question 1?\nQuestion 2?",
            recipient_email="test@example.com",
            form_id="abc123",
            form_url="https://example.com/form",
            status=SurveyStatus.DRAFT
        )
        
        self.assertIsNotNone(survey.id)
        self.assertEqual(survey.title, "Test Survey")
        self.assertEqual(survey.questions, "Question 1?\nQuestion 2?")
        self.assertEqual(survey.recipient_email, "test@example.com")
        self.assertEqual(survey.form_id, "abc123")
        self.assertEqual(survey.form_url, "https://example.com/form")
        self.assertEqual(survey.status, SurveyStatus.DRAFT)
        self.assertIsInstance(survey.created_at, datetime)
        self.assertIsInstance(survey.updated_at, datetime)
    
    def test_get_survey_by_id(self):
        """Test retrieving a survey by ID."""
        # Create a survey
        survey = Survey.create(
            title="Test Survey",
            questions="Question 1?\nQuestion 2?",
            recipient_email="test@example.com",
            form_id="abc123",
            form_url="https://example.com/form",
            status=SurveyStatus.DRAFT
        )
        
        # Retrieve the survey
        retrieved_survey = Survey.get_by_id(survey.id)
        
        self.assertIsNotNone(retrieved_survey)
        self.assertEqual(retrieved_survey.id, survey.id)
        self.assertEqual(retrieved_survey.title, survey.title)
        self.assertEqual(retrieved_survey.status, survey.status)
    
    def test_approve_survey(self):
        """Test approving a survey."""
        # Create a survey in draft status
        survey = Survey.create(
            title="Test Survey",
            questions="Question 1?\nQuestion 2?",
            recipient_email="test@example.com",
            form_id="abc123",
            form_url="https://example.com/form",
            status=SurveyStatus.DRAFT
        )
        
        # Approve the survey
        survey.approve()
        
        # Retrieve the survey and check its status
        retrieved_survey = Survey.get_by_id(survey.id)
        self.assertEqual(retrieved_survey.status, SurveyStatus.APPROVED)
    
    def test_invalid_status_transition(self):
        """Test that an invalid status transition raises an error."""
        # Create a survey in approved status
        survey = Survey.create(
            title="Test Survey",
            questions="Question 1?\nQuestion 2?",
            recipient_email="test@example.com",
            form_id="abc123",
            form_url="https://example.com/form",
            status=SurveyStatus.APPROVED
        )
        
        # Attempt to approve an already approved survey
        with self.assertRaises(ValueError):
            survey.approve()
    
    def test_delete_survey(self):
        """Test deleting a survey."""
        # Create a survey
        survey = Survey.create(
            title="Test Survey",
            questions="Question 1?\nQuestion 2?",
            recipient_email="test@example.com",
            form_id="abc123",
            form_url="https://example.com/form",
            status=SurveyStatus.DRAFT
        )
        
        # Delete the survey
        survey.delete()
        
        # Retrieve the survey and check that it's None (as deleted surveys are filtered out)
        retrieved_survey = Survey.get_by_id(survey.id)
        self.assertIsNone(retrieved_survey)
    
    def test_get_all_surveys(self):
        """Test retrieving all surveys."""
        # Create a few surveys
        Survey.create(
            title="Survey 1",
            questions="Question 1?",
            recipient_email="test1@example.com",
            form_id="abc123",
            form_url="https://example.com/form1",
            status=SurveyStatus.DRAFT
        )
        
        Survey.create(
            title="Survey 2",
            questions="Question 2?",
            recipient_email="test2@example.com",
            form_id="def456",
            form_url="https://example.com/form2",
            status=SurveyStatus.APPROVED
        )
        
        survey_to_delete = Survey.create(
            title="Survey 3",
            questions="Question 3?",
            recipient_email="test3@example.com",
            form_id="ghi789",
            form_url="https://example.com/form3",
            status=SurveyStatus.DRAFT
        )
        
        # Delete one survey
        survey_to_delete.delete()
        
        # Get all surveys
        surveys = Survey.get_all()
        
        # Check that we have only the two non-deleted surveys
        self.assertEqual(len(surveys), 2)
        self.assertEqual(surveys[0].title, "Survey 2")  # Most recent first
        self.assertEqual(surveys[1].title, "Survey 1")

class TestGoogleFormsService(unittest.TestCase):
    """Test cases for the Google Forms service."""
    
    @patch('services.google_forms.build')
    @patch('services.google_forms.service_account.Credentials.from_service_account_info')
    def test_create_form_with_credentials(self, mock_credentials, mock_build):
        """Test creating a form when credentials are available."""
        # Mock the forms API
        mock_forms = MagicMock()
        mock_forms_create = MagicMock()
        mock_forms_create.execute.return_value = {'formId': 'test_form_id'}
        
        mock_forms_batchupdate = MagicMock()
        mock_forms_batchupdate.execute.return_value = {}
        
        mock_forms.forms.return_value.create.return_value = mock_forms_create
        mock_forms.forms.return_value.batchUpdate.return_value = mock_forms_batchupdate
        
        mock_build.return_value = mock_forms
        
        # Set up the service with mock credentials
        with patch.dict('os.environ', {'GOOGLE_CREDENTIALS': "{'type': 'service_account'}"}):
            service = GoogleFormsService()
            service.use_mock = False
            service.forms_service = mock_forms
        
        # Create a form
        form_id, form_url = service.create_form(
            title="Test Form",
            questions=["Question 1?", "Question 2?"]
        )
        
        # Check the result
        self.assertEqual(form_id, 'test_form_id')
        self.assertEqual(form_url, 'https://docs.google.com/forms/d/test_form_id/viewform')
        
        # Verify API calls
        mock_forms.forms.return_value.create.assert_called_once()
        mock_forms.forms.return_value.batchUpdate.assert_called_once()
    
    def test_create_form_mock_implementation(self):
        """Test the mock implementation of create_form."""
        # Create service without credentials
        service = GoogleFormsService()
        service.use_mock = True
        
        # Create a form
        form_id, form_url = service.create_form(
            title="Test Form",
            questions=["Question 1?", "Question 2?"]
        )
        
        # Check the result
        self.assertIsNotNone(form_id)
        self.assertTrue(form_url.startswith('https://docs.google.com/forms/d/mock-'))

class TestEmailService(unittest.TestCase):
    """Test cases for the Email service."""
    
    @patch('services.email_service.smtplib.SMTP')
    def test_send_email_with_credentials(self, mock_smtp):
        """Test sending an email when credentials are available."""
        # Set up mock SMTP server
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        # Set up the service with mock credentials
        with patch.dict('os.environ', {
            'SMTP_USERNAME': 'test@example.com',
            'SMTP_PASSWORD': 'password123'
        }):
            service = EmailService()
            service.use_mock = False
        
        # Send an email
        result = service.send_survey_notification(
            recipient_email="recipient@example.com",
            survey_title="Test Survey",
            form_url="https://example.com/form"
        )
        
        # Check the result
        self.assertTrue(result)
        
        # Verify SMTP calls
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.send_message.assert_called_once()
    
    def test_send_email_mock_implementation(self):
        """Test the mock implementation of send_email."""
        # Create service without credentials
        service = EmailService()
        service.use_mock = True
        
        # Send an email
        result = service.send_survey_notification(
            recipient_email="recipient@example.com",
            survey_title="Test Survey",
            form_url="https://example.com/form"
        )
        
        # Check the result
        self.assertTrue(result)

if __name__ == '__main__':
    unittest.main()
