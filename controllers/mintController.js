const ipfsService = require("../services/ipfsService");
const mintService = require("../utils/mintSPL");

/**
 * Create COMBINED mint transaction with metadata and enhanced features
 */
async function createCombinedMintTransaction(req, res) {
  try {
    // Helper function to clean form data values
    const cleanFormValue = (value) => {
      if (!value || value === "null" || value === "undefined" || value === "") {
        return null;
      }
      return value;
    };

    // Extract and clean form data
    const payerAddress = cleanFormValue(req.body.payerAddress);
    const recipientAddress = cleanFormValue(req.body.recipientAddress);
    const mintAuthorityAddress = cleanFormValue(req.body.mintAuthorityAddress);
    const amount = req.body.amount ? parseFloat(req.body.amount) : 0;
    const decimals = req.body.decimals ? parseInt(req.body.decimals) : 6;
    const name = cleanFormValue(req.body.name);
    const symbol = cleanFormValue(req.body.symbol);
    const description = cleanFormValue(req.body.description);
    const sellerFeeBasisPoints = req.body.sellerFeeBasisPoints
      ? parseInt(req.body.sellerFeeBasisPoints)
      : 0;

    // Social links (optional)
    const telegramUrl = cleanFormValue(req.body.telegramUrl);
    const websiteUrl = cleanFormValue(req.body.websiteUrl);
    const discordUrl = cleanFormValue(req.body.discordUrl);
    const twitterUrl = cleanFormValue(req.body.twitterUrl);

    // Tags (optional - up to 5)
    let tags = [];
    if (req.body.tags) {
      if (typeof req.body.tags === "string") {
        // If tags come as comma-separated string
        tags = req.body.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
          .slice(0, 5);
      } else if (Array.isArray(req.body.tags)) {
        // If tags come as array
        tags = req.body.tags
          .map((tag) => String(tag).trim())
          .filter((tag) => tag)
          .slice(0, 5);
      }
    }

    // Custom address features
    const useCustomAddress =
      req.body.useCustomAddress === "true" ||
      req.body.useCustomAddress === true;
    const addressPrefix = cleanFormValue(req.body.addressPrefix) || "";
    const addressSuffix = cleanFormValue(req.body.addressSuffix) || "";

    // Multi-wallet distribution
    let multiWalletDistribution = null;
    if (req.body.multiWalletDistribution) {
      try {
        console.log(
          "📥 Raw multiWalletDistribution received:",
          req.body.multiWalletDistribution
        );
        console.log("📥 Type:", typeof req.body.multiWalletDistribution);

        // Parse the distribution data
        if (typeof req.body.multiWalletDistribution === "string") {
          multiWalletDistribution = JSON.parse(
            req.body.multiWalletDistribution
          );
        } else {
          multiWalletDistribution = req.body.multiWalletDistribution;
        }

        console.log(
          "📥 Parsed multiWalletDistribution:",
          multiWalletDistribution
        );

        // Validate distribution
        if (
          Array.isArray(multiWalletDistribution) &&
          multiWalletDistribution.length > 0
        ) {
          // Limit to 10 wallets maximum
          multiWalletDistribution = multiWalletDistribution.slice(0, 10);

          // Validate each distribution entry
          multiWalletDistribution = multiWalletDistribution.filter(
            (dist) => dist.wallet && dist.percentage > 0
          );

          // Normalize percentages to total 100
          const totalPercentage = multiWalletDistribution.reduce(
            (sum, dist) => sum + parseFloat(dist.percentage),
            0
          );
          if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.01) {
            multiWalletDistribution = multiWalletDistribution.map((dist) => ({
              wallet: dist.wallet,
              percentage: (parseFloat(dist.percentage) * 100) / totalPercentage,
            }));
          }
        } else {
          multiWalletDistribution = null;
        }
      } catch (e) {
        console.error("Error parsing multi-wallet distribution:", e);
        multiWalletDistribution = null;
      }
    }

    // Revoke authorities
    const revokeAuthorities = {
      freezeAuthority:
        req.body.revokeFreezeAuthority === "true" ||
        req.body.revokeFreezeAuthority === true,
      mintAuthority:
        req.body.revokeMintAuthority === "true" ||
        req.body.revokeMintAuthority === true,
      updateAuthority:
        req.body.revokeUpdateAuthority === "true" ||
        req.body.revokeUpdateAuthority === true,
    };

    // Validate required fields
    if (!payerAddress) {
      return res.status(400).json({ error: "payerAddress is required" });
    }
    if (!recipientAddress && !multiWalletDistribution) {
      return res.status(400).json({
        error: "recipientAddress or multiWalletDistribution is required",
      });
    }
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    // Validate custom address parameters
    if (useCustomAddress && (addressPrefix + addressSuffix).length > 4) {
      return res.status(400).json({
        error: "Combined prefix and suffix cannot exceed 4 characters",
      });
    }

    console.log("📦 Processing COMBINED mint transaction request...");
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Payer Address:", payerAddress);
    console.log("Use Custom Address:", useCustomAddress);
    console.log(
      "Multi-Wallet Distribution:",
      multiWalletDistribution ? "Yes" : "No"
    );
    console.log("Revoke Authorities:", JSON.stringify(revokeAuthorities));

    // Get image file from request
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: "Image file is required" });
    }

    console.log("Image:", imageFile.originalname);

    // Build social links object
    const socialLinks = {};
    if (telegramUrl) socialLinks.telegram = telegramUrl;
    if (websiteUrl) socialLinks.website = websiteUrl;
    if (discordUrl) socialLinks.discord = discordUrl;
    if (twitterUrl) socialLinks.twitter = twitterUrl;

    // Step 1: Upload image and metadata to IPFS
    console.log("⬆️ Uploading to IPFS...");

    // Build attributes for metadata
    const attributes = [];

    // Add social links as attributes
    if (telegramUrl)
      attributes.push({ trait_type: "Telegram", value: telegramUrl });
    if (websiteUrl)
      attributes.push({ trait_type: "Website", value: websiteUrl });
    if (discordUrl)
      attributes.push({ trait_type: "Discord", value: discordUrl });
    if (twitterUrl)
      attributes.push({ trait_type: "Twitter", value: twitterUrl });

    // Add tags as attributes
    tags.forEach((tag, index) => {
      attributes.push({ trait_type: `Tag${index + 1}`, value: tag });
    });

    // Add feature flags as attributes
    if (useCustomAddress) {
      attributes.push({ trait_type: "Custom Address", value: "true" });
      if (addressPrefix)
        attributes.push({ trait_type: "Address Prefix", value: addressPrefix });
      if (addressSuffix)
        attributes.push({ trait_type: "Address Suffix", value: addressSuffix });
    }

    if (multiWalletDistribution) {
      attributes.push({
        trait_type: "Multi-Wallet Distribution",
        value: `${multiWalletDistribution.length} wallets`,
      });
    }

    // Add revoke status as attributes
    if (revokeAuthorities.freezeAuthority) {
      attributes.push({ trait_type: "Freeze Authority", value: "Revoked" });
    }
    if (revokeAuthorities.mintAuthority) {
      attributes.push({ trait_type: "Mint Authority", value: "Revoked" });
    }
    if (revokeAuthorities.updateAuthority) {
      attributes.push({ trait_type: "Update Authority", value: "Revoked" });
    }

    const ipfsResult = await ipfsService.uploadTokenPackage({
      imageBuffer: imageFile.buffer,
      imageName: imageFile.originalname,
      imageType: imageFile.mimetype,
      name: name,
      symbol: symbol,
      description: description || `${name} - ${symbol} Token`,
      attributes: attributes,
      externalUrl: websiteUrl || "",
      // Additional metadata fields
      properties: {
        category: "fungible",
        creators: [],
        files: [],
      },
      // Social links stored in extensions
      extensions: socialLinks,
    });

    console.log("✅ IPFS Upload Complete:");
    console.log("Image URL:", ipfsResult.image.url);
    console.log("Metadata URL:", ipfsResult.metadata.url);

    // Step 2: Create COMBINED transaction (mint + metadata in one!)
    console.log("🔨 Creating COMBINED transaction...");

    const result = await mintService.createCombinedMintWithMetadata({
      payerAddress,
      recipientAddress:
        recipientAddress ||
        (multiWalletDistribution ? multiWalletDistribution[0].wallet : null),
      mintAuthorityAddress,
      amount,
      decimals,
      metadata: {
        name: name,
        symbol: symbol,
        uri: ipfsResult.metadata.url,
      },
      sellerFeeBasisPoints,
      socialLinks,
      tags,
      useCustomAddress,
      addressPrefix,
      addressSuffix,
      multiWalletDistribution,
      revokeAuthorities,
    });

    console.log("✅ Combined transaction created successfully!");
    console.log("Mint Address:", result.mintAddress);
    console.log("Metadata Account:", result.metadataAccount);

    // Step 3: Return response
    const response = {
      // Transaction data (single transaction with everything!)
      transaction: result.transaction,
      blockhash: result.blockhash,
      lastValidBlockHeight: result.lastValidBlockHeight,

      // Token addresses
      mintAddress: result.mintAddress,
      metadataAccount: result.metadataAccount,

      // IPFS data
      ipfs: {
        imageUrl: ipfsResult.image.url,
        imageHash: ipfsResult.image.hash,
        metadataUrl: ipfsResult.metadata.url,
        metadataHash: ipfsResult.metadata.hash,
        metadataJson: ipfsResult.metadata.json,
      },

      // Token info
      tokenInfo: {
        name,
        symbol,
        decimals,
        amount,
        supply: result.supply,
        socialLinks,
        tags,
      },

      // Distribution info
      distribution: result.walletDistributions,

      // Authority status
      authorities: {
        mint:
          result.mintAuthority === "revoked" ? "revoked" : result.mintAuthority,
        freeze: result.freezeAuthority,
        update: result.updateAuthority,
      },

      // Features used
      features: result.features,

      // Platform fee details
      platformFee: result.platformFee,

      // Additional info
      payerAddress: result.payerPublicKey,
      recipientAddress: result.recipientAddress,
    };

    console.log("✅ Response ready!");
    console.log(
      "Transaction size:",
      Buffer.from(result.transaction, "base64").length,
      "bytes"
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error creating combined mint transaction:", error);
    res.status(500).json({
      error: error.message || "Failed to create combined mint transaction",
      details: error.stack,
    });
  }
}

