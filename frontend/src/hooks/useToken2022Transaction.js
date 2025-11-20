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
 * Custom hook for minting Token-2022 tokens with extensions
 */
export const useToken2022Transaction = () => {
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
          message:
            formData.extensions && formData.extensions.length > 0
              ? `Creating Token-2022 with ${formData.extensions.length} extension(s)...`
              : STATUS_MESSAGES.TRANSACTION_CREATED,
        });

        const transactionData = await apiService.createToken2022Transaction({
          payerAddress: publicKey.toString(),
          recipientAddress: formData.recipientAddress,
          mintAuthorityAddress: formData.mintAuthorityAddress || null,
          amount: parseFloat(formData.amount),
          decimals: parseInt(formData.decimals),
          name: formData.name,
          symbol: formData.symbol,
          description:
            formData.description ||
            `${formData.name} - ${formData.symbol} Token`,
          image: formData.image,
          extensions: formData.extensions || [], // Pass extensions as array
        });

        console.log("Backend response:", transactionData);
        if (transactionData.tokenInfo && transactionData.tokenInfo.extensions) {
          console.log(
            "Token extensions enabled:",
            transactionData.tokenInfo.extensions
          );
        }

        // Step 2: Deserialize mint transaction with blockhash and feePayer
        setStatus({
          type: STATUS_TYPES.INFO,
          message: "Preparing Token-2022 transaction...",
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

        console.log("Token-2022 transaction signature:", signature);

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

        console.log("✅ Token-2022 transaction confirmed!");

        // Log enabled extensions
        if (
          transactionData.tokenInfo &&
          transactionData.tokenInfo.extensions &&
          transactionData.tokenInfo.extensions.length > 0
        ) {
          console.log(
            `✅ Token created with extensions: ${transactionData.tokenInfo.extensions.join(
              ", "
            )}`
          );
        }

        // Clear status message - detailed info will be shown in result box
        setStatus({
          type: "",
          message: "",
        });

        return {
          success: true,
          signature,
          transactionData,
        };
      } catch (error) {
        console.error("Token-2022 transaction error:", error);
        console.error("Error details:", error.stack);
        setStatus({
          type: STATUS_TYPES.ERROR,
          message:
            error.message ||
            "An error occurred while minting Token-2022 tokens",
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
