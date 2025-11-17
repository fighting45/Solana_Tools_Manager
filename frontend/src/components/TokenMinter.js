import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMintTransaction } from "../hooks/useMintTransaction";
import { useToken2022Transaction } from "../hooks/useToken2022Transaction";
import { DEFAULT_FORM_VALUES, TOKEN_TYPES } from "../config/constants";
import Navbar from "./Navbar";
import StatusMessage from "./StatusMessage";
import WalletInfo from "./WalletInfo";
import MintForm from "./MintForm";
import "./TokenMinter.css";

const TokenMinter = () => {
  const { publicKey } = useWallet();
  const [tokenType, setTokenType] = useState(TOKEN_TYPES.SPL);
  const splMint = useMintTransaction();
  const token2022Mint = useToken2022Transaction();
  
  // Use the appropriate hook based on token type
  const { mintTokens, loading, status } = tokenType === TOKEN_TYPES.SPL ? splMint : token2022Mint;
  
  const [formData, setFormData] = useState(DEFAULT_FORM_VALUES);
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: file,
          imagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTokenTypeChange = (newType) => {
    if (loading) return; // Don't allow switching while loading
    setTokenType(newType);
    setFormData(DEFAULT_FORM_VALUES);
    setResult(null);
    // Status will automatically switch to the active hook's status
  };

  const handleMint = async () => {
    const result = await mintTokens(formData);
    setResult(result);
    if (result.success) {
      // Reset form on success
      setFormData(DEFAULT_FORM_VALUES);
    }
  };

  return (
    <div className="token-minter-wrapper">
      <Navbar />
      <div className="token-minter-container">
        <div className="token-minter-card">
        <div className="card-header">
          <h1 className="card-title">
            <span className="title-icon">🪙</span>
            Token Launcher
          </h1>
          <p className="card-subtitle">Create and mint tokens on Solana</p>
          <div className="powered-by">
            <span className="powered-by-text">powered by</span>
            <span className="programmx-brand">ProgrammX</span>
          </div>
        </div>

        <div className="token-type-selector">
          <button
            className={`token-type-btn ${tokenType === TOKEN_TYPES.SPL ? 'active' : ''}`}
            onClick={() => handleTokenTypeChange(TOKEN_TYPES.SPL)}
            disabled={loading}
          >
            <span className="token-type-icon">🪙</span>
            <span className="token-type-label">SPL Token</span>
          </button>
          <button
            className={`token-type-btn ${tokenType === TOKEN_TYPES.TOKEN2022 ? 'active' : ''}`}
            onClick={() => handleTokenTypeChange(TOKEN_TYPES.TOKEN2022)}
            disabled={loading}
          >
            <span className="token-type-icon">✨</span>
            <span className="token-type-label">Token-2022</span>
          </button>
        </div>

        <div className="wallet-section">
          <WalletMultiButton className="wallet-button" />
        </div>

        {publicKey && <WalletInfo publicKey={publicKey} />}

        <MintForm
          formData={formData}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          onMint={handleMint}
          loading={loading}
          disabled={!publicKey}
        />

        <StatusMessage status={status} />

        {result && result.success && (
          <div className="success-result">
            <h3 className="result-title">✅ Mint Successful!</h3>
            <div className="result-info">
              <div className="result-item">
                <span className="result-label">Token Type:</span>
                <span className="result-value">
                  {tokenType === TOKEN_TYPES.SPL ? "SPL Token" : "Token-2022"}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Mint Address:</span>
                <span className="result-value">
                  {result.transactionData?.mintAddress || "N/A"}
                </span>
              </div>
              {result.transactionData?.metadataAccount && (
                <div className="result-item">
                  <span className="result-label">Metadata Account:</span>
                  <span className="result-value">
                    {result.transactionData.metadataAccount}
                  </span>
                </div>
              )}
              {result.transactionData?.tokenProgram && (
                <div className="result-item">
                  <span className="result-label">Token Program:</span>
                  <span className="result-value">
                    {result.transactionData.tokenProgram}
                  </span>
                </div>
              )}
              <div className="result-item">
                <span className="result-label">
                  Transaction Signature:
                </span>
                <span className="result-value signature">
                  {result.signature}
                </span>
              </div>
              {result.transactionData?.tokenInfo && (
                <>
                  <div className="result-item">
                    <span className="result-label">Token Name:</span>
                    <span className="result-value">
                      {result.transactionData.tokenInfo.name}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Token Symbol:</span>
                    <span className="result-value">
                      {result.transactionData.tokenInfo.symbol}
                    </span>
                  </div>
                  {result.transactionData.ipfs?.metadataUrl && (
                    <div className="result-item">
                      <span className="result-label">Metadata URL:</span>
                      <a
                        href={result.transactionData.ipfs.metadataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="result-link"
                      >
                        {result.transactionData.ipfs.metadataUrl}
                      </a>
                    </div>
                  )}
                  {result.transactionData.ipfs?.imageUrl && (
                    <div className="result-item">
                      <span className="result-label">Image URL:</span>
                      <a
                        href={result.transactionData.ipfs.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="result-link"
                      >
                        {result.transactionData.ipfs.imageUrl}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="card-footer">
          <p className="footer-text">
            Built with Solana Wallet Adapter • Devnet
          </p>
          <p className="footer-text programmx-footer">
            Made with ❤️ by <span className="programmx-brand-small">ProgrammX</span>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default TokenMinter;
