import React, { useState, useEffect } from "react";
import "./MultiWalletDistribution.css";

const MultiWalletDistribution = ({
  enabled,
  distributions,
  onToggle,
  onChange,
  disabled,
}) => {
  const [wallets, setWallets] = useState(
    distributions || [{ wallet: "", percentage: 100, avatar: "😎" }]
  );
  const [error, setError] = useState("");

  const avatars = ["😎", "🦊", "🐻", "🐼", "🐵", "🦁", "🐸", "🦄", "🐙", "🦋"];

  useEffect(() => {
    validatePercentages();
  }, [wallets]);

  const validatePercentages = () => {
    const total = wallets.reduce(
      (sum, w) => sum + (parseFloat(w.percentage) || 0),
      0
    );
    if (wallets.length > 0 && Math.abs(total - 100) > 0.01) {
      setError(`Percentages must total 100% (currently ${total.toFixed(2)}%)`);
    } else {
      setError("");
    }
  };

  const handleWalletChange = (index, field, value) => {
    const newWallets = [...wallets];
    if (field === "percentage") {
      value = Math.max(0, Math.min(100, parseFloat(value) || 0));
    }
    newWallets[index] = { ...newWallets[index], [field]: value };
    setWallets(newWallets);
    onChange(newWallets);
  };

  const addWallet = () => {
    if (wallets.length < 10) {
      const newWallets = [
        ...wallets,
        {
          wallet: "",
          percentage: 0,
          avatar: avatars[wallets.length % avatars.length],
        },
      ];
      setWallets(newWallets);
      onChange(newWallets);
    }
  };

  const removeWallet = (index) => {
    if (wallets.length > 1) {
      const newWallets = wallets.filter((_, i) => i !== index);
      setWallets(newWallets);
      onChange(newWallets);
    }
  };

  const autoDistribute = () => {
    const count = wallets.filter((w) => w.wallet).length || wallets.length;
    const basePercentage = Math.floor(100 / count);
    const remainder = 100 - basePercentage * count;

    const newWallets = wallets.map((w, index) => ({
      ...w,
      percentage: index === 0 ? basePercentage + remainder : basePercentage,
    }));

    setWallets(newWallets);
    onChange(newWallets);
  };

  // Calculate visual distribution bar segments
  const getDistributionBar = () => {
    const total = wallets.reduce(
      (sum, w) => sum + (parseFloat(w.percentage) || 0),
      0
    );
    if (total === 0) return [];

    return wallets.map((w, index) => ({
      percentage: ((parseFloat(w.percentage) || 0) * 100) / total,
      color: `hsl(${(index * 360) / wallets.length}, 70%, 60%)`,
      avatar: w.avatar,
    }));
  };

  return (
    <div className="multi-wallet-section">
      <div className="feature-header">
        <div className="feature-title">
          <h4>Multi-Wallet Supply Distribution (+0.1 SOL)</h4>
          <p className="feature-description">
            Distribute the supply of your token on different wallets within the
            creation. (maximum 10 wallets)
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
        <div className="multi-wallet-content">
          {/* Visual Distribution Bar */}
          <div className="distribution-bar">
            {getDistributionBar().map((segment, index) => (
              <div
                key={index}
                className="bar-segment"
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: segment.color,
                }}
                title={`${segment.percentage.toFixed(1)}%`}
              >
                <span className="segment-avatar">{segment.avatar}</span>
              </div>
            ))}
          </div>

          {/* Wallet Inputs */}
          <div className="wallets-list">
            {wallets.map((wallet, index) => (
              <div key={index} className="wallet-item">
                <div className="wallet-avatar">{wallet.avatar}</div>
                <input
                  type="text"
                  value={wallet.wallet}
                  onChange={(e) =>
                    handleWalletChange(index, "wallet", e.target.value)
                  }
                  placeholder="Type wallet address"
                  className="wallet-address-input"
                  disabled={disabled}
                />
                <input
                  type="number"
                  value={wallet.percentage}
                  onChange={(e) =>
                    handleWalletChange(index, "percentage", e.target.value)
                  }
                  className="percentage-input"
                  disabled={disabled}
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="percentage-label">%</span>
                {wallets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWallet(index)}
                    className="remove-wallet-btn"
                    disabled={disabled}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="wallet-actions">
            {wallets.length < 10 && (
              <button
                type="button"
                onClick={addWallet}
                className="add-wallet-btn"
                disabled={disabled}
              >
                + Add Another Wallet
              </button>
            )}

            <button
              type="button"
              onClick={autoDistribute}
              className="auto-distribute-btn"
              disabled={disabled || wallets.length === 0}
            >
              Auto-Distribute Equally
            </button>
          </div>

          <div className="distribution-summary">
            <strong>Distribution Summary:</strong>
            <ul>
              {wallets
                .filter((w) => w.wallet && w.percentage > 0)
                .map((w, index) => (
                  <li key={index}>
                    {w.avatar} Wallet {index + 1}: {w.percentage.toFixed(2)}% (
                    {w.wallet.substring(0, 4)}...
                    {w.wallet.substring(w.wallet.length - 4)})
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiWalletDistribution;
