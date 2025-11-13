import React from 'react';
import './WalletInfo.css';

const WalletInfo = ({ publicKey }) => {
  return (
    <div className="wallet-info">
      <p className="wallet-address">
        <span className="label">Connected:</span>
        <span className="address">{publicKey.toString()}</span>
      </p>
    </div>
  );
};

export default WalletInfo;

