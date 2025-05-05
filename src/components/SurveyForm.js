import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSurvey } from '../services/api';

function SurveyForm({ showNotification }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    recipient_email: '',
    question_type: 'fillup',
    num_questions: '',
  });
  const [questions, setQuestions] = useState([]);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [questionsFile, setQuestionsFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNumQuestionsChange = (e) => {
    const num = parseInt(e.target.value, 10);
    setFormData(prev => ({ ...prev, num_questions: e.target.value }));
    if (isNaN(num) || num < 1) {
      setErrors(prev => ({ ...prev, num_questions: 'Please enter a valid number of questions (at least 1)' }));
      setQuestions([]);
      return;
    }
    setErrors(prev => ({ ...prev, num_questions: '' }));

    const newQuestions = Array.from({ length: num }, () => ({
      text: '',
      options: formData.question_type === 'multiple_choice' ? ['', ''] : null,
    }));
    setQuestions(newQuestions);
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    if (field === 'text') {
      updatedQuestions[index].text = value;
    } else {
      updatedQuestions[index].options[field] = value;
    }
    setQuestions(updatedQuestions);
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.push('');
    setQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options.length > 2) {
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      setQuestions(updatedQuestions);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.txt')) {
        setErrors(prev => ({ ...prev, questions_file: 'Please upload a .txt file.' }));
        setQuestionsFile(null);
        e.target.value = null;
        return;
      }
      setQuestionsFile(file);
      setUseFileUpload(true);
      setErrors(prev => ({ ...prev, questions_file: '' }));

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const questionTexts = content.split('\n').filter(q => q.trim());
        if (questionTexts.length === 0) {
          setErrors(prev => ({ ...prev, questions_file: 'File must contain at least one question.' }));
          setQuestionsFile(null);
          setUseFileUpload(false);
          e.target.value = null;
          return;
        }
        setFormData(prev => ({ ...prev, num_questions: questionTexts.length.toString() }));
        const newQuestions = questionTexts.map(text => ({
          text,
          options: formData.question_type === 'multiple_choice' ? ['', ''] : null,
        }));
        setQuestions(newQuestions);
      };
      reader.readAsText(file);
    } else {
      setQuestionsFile(null);
      setUseFileUpload(false);
      setQuestions([]);
      setFormData(prev => ({ ...prev, num_questions: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Survey title is required';
    }

    if (!formData.num_questions || parseInt(formData.num_questions, 10) < 1) {
      newErrors.num_questions = 'Please specify the number of questions (at least 1)';
    }

    if (!formData.recipient_email.trim()) {
      newErrors.recipient_email = 'Recipient email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.recipient_email)) {
      newErrors.recipient_email = 'Please enter a valid email address';
    }

    if (useFileUpload && !questionsFile) {
      newErrors.questions_file = 'Please upload a questions file.';
    }

    questions.forEach((question, index) => {
      if (!question.text.trim()) {
        newErrors[`question_${index}`] = `Question ${index + 1} text is required`;
      }
      if (formData.question_type === 'multiple_choice') {
        const options = question.options;
        options.forEach((option, optIndex) => {
          if (!option.trim()) {
            newErrors[`option_${index}_${optIndex}`] = `Option ${optIndex + 1} for Question ${index + 1} is required`;
          }
        });
        const trimmedOptions = options.map(opt => opt.trim());
        const uniqueOptions = new Set(trimmedOptions);
        if (uniqueOptions.size !== trimmedOptions.length) {
          newErrors[`options_duplicate_${index}`] = `Options for Question ${index + 1} must be unique`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response;
      if (useFileUpload && questionsFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('recipient_email', formData.recipient_email);
        formDataToSend.append('questions_file', questionsFile);
        formDataToSend.append('question_type', formData.question_type);
        if (formData.question_type === 'multiple_choice') {
          // For file upload, we can include the questions with options as a JSON string
          const questionsWithOptions = questions.map(q => ({
            text: q.text,
            options: q.options,
          }));
          formDataToSend.append('questions', JSON.stringify(questionsWithOptions));
        }
        response = await createSurvey(formDataToSend, true);
      } else {
        const surveyData = {
          title: formData.title,
          question_type: formData.question_type,
          questions: questions,
          recipient_email: formData.recipient_email,
        };
        response = await createSurvey(surveyData);
      }
      showNotification('success', 'Survey created successfully!');
      navigate(`/surveys/${response.data.id}`);
    } catch (error) {
      console.error('Error creating survey:', error.message, error.response?.data);
      let errorMessage = 'Failed to create survey. Please try again.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      showNotification('danger', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  const renderQuestionPreview = () => {
    if (questions.length === 0) {
      return <p className="text-muted">No questions added yet.</p>;
    }

    return (
      <div>
        <h5 className="mb-3">{formData.title || 'Untitled Survey'}</h5>
        {questions.map((question, index) => (
          <div key={index} className="card mb-2">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Question {index + 1}</h6>
              <p className="card-text">{question.text}</p>
              {formData.question_type === 'multiple_choice' && question.options && (
                <ul className="list-group">
                  {question.options.map((option, optIndex) => (
                    <li key={optIndex} className="list-group-item">{option || `Option ${optIndex + 1}`}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">Create a New Survey</h3>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={togglePreview}
                disabled={loading}
              >
                {previewMode ? 'Edit Survey' : 'Preview Survey'}
              </button>
            </div>

            <div className="card-body">
              {previewMode ? (
                <div className="preview-container">
                  <h4 className="mb-4 text-center">Survey Preview</h4>
                  {renderQuestionPreview()}
                  <div className="d-flex justify-content-between mt-4">
                    <button
                      className="btn btn-secondary"
                      onClick={togglePreview}
                    >
                      Back to Edit
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Survey'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="title" className="form-label fw-bold">Survey Title</label>
                    <input
                      type="text"
                      className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter the title of your survey"
                      disabled={loading}
                    />
                    {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="recipient_email" className="form-label fw-bold">Recipient Email</label>
                    <input
                      type="email"
                      className={`form-control ${errors.recipient_email ? 'is-invalid' : ''}`}
                      id="recipient_email"
                      name="recipient_email"
                      value={formData.recipient_email}
                      onChange={handleInputChange}
                      placeholder="Enter the recipient's email address"
                      disabled={loading}
                    />
                    {errors.recipient_email && <div className="invalid-feedback">{errors.recipient_email}</div>}
                    <small className="form-text text-muted">
                      This email will receive the survey link after approval.
                    </small>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="question_type" className="form-label fw-bold">Question Type</label>
                    <select
                      className="form-select"
                      id="question_type"
                      name="question_type"
                      value={formData.question_type}
                      onChange={(e) => {
                        handleInputChange(e);
                        setQuestions([]);
                        setFormData(prev => ({ ...prev, num_questions: '' }));
                        setQuestionsFile(null);
                        setUseFileUpload(false);
                        const fileInput = document.getElementById('questions_file');
                        if (fileInput) {
                          fileInput.value = null;
                        }
                      }}
                      disabled={loading}
                    >
                      <option value="fillup">Fill-up (Short Answer)</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-bold">Input Method</label>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="input_method"
                        id="manual_input"
                        checked={!useFileUpload}
                        onChange={() => {
                          setUseFileUpload(false);
                          setQuestionsFile(null);
                          const fileInput = document.getElementById('questions_file');
                          if (fileInput) {
                            fileInput.value = null;
                          }
                          setQuestions([]);
                          setFormData(prev => ({ ...prev, num_questions: '' }));
                        }}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="manual_input">
                        Manual Input
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="input_method"
                        id="file_upload"
                        checked={useFileUpload}
                        onChange={() => setUseFileUpload(true)}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="file_upload">
                        Upload Questions File
                      </label>
                    </div>
                  </div>

                  {useFileUpload ? (
                    <div className="mb-4">
                      <label htmlFor="questions_file" className="form-label fw-bold">
                        Upload Questions File (.txt)
                      </label>
                      <input
                        type="file"
                        className={`form-control ${errors.questions_file ? 'is-invalid' : ''}`}
                        id="questions_file"
                        accept=".txt"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                      {errors.questions_file && <div className="invalid-feedback">{errors.questions_file}</div>}
                      <small className="form-text text-muted">
                        Upload a .txt file with one question per line.
                      </small>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label htmlFor="num_questions" className="form-label fw-bold">Number of Questions</label>
                      <input
                        type="number"
                        className={`form-control ${errors.num_questions ? 'is-invalid' : ''}`}
                        id="num_questions"
                        name="num_questions"
                        value={formData.num_questions}
                        onChange={handleNumQuestionsChange}
                        placeholder="Enter the number of questions"
                        min="1"
                        disabled={loading}
                      />
                      {errors.num_questions && <div className="invalid-feedback">{errors.num_questions}</div>}
                    </div>
                  )}

                  {questions.length > 0 && (
                    <div className="mb-4">
                      <h5 className="fw-bold mb-3">Questions</h5>
                      {questions.map((question, index) => (
                        <div key={index} className="border p-3 mb-3 rounded bg-light">
                          <div className="mb-3">
                            <label className="form-label fw-bold">
                              Question {index + 1}
                            </label>
                            <input
                              type="text"
                              className={`form-control ${errors[`question_${index}`] ? 'is-invalid' : ''}`}
                              value={question.text}
                              onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                              placeholder={`Enter question ${index + 1}`}
                              disabled={loading || useFileUpload}
                            />
                            {errors[`question_${index}`] && (
                              <div className="invalid-feedback">{errors[`question_${index}`]}</div>
                            )}
                          </div>
                          {formData.question_type === 'multiple_choice' && (
                            <div className="ms-3">
                              <label className="form-label fw-bold">Options</label>
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="input-group mb-2">
                                  <span className="input-group-text">{optIndex + 1}</span>
                                  <input
                                    type="text"
                                    className={`form-control ${errors[`option_${index}_${optIndex}`] || errors[`options_duplicate_${index}`] ? 'is-invalid' : ''}`}
                                    value={option}
                                    onChange={(e) => handleQuestionChange(index, optIndex, e.target.value)}
                                    placeholder={`Option ${optIndex + 1}`}
                                    disabled={loading}
                                  />
                                  {question.options.length > 2 && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => removeOption(index, optIndex)}
                                      disabled={loading}
                                    >
                                      Remove
                                    </button>
                                  )}
                                  {errors[`option_${index}_${optIndex}`] && (
                                    <div className="invalid-feedback">{errors[`option_${index}_${optIndex}`]}</div>
                                  )}
                                </div>
                              ))}
                              {errors[`options_duplicate_${index}`] && (
                                <div className="text-danger mt-2">{errors[`options_duplicate_${index}`]}</div>
                              )}
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm mt-2"
                                onClick={() => addOption(index)}
                                disabled={loading}
                              >
                                Add Option
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="d-flex justify-content-between">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate('/surveys')}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <div>
                      <button
                        type="button"
                        className="btn btn-outline-primary me-2"
                        onClick={togglePreview}
                        disabled={loading}
                      >
                        Preview
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Creating...' : 'Create Survey'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurveyForm;