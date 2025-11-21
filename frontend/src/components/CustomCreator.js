import React from 'react';
import './CustomCreator.css';

const CustomCreator = ({ formData, onInputChange, disabled }) => {
  const handleToggle = () => {
    onInputChange({
      target: {
        name: 'useCustomCreator',
        value: !formData.useCustomCreator
      }
    });
  };

  return (
    <div className="custom-creator-section">
      <div className="custom-creator-header">
        <div className="custom-creator-title-section">
          <h4 className="custom-creator-title">
            Modify Creator Information (+0.1 SOL):
          </h4>
          <p className="custom-creator-description">
            Change the information of the creator in the metadata, by default it is ProgrammX.
          </p>
        </div>
        <label className="custom-creator-toggle">
          <input
            type="checkbox"
            checked={formData.useCustomCreator || false}
            onChange={handleToggle}
            disabled={disabled}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {formData.useCustomCreator && (
        <div className="custom-creator-content">
          <div className="custom-creator-fields">
            <div className="form-group">
              <label htmlFor="creatorName" className="form-label">
                <span className="required">*</span> Creator Name
              </label>
              <input
                type="text"
                id="creatorName"
                name="creatorName"
                value={formData.creatorName || ''}
                onChange={onInputChange}
                placeholder="Enter name.."
                className="form-input"
                disabled={disabled}
              />
            </div>

            <div className="form-group">
              <label htmlFor="creatorWebsite" className="form-label">
                <span className="required">*</span> Creator Website
              </label>
              <div className="input-with-icon">
                <span className="input-icon">🌐</span>
                <input
                  type="url"
                  id="creatorWebsite"
                  name="creatorWebsite"
                  value={formData.creatorWebsite || ''}
                  onChange={onInputChange}
                  placeholder="https://programmx.com"
                  className="form-input with-icon"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomCreator;
