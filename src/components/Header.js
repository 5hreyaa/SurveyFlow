import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Header() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fas fa-poll"></i>
        Flow Survey
      </Link>
      <div className="navbar-nav">
        <Link
          to="/surveys"
          className={`nav-link ${location.pathname === '/surveys' ? 'active' : ''}`}
        >
          All Surveys
        </Link>
        <Link to="/surveys/new" className="btn-create-survey">
          Create New Survey
        </Link>
      </div>
    </nav>
  );
}

export default Header;