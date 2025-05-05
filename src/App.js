import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import SurveyForm from './components/SurveyForm';
import SurveyList from './components/SurveyList';
import SurveyDetail from './components/SurveyDetail';

function App() {
  const [notification, setNotification] = useState({ type: null, message: '' });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, 5000);
  };

  return (
    <div className="app">
      <style>
        {`
          /* Global Styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #f0f4f8 0%, #ffffff 100%);
            min-height: 100vh;
            overflow-x: hidden;
            color: #333;
          }

          .app {
            position: relative;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            animation: fadeIn 1s ease-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Background Shapes */
          .background-shapes {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
          }

          .wave {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 200px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%2343b5c0' fill-opacity='0.2' d='M0,128L48,138.7C96,149,192,171,288,181.3C384,192,480,192,576,170.7C672,149,768,107,864,96C960,85,1056,107,1152,128C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E");
            background-size: cover;
            background-repeat: no-repeat;
            background-position: bottom;
          }

          .circle {
            position: absolute;
            border-radius: 50%;
            background: rgba(67, 181, 192, 0.1);
            animation: float 6s ease-in-out infinite;
          }

          .circle:nth-child(1) {
            width: 300px;
            height: 300px;
            top: 10%;
            left: 10%;
          }

          .circle:nth-child(2) {
            width: 200px;
            height: 200px;
            top: 60%;
            right: 15%;
            animation-delay: -3s;
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          /* Header (Assuming Header Component Uses These Classes) */
          .navbar {
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1000;
          }

          .navbar-brand {
            font-size: 24px;
            font-weight: 700;
            color: #43b5c0;
            text-decoration: none;
            display: flex;
            align-items: center;
          }

          .navbar-brand i {
            margin-right: 10px;
            font-size: 28px;
            color: #43b5c0;
          }

          .navbar-nav {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .nav-link {
            font-size: 16px;
            font-weight: 500;
            color: #555;
            text-decoration: none;
            position: relative;
            transition: color 0.3s ease;
          }

          .nav-link:hover, .nav-link.active {
            color: #43b5c0;
          }

          .nav-link::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            background: #43b5c0;
            bottom: -5px;
            left: 0;
            transition: width 0.3s ease;
          }

          .nav-link:hover::after, .nav-link.active::after {
            width: 100%;
          }

          .btn-create-survey {
            background: #43b5c0;
            color: #ffffff;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 15px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.3s ease;
          }

          .btn-create-survey:hover {
            background: #3a9ca6;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(67, 181, 192, 0.3);
          }

          /* Notification */
          .alert {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.5s ease-out;
            border: none;
          }

          .alert-success {
            background: #e6f7e9;
            color: #2e7d32;
            border-left: 4px solid #2e7d32;
          }

          .alert-danger {
            background: #ffebee;
            color: #d32f2f;
            border-left: 4px solid #d32f2f;
          }

          .alert .btn-close {
            background: none;
            border: none;
            font-size: 16px;
            color: inherit;
            opacity: 0.6;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
          }

          .alert .btn-close:hover {
            opacity: 1;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          /* Main Content */
          .container {
            flex: 1;
            padding: 40px 20px;
            max-width: 900px;
            margin: 0 auto;
          }

          /* Global Form Styles (Affects SurveyForm) */
          .form-container {
            max-width: 700px;
            width: 100%;
            margin: 0 auto;
          }

          .card {
            background: #ffffff;
            border: none;
            border-radius: 15px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }

          .card-header {
            background: #43b5c0;
            color: #ffffff;
            padding: 20px 30px;
            border-bottom: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .card-header h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }

          .card-body {
            padding: 30px;
          }

          .form-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .form-control, .form-select {
            border: 1px solid #d1d9e6;
            border-radius: 8px;
            padding: 12px 15px;
            font-size: 15px;
            color: #333;
            transition: all 0.3s ease;
            background: #f8fafd;
          }

          .form-control:focus, .form-select:focus {
            border-color: #43b5c0;
            box-shadow: 0 0 0 3px rgba(67, 181, 192, 0.1);
            background: #ffffff;
            outline: none;
          }

          .form-control.is-invalid {
            border-color: #dc3545;
          }

          .invalid-feedback {
            font-size: 13px;
            color: #dc3545;
          }

          .form-text {
            font-size: 13px;
            color: #666;
          }

          .form-check {
            margin-bottom: 10px;
          }

          .form-check-label {
            font-size: 15px;
            color: #333;
            margin-left: 8px;
            cursor: pointer;
          }

          .form-check-input {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }

          .form-check-input:checked {
            background-color: #43b5c0;
            border-color: #43b5c0;
          }

          .btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 500;
            transition: all 0.3s ease;
          }

          .btn-primary {
            background: #43b5c0;
            border: none;
            color: #ffffff;
          }

          .btn-primary:hover {
            background: #3a9ca6;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(67, 181, 192, 0.3);
          }

          .btn-primary:disabled {
            background: #a3d9de;
            transform: none;
            box-shadow: none;
          }

          .btn-secondary, .btn-outline-primary {
            background: #f1f4f8;
            color: #43b5c0;
            border: 1px solid #d1d9e6;
          }

          .btn-secondary:hover, .btn-outline-primary:hover {
            background: #e6eaf0;
            color: #3a9ca6;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .btn-outline-light {
            border-color: #ffffff;
            color: #ffffff;
          }

          .btn-outline-light:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: #ffffff;
            color: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3);
          }

          /* Survey List and Details Styles */
          .survey-list, .survey-details {
            max-width: 900px;
            width: 100%;
            margin: 0 auto;
          }

          .survey-list h2, .survey-details h2 {
            font-size: 28px;
            font-weight: 600;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
          }

          .survey-item {
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            padding: 20px;
            margin-bottom: 20px;
            transition: transform 0.3s ease;
          }

          .survey-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          }

          .survey-item h5 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
          }

          .survey-item p {
            font-size: 15px;
            color: #666;
            margin-bottom: 10px;
          }

          .survey-item a {
            color: #43b5c0;
            text-decoration: none;
            font-weight: 500;
          }

          .survey-item a:hover {
            color: #3a9ca6;
            text-decoration: underline;
          }

          /* Footer */
          .footer {
            background: #f8fafd;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e0e7ef;
            margin-top: auto;
          }
        `}
      </style>

      {/* Background Shapes */}
      <div className="background-shapes">
        <div className="wave"></div>
        <div className="circle"></div>
        <div className="circle"></div>
      </div>

      {/* Header */}
      <Header />

      {/* Notification */}
      {notification.type && (
        <div className={`alert alert-${notification.type} m-2`} role="alert">
          {notification.message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setNotification({ type: null, message: '' })}
            aria-label="Close"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<Navigate to="/surveys" replace />} />
          <Route
            path="/surveys"
            element={<SurveyList showNotification={showNotification} />}
          />
          <Route
            path="/surveys/new"
            element={<SurveyForm showNotification={showNotification} />}
          />
          <Route
            path="/surveys/:id"
            element={<SurveyDetail showNotification={showNotification} />}
          />
        </Routes>
      </div>

      {/* Footer */}
      <footer className="footer">
        © {new Date().getFullYear()} Google Forms System. All rights reserved.
      </footer>
    </div>
  );
}

export default App;