import React from 'react';
import './MintForm.css';

const MintForm = ({ formData, onInputChange, onFileChange, onMint, loading, disabled }) => {
  return (
    <div className="form-section">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Token Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            placeholder="My Token"
            className="form-input"
            disabled={loading || disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="symbol" className="form-label">
            Token Symbol <span className="required">*</span>
          </label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={onInputChange}
            placeholder="MTK"
            className="form-input"
            disabled={loading || disabled}
            maxLength="10"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="image" className="form-label">
          Token Image <span className="required">*</span>
        </label>
        <input
          type="file"
          id="image"
          name="image"
          accept="image/*"
          onChange={onFileChange}
          className="form-input file-input"
          disabled={loading || disabled}
        />
        {formData.imagePreview && (
          <div className="image-preview">
            <img src={formData.imagePreview} alt="Preview" />
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="recipientAddress" className="form-label">
          Recipient Address <span className="required">*</span>
        </label>
        <input
          type="text"
          id="recipientAddress"
          name="recipientAddress"
          value={formData.recipientAddress}
          onChange={onInputChange}
          placeholder="Enter recipient wallet address"
          className="form-input"
          disabled={loading || disabled}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount" className="form-label">
            Amount <span className="required">*</span>
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={onInputChange}
            placeholder="1000000"
            className="form-input"
            disabled={loading || disabled}
            min="0"
            step="0.000000001"
          />
        </div>

        <div className="form-group">
          <label htmlFor="decimals" className="form-label">
            Decimals <span className="required">*</span>
          </label>
          <input
            type="number"
            id="decimals"
            name="decimals"
            value={formData.decimals}
            onChange={onInputChange}
            placeholder="9"
            className="form-input"
            disabled={loading || disabled}
            min="0"
            max="18"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="mintAuthorityAddress" className="form-label">
          Mint Authority Address (Optional)
        </label>
        <input
          type="text"
          id="mintAuthorityAddress"
          name="mintAuthorityAddress"
          value={formData.mintAuthorityAddress}
          onChange={onInputChange}
          placeholder="Leave empty to use payer as mint authority"
          className="form-input"
          disabled={loading || disabled}
        />
      </div>

      <button
        onClick={onMint}
        disabled={loading || disabled}
        className="mint-button"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : (
          <>
            <span>✨</span>
            Mint Tokens
          </>
        )}
      </button>
    </div>
  );
};

export default MintForm;

