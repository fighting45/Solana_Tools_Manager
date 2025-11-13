import { Transaction } from "@solana/web3.js";

/**
 * Transaction Service for handling Solana transactions
 */
class TransactionService {
  /**
   * Deserialize base64 transaction string to Transaction object
   * @param {string} base64Transaction - Base64 encoded transaction
   * @param {Object} options - Additional options (blockhash, feePayer)
   * @returns {Transaction} Deserialized transaction
   */
  deserializeTransaction(base64Transaction, options = {}) {
    try {
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Transaction);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const transaction = Transaction.from(bytes);

      // CRITICAL: Set blockhash and feePayer
      if (options.blockhash) {
        transaction.recentBlockhash = options.blockhash;
      }
      if (options.feePayer) {
        transaction.feePayer = options.feePayer;
      }

      return transaction;
    } catch (error) {
      console.error("Error deserializing transaction:", error);
      throw new Error("Failed to deserialize transaction");
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
      console.error("Error signing transaction:", error);
      throw new Error("Transaction signing failed. Please try again.");
    }
  }

  /**
   * Send transaction to network
   * @param {Transaction} signedTransaction - Signed transaction
   * @param {Connection} connection - Solana connection
   * @param {Object} options - Send options
   * @returns {Promise<string>} Transaction signature
   */
  async sendTransaction(signedTransaction, connection, options = {}) {
    try {
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: options.skipPreflight || false,
          preflightCommitment: options.preflightCommitment || "confirmed",
          maxRetries: options.maxRetries || 3,
        }
      );
      return signature;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Confirm transaction with blockhash strategy (recommended method)
   * @param {string} signature - Transaction signature
   * @param {Connection} connection - Solana connection
   * @param {string} blockhash - Recent blockhash (optional, will use legacy if not provided)
   * @param {number} lastValidBlockHeight - Last valid block height (optional)
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmTransaction(
    signature,
    connection,
    blockhash = null,
    lastValidBlockHeight = null
  ) {
    try {
      let confirmation;

      // Use new blockhash strategy if available (recommended)
      if (blockhash && lastValidBlockHeight) {
        confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });
      } else {
        // Fallback to legacy confirmation method
        console.warn(
          "Using legacy confirmation method. Consider passing blockhash and lastValidBlockHeight."
        );
        confirmation = await connection.confirmTransaction(
          signature,
          "confirmed"
        );
      }

      if (confirmation.value?.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      return confirmation;
    } catch (error) {
      console.error("Error confirming transaction:", error);
      throw new Error(`Transaction confirmation failed: ${error.message}`);
    }
  }

  /**
   * Complete transaction flow: deserialize, sign, send, and confirm
   * @param {string} base64Transaction - Base64 encoded transaction
   * @param {Object} transactionData - Data from backend (blockhash, lastValidBlockHeight)
   * @param {Object} wallet - Wallet object with publicKey and signTransaction
   * @param {Connection} connection - Solana connection
   * @returns {Promise<string>} Transaction signature
   */
  async executeTransaction(
    base64Transaction,
    transactionData,
    wallet,
    connection
  ) {
    try {
      console.log("Executing transaction...");

      // Deserialize with blockhash and feePayer
      const transaction = this.deserializeTransaction(base64Transaction, {
        blockhash: transactionData.blockhash,
        feePayer: wallet.publicKey,
      });

      console.log("Transaction details:", {
        instructions: transaction.instructions.length,
        feePayer: transaction.feePayer?.toString(),
        recentBlockhash: transaction.recentBlockhash,
      });

      // Sign
      const signedTransaction = await this.signTransaction(
        transaction,
        wallet.signTransaction
      );

      // Send
      const signature = await this.sendTransaction(
        signedTransaction,
        connection,
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log("Transaction sent! Signature:", signature);

      // Confirm
      await this.confirmTransaction(
        signature,
        connection,
        transactionData.blockhash,
        transactionData.lastValidBlockHeight
      );

      console.log("✅ Transaction confirmed!");
      return signature;
    } catch (error) {
      console.error("Transaction execution failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export default new TransactionService();
