import React from 'react';
import './SuccessModal.css';

const SuccessModal = ({ result, tokenType, onClose, onNewMint }) => {
  if (!result || !result.success) return null;

  const transactionData = result.transactionData || {};

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal-header">
          <div className="success-icon-wrapper">
            <div className="success-icon">✓</div>
            <div className="success-ripple"></div>
            <div className="success-ripple"></div>
            <div className="success-ripple"></div>
          </div>
          <h2 className="success-modal-title">Mint Successful!</h2>
          <p className="success-modal-subtitle">
            Your {tokenType === 'SPL' ? 'SPL Token' : 'Token-2022'} has been created successfully
          </p>
        </div>

        <div className="success-modal-content">
          <div className="success-info-grid">
            <div className="info-card">
              <div className="info-icon">🪙</div>
              <div className="info-content">
                <div className="info-label">Token Type</div>
                <div className="info-value">
                  {tokenType === 'SPL' ? 'SPL Token' : 'Token-2022'}
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">📝</div>
              <div className="info-content">
                <div className="info-label">Token Name</div>
                <div className="info-value">
                  {transactionData.tokenInfo?.name || 'N/A'}
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">🏷️</div>
              <div className="info-content">
                <div className="info-label">Token Symbol</div>
                <div className="info-value">
                  {transactionData.tokenInfo?.symbol || 'N/A'}
                </div>
              </div>
            </div>

            <div className="info-card full-width">
              <div className="info-icon">📍</div>
              <div className="info-content">
                <div className="info-label">Mint Address</div>
                <div className="info-value address">
                  {transactionData.mintAddress || 'N/A'}
                </div>
              </div>
            </div>

            {transactionData.metadataAccount && (
              <div className="info-card full-width">
                <div className="info-icon">📄</div>
                <div className="info-content">
                  <div className="info-label">Metadata Account</div>
                  <div className="info-value address">
                    {transactionData.metadataAccount}
                  </div>
                </div>
              </div>
            )}

            {transactionData.tokenProgram && (
              <div className="info-card full-width">
                <div className="info-icon">⚙️</div>
                <div className="info-content">
                  <div className="info-label">Token Program</div>
                  <div className="info-value address">
                    {transactionData.tokenProgram}
                  </div>
                </div>
              </div>
            )}

            <div className="info-card full-width">
              <div className="info-icon">🔐</div>
              <div className="info-content">
                <div className="info-label">Transaction Signature</div>
                <div className="info-value signature">
                  {result.signature}
                </div>
              </div>
            </div>

            {transactionData.ipfs?.metadataUrl && (
              <div className="info-card full-width">
                <div className="info-icon">🔗</div>
                <div className="info-content">
                  <div className="info-label">Metadata URL</div>
                  <a
                    href={transactionData.ipfs.metadataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-link"
                  >
                    {transactionData.ipfs.metadataUrl}
                  </a>
                </div>
              </div>
            )}

            {transactionData.ipfs?.imageUrl && (
              <div className="info-card full-width">
                <div className="info-icon">🖼️</div>
                <div className="info-content">
                  <div className="info-label">Image URL</div>
                  <a
                    href={transactionData.ipfs.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-link"
                  >
                    {transactionData.ipfs.imageUrl}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="success-modal-footer">
          <button className="modal-button secondary" onClick={onClose}>
            Close
          </button>
          <button className="modal-button primary" onClick={onNewMint}>
            Mint Another Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

