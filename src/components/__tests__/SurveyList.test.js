import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import SurveyList from '../SurveyList';
import { getSurveys } from '../../services/api';

// Mock the showNotification prop
const mockShowNotification = jest.fn();

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('SurveyList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    getSurveys.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <SurveyList showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading surveys...')).toBeInTheDocument();
  });

  test('displays no surveys message when empty', async () => {
    getSurveys.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <SurveyList showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No surveys available. Create a new survey to get started.')).toBeInTheDocument();
    });
  });

  test('displays surveys when data is available', async () => {
    const mockSurveys = [
      { id: 1, title: 'Survey 1', status: 'draft' },
      { id: 2, title: 'Survey 2', status: 'published' }
    ];
    getSurveys.mockResolvedValueOnce({ data: mockSurveys });

    render(
      <MemoryRouter>
        <SurveyList showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Survey 1')).toBeInTheDocument();
      expect(screen.getByText('Survey 2')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
      expect(screen.getAllByText('View').length).toBe(2);
    });
  });

  test('navigates to survey details when View is clicked', async () => {
    const mockSurveys = [
      { id: 1, title: 'Survey 1', status: 'draft' }
    ];
    getSurveys.mockResolvedValueOnce({ data: mockSurveys });

    render(
      <MemoryRouter>
        <SurveyList showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Survey 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View'));
    expect(mockNavigate).toHaveBeenCalledWith('/surveys/1');
  });

  test('navigates to create survey page when Create New Survey is clicked', async () => {
    getSurveys.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <SurveyList showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No surveys available. Create a new survey to get started.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create New Survey'));
    expect(mockNavigate).toHaveBeenCalledWith('/surveys/new');
  });

  test('handles API error', async () => {
    getSurveys.mockRejectedValueOnce({
      response: { data: { detail: 'Failed to fetch surveys' } }
    });

    render(
      <MemoryRouter>
        <SurveyList showNotification={mockShowNotification} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch surveys')).toBeInTheDocument();
      expect(mockShowNotification).toHaveBeenCalledWith('danger', 'Failed to fetch surveys');
    });
  });
});