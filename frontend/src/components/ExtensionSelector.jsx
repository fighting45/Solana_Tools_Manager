import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import './ExtensionSelector.css';

const ExtensionSelector = ({ onExtensionsChange, disabled, tokenType }) => {
  const [extensions, setExtensions] = useState([]);
  const [selectedExtensions, setSelectedExtensions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch available extensions from backend
  useEffect(() => {
    if (tokenType === 'TOKEN2022') {
      fetchExtensions();
    } else {
      // Reset when switching away from Token-2022
      setExtensions([]);
      setSelectedExtensions([]);
      onExtensionsChange([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenType]);

  const fetchExtensions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getToken2022Extensions();
      setExtensions(data.extensions || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
      setLoading(false);
      // Set empty array on error
      setExtensions([]);
    }
  };

  const handleExtensionToggle = (extensionName) => {
    const newSelection = selectedExtensions.includes(extensionName)
      ? selectedExtensions.filter(ext => ext !== extensionName)
      : [...selectedExtensions, extensionName];
    
    setSelectedExtensions(newSelection);
    onExtensionsChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedExtensions.length === extensions.length) {
      setSelectedExtensions([]);
      onExtensionsChange([]);
    } else {
      const allExtensions = extensions.map(ext => ext.name);
      setSelectedExtensions(allExtensions);
      onExtensionsChange(allExtensions);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.extension-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (loading) {
    return (
      <div className="extension-selector">
        <label className="form-label">
          Optional Token Extensions
          <span className="label-hint">(Select any that apply)</span>
        </label>
        <div className="extension-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!extensions || extensions.length === 0) {
    return null; // Don't show if no extensions available
  }

  return (
    <div className="extension-selector">
      <label className="form-label">
        Optional Token Extensions
        <span className="label-hint">(Select any that apply)</span>
      </label>
      
      <div className="extension-dropdown">
        <button
          type="button"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className="extension-dropdown-toggle"
        >
          <div className="dropdown-toggle-content">
            <span className="dropdown-text">
              {selectedExtensions.length === 0
                ? "Select extensions..."
                : `${selectedExtensions.length} extension${selectedExtensions.length > 1 ? 's' : ''} selected`}
            </span>
            <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
          </div>
        </button>

        {isDropdownOpen && (
          <div className="extension-dropdown-menu">
            <div className="dropdown-header">
              <button
                type="button"
                onClick={handleSelectAll}
                className="select-all-btn"
              >
                {selectedExtensions.length === extensions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="extension-list">
              {extensions.map((extension) => (
                <div
                  key={extension.name}
                  className="extension-item"
                  onClick={() => handleExtensionToggle(extension.name)}
                >
                  <div className="extension-checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={selectedExtensions.includes(extension.name)}
                      onChange={() => {}}
                      className="extension-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="extension-content">
                      <div className="extension-header">
                        <span className="extension-label">{extension.label}</span>
                        {extension.warning && (
                          <span className="warning-icon" title={extension.warning}>⚠️</span>
                        )}
                      </div>
                      <p className="extension-description">{extension.description}</p>
                      {extension.warning && (
                        <div className="extension-warning">
                          <span className="warning-prefix">⚠️</span>
                          <span>{extension.warning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedExtensions.length > 0 && (
        <div className="selected-extensions">
          <div className="extension-tags">
            {selectedExtensions.map(ext => {
              const extension = extensions.find(e => e.name === ext);
              return (
                <span key={ext} className="extension-tag">
                  {extension?.label || ext}
                  <button
                    type="button"
                    onClick={() => handleExtensionToggle(ext)}
                    className="tag-remove"
                    disabled={disabled}
                    title="Remove extension"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionSelector;
