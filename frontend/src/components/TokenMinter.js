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
import SuccessModal from "./SuccessModal";
import "./TokenMinter.css";

const TokenMinter = () => {
  const { publicKey } = useWallet();
  const [tokenType, setTokenType] = useState(TOKEN_TYPES.SPL);
  const splMint = useMintTransaction();
  const token2022Mint = useToken2022Transaction();
  
  // Use the appropriate hook based on token type
  const { mintTokens, loading, status } = tokenType === TOKEN_TYPES.SPL ? splMint : token2022Mint;
  
  const [formData, setFormData] = useState({
    ...DEFAULT_FORM_VALUES,
    extensions: [] // Add extensions to form data
  });
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

  const handleExtensionsChange = (extensions) => {
    setFormData((prev) => ({
      ...prev,
      extensions: extensions
    }));
  };

  const handleTokenTypeChange = (newType) => {
    if (loading) return; // Don't allow switching while loading
    setTokenType(newType);
    setFormData({
      ...DEFAULT_FORM_VALUES,
      extensions: [] // Reset extensions when switching token types
    });
    setResult(null);
    // Status will automatically switch to the active hook's status
  };

  const handleMint = async () => {
    const result = await mintTokens(formData);
    setResult(result);
    if (result.success) {
      // Don't reset form immediately - let user see the success modal first
    }
  };

  const handleCloseModal = () => {
    setResult(null);
    setFormData({
      ...DEFAULT_FORM_VALUES,
      extensions: []
    });
  };

  const handleNewMint = () => {
    setResult(null);
    setFormData({
      ...DEFAULT_FORM_VALUES,
      extensions: []
    });
  };

  const handleGenerateCustomAddress = async (prefix, suffix) => {
    try {
      console.log('🔍 Generating custom address...', { prefix, suffix });
      const apiService = (await import('../services/apiService')).default;
      const result = await apiService.previewCustomAddress(prefix, suffix);

      console.log('✅ Received result:', result);

      if (!result.success || !result.sampleAddress) {
        throw new Error(result.error || 'Failed to generate address');
      }

      // Update form with generated address
      setFormData((prev) => ({
        ...prev,
        generatedAddress: result.sampleAddress
      }));

      console.log('✅ Custom address generated:', result.sampleAddress);
      return result.sampleAddress;
    } catch (error) {
      console.error('❌ Error generating custom address:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate address. Please try again.';
      throw new Error(errorMessage);
    }
  };

  return (
    <div className="token-minter-wrapper">
      <Navbar />
      <div className="token-minter-container">
        <div className={`token-minter-card ${result && result.success ? 'hidden' : ''}`}>
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
              {formData.extensions && formData.extensions.length > 0 && (
                <span className="extension-badge">{formData.extensions.length}</span>
              )}
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
            onExtensionsChange={handleExtensionsChange}
            onGenerateCustomAddress={handleGenerateCustomAddress}
            onMint={handleMint}
            loading={loading}
            disabled={!publicKey}
            tokenType={tokenType}
          />

          {/* Only show status message if there's no successful result (to avoid duplication) */}
          {(!result || !result.success) && <StatusMessage status={status} />}

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

      {/* Success Modal */}
      <SuccessModal
        result={result}
        tokenType={tokenType === TOKEN_TYPES.SPL ? 'SPL' : 'TOKEN2022'}
        onClose={handleCloseModal}
        onNewMint={handleNewMint}
      />
    </div>
  );
};

export default TokenMinter;
