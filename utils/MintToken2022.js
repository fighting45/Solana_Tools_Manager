const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMintLen,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  createInitializeMintCloseAuthorityInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeNonTransferableMintInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
} = require("@solana/spl-token");
const {
  createInitializeInstruction,
  pack,
} = require("@solana/spl-token-metadata");
const bs58 = require("bs58");
const {
  getPriorityFee,
  addPriorityFeeToTransaction,
  mapPriorityLevel,
} = require("./priorityFee");
require("dotenv").config();

// Platform fee configuration from .env
const PLATFORM_WALLET = new PublicKey(
  process.env.PLATFORM_WALLET || "A1YrqK6SUgr1mKDLx88sy992BCx4EAGSkbAsre34tgPz",
);
const PLATFORM_FEE_SOL = parseFloat(process.env.PLATFORM_FEE || "0.05");
const PLATFORM_FEE_LAMPORTS = Math.floor(PLATFORM_FEE_SOL * LAMPORTS_PER_SOL);
const EXTENSION_FEE_SOL = 0.1; // 0.1 SOL per extension
const EXTENSION_FEE_LAMPORTS = Math.floor(EXTENSION_FEE_SOL * LAMPORTS_PER_SOL);

/**
 * Map user-friendly extension names to ExtensionType enum
 */
const EXTENSION_MAP = {
  mintCloseAuthority: ExtensionType.MintCloseAuthority,
  permanentDelegate: ExtensionType.PermanentDelegate,
  nonTransferable: ExtensionType.NonTransferable,
  // Note: ConfidentialTransferMint requires more complex setup, leaving it out for now
};

/**
 * Create Token-2022 with metadata and optional extensions
 * @param {string} payerAddress - Payer's public key
 * @param {string} recipientAddress - Recipient's public key
 * @param {string|null} mintAuthorityAddress - Mint authority's public key
 * @param {number} amount - Amount to mint
 * @param {number} decimals - Token decimals
 * @param {Object} metadata - Token metadata
 * @param {Array<string>} selectedExtensions - Array of selected extension names
 */
