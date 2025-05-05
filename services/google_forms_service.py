from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os
import logging
import json
from google.auth.transport.requests import Request

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GoogleFormsService:
    SCOPES = [
        'https://www.googleapis.com/auth/forms',
        'https://www.googleapis.com/auth/forms.body',
        'https://www.googleapis.com/auth/drive'
    ]
    CREDENTIALS_FILE = r'C:\GoogleFormSystems\backend\credentials.json'

    def __init__(self):
        self.credentials = self._get_credentials()
        self.service = build('forms', 'v1', credentials=self.credentials)

    def _get_credentials(self):
        """Load or generate Google API credentials."""
        if not os.path.exists(self.CREDENTIALS_FILE):
            raise FileNotFoundError(f"Credentials file not found at {self.CREDENTIALS_FILE}. Please set up Google API credentials.")

        # Check if token.json exists and validate its contents
        if os.path.exists('token.json'):
            logger.info(f"Loading existing token with scopes: {self.SCOPES}")
            try:
                with open('token.json', 'r') as token_file:
                    token_data = json.load(token_file)
                required_fields = ['refresh_token', 'client_id', 'client_secret', 'scopes']
                missing_fields = [field for field in required_fields if field not in token_data]
                if missing_fields:
                    logger.warning(f"Token is missing required fields: {missing_fields}. Generating a new token.")
                    os.remove('token.json')
                else:
                    credentials = Credentials.from_authorized_user_file('token.json', self.SCOPES)
                    # Check if scopes match
                    if set(credentials.scopes) != set(self.SCOPES):
                        logger.warning(f"Token scopes {credentials.scopes} do not match required scopes {self.SCOPES}. Generating a new token.")
                        os.remove('token.json')
                    else:
                        # Check if the token is expired and refresh if necessary
                        if credentials.expired and credentials.refresh_token:
                            logger.info("Access token expired. Attempting to refresh.")
                            try:
                                credentials.refresh(Request())
                                # Save the refreshed token
                                with open('token.json', 'w') as token_file:
                                    token_file.write(credentials.to_json())
                                logger.info("Token refreshed successfully.")
                            except Exception as e:
                                logger.error(f"Failed to refresh token: {str(e)}. Generating a new token.")
                                os.remove('token.json')
                        elif not credentials.valid:
                            logger.warning("Token is invalid. Generating a new token.")
                            os.remove('token.json')
                        else:
                            logger.info("Token is valid.")
                            return credentials
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to load token.json: {str(e)}. Generating a new token.")
                os.remove('token.json')

        # If token.json doesn't exist or was deleted, generate a new token
        logger.info(f"Requesting new token with scopes: {self.SCOPES}")
        flow = InstalledAppFlow.from_client_secrets_file(self.CREDENTIALS_FILE, self.SCOPES)
        flow.run_local_server(port=8080, access_type='offline', prompt='consent')
        creds = flow.credentials
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
        logger.info("New token generated successfully")
        return creds

    def create_form(self, title: str, questions: list) -> tuple[str, str]:
        """Create a Google Form with the given title and questions."""
        if not title or not title.strip():
            raise ValueError("Form title cannot be empty.")

        if not questions:
            raise ValueError("At least one question is required.")

        try:
            # Create the form
            form = {
                'info': {
                    'title': title,
                    'documentTitle': title
                }
            }
            logger.info(f"Creating Google Form with title: {title}")
            request = self.service.forms().create(body=form)
            form_response = request.execute()
            form_id = form_response['formId']
            logger.info(f"Created form with ID: {form_id}")

            # Add questions to the form
            for index, question in enumerate(questions, 1):
                if not question.get("text") or not question["text"].strip():
                    raise ValueError(f"Question {index} text cannot be empty.")

                if question["type"] == "short_answer":
                    question_request = {
                        'requests': [{
                            'createItem': {
                                'item': {
                                    'title': question["text"],
                                    'questionItem': {
                                        'question': {
                                            'required': False,
                                            'textQuestion': {
                                                'paragraph': False
                                            }
                                        }
                                    }
                                },
                                'location': {'index': index - 1}
                            }
                        }]
                    }
                elif question["type"] == "multiple_choice":
                    if not question.get("options") or len(question["options"]) < 2:
                        raise ValueError(f"Multiple-choice question {index} must have at least 2 options.")
                    # Ensure all options are non-empty
                    for opt_index, option in enumerate(question["options"], 1):
                        if not option or not option.strip():
                            raise ValueError(f"Option {opt_index} for question {index} cannot be empty.")
                    # Check for duplicate options
                    trimmed_options = [option.strip() for option in question["options"]]
                    unique_options = set(trimmed_options)
                    if len(unique_options) != len(trimmed_options):
                        raise ValueError(f"Options for question {index} must be unique: {trimmed_options}")

                    question_request = {
                        'requests': [{
                            'createItem': {
                                'item': {
                                    'title': question["text"],
                                    'questionItem': {
                                        'question': {
                                            'required': False,
                                            'choiceQuestion': {
                                                'type': 'RADIO',
                                                'options': [{'value': option} for option in question["options"]]
                                            }
                                        }
                                    }
                                },
                                'location': {'index': index - 1}
                            }
                        }]
                    }
                else:
                    raise ValueError(f"Unsupported question type: {question['type']}")

                logger.info(f"Adding question {index}: {question['text']}")
                self.service.forms().batchUpdate(formId=form_id, body=question_request).execute()

            form_url = f"https://docs.google.com/forms/d/{form_id}/edit"
            logger.info(f"Form URL: {form_url}")
            return form_id, form_url
        except HttpError as e:
            logger.error(f"Google API HTTP Error: {str(e)} - Status: {e.status_code} - Reason: {e.reason}")
            raise Exception(f"Failed to create Google Form: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error while creating Google Form: {str(e)}")
            raise Exception(f"Failed to create Google Form: {str(e)}")