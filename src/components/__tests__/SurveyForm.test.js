import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SurveyForm from '../SurveyForm';
import { createSurvey } from '../../services/api';

// Mock the navigate function from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the showNotification prop
const mockShowNotification = jest.fn();

// Mock file reading for file upload
const mockFileContent = 'Question 1\nQuestion 2';
global.FileReader = class {
  readAsText() {
    this.onload({ target: { result: mockFileContent } });
  }
};

describe('SurveyForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the survey form correctly', () => {
    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    expect(screen.getByText('Create a New Survey')).toBeInTheDocument();
    expect(screen.getByText('Survey Details')).toBeInTheDocument();
    expect(screen.getByText('Questions Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('Survey Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Question Type')).toBeInTheDocument();
    expect(screen.getByText('Input Method')).toBeInTheDocument();
  });

  test('toggles collapsible sections', () => {
    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    const detailsHeader = screen.getByText('Survey Details');
    const questionsHeader = screen.getByText('Questions Configuration');

    // Initially open
    expect(screen.getByLabelText('Survey Title')).toBeVisible();

    // Collapse Survey Details
    fireEvent.click(detailsHeader);
    expect(screen.queryByLabelText('Survey Title')).not.toBeVisible();

    // Reopen Survey Details
    fireEvent.click(detailsHeader);
    expect(screen.getByLabelText('Survey Title')).toBeVisible();

    // Collapse Questions Configuration
    fireEvent.click(questionsHeader);
    expect(screen.queryByLabelText('Input Method')).not.toBeVisible();
  });

  test('shows validation errors when submitting an empty form', async () => {
    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Create Survey'));

    expect(screen.getByText('Survey title is required')).toBeInTheDocument();
    expect(screen.getByText('Recipient email is required')).toBeInTheDocument();
    expect(screen.getByText('Please specify the number of questions (at least 1)')).toBeInTheDocument();
  });

  test('handles file upload and populates questions', async () => {
    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    // Switch to file upload
    fireEvent.click(screen.getByLabelText('Upload Questions File'));

    // Mock file input
    const file = new File([mockFileContent], 'questions.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText('Upload Questions File (.txt)');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Question 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Number of Questions')).toHaveValue('2');
    });
  });

  test('allows filling and submitting multiple choice questions', async () => {
    createSurvey.mockResolvedValueOnce({ data: { id: 1 } });

    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    // Fill basic fields
    fireEvent.change(screen.getByLabelText('Survey Title'), { target: { value: 'Test Survey' } });
    fireEvent.change(screen.getByLabelText('Recipient Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Question Type'), { target: { value: 'multiple_choice' } });
    fireEvent.change(screen.getByLabelText('Number of Questions'), { target: { value: '1' } });

    // Fill question and options
    fireEvent.change(screen.getByPlaceholderText('Enter question 1'), { target: { value: 'Favorite Color?' } });
    const options = screen.getAllByPlaceholderText(/Option/i);
    fireEvent.change(options[0], { target: { value: 'Red' } });
    fireEvent.change(options[1], { target: { value: 'Blue' } });

    // Add a new option
    fireEvent.click(screen.getByText('Add Option'));
    const newOptions = screen.getAllByPlaceholderText(/Option/i);
    fireEvent.change(newOptions[2], { target: { value: 'Green' } });

    // Remove an option
    fireEvent.click(screen.getAllByText('Remove')[0]);
    expect(screen.queryByDisplayValue('Blue')).not.toBeInTheDocument();

    // Submit
    fireEvent.click(screen.getByText('Create Survey'));

    await waitFor(() => {
      expect(createSurvey).toHaveBeenCalledWith({
        title: 'Test Survey',
        question_type: 'multiple_choice',
        questions: [
          { text: 'Favorite Color?', options: ['Red', 'Green'] }
        ],
        recipient_email: 'test@example.com',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/surveys/1');
    });
  });

  test('shows validation for duplicate options in multiple choice', async () => {
    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    // Fill basic fields
    fireEvent.change(screen.getByLabelText('Survey Title'), { target: { value: 'Test Survey' } });
    fireEvent.change(screen.getByLabelText('Recipient Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Question Type'), { target: { value: 'multiple_choice' } });
    fireEvent.change(screen.getByLabelText('Number of Questions'), { target: { value: '1' } });

    // Fill question and duplicate options
    fireEvent.change(screen.getByPlaceholderText('Enter question 1'), { target: { value: 'Favorite Color?' } });
    const options = screen.getAllByPlaceholderText(/Option/i);
    fireEvent.change(options[0], { target: { value: 'Red' } });
    fireEvent.change(options[1], { target: { value: 'Red' } });

    fireEvent.click(screen.getByText('Create Survey'));

    expect(screen.getByText('Options for Question 1 must be unique')).toBeInTheDocument();
  });

  test('toggles preview mode and displays preview', async () => {
    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    // Fill the form
    fireEvent.change(screen.getByLabelText('Survey Title'), { target: { value: 'Test Survey' } });
    fireEvent.change(screen.getByLabelText('Recipient Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Number of Questions'), { target: { value: '1' } });
    fireEvent.change(screen.getAllByPlaceholderText(/Enter question/i)[0], { target: { value: 'Question 1' } });

    // Toggle preview
    fireEvent.click(screen.getByText('Preview'));

    expect(screen.getByText('Survey Preview')).toBeInTheDocument();
    expect(screen.getByText('Test Survey')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Back to Edit')).toBeInTheDocument();
  });

  test('handles API failure during submission', async () => {
    createSurvey.mockRejectedValueOnce({
      response: { data: { detail: 'Server error' } }
    });

    render(
      <MemoryRouter>
        <SurveyForm showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    // Fill the form
    fireEvent.change(screen.getByLabelText('Survey Title'), { target: { value: 'Test Survey' } });
    fireEvent.change(screen.getByLabelText('Recipient Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Number of Questions'), { target: { value: '1' } });
    fireEvent.change(screen.getAllByPlaceholderText(/Enter question/i)[0], { target: { value: 'Question 1' } });

    // Submit the form
    fireEvent.click(screen.getByText('Create Survey'));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith('danger', 'Server error');
    });
  });
});