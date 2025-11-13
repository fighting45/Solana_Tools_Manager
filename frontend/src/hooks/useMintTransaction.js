import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import apiService from "../services/apiService";
import transactionService from "../services/transactionService";
import {
  STATUS_TYPES,
  STATUS_MESSAGES,
  VALIDATION_MESSAGES,
} from "../config/constants";
import { validators } from "../utils/validators";

/**
 * Custom hook for minting SPL tokens
 */
export const useMintTransaction = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const mintTokens = useCallback(
    async (formData) => {
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
          message: validation.errors.join(", "),
        });
        return { success: false };
      }

      setLoading(true);
      setStatus({ type: "", message: "" });

      try {
        // Step 1: Create transaction from backend
        setStatus({
          type: STATUS_TYPES.INFO,
          message: STATUS_MESSAGES.TRANSACTION_CREATED,
        });

        const transactionData = await apiService.createMintTransaction(
          {
            payerAddress: publicKey.toString(),
            recipientAddress: formData.recipientAddress,
            mintAuthorityAddress: formData.mintAuthorityAddress || null,
            amount: parseFloat(formData.amount),
            decimals: parseInt(formData.decimals),
            name: formData.name,
            symbol: formData.symbol,
          },
          formData.image
        );

        console.log("Backend response:", transactionData);

        // Step 2: Deserialize mint transaction with blockhash and feePayer
        setStatus({
          type: STATUS_TYPES.INFO,
          message: "Preparing mint transaction...",
        });

        const transaction = transactionService.deserializeTransaction(
          transactionData.transaction,
          {
            blockhash: transactionData.blockhash,
            feePayer: publicKey,
          }
        );

        // Step 3: Sign mint transaction
        setStatus({
          type: STATUS_TYPES.INFO,
          message: STATUS_MESSAGES.APPROVE_TRANSACTION,
        });

        const signedTransaction = await transactionService.signTransaction(
          transaction,
          signTransaction
        );

        // Step 4: Send mint transaction
        setStatus({
          type: STATUS_TYPES.INFO,
          message: STATUS_MESSAGES.SENDING_TRANSACTION,
        });

        const signature = await transactionService.sendTransaction(
          signedTransaction,
          connection,
          {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          }
        );

        console.log("Mint transaction signature:", signature);

        // Step 5: Confirm mint transaction
        setStatus({
          type: STATUS_TYPES.INFO,
          message: STATUS_MESSAGES.CONFIRMING_TRANSACTION,
        });

        await transactionService.confirmTransaction(
          signature,
          connection,
          transactionData.blockhash,
          transactionData.lastValidBlockHeight
        );

        console.log("✅ Mint transaction confirmed!");

        // Step 6: Create metadata if available
        let metadataSignature = null;
        if (
          transactionData.metadata?.transaction &&
          transactionData.metadata?.readyToCreate
        ) {
          try {
            setStatus({
              type: STATUS_TYPES.INFO,
              message: "Creating metadata transaction...",
            });

            console.log("Metadata data:", transactionData.metadata);

            // CRITICAL FIX: Deserialize metadata transaction with blockhash and feePayer
            const metadataTransaction =
              transactionService.deserializeTransaction(
                transactionData.metadata.transaction,
                {
                  blockhash: transactionData.metadata.blockhash,
                  feePayer: publicKey,
                }
              );

            console.log("Metadata transaction details:", {
              instructions: metadataTransaction.instructions.length,
              feePayer: metadataTransaction.feePayer?.toString(),
              recentBlockhash: metadataTransaction.recentBlockhash,
            });

            // Sign metadata transaction
            setStatus({
              type: STATUS_TYPES.INFO,
              message:
                "Please approve the metadata transaction in your wallet...",
            });

            const signedMetadataTransaction =
              await transactionService.signTransaction(
                metadataTransaction,
                signTransaction
              );

            // Send metadata transaction
            setStatus({
              type: STATUS_TYPES.INFO,
              message: "Sending metadata transaction to network...",
            });

            metadataSignature = await transactionService.sendTransaction(
              signedMetadataTransaction,
              connection,
              {
                skipPreflight: false,
                preflightCommitment: "confirmed",
              }
            );

            console.log("Metadata transaction signature:", metadataSignature);
            console.log(
              `View on Solscan: https://solscan.io/tx/${metadataSignature}?cluster=devnet`
            );

            // Confirm metadata transaction
            setStatus({
              type: STATUS_TYPES.INFO,
              message: "Confirming metadata transaction...",
            });

            await transactionService.confirmTransaction(
              metadataSignature,
              connection,
              transactionData.metadata.blockhash,
              transactionData.metadata.lastValidBlockHeight
            );

            console.log("✅ Metadata transaction confirmed!");

            setStatus({
              type: STATUS_TYPES.SUCCESS,
              message: `Success! Both transactions confirmed.\n\nMint: ${signature.substring(
                0,
                8
              )}...\nMetadata: ${metadataSignature.substring(
                0,
                8
              )}...\n\nMint Address: ${transactionData.mintAddress}`,
            });
          } catch (metadataError) {
            console.error("Metadata transaction error:", metadataError);
            console.error("Error details:", metadataError.stack);

            // Don't fail the whole process if metadata fails
            setStatus({
              type: STATUS_TYPES.WARNING,
              message: `Mint successful! But metadata creation failed: ${metadataError.message}\n\nMint signature: ${signature}\nMint address: ${transactionData.mintAddress}\n\nYou can try creating metadata again later.`,
            });
          }
        } else {
          console.log(
            "No metadata transaction available or not ready to create"
          );
          setStatus({
            type: STATUS_TYPES.SUCCESS,
            message: `${STATUS_MESSAGES.TRANSACTION_SUCCESS(
              signature
            )}\n\nMint Address: ${transactionData.mintAddress}`,
          });
        }

        return {
          success: true,
          signature,
          metadataSignature,
          transactionData,
        };
      } catch (error) {
        console.error("Mint transaction error:", error);
        console.error("Error details:", error.stack);
        setStatus({
          type: STATUS_TYPES.ERROR,
          message: error.message || "An error occurred while minting tokens",
        });
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, signTransaction]
  );

  return {
    mintTokens,
    loading,
    status,
  };
};