async function createToken2022WithMetadataAndExtensions(
  payerAddress,
  recipientAddress,
  mintAuthorityAddress = null,
  amount,
  decimals,
  metadata,
  selectedExtensions = [],
  priorityLevel = "none",
) {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  console.log(`🔗 Connecting to Solana RPC for Token-2022: ${rpcUrl}`);
  console.log(
    `🔧 Selected extensions: ${selectedExtensions.join(", ") || "None"}`,
  );

  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  const supply = BigInt(Math.floor(amount * Math.pow(10, decimals)));
  const payer = new PublicKey(payerAddress);
  const recipient = new PublicKey(recipientAddress);
  const mintAuthority = mintAuthorityAddress
    ? new PublicKey(mintAuthorityAddress)
    : payer;
  const updateAuthority = mintAuthority;

  console.log(
    `💰 Supply calculation: ${amount} tokens × 10^${decimals} = ${supply.toString()}`,
  );

  // Calculate total platform fee (base + extensions)
  let totalPlatformFee = PLATFORM_FEE_SOL;
  const extensionCount = selectedExtensions.length;
  if (extensionCount > 0) {
    totalPlatformFee += EXTENSION_FEE_SOL * extensionCount;
    console.log(
      `🔧 ${extensionCount} extension(s) enabled (+${EXTENSION_FEE_SOL * extensionCount} SOL)`,
    );
  }

  const totalPlatformFeeLamports = Math.floor(
    totalPlatformFee * LAMPORTS_PER_SOL,
  );

  console.log(
    `💰 Total platform fee: ${totalPlatformFee} SOL (${totalPlatformFeeLamports} lamports)`,
  );
  console.log(`💰 Platform wallet: ${PLATFORM_WALLET.toBase58()}`);

  // Check payer balance
  const payerBalance = await connection.getBalance(payer);
  console.log(`💵 Payer balance: ${payerBalance / LAMPORTS_PER_SOL} SOL`);

  // Generate a new mint keypair for Token-2022
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log(`🎯 Creating Token-2022 mint: ${mint.toBase58()}`);

  // Get the associated token account address for Token-2022
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    recipient,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  console.log(
    `📦 Associated Token Account: ${associatedTokenAddress.toBase58()}`,
  );

  // Check if associated token account already exists
  let associatedTokenAccountExists = false;
  try {
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    associatedTokenAccountExists = accountInfo !== null;
  } catch (error) {
    associatedTokenAccountExists = false;
  }

  // Get recent blockhash
  let blockhash, lastValidBlockHeight;
  let retries = 3;

  while (retries > 0) {
    try {
      const result = await connection.getLatestBlockhash("confirmed");
      blockhash = result.blockhash;
      lastValidBlockHeight = result.lastValidBlockHeight;
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to connect to Solana RPC: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Create a new transaction
  const transaction = new Transaction({
    feePayer: payer,
    blockhash: blockhash,
    lastValidBlockHeight: lastValidBlockHeight,
  });

  // ========================================
  // PRIORITY FEE (if enabled)
  // ========================================
  if (priorityLevel && priorityLevel !== "none") {
    try {
      console.log(`🚀 Processing priority fee (UI level: ${priorityLevel})...`);
      const apiLevel = mapPriorityLevel(priorityLevel);
      const priorityFee = getPriorityFee(apiLevel);

      if (priorityFee > 0) {
        addPriorityFeeToTransaction(transaction, priorityFee);
        console.log(`✅ Priority fee added: ${priorityFee} micro-lamports`);
      } else {
        console.log(`⏭️  Skipping priority fee (level: ${apiLevel})`);
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to add priority fee, continuing without it:",
        error.message,
      );
    }
  } else {
    console.log(`⏭️  No priority fee requested (level: ${priorityLevel})`);
  }

  // ========================================
  // PLATFORM FEE TRANSFER
  // ========================================
  console.log("💸 Adding platform fee transfer instruction...");

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: PLATFORM_WALLET,
      lamports: totalPlatformFeeLamports,
    }),
  );

  // ========================================
  // PREPARE EXTENSIONS
  // ========================================

  // Convert selected extension names to ExtensionType array
  const extensions = [ExtensionType.MetadataPointer]; // Metadata is always included

  selectedExtensions.forEach((ext) => {
    if (EXTENSION_MAP[ext]) {
      extensions.push(EXTENSION_MAP[ext]);
    }
  });

  console.log("📝 Calculating space for Token-2022 with extensions...");

  // Calculate space WITHOUT metadata data (for account creation)
  const spaceWithoutMetadata = getMintLen(extensions);

  // Pack the metadata to get its exact size
  const metadataData = {
    updateAuthority: updateAuthority,
    mint: mint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: [],
  };

  const metadataBytes = pack(metadataData);
  const metadataLen = metadataBytes.length;

  // Total space WITH metadata
  const spaceWithMetadata =
    spaceWithoutMetadata + TYPE_SIZE + LENGTH_SIZE + metadataLen;

  console.log("📊 Space breakdown:");
  console.log(`   Base + extensions: ${spaceWithoutMetadata} bytes`);
  console.log(`   Metadata data: ${metadataLen} bytes`);
  console.log(`   Total: ${spaceWithMetadata} bytes`);

  // Calculate rent
  const mintLamports =
    await connection.getMinimumBalanceForRentExemption(spaceWithMetadata);

  // ========================================
  // BUILD TRANSACTION
  // ========================================
  console.log("📝 Building Token-2022 transaction with extensions...");

  // 1. Create the mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: spaceWithoutMetadata,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
  );

  // 2. Initialize extensions (BEFORE InitializeMint)
  let instructionIndex = 2;

  // Always initialize MetadataPointer
  transaction.add(
    createInitializeMetadataPointerInstruction(
      mint,
      updateAuthority,
      mint,
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  console.log(
    `✅ Instruction ${instructionIndex++}: MetadataPointer extension`,
  );

  // Add optional extensions based on user selection
  selectedExtensions.forEach((ext) => {
    switch (ext) {
      case "mintCloseAuthority":
        transaction.add(
          createInitializeMintCloseAuthorityInstruction(
            mint,
            mintAuthority, // Close authority (can be different from mint authority)
            TOKEN_2022_PROGRAM_ID,
          ),
        );
        console.log(
          `✅ Instruction ${instructionIndex++}: MintCloseAuthority extension`,
        );
        break;

      case "permanentDelegate":
        transaction.add(
          createInitializePermanentDelegateInstruction(
            mint,
            mintAuthority, // Permanent delegate (can be different)
            TOKEN_2022_PROGRAM_ID,
          ),
        );
        console.log(
          `✅ Instruction ${instructionIndex++}: PermanentDelegate extension`,
        );
        break;

      case "nonTransferable":
        transaction.add(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID,
          ),
        );
        console.log(
          `✅ Instruction ${instructionIndex++}: NonTransferable extension`,
        );
        break;
    }
  });

  // 3. Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      null, // Freeze authority
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  console.log(`✅ Instruction ${instructionIndex++}: Initialize mint`);

  // 4. Initialize metadata
  transaction.add(
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: updateAuthority,
      mint: mint,
      mintAuthority: mintAuthority,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    }),
  );
  console.log(`✅ Instruction ${instructionIndex++}: Initialize metadata`);

  // 5. Create associated token account
  if (!associatedTokenAccountExists) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAddress,
        recipient,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
    console.log(
      `✅ Instruction ${instructionIndex++}: Create associated token account`,
    );
  }

  // 6. Mint tokens
  const supplyNumber = Number(supply);
  transaction.add(
    createMintToInstruction(
      mint,
      associatedTokenAddress,
      mintAuthority,
      supplyNumber,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  console.log(
    `✅ Instruction ${instructionIndex++}: Mint ${supplyNumber.toLocaleString()} tokens`,
  );

  // Partially sign with mint keypair
  transaction.partialSign(mintKeypair);

  // Serialize the transaction
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  console.log("✅ Token-2022 transaction created successfully!");
  console.log(`📊 Transaction size: ${serializedTransaction.length} bytes`);

  return {
    transaction: serializedTransaction.toString("base64"),
    mintAddress: mint.toBase58(),
    recipientAddress: recipient.toBase58(),
    associatedTokenAddress: associatedTokenAddress.toBase58(),
    supply: supply.toString(),
    decimals: decimals,
    mintSecretKey: bs58.encode(mintKeypair.secretKey),
    payerPublicKey: payer.toBase58(),
    mintAuthority: mintAuthority.toBase58(),
    updateAuthority: updateAuthority.toBase58(),
    blockhash: blockhash,
    lastValidBlockHeight: lastValidBlockHeight,
    metadata: {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    },
    extensions: selectedExtensions,
    tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(),
    platformFee: {
      base: PLATFORM_FEE_SOL,
      extensionFee: EXTENSION_FEE_SOL,
      extensionCount: extensionCount,
      total: totalPlatformFee,
      totalLamports: totalPlatformFeeLamports,
      recipient: PLATFORM_WALLET.toBase58(),
      breakdown: {
        baseFee: PLATFORM_FEE_SOL,
        extensionsFee: EXTENSION_FEE_SOL * extensionCount,
      },
    },
  };
}

// Keep backward compatibility
async function createToken2022WithMetadata(
  payerAddress,
  recipientAddress,
  mintAuthorityAddress,
  amount,
  decimals,
  metadata,
) {
  return createToken2022WithMetadataAndExtensions(
    payerAddress,
    recipientAddress,
    mintAuthorityAddress,
    amount,
    decimals,
    metadata,
    [], // No additional extensions
  );
}

module.exports = {
  createToken2022WithMetadata,
  createToken2022WithMetadataAndExtensions,
  EXTENSION_MAP,
};
