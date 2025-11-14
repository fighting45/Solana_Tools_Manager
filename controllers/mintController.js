// Example: How to use the IPFS service in your mint controller

const ipfsService = require("../services/ipfsService");
const mintService = require("../utils/mintSPL");
const metadataService = require("../services/metadataService");

/**
 * Create mint transaction with metadata
 */
async function createMintTransaction(req, res) {
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
    const amount = req.body.amount ? parseInt(req.body.amount) : 0;
    const decimals = req.body.decimals ? parseInt(req.body.decimals) : 6;
    const name = cleanFormValue(req.body.name);
    const symbol = cleanFormValue(req.body.symbol);
    const description = cleanFormValue(req.body.description);

    // Validate required fields
    if (!payerAddress) {
      return res.status(400).json({ error: "payerAddress is required" });
    }
    if (!recipientAddress) {
      return res.status(400).json({ error: "recipientAddress is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    // Debug logging
    console.log("📦 Processing mint transaction request...");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Payer Address:", payerAddress);
    console.log("Mint Authority Address (raw):", req.body.mintAuthorityAddress);
    console.log("Mint Authority Address (cleaned):", mintAuthorityAddress);

    // Get image file from request
    const imageFile = req.file; // Using multer middleware

    if (!imageFile) {
      return res.status(400).json({ error: "Image file is required" });
    }

    console.log("Image:", imageFile.originalname);

    // Step 1: Upload image and metadata to IPFS
    console.log("⬆️ Uploading to IPFS...");

    const ipfsResult = await ipfsService.uploadTokenPackage({
      imageBuffer: imageFile.buffer,
      imageName: imageFile.originalname,
      imageType: imageFile.mimetype,
      name: name,
      symbol: symbol,
      description: description || `${name} - ${symbol} Token`,
      attributes: [], // Add custom attributes if needed
      externalUrl: "", // Optional external URL
    });

    console.log("✅ IPFS Upload Complete:");
    console.log("Image URL:", ipfsResult.image.url);
    console.log("Metadata URL:", ipfsResult.metadata.url);
    console.log(
      "Metadata JSON:",
      JSON.stringify(ipfsResult.metadata.json, null, 2)
    );

    // Step 2: Create mint transaction
    console.log("🔨 Creating mint transaction...");

    const mintResult = await mintService.createMintSPLTransaction(
      payerAddress,
      recipientAddress,
      mintAuthorityAddress,
      amount,
      decimals
    );

    console.log("✅ Mint transaction created");
    console.log("Mint Address:", mintResult.mintAddress);

    // Step 3: Create metadata transaction
    console.log("📝 Creating metadata transaction...");

    // Ensure updateAuthority is not null/undefined
    // Check for null, undefined, empty string, or "null" string
    let updateAuthority = mintAuthorityAddress;

    if (
      !updateAuthority ||
      updateAuthority === "null" ||
      updateAuthority === "undefined"
    ) {
      console.log(
        "⚠️ mintAuthorityAddress is invalid, using payerAddress as update authority"
      );
      updateAuthority = payerAddress;
    }

    console.log("Final Update Authority:", updateAuthority);

    const metadataResult = await metadataService.createMetadataTransaction(
      mintResult.mintAddress,
      payerAddress,
      updateAuthority,
      {
        name: name,
        symbol: symbol,
        uri: ipfsResult.metadata.url, // IMPORTANT: Use metadata URL, not image URL
      },
      0 // seller fee basis points (0 = 0%)
    );

    console.log("✅ Metadata transaction created");
    console.log("Metadata Account:", metadataResult.metadataAccount);

    // Step 4: Return response
    const response = {
      // Mint transaction data
      transaction: mintResult.transaction,
      blockhash: mintResult.blockhash,
      lastValidBlockHeight: mintResult.lastValidBlockHeight,
      mintAddress: mintResult.mintAddress,

      // Metadata transaction data
      metadata: {
        transaction: metadataResult.transaction,
        blockhash: metadataResult.blockhash,
        lastValidBlockHeight: metadataResult.lastValidBlockHeight,
        metadataAccount: metadataResult.metadataAccount,
        readyToCreate: true,
      },

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
      },
    };

    console.log("✅ All transactions created successfully!");
    console.log("Response preview:", {
      mintAddress: response.mintAddress,
      metadataUrl: response.ipfs.metadataUrl,
      imageUrl: response.ipfs.imageUrl,
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error creating mint transaction:", error);
    res.status(500).json({
      error: error.message || "Failed to create mint transaction",
      details: error.stack,
    });
  }
}

module.exports = {
  createMintTransaction,
};
