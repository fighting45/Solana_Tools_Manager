import React from 'react';
import './RevokeAuthorities.css';

const RevokeAuthorities = ({ formData, onInputChange, disabled }) => {
  const authorities = [
    {
      key: 'revokeFreezeAuthority',
      icon: '❄️',
      title: 'Revoke Freeze',
      description: 'No one will be able to freeze holders\' token accounts anymore',
    },
    {
      key: 'revokeMintAuthority',
      icon: '🪙',
      title: 'Revoke Mint',
      description: 'No one will be able to create more tokens anymore',
    },
    {
      key: 'revokeUpdateAuthority',
      icon: '✏️',
      title: 'Revoke Update',
      description: 'No one will be able to modify token metadata anymore',
    },
  ];

  return (
    <div className="revoke-authorities-section">
      <div className="revoke-authorities-header">
        <h3>Revoke Authorities</h3>
        <p className="revoke-authorities-description">
          Solana Token has 3 authorities: Freeze Authority, Mint Authority, and Update Authority.
          Revoke them to attract more investors.
        </p>
      </div>

      <div className="revoke-authorities-grid">
        {authorities.map((authority) => (
          <div
            key={authority.key}
            className={`revoke-authority-card ${formData[authority.key] ? 'selected' : ''}`}
            onClick={() => !disabled && onInputChange({
              target: { name: authority.key, value: !formData[authority.key] }
            })}
          >
            <div className="authority-card-header">
              <div className="authority-icon">{authority.icon}</div>
              <div className="authority-checkbox">
                <input
                  type="checkbox"
                  name={authority.key}
                  checked={formData[authority.key] || false}
                  onChange={(e) => onInputChange({
                    target: { name: authority.key, value: e.target.checked }
                  })}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <h4 className="authority-title">{authority.title}</h4>
            <p className="authority-description">{authority.description}</p>
            <div className="authority-fee">+0.1 SOL</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevokeAuthorities;
