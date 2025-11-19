import React from "react";
import "./RevokeAuthorities.css";

const RevokeAuthorities = ({
  freezeAuthority,
  mintAuthority,
  updateAuthority,
  onFreezeChange,
  onMintChange,
  onUpdateChange,
  disabled,
}) => {
  const authorities = [
    {
      id: "freeze",
      title: "Revoke Freeze Authority",
      description:
        "Permanently removes the ability to freeze token accounts. Once revoked, no one can freeze or unfreeze token accounts.",
      checked: freezeAuthority,
      onChange: onFreezeChange,
      icon: "❄️",
      warning:
        "This action is irreversible. Token accounts can never be frozen after this.",
    },
    {
      id: "mint",
      title: "Revoke Mint Authority",
      description:
        "Permanently removes the ability to mint new tokens. The total supply becomes fixed forever.",
      checked: mintAuthority,
      onChange: onMintChange,
      icon: "🏭",
      warning:
        "This action is irreversible. No new tokens can ever be created after this.",
    },
    {
      id: "update",
      title: "Revoke Update Authority",
      description:
        "Permanently removes the ability to update token metadata. The metadata becomes immutable.",
      checked: updateAuthority,
      onChange: onUpdateChange,
      icon: "✏️",
      warning:
        "This action is irreversible. Token metadata can never be changed after this.",
    },
  ];

  return (
    <div className="revoke-authorities-section">
      <div className="feature-header">
        <div className="feature-title">
          <h4>Revoke Authorities</h4>
          <p className="feature-description">
            Permanently remove specific authorities to make your token more
            decentralized and trustless. These actions are irreversible.
          </p>
        </div>
      </div>

      <div className="authorities-grid">
        {authorities.map((authority) => (
          <div
            key={authority.id}
            className={`authority-card ${authority.checked ? "selected" : ""}`}
          >
            <div className="authority-header">
              <span className="authority-icon">{authority.icon}</span>
              <label className="authority-checkbox">
                <input
                  type="checkbox"
                  checked={authority.checked}
                  onChange={(e) => authority.onChange(e.target.checked)}
                  disabled={disabled}
                />
                <span className="checkbox-custom"></span>
              </label>
            </div>

            <h5 className="authority-title">{authority.title}</h5>
            <p className="authority-description">{authority.description}</p>

            {authority.checked && (
              <div className="authority-warning">⚠️ {authority.warning}</div>
            )}
          </div>
        ))}
      </div>

      <div className="revoke-summary">
        <h5>Selected Revokes:</h5>
        <div className="revoke-list">
          {!freezeAuthority && !mintAuthority && !updateAuthority && (
            <span className="no-revokes">No authorities will be revoked</span>
          )}
          {freezeAuthority && (
            <span className="revoke-badge">❄️ Freeze Authority</span>
          )}
          {mintAuthority && (
            <span className="revoke-badge">🏭 Mint Authority</span>
          )}
          {updateAuthority && (
            <span className="revoke-badge">✏️ Update Authority</span>
          )}
        </div>

        {(freezeAuthority || mintAuthority || updateAuthority) && (
          <div className="final-warning">
            <strong>⚠️ Final Warning:</strong> Revoking authorities is permanent
            and cannot be undone. Make sure you understand the implications
            before proceeding.
          </div>
        )}
      </div>
    </div>
  );
};

export default RevokeAuthorities;
