import React from 'react';
import './TotalFees.css';

const TotalFees = ({ formData }) => {
  const calculateTotalFees = () => {
    let total = 0.1; // Base platform fee

    // Custom address fee
    if (formData.useCustomAddress) {
      total += 0.1;
    }

    // Multi-wallet fee
    if (formData.useMultiWallet &&
        formData.multiWalletDistributions &&
        Array.isArray(formData.multiWalletDistributions) &&
        formData.multiWalletDistributions.length > 0 &&
        formData.multiWalletDistributions.some(dist => dist.wallet && dist.wallet.trim() !== '')) {
      total += 0.1;
    }

    // Revoke authority fees (0.1 SOL per authority)
    if (formData.revokeFreezeAuthority) total += 0.1;
    if (formData.revokeMintAuthority) total += 0.1;
    if (formData.revokeUpdateAuthority) total += 0.1;

    // Custom creator fee
    if (formData.useCustomCreator) {
      total += 0.1;
    }

    return total;
  };

  const totalFees = calculateTotalFees();

  return (
    <div className="total-fees-container">
      <span className="total-fees-label">Total Fees:</span>
      <span className="total-fees-amount">{totalFees.toFixed(1)} SOL</span>
    </div>
  );
};

export default TotalFees;
