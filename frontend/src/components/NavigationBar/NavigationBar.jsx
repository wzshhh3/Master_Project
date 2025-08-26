import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NavigationBar.css'; // ← 引入 CSS 文件

const NavigationBar = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/upload');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">🌐 Graphlet Platform</div>
      <button className="navbar-button" onClick={handleClick}>
        Start
      </button>
    </nav>
  );
};

export default NavigationBar;

