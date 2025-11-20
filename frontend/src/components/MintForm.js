import React from "react";
import ExtensionSelector from "./ExtensionSelector";
import CustomAddressGenerator from "./CustomAddressGenerator";
import MultiWalletDistribution from "./MultiWalletDistribution";
import OptionalMetadata from "./OptionalMetadata";
import "./MintForm.css";

const MintForm = ({
  formData,
  onInputChange,
  onFileChange,
  onExtensionsChange,
  onGenerateCustomAddress,
  onMint,
  loading,
  disabled,
  tokenType,
}) => {
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
        <label htmlFor="description" className="form-label">
          Token Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ""}
          onChange={onInputChange}
          placeholder="Describe your token..."
          className="form-input form-textarea"
          disabled={loading || disabled}
          rows="3"
        />
      </div>

      {/* Social Links & Tags - Only show for SPL tokens */}
      {tokenType !== "TOKEN2022" && (
        <OptionalMetadata
          enabled={formData.useOptionalMetadata || false}
          socialLinks={{
            telegramUrl: formData.telegramUrl,
            websiteUrl: formData.websiteUrl,
            discordUrl: formData.discordUrl,
            twitterUrl: formData.twitterUrl,
          }}
          tags={{
            tag1: formData.tag1,
            tag2: formData.tag2,
            tag3: formData.tag3,
            tag4: formData.tag4,
            tag5: formData.tag5,
          }}
          onToggle={(enabled) =>
            onInputChange({
              target: { name: "useOptionalMetadata", value: enabled },
            })
          }
          onSocialLinkChange={onInputChange}
          onTagChange={onInputChange}
          disabled={loading || disabled}
        />
      )}

      {/* Custom Address Generator - Only show for SPL tokens */}
      {tokenType !== "TOKEN2022" && (
        <CustomAddressGenerator
          enabled={formData.useCustomAddress || false}
          prefix={formData.addressPrefix || ""}
          suffix={formData.addressSuffix || ""}
          generatedAddress={formData.generatedAddress || ""}
          onToggle={(enabled) =>
            onInputChange({
              target: { name: "useCustomAddress", value: enabled },
            })
          }
          onPrefixChange={(value) =>
            onInputChange({ target: { name: "addressPrefix", value } })
          }
          onSuffixChange={(value) =>
            onInputChange({ target: { name: "addressSuffix", value } })
          }
          onGenerate={onGenerateCustomAddress}
          disabled={loading || disabled}
          loading={loading}
        />
      )}

      {/* Multi-Wallet Distribution - Only show for SPL tokens */}
      {tokenType !== "TOKEN2022" && (
        <MultiWalletDistribution
          enabled={formData.useMultiWallet || false}
          distributions={
            formData.multiWalletDistributions || [
              { wallet: "", percentage: 100, avatar: "😎" },
            ]
          }
          onToggle={(enabled) =>
            onInputChange({
              target: { name: "useMultiWallet", value: enabled },
            })
          }
          onChange={(distributions) =>
            onInputChange({
              target: {
                name: "multiWalletDistributions",
                value: distributions,
              },
            })
          }
          disabled={loading || disabled}
        />
      )}

      {/* Extension Selector - Only show for Token-2022 */}
      {tokenType === "TOKEN2022" && (
        <ExtensionSelector
          onExtensionsChange={onExtensionsChange}
          disabled={loading || disabled}
          tokenType={tokenType}
        />
      )}

      {/* Recipient Address - Only show when NOT using multi-wallet distribution */}
      {!(formData.useMultiWallet && formData.multiWalletDistributions && formData.multiWalletDistributions.length > 0) && (
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
          <p className="form-helper-text">
            💡 When using Multi-Wallet Distribution, recipient addresses are specified in the distribution list
          </p>
        </div>
      )}

      {/* Show info when multi-wallet is enabled */}
      {formData.useMultiWallet && formData.multiWalletDistributions && formData.multiWalletDistributions.length > 0 && (
        <div className="info-message">
          <span className="info-icon">ℹ️</span>
          <span>Tokens will be distributed to the wallets specified in Multi-Wallet Distribution</span>
        </div>
      )}

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
            {tokenType === "TOKEN2022" &&
            formData.extensions &&
            formData.extensions.length > 0
              ? `Mint with ${formData.extensions.length} Extension${
                  formData.extensions.length > 1 ? "s" : ""
                }`
              : "Mint Tokens"}
          </>
        )}
      </button>

      {/* Show selected extensions info */}
      {tokenType === "TOKEN2022" &&
        formData.extensions &&
        formData.extensions.length > 0 && (
          <div className="extensions-info-box">
            <p className="extensions-info-title">
              🔧 Token will be created with {formData.extensions.length}{" "}
              extension{formData.extensions.length > 1 ? "s" : ""}
            </p>
            <p className="extensions-info-subtitle">
              Extensions are permanent and cannot be removed after token
              creation.
            </p>
          </div>
        )}
    </div>
  );
};

export default MintForm;