/**
 * Preview custom address generation
 */
async function previewCustomAddress(req, res) {
  try {
    const { prefix = "", suffix = "" } = req.query;

    // Validate input
    if (!prefix && !suffix) {
      return res.status(400).json({
        error: "At least one of prefix or suffix must be provided",
      });
    }

    if ((prefix + suffix).length > 4) {
      return res.status(400).json({
        error: "Combined prefix and suffix cannot exceed 4 characters",
      });
    }

    console.log(
      `🔍 Previewing custom address: prefix="${prefix}", suffix="${suffix}"`
    );

    // Generate a sample address with more attempts for better success rate
    const { generateCustomAddress } = mintService;

    const keypair = await generateCustomAddress(prefix, suffix);

    console.log(
      `✅ Generated preview address: ${keypair.publicKey.toBase58()}`
    );

    res.status(200).json({
      success: true,
      sampleAddress: keypair.publicKey.toBase58(),
      prefix,
      suffix,
      note: "This is a preview. The actual mint will use a different address with these characteristics.",
    });
  } catch (error) {
    console.error("❌ Error generating custom address preview:", error);
    res.status(500).json({
      success: false,
      error: `Could not generate address with prefix="${prefix}" suffix="${suffix}" after multiple attempts. Try a simpler combination or fewer characters.`,
      details: error.message,
    });
  }
}

