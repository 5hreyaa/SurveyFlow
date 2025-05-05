import axios from 'axios';

const api = axios.create({
  baseURL: '/api',  // Use relative URL to leverage proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSurveys = () => api.get('/surveys/');
export const createSurvey = (data, isFileUpload = false) => {
  if (isFileUpload) {
    return api.post('/surveys/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
  return api.post('/surveys/', data);
};
export const getSurveyById = (id) => api.get(`/surveys/${id}`);
export const approveSurvey = (id) => api.post(`/surveys/${id}/approve`);
export const deleteSurvey = (id) => api.delete(`/surveys/${id}`);

export default api;