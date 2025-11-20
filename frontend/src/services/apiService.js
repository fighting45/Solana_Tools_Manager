import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001/api";

class ApiService {
  /**
   * Create combined mint transaction with all features
   */
  async createCombinedMintTransaction(formData) {
    try {
      const form = new FormData();

      // Basic token information
      form.append("payerAddress", formData.payerAddress);
      form.append("recipientAddress", formData.recipientAddress);
      form.append("name", formData.name);
      form.append("symbol", formData.symbol);
      form.append("description", formData.description || "");
      form.append("amount", formData.amount);
      form.append("decimals", formData.decimals);
      form.append("image", formData.image);

      // Mint authority (optional)
      if (formData.mintAuthorityAddress) {
        form.append("mintAuthorityAddress", formData.mintAuthorityAddress);
      }

      // Seller fee (royalties)
      if (formData.sellerFeeBasisPoints) {
        form.append("sellerFeeBasisPoints", formData.sellerFeeBasisPoints);
      }

      // Social links (optional)
      if (formData.telegramUrl)
        form.append("telegramUrl", formData.telegramUrl);
      if (formData.websiteUrl) form.append("websiteUrl", formData.websiteUrl);
      if (formData.discordUrl) form.append("discordUrl", formData.discordUrl);
      if (formData.twitterUrl) form.append("twitterUrl", formData.twitterUrl);

      // Tags (optional - up to 5)
      if (formData.tags && formData.tags.length > 0) {
        form.append("tags", formData.tags.join(","));
      }

      // Custom address feature
      if (formData.useCustomAddress) {
        form.append("useCustomAddress", "true");
        if (formData.addressPrefix)
          form.append("addressPrefix", formData.addressPrefix);
        if (formData.addressSuffix)
          form.append("addressSuffix", formData.addressSuffix);
      }

      // Multi-wallet distribution
      if (
        formData.multiWalletDistribution &&
        formData.multiWalletDistribution.length > 0
      ) {
        form.append(
          "multiWalletDistribution",
          JSON.stringify(formData.multiWalletDistribution)
        );
      }

      // Revoke authorities
      if (formData.revokeFreezeAuthority)
        form.append("revokeFreezeAuthority", "true");
      if (formData.revokeMintAuthority)
        form.append("revokeMintAuthority", "true");
      if (formData.revokeUpdateAuthority)
        form.append("revokeUpdateAuthority", "true");

      const response = await axios.post(
        `${API_BASE_URL}/mint/create-transaction`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error creating combined mint transaction:", error);
      throw error;
    }
  }

  /**
   * Preview custom address generation
   */
  async previewCustomAddress(prefix, suffix) {
    try {
      const response = await axios.get(`${API_BASE_URL}/mint/preview-address`, {
        params: { prefix, suffix },
      });
      return response.data;
    } catch (error) {
      console.error("Error previewing custom address:", error);
      throw error;
    }
  }

  /**
   * Calculate fees based on selected features
   */
  async calculateFees(features) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/mint/calculate-fees`,
        features
      );
      return response.data;
    } catch (error) {
      console.error("Error calculating fees:", error);
      throw error;
    }
  }

  /**
   * Create Token-2022 with extensions
   */
  async createToken2022Transaction(formData) {
    try {
      const form = new FormData();

      // Basic token information
      form.append("payerAddress", formData.payerAddress);
      form.append("recipientAddress", formData.recipientAddress);
      form.append("name", formData.name);
      form.append("symbol", formData.symbol);
      form.append("description", formData.description || "");
      form.append("amount", formData.amount);
      form.append("decimals", formData.decimals);
      form.append("image", formData.image);

      // Mint authority (optional)
      if (formData.mintAuthorityAddress) {
        form.append("mintAuthorityAddress", formData.mintAuthorityAddress);
      }

      // Token-2022 specific extensions (send as comma-separated string or array)
      if (formData.extensions && Array.isArray(formData.extensions) && formData.extensions.length > 0) {
        // Send as comma-separated string to match backend expectation
        form.append("extensions", formData.extensions.join(","));
      }

      const response = await axios.post(
        `${API_BASE_URL}/token2022/create-token2022-transaction`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error creating Token-2022 transaction:", error);
      throw error;
    }
  }

  /**
   * Upload metadata to IPFS
   */
  async uploadToIPFS(imageFile, metadata) {
    try {
      const form = new FormData();
      form.append("image", imageFile);
      form.append("metadata", JSON.stringify(metadata));

      const response = await axios.post(`${API_BASE_URL}/ipfs/upload`, form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transaction/status/${signature}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting transaction status:", error);
      throw error;
    }
  }

  /**
   * Validate Solana address
   */
  async validateAddress(address) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/utils/validate-address`,
        { address }
      );
      return response.data.valid;
    } catch (error) {
      console.error("Error validating address:", error);
      return false;
    }
  }

  /**
   * Get network status and RPC health
   */
  async getNetworkStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/network/status`);
      return response.data;
    } catch (error) {
      console.error("Error getting network status:", error);
      throw error;
    }
  }

  /**
   * Get available Token-2022 extensions
   */
  async getToken2022Extensions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/token2022/token2022-extensions`);
      return response.data;
    } catch (error) {
      console.error("Error fetching Token-2022 extensions:", error);
      throw error;
    }
  }
}

export default new ApiService();
