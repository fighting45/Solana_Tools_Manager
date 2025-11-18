import React from "react";
import "./SuccessModal.css";

const SuccessModal = ({ result, tokenType, onClose, onNewMint }) => {
  if (!result || !result.success) return null;

  const { signature, transactionData } = result;
  const mintAddress = transactionData?.mintAddress;
  const amount = transactionData?.tokenInfo?.amount || 0;
  const decimals = transactionData?.tokenInfo?.decimals || 0;
  const supply = transactionData?.tokenInfo?.supply || "0";
  const extensions = transactionData?.tokenInfo?.extensions || [];

  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  const mintExplorerUrl = mintAddress
    ? `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`
    : null;

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    // You could add a toast notification here
  };

  return (
    <div className="success-modal-overlay">
      <div className="success-modal">
        <div className="success-header">
          <div className="success-icon">✅</div>
          <h2 className="success-title">Token Minted Successfully!</h2>
          <p className="success-subtitle">
            Your {tokenType} token has been created and minted on Solana Devnet
          </p>
        </div>

        <div className="success-details">
          <div className="detail-section">
            <h3 className="detail-title">Token Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">
                  {transactionData?.tokenInfo?.name}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Symbol:</span>
                <span className="detail-value">
                  {transactionData?.tokenInfo?.symbol}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Supply:</span>
                <span className="detail-value">
                  {Number(supply).toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Decimals:</span>
                <span className="detail-value">{decimals}</span>
              </div>
            </div>
          </div>

          {/* Show enabled extensions for Token-2022 */}
          {tokenType === "TOKEN2022" && extensions.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-title">Enabled Extensions</h3>
              <div className="extensions-list">
                {extensions.map((ext, index) => (
                  <div key={index} className="extension-item-success">
                    <span className="extension-checkmark">✓</span>
                    <span className="extension-name">
                      {getExtensionDisplayName(ext)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3 className="detail-title">Addresses</h3>

            {mintAddress && (
              <div className="address-box">
                <div className="address-label">Mint Address:</div>
                <div className="address-container">
                  <code className="address-text">{mintAddress}</code>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopyAddress(mintAddress)}
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}

            {transactionData?.associatedTokenAddress && (
              <div className="address-box">
                <div className="address-label">Token Account:</div>
                <div className="address-container">
                  <code className="address-text">
                    {transactionData.associatedTokenAddress}
                  </code>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyAddress(transactionData.associatedTokenAddress)
                    }
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3 className="detail-title">Transaction</h3>
            <div className="address-box">
              <div className="address-label">Transaction Signature:</div>
              <div className="address-container">
                <code className="address-text signature">
                  {signature.substring(0, 20)}...
                  {signature.substring(signature.length - 20)}
                </code>
                <button
                  className="copy-btn"
                  onClick={() => handleCopyAddress(signature)}
                  title="Copy signature"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          {transactionData?.ipfs && (
            <div className="detail-section">
              <h3 className="detail-title">Metadata</h3>
              <div className="metadata-links">
                <a
                  href={transactionData.ipfs.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="metadata-link"
                >
                  🖼️ View Image on IPFS
                </a>
                <a
                  href={transactionData.ipfs.metadataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="metadata-link"
                >
                  📄 View Metadata on IPFS
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="success-actions">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn primary"
          >
            View on Explorer →
          </a>
          {mintExplorerUrl && (
            <a
              href={mintExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn secondary"
            >
              View Mint Account →
            </a>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onNewMint} className="new-mint-btn">
            🪙 Mint Another Token
          </button>
          <button onClick={onClose} className="close-modal-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get display names for extensions
const getExtensionDisplayName = (extensionKey) => {
  const displayNames = {
    mintCloseAuthority: "Mint Close Authority",
    permanentDelegate: "Permanent Delegate",
    nonTransferable: "Non-Transferable",
  };
  return displayNames[extensionKey] || extensionKey;
};

export default SuccessModal;
