import React, { useState, useEffect } from "react";
import "./CustomAddressGenerator.css";

const CustomAddressGenerator = ({
  enabled,
  prefix,
  suffix,
  generatedAddress,
  onToggle,
  onPrefixChange,
  onSuffixChange,
  onGenerate,
  disabled,
  loading,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState("");

  const combinedLength = prefix.length + suffix.length;
  const isValid = combinedLength <= 4 && combinedLength > 0;

  useEffect(() => {
    if (combinedLength > 4) {
      setError("Combined prefix and suffix must not exceed 4 characters.");
    } else if (combinedLength === 0) {
      setError("At least one of prefix or suffix must be provided.");
    } else {
      setError("");
    }
  }, [prefix, suffix]);

  const handlePrefixChange = (e) => {
    const value = e.target.value.toUpperCase();
    onPrefixChange(value);
  };

  const handleSuffixChange = (e) => {
    const value = e.target.value.toUpperCase();
    onSuffixChange(value);
  };

  const handleGenerate = async () => {
    if (!isValid) return;
    setInternalLoading(true);
    try {
      await onGenerate(prefix, suffix);
    } catch (err) {
      setError(
        "Failed to generate address in threshold time. Please try again."
      );
    } finally {
      setInternalLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedAddress);
  };

  return (
    <div className="custom-address-section">
      <div className="feature-header">
        <div className="feature-title">
          <h4>Custom Address Generator (+0.1 SOL)</h4>
          <p className="feature-description">
            Generate a custom token address with your desired prefix or suffix
            (max 4 characters combined)
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
              value={prefix}
              onChange={handlePrefixChange}
              placeholder="Prefix (e.g., ABC)"
              className="address-input"
              maxLength={4 - suffix.length}
              disabled={disabled}
            />
            <input
              type="text"
              value={suffix}
              onChange={handleSuffixChange}
              placeholder="Suffix (e.g., XYZ)"
              className="address-input"
              maxLength={4 - prefix.length}
              disabled={disabled}
            />
          </div>

          <div className={`character-counter ${isValid ? "valid" : "invalid"}`}>
            {combinedLength}/4 characters used
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={disabled || !isValid || internalLoading || loading}
          >
            {internalLoading || loading ? (
              <span className="spinner"></span>
            ) : (
              "Generate Address"
            )}
          </button>

          {generatedAddress && (
            <div className="generated-address-display">
              <div className="label">Generated Address</div>
              <div className="address">{generatedAddress}</div>
              <button className="copy-btn" onClick={copyToClipboard}>
                Copy
              </button>
            </div>
          )}

          <div className="info-note">
            Note: Address generation may take a few moments depending on
            complexity
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomAddressGenerator;
