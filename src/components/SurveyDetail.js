import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSurveyById, approveSurvey, deleteSurvey } from '../services/api';

const SurveyDetail = ({ showNotification }) => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const response = await getSurveyById(id);
        setSurvey(response.data);
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Failed to fetch survey';
        setMessage(`Error: ${errorMsg}`);
        showNotification('danger', errorMsg);
      }
    };
    fetchSurvey();
  }, [id, showNotification]);

  const handleApprove = async () => {
    try {
      const response = await approveSurvey(id);
      setMessage(response.data.message);
      setSurvey({ ...survey, status: 'approved' });
      showNotification('success', 'Survey approved successfully!');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to approve survey';
      setMessage(`Error: ${errorMsg}`);
      showNotification('danger', errorMsg);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSurvey(id);
      setMessage('Survey deleted successfully');
      showNotification('success', 'Survey deleted successfully!');
      // Optionally redirect to survey list
      window.location.href = '/surveys';
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to delete survey';
      setMessage(`Error: ${errorMsg}`);
      showNotification('danger', errorMsg);
    }
  };

  if (!survey) return <div className="container mt-4">Loading...</div>;

  return (
    <div className="container mt-4">
      <h2>{survey.title}</h2>
      <p><strong>Status:</strong> {survey.status}</p>
      <p>
        <strong>Form URL:</strong>{' '}
        <a href={survey.form_url} target="_blank" rel="noopener noreferrer">
          {survey.form_url}
        </a>
      </p>
      <p><strong>Recipient Email:</strong> {survey.recipient_email}</p>
      {survey.status === 'draft' && (
        <button className="btn btn-success me-2" onClick={handleApprove}>
          Approve Survey
        </button>
      )}
      <button className="btn btn-danger" onClick={handleDelete}>
        Delete Survey
      </button>
      {message && <div className="alert alert-info mt-3">{message}</div>}
    </div>
  );
};

export default SurveyDetail;