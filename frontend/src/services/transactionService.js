import { Transaction } from '@solana/web3.js';

/**
 * Transaction Service for handling Solana transactions
 */
class TransactionService {
  /**
   * Deserialize base64 transaction string to Transaction object
   * @param {string} base64Transaction - Base64 encoded transaction
   * @returns {Transaction} Deserialized transaction
   */
  deserializeTransaction(base64Transaction) {
    try {
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Transaction);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return Transaction.from(bytes);
    } catch (error) {
      console.error('Error deserializing transaction:', error);
      throw new Error('Failed to deserialize transaction');
    }
  }

  /**
   * Sign transaction with wallet
   * @param {Transaction} transaction - Transaction to sign
   * @param {Function} signTransaction - Wallet sign function
   * @returns {Promise<Transaction>} Signed transaction
   */
  async signTransaction(transaction, signTransaction) {
    try {
      return await signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new Error('Transaction signing failed. Please try again.');
    }
  }

  /**
   * Send transaction to network
   * @param {Transaction} signedTransaction - Signed transaction
   * @param {Connection} connection - Solana connection
   * @returns {Promise<string>} Transaction signature
   */
  async sendTransaction(signedTransaction, connection) {
    try {
      return await connection.sendRawTransaction(signedTransaction.serialize());
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error('Failed to send transaction to network');
    }
  }

  /**
   * Confirm transaction
   * @param {string} signature - Transaction signature
   * @param {Connection} connection - Solana connection
   * @param {string} commitment - Commitment level
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmTransaction(signature, connection, commitment = 'confirmed') {
    try {
      return await connection.confirmTransaction(signature, commitment);
    } catch (error) {
      console.error('Error confirming transaction:', error);
      throw new Error('Transaction confirmation failed');
    }
  }
}

// Export singleton instance
export default new TransactionService();