/**
 * Calculate fees based on selected features
 */
async function calculateFees(req, res) {
  try {
    const {
      useCustomAddress = false,
      useMultiWallet = false,
      walletCount = 1,
    } = req.body;

    const baseFee = parseFloat(process.env.PLATFORM_FEE || "0.05");
    const customAddressFee = useCustomAddress
      ? mintService.CUSTOM_ADDRESS_FEE_SOL
      : 0;
    const multiWalletFee = useMultiWallet
      ? mintService.MULTI_WALLET_FEE_SOL
      : 0;

    // Estimate additional costs
    const mintRent = 0.00203928; // Approximate
    const metadataRent = 0.0015; // Approximate
    const transactionFees = 0.00002 * Math.max(1, walletCount); // Per signature

    const totalPlatformFee = baseFee + customAddressFee + multiWalletFee;
    const totalCost =
      totalPlatformFee + mintRent + metadataRent + transactionFees;

    res.status(200).json({
      fees: {
        platform: {
          base: baseFee,
          customAddress: customAddressFee,
          multiWallet: multiWalletFee,
          total: totalPlatformFee,
        },
        blockchain: {
          mintRent,
          metadataRent,
          transactionFees,
          total: mintRent + metadataRent + transactionFees,
        },
        totalCost,
      },
      formatted: {
        platformFee: `${totalPlatformFee} SOL`,
        blockchainFee: `${(mintRent + metadataRent + transactionFees).toFixed(
          6
        )} SOL`,
        total: `${totalCost.toFixed(6)} SOL`,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to calculate fees",
      details: error.message,
    });
  }
}

module.exports = {
  createCombinedMintTransaction,
  previewCustomAddress,
  calculateFees,
};
