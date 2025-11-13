// Example: How to use the IPFS service in your mint controller

const ipfsService = require("../services/ipfsService");
const mintService = require("../services/mintService");
const metadataService = require("../services/metadataService");

/**
 * Create mint transaction with metadata
 */
async function createMintTransaction(req, res) {
  try {
    const {
      payerAddress,
      recipientAddress,
      mintAuthorityAddress,
      amount,
      decimals,
      name,
      symbol,
      description, // Optional description
    } = req.body;

    // Get image file from request
    const imageFile = req.file; // Using multer middleware

    if (!imageFile) {
      return res.status(400).json({ error: "Image file is required" });
    }

    console.log("📦 Processing mint transaction request...");
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
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

    const mintResult = await mintService.createMintTransaction(
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

    const metadataResult = await metadataService.createMetadataTransaction(
      mintResult.mintAddress,
      payerAddress,
      mintAuthorityAddress || payerAddress,
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
