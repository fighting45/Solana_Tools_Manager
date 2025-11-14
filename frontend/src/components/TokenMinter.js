import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMintTransaction } from "../hooks/useMintTransaction";
import { DEFAULT_FORM_VALUES } from "../config/constants";
import StatusMessage from "./StatusMessage";
import WalletInfo from "./WalletInfo";
import MintForm from "./MintForm";
import "./TokenMinter.css";

const TokenMinter = () => {
  const { publicKey } = useWallet();
  const { mintTokens, loading, status } = useMintTransaction();
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

  const handleMint = async () => {
    const result = await mintTokens(formData);
    setResult(result);
    if (result.success) {
      // Reset form on success
      setFormData(DEFAULT_FORM_VALUES);
    }
  };

  return (
    <div className="token-minter-container">
      <div className="token-minter-card">
        <div className="card-header">
          <h1 className="card-title">
            <span className="title-icon">🪙</span>
            SPL Token Minter
          </h1>
          <p className="card-subtitle">Create and mint SPL tokens on Solana</p>
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

        {status.message && <StatusMessage status={status} />}

        {result && result.success && (
          <div className="success-result">
            <h3 className="result-title">✅ Mint Successful!</h3>
            <div className="result-info">
              <div className="result-item">
                <span className="result-label">Mint Address:</span>
                <span className="result-value">
                  {result.transactionData?.mintAddress || "N/A"}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Metadata Account:</span>
                <span className="result-value">
                  {result.transactionData?.metadataAccount || "N/A"}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">
                  Mint Transaction Signature:
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
                  {result.transactionData.ipfs.imageUrl && (
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
        </div>
      </div>
    </div>
  );
};

export default TokenMinter;
