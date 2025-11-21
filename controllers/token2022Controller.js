const ipfsService = require("../services/ipfsService");
const token2022Service = require("../utils/MintToken2022");

/**
 * Create Token-2022 transaction with on-chain metadata and optional extensions
 */
async function createToken2022Transaction(req, res) {
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

    // Priority fee level
    const priorityLevel = cleanFormValue(req.body.priorityLevel) || "none";
    console.log('🎯 [Controller] Received priority level from frontend:', req.body.priorityLevel);
    console.log('🎯 [Controller] Cleaned priority level:', priorityLevel);

    // Parse selected extensions from request
    let selectedExtensions = [];
    if (req.body.extensions) {
      if (typeof req.body.extensions === "string") {
        // If it's a comma-separated string
        selectedExtensions = req.body.extensions
          .split(",")
          .map((ext) => ext.trim())
          .filter((ext) => ext);
      } else if (Array.isArray(req.body.extensions)) {
        // If it's already an array
        selectedExtensions = req.body.extensions;
      }
    }

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

    console.log("📦 Processing Token-2022 mint transaction request...");
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Payer Address:", payerAddress);
    console.log("Selected Extensions:", selectedExtensions);

    // Get image file from request
    const imageFile = req.file;

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
      attributes: [],
      externalUrl: "",
    });

    console.log("✅ IPFS Upload Complete:");
    console.log("Image URL:", ipfsResult.image.url);
    console.log("Metadata URL:", ipfsResult.metadata.url);

    // Step 2: Create Token-2022 transaction with on-chain metadata and extensions
    console.log("🔨 Creating Token-2022 transaction with extensions...");

    const result =
      await token2022Service.createToken2022WithMetadataAndExtensions(
        payerAddress,
        recipientAddress,
        mintAuthorityAddress,
        amount,
        decimals,
        {
          name: name,
          symbol: symbol,
          uri: ipfsResult.metadata.url,
        },
        selectedExtensions, // Pass the selected extensions
        priorityLevel // Pass the priority level
      );

    console.log("✅ Token-2022 transaction created successfully!");
    console.log("Mint Address:", result.mintAddress);
    console.log("Enabled Extensions:", result.extensions);

    // Step 3: Return response
    const response = {
      // Transaction data
      transaction: result.transaction,
      blockhash: result.blockhash,
      lastValidBlockHeight: result.lastValidBlockHeight,

      // Token addresses
      mintAddress: result.mintAddress,
      associatedTokenAddress: result.associatedTokenAddress,
      tokenProgram: result.tokenProgram,

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
        extensions: result.extensions, // Include enabled extensions in response
      },

      // Additional info
      payerAddress: result.payerPublicKey,
      updateAuthority: result.updateAuthority,
      recipientAddress: result.recipientAddress,
      mintAuthority: result.mintAuthority,
    };

    console.log("✅ Response ready!");
    console.log(
      "Transaction size:",
      Buffer.from(result.transaction, "base64").length,
      "bytes"
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error creating Token-2022 transaction:", error);
    res.status(500).json({
      error: error.message || "Failed to create Token-2022 transaction",
      details: error.stack,
    });
  }
}

/**
 * Get available Token-2022 extensions
 */
function getAvailableExtensions(req, res) {
  const extensions = [
    {
      name: "mintCloseAuthority",
      label: "Mint Close Authority",
      description:
        "Allows the mint authority to close the mint account and recover rent",
      warning: null,
    },
    {
      name: "permanentDelegate",
      label: "Permanent Delegate",
      description:
        "Assigns a permanent delegate that can transfer or burn tokens from any account",
      warning: "This gives significant control to the delegate address",
    },
    {
      name: "nonTransferable",
      label: "Non-Transferable",
      description: "Makes tokens non-transferable (soulbound)",
      warning: "Tokens cannot be transferred once minted",
    },
  ];

  res.status(200).json({ extensions });
}

module.exports = {
  createToken2022Transaction,
  getAvailableExtensions,
};
