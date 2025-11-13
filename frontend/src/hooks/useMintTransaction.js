import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import apiService from '../services/apiService';
import transactionService from '../services/transactionService';
import { STATUS_TYPES, STATUS_MESSAGES, VALIDATION_MESSAGES } from '../config/constants';
import { validators } from '../utils/validators';

/**
 * Custom hook for minting SPL tokens
 */
export const useMintTransaction = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const mintTokens = useCallback(async (formData) => {
    // Validate wallet connection
    if (!publicKey) {
      setStatus({
        type: STATUS_TYPES.ERROR,
        message: VALIDATION_MESSAGES.WALLET_NOT_CONNECTED,
      });
      return { success: false };
    }

    // Validate form data
    const validation = validators.validateMintForm(formData);
    if (!validation.isValid) {
      setStatus({
        type: STATUS_TYPES.ERROR,
        message: validation.errors.join(', '),
      });
      return { success: false };
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Step 1: Create transaction from backend
      setStatus({
        type: STATUS_TYPES.INFO,
        message: STATUS_MESSAGES.TRANSACTION_CREATED,
      });

      const transactionData = await apiService.createMintTransaction({
        payerAddress: publicKey.toString(),
        recipientAddress: formData.recipientAddress,
        mintAuthorityAddress: formData.mintAuthorityAddress || null,
        amount: parseFloat(formData.amount),
        decimals: parseInt(formData.decimals),
        name: formData.name,
        symbol: formData.symbol,
      }, formData.image);

      // Step 2: Deserialize transaction
      const transaction = transactionService.deserializeTransaction(
        transactionData.transaction
      );

      // Step 3: Sign transaction
      setStatus({
        type: STATUS_TYPES.INFO,
        message: STATUS_MESSAGES.APPROVE_TRANSACTION,
      });

      const signedTransaction = await transactionService.signTransaction(
        transaction,
        signTransaction
      );

      // Step 4: Send transaction
      setStatus({
        type: STATUS_TYPES.INFO,
        message: STATUS_MESSAGES.SENDING_TRANSACTION,
      });

      const signature = await transactionService.sendTransaction(
        signedTransaction,
        connection
      );

      // Step 5: Confirm transaction
      setStatus({
        type: STATUS_TYPES.INFO,
        message: STATUS_MESSAGES.CONFIRMING_TRANSACTION,
      });

      await transactionService.confirmTransaction(signature, connection);

      // Step 6: Create metadata if available
      let metadataSignature = null;
      if (transactionData.metadata?.transaction && transactionData.metadata?.readyToCreate) {
        try {
          setStatus({
            type: STATUS_TYPES.INFO,
            message: 'Creating metadata transaction...',
          });

          // Deserialize metadata transaction
          const metadataTransaction = transactionService.deserializeTransaction(
            transactionData.metadata.transaction
          );

          // Sign metadata transaction
          setStatus({
            type: STATUS_TYPES.INFO,
            message: 'Please approve the metadata transaction in your wallet...',
          });

          const signedMetadataTransaction = await transactionService.signTransaction(
            metadataTransaction,
            signTransaction
          );

          // Send metadata transaction
          setStatus({
            type: STATUS_TYPES.INFO,
            message: 'Sending metadata transaction to network...',
          });

          metadataSignature = await transactionService.sendTransaction(
            signedMetadataTransaction,
            connection
          );

          // Confirm metadata transaction
          await transactionService.confirmTransaction(metadataSignature, connection);

          setStatus({
            type: STATUS_TYPES.SUCCESS,
            message: `Success! Mint and metadata transactions confirmed. Mint: ${signature.substring(0, 8)}... Metadata: ${metadataSignature.substring(0, 8)}...`,
          });
        } catch (metadataError) {
          console.error('Metadata transaction error:', metadataError);
          // Don't fail the whole process if metadata fails
          setStatus({
            type: STATUS_TYPES.SUCCESS,
            message: `Mint successful! Metadata creation failed: ${metadataError.message}. Mint signature: ${signature}`,
          });
        }
      } else {
        setStatus({
          type: STATUS_TYPES.SUCCESS,
          message: STATUS_MESSAGES.TRANSACTION_SUCCESS(signature),
        });
      }

      return { 
        success: true, 
        signature, 
        metadataSignature,
        transactionData 
      };
    } catch (error) {
      console.error('Mint transaction error:', error);
      setStatus({
        type: STATUS_TYPES.ERROR,
        message: error.message || 'An error occurred while minting tokens',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, signTransaction]);

  return {
    mintTokens,
    loading,
    status,
  };
};

