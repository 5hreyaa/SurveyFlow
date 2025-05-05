import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSurveys } from '../services/api';

const SurveyList = ({ showNotification }) => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getSurveys();
        setSurveys(response.data);
      } catch (error) {
        console.error('Error fetching surveys:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.detail || 'Failed to fetch surveys. Please try again.';
        setError(errorMessage);
        showNotification('danger', errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, [showNotification]);

  return (
    <div className="container mt-4">
      <h2>Surveys</h2>
      <Link to="/surveys/new" className="btn btn-primary mb-3">
        Create New Survey
      </Link>
      {loading && <p>Loading surveys...</p>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && surveys.length === 0 && !error && (
        <p>No surveys available.</p>
      )}
      {surveys.length > 0 && (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey) => (
              <tr key={survey.id}>
                <td>{survey.title}</td>
                <td>{survey.status}</td>
                <td>
                  <Link
                    to={`/surveys/${survey.id}`}
                    className="btn btn-info btn-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SurveyList;