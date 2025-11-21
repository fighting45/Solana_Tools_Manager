import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePriorityFee } from '../context/PriorityFeeContext';
import PriorityFeeSelector from './PriorityFeeSelector';
import './Navbar.css';

const Navbar = () => {
  const { priorityLevel, updatePriorityLevel } = usePriorityFee();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });
  const [isPriorityFeeOpen, setIsPriorityFeeOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handlePriorityLevelChange = (level) => {
    console.log('🎯 [Navbar] Setting priority level to:', level);
    updatePriorityLevel(level);
    console.log('✅ [Navbar] Priority level updated via context');
  };

  // Get display label for current priority level
  const getPriorityLabel = () => {
    const labels = {
      'none': 'None',
      'fast': 'Fast 1x',
      'turbo': 'Turbo 2x',
      'ultra': 'Ultra 3x'
    };
    return labels[priorityLevel] || 'Fast 1x';
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <Link to="/" className="navbar-logo">
              <img src="/programmx-logo.jpeg" alt="ProgrammX" className="logo-image" />
              <span className="logo-text">ProgrammX</span>
            </Link>

            <div className="navbar-links">
              <Link to="/" className="navbar-link">Home</Link>
              <Link to="/launch" className="navbar-link">Launch Token</Link>
              <a
                href="https://programmx.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-link"
              >
                About
              </a>
              <a
                href="https://www.linkedin.com/company/programm-x/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-link"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className="navbar-right">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button
              className="priority-fee-btn"
              onClick={() => setIsPriorityFeeOpen(true)}
              title="Set Priority Fees"
            >
              <span className="priority-label">Priority:</span>
              <span className="priority-value">{getPriorityLabel()}</span>
            </button>

            <div className="network-badge">
              <span className="network-icon">⚡</span>
              <span className="network-name">Solana</span>
            </div>

            <WalletMultiButton className="navbar-wallet-button" />
          </div>
        </div>
      </nav>

      <PriorityFeeSelector
        isOpen={isPriorityFeeOpen}
        onClose={() => setIsPriorityFeeOpen(false)}
        selectedLevel={priorityLevel}
        onSelectLevel={handlePriorityLevelChange}
      />
    </>
  );
};

export default Navbar;

