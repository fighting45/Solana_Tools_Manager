import { PublicKey } from '@solana/web3.js';
import { VALIDATION_MESSAGES } from '../config/constants';

/**
 * Validation utilities
 */
export const validators = {
  /**
   * Validate Solana address
   * @param {string} address - Address to validate
   * @returns {boolean} True if valid
   */
  isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') {
      return false;
    }
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate amount
   * @param {string|number} amount - Amount to validate
   * @returns {boolean} True if valid
   */
  isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },

  /**
   * Validate decimals
   * @param {string|number} decimals - Decimals to validate
   * @returns {boolean} True if valid
   */
  isValidDecimals(decimals) {
    const num = parseInt(decimals);
    return !isNaN(num) && num >= 0 && num <= 18;
  },

  /**
   * Validate mint form data
   * @param {Object} formData - Form data to validate
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validateMintForm(formData) {
    const errors = [];

    if (!formData.name || formData.name.trim() === '') {
      errors.push('Token name is required');
    }

    if (!formData.symbol || formData.symbol.trim() === '') {
      errors.push('Token symbol is required');
    }

    if (!formData.image) {
      errors.push('Token image is required');
    }

    // Recipient address is required UNLESS multi-wallet distribution is enabled
    const hasMultiWallet = formData.multiWalletDistributions &&
                           Array.isArray(formData.multiWalletDistributions) &&
                           formData.multiWalletDistributions.some(dist => dist.wallet && dist.wallet.trim() !== '');

    if (!hasMultiWallet) {
      // Only validate recipient address if NOT using multi-wallet
      if (!formData.recipientAddress) {
        errors.push('Recipient address is required (or use Multi-Wallet Distribution)');
      } else if (!this.isValidSolanaAddress(formData.recipientAddress)) {
        errors.push(VALIDATION_MESSAGES.INVALID_ADDRESS);
      }
    } else if (formData.recipientAddress && !this.isValidSolanaAddress(formData.recipientAddress)) {
      // If recipient address is provided with multi-wallet, still validate it
      errors.push(VALIDATION_MESSAGES.INVALID_ADDRESS);
    }

    if (!formData.amount) {
      errors.push('Amount is required');
    } else if (!this.isValidAmount(formData.amount)) {
      errors.push(VALIDATION_MESSAGES.INVALID_AMOUNT);
    }

    if (!formData.decimals) {
      errors.push('Decimals is required');
    } else if (!this.isValidDecimals(formData.decimals)) {
      errors.push(VALIDATION_MESSAGES.INVALID_DECIMALS);
    }

    if (formData.mintAuthorityAddress && !this.isValidSolanaAddress(formData.mintAuthorityAddress)) {
      errors.push('Invalid mint authority address');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

