const { createMintSPLTransaction } = require("../utils/mintSPL");
const ipfsService = require("../services/ipfsService");
const metadataService = require("../services/metadataService");

const createMintTransaction = async (req, res) => {
  try {
    const {
      payerAddress,
      recipientAddress,
      mintAuthorityAddress,
      amount,
      decimals,
      name,
      symbol,
    } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (
      !payerAddress ||
      !recipientAddress ||
      amount === undefined ||
      decimals === undefined
    ) {
      return res.status(400).json({
        error:
          "payerAddress, recipientAddress, amount, and decimals are required",
      });
    }

    // Validate metadata fields
    if (!name || !symbol) {
      return res.status(400).json({
        error: "name and symbol are required",
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        error: "Image file is required",
      });
    }

    // Step 1: Upload image to IPFS
    let imageUri;
    try {
      imageUri = await ipfsService.uploadFile(
        imageFile.buffer,
        imageFile.originalname
      );
      console.log("Image uploaded to IPFS:", imageUri);
    } catch (ipfsError) {
      console.error("IPFS upload error:", ipfsError);
      return res.status(500).json({
        error: "Failed to upload image to IPFS. Please try again.",
      });
    }

    // Step 2: Create metadata JSON and upload to IPFS
    const metadataJson = {
      name: name,
      symbol: symbol,
      description: `${name} (${symbol}) - SPL Token`,
      image: imageUri,
      attributes: [],
    };

    let metadataUri;
    try {
      metadataUri = await ipfsService.uploadMetadata(metadataJson);
      console.log("Metadata uploaded to IPFS:", metadataUri);
    } catch (metadataError) {
      console.error("Metadata upload error:", metadataError);
      return res.status(500).json({
        error: "Failed to upload metadata to IPFS. Please try again.",
      });
    }

    // Step 3: Create mint transaction
    const transactionData = await createMintSPLTransaction(
      payerAddress,
      recipientAddress,
      mintAuthorityAddress || null,
      amount,
      decimals
    );

    // Step 4: Create metadata transaction (unsigned, for frontend signing)
    let metadataTransaction = null;
    try {
      metadataTransaction = await metadataService.createMetadataTransaction(
        transactionData.mintAddress, // Use the mint address from the mint transaction
        payerAddress, // Payer will sign
        payerAddress, // Update authority (defaults to payer)
        {
          name,
          symbol,
          uri: metadataUri,
        },
        0 // No royalty fees
      );
    } catch (metadataError) {
      console.error("Error creating metadata transaction:", metadataError);
      // Don't fail the whole request, just log the error
      // Frontend can create metadata later if needed
    }

    // Step 5: Add metadata information to response
    transactionData.metadata = {
      name,
      symbol,
      imageUri,
      metadataUri,
      transaction: metadataTransaction?.transaction || null, // Base64 encoded transaction
      metadataAccount: metadataTransaction?.metadataAccount || null,
      readyToCreate: !!metadataTransaction, // True if metadata transaction was created
    };

    res.json(transactionData);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createMintTransaction,
};
