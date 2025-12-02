import React, { useState, useEffect } from 'react';
import './CustomAddressGenerator.css';

const CustomAddressGenerator = ({
  enabled,
  suffix,
  onToggle,
  onSuffixChange,
  disabled,
}) => {
  const [error, setError] = useState('');

  const maxSuffixLength = 3;
  const isValid = suffix.length > 0 && suffix.length <= maxSuffixLength;

  useEffect(() => {
    if (suffix.length > maxSuffixLength) {
      setError(`Suffix must not exceed ${maxSuffixLength} characters.`);
    } else if (suffix.length === 0) {
      setError('Suffix must be provided.');
    } else {
      setError('');
    }
  }, [suffix]);

  const handleSuffixChange = (e) => {
    const value = e.target.value.toUpperCase();
    onSuffixChange(value);
  };

  return (
    <div className="custom-address-section">
      <div className="feature-header">
        <div className="feature-title">
          <h4>Custom Address Generator (+0.1 SOL)</h4>
          <p className="feature-description">
            Generate a custom token address with your desired suffix (max 3
            characters). Address will be generated during token creation.
          </p>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div className="custom-address-content">
          <div className="input-row">
            <input
              type="text"
              value={suffix}
              onChange={handleSuffixChange}
              placeholder="Suffix (e.g., XYZ)"
              className="address-input"
              maxLength={maxSuffixLength}
              disabled={disabled}
            />
          </div>

          <div className={`character-counter ${isValid ? 'valid' : 'invalid'}`}>
            {suffix.length}/{maxSuffixLength} characters used
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="info-note">
            Note: Custom address will be generated automatically during token
            minting
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomAddressGenerator;
