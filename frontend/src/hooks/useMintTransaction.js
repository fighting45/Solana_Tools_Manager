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

        // Prepare tags array from individual tag fields
        const tags = [
          formData.tag1,
          formData.tag2,
          formData.tag3,
          formData.tag4,
          formData.tag5,
        ].filter((tag) => tag && tag.trim() !== "");

        // Prepare multi-wallet distribution - filter out empty wallets
        let multiWalletDistribution = null;
        if (formData.multiWalletDistributions && Array.isArray(formData.multiWalletDistributions)) {
          console.log("📋 Original multi-wallet data:", formData.multiWalletDistributions);
          const validWallets = formData.multiWalletDistributions.filter(
            (dist) => dist.wallet && dist.wallet.trim() !== "" && dist.percentage > 0
          );
          console.log("✅ Filtered valid wallets:", validWallets);
          if (validWallets.length > 0) {
            multiWalletDistribution = validWallets;
          }
        }

        const transactionData = await apiService.createCombinedMintTransaction({
          payerAddress: publicKey.toString(),
          recipientAddress: formData.recipientAddress,
          mintAuthorityAddress: formData.mintAuthorityAddress || null,
          amount: parseFloat(formData.amount),
          decimals: parseInt(formData.decimals),
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          image: formData.image,
          // Social links
          telegramUrl: formData.telegramUrl,
          websiteUrl: formData.websiteUrl,
          discordUrl: formData.discordUrl,
          twitterUrl: formData.twitterUrl,
          // Tags
          tags: tags,
          // Custom address
          useCustomAddress: formData.useCustomAddress,
          addressPrefix: formData.addressPrefix,
          addressSuffix: formData.addressSuffix,
          // Multi-wallet distribution (only valid wallets)
          multiWalletDistribution: multiWalletDistribution,
          // Revoke authorities
          revokeFreezeAuthority: formData.revokeFreezeAuthority,
          revokeMintAuthority: formData.revokeMintAuthority,
          revokeUpdateAuthority: formData.revokeUpdateAuthority,
        });

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
