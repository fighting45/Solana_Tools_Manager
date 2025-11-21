const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  createSetAuthorityInstruction,
  AuthorityType,
  MINT_SIZE,
} = require("@solana/spl-token");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { mplTokenMetadata } = require("@metaplex-foundation/mpl-token-metadata");
const {
  createV1,
  updateV1,
  findMetadataPda,
  TokenStandard,
} = require("@metaplex-foundation/mpl-token-metadata");

const {
  publicKey,
  percentAmount,
  createNoopSigner,
  signerIdentity,
} = require("@metaplex-foundation/umi");
const {
  toWeb3JsInstruction,
} = require("@metaplex-foundation/umi-web3js-adapters");
const { TransactionInstruction } = require("@solana/web3.js");
const bs58 = require("bs58");
const crypto = require("crypto");
const { getPriorityFee, addPriorityFeeToTransaction, mapPriorityLevel } = require("./priorityFee");
require("dotenv").config();

// Platform fee configuration from .env
const PLATFORM_WALLET = new PublicKey(
  process.env.PLATFORM_WALLET || "A1YrqK6SUgr1mKDLx88sy992BCx4EAGSkbAsre34tgPz"
);
const PLATFORM_FEE_SOL = parseFloat(process.env.PLATFORM_FEE || "0.05"); // Default 0.05 SOL
const PLATFORM_FEE_LAMPORTS = Math.floor(PLATFORM_FEE_SOL * LAMPORTS_PER_SOL);

// Additional feature fees
const CUSTOM_ADDRESS_FEE_SOL = 0.1; // +0.1 SOL for custom address
const MULTI_WALLET_FEE_SOL = 0.1; // +0.1 SOL for multi-wallet distribution
const REVOKE_AUTHORITY_FEE_SOL = 0.1; // +0.1 SOL per revoke authority option
const CUSTOM_CREATOR_FEE_SOL = 0.1; // +0.1 SOL for custom creator information

/**
 * Generates a custom address with specified prefix and/or suffix
 * @param {string} prefix - Desired prefix for the address (max 4 chars combined with suffix)
 * @param {string} suffix - Desired suffix for the address (max 4 chars combined with prefix)
 * @param {number} maxAttempts - Maximum attempts to generate matching address
 * @returns {Keypair} - Keypair with custom address
 */
async function generateCustomAddress(
  prefix = "",
  suffix = "",
  maxAttempts = 1000000
) {
  console.log(
    `🔑 Generating custom address with prefix: "${prefix}", suffix: "${suffix}", maxAttempts: ${maxAttempts} (type: ${typeof maxAttempts})`
  );

  if ((prefix + suffix).length > 4) {
    throw new Error("Combined prefix and suffix cannot exceed 4 characters");
  }

  let attempts = 0;
  while (attempts < maxAttempts) {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();

    const matchesPrefix =
      !prefix || address.toLowerCase().startsWith(prefix.toLowerCase());
    const matchesSuffix =
      !suffix || address.toLowerCase().endsWith(suffix.toLowerCase());

    if (matchesPrefix && matchesSuffix) {
      console.log(
        `✅ Found matching address after ${attempts} attempts: ${address}`
      );
      return keypair;
    }

    attempts++;
    if (attempts % 1000000 === 0) {
      console.log(`... ${attempts} attempts made`);
    }
  }

  throw new Error(
    `Could not generate custom address after ${maxAttempts} attempts`
  );
}

/**
 * Creates a COMBINED transaction with both SPL token mint AND metadata creation
 * with support for additional features like custom address, multi-wallet distribution, and revokes
 * @param {Object} params - All parameters for token creation
 * @returns {Promise<Object>} Combined transaction ready for frontend signing
 */
async function createCombinedMintWithMetadata(params) {
  const {
    payerAddress,
    recipientAddress,
    mintAuthorityAddress = null,
    amount,
    decimals,
    metadata,
    sellerFeeBasisPoints = 0,
    // Social links
    socialLinks = {},
    // Tags
    tags = [],
    // Custom address parameters
    useCustomAddress = false,
    addressPrefix = "",
    addressSuffix = "",
    // Custom creator parameters
    useCustomCreator = false,
    // Multi-wallet distribution
    multiWalletDistribution = null,
    // Revoke authorities
    revokeAuthorities = {
      freezeAuthority: false,
      mintAuthority: false,
      updateAuthority: false,
    },
    // Priority fee level
    priorityLevel = "none",
  } = params;

  // Use RPC from environment or fallback to reliable public RPCs
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  console.log(`🔗 Connecting to Solana RPC: ${rpcUrl}`);

  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  const supply = amount * Math.pow(10, decimals);
  const payer = new PublicKey(payerAddress);
  const recipient = new PublicKey(recipientAddress);
  const mintAuthority = mintAuthorityAddress
    ? new PublicKey(mintAuthorityAddress)
    : payer;
  const freezeAuthority = revokeAuthorities.freezeAuthority
    ? null
    : mintAuthority;

  // Check payer balance
  const payerBalance = await connection.getBalance(payer);
  console.log(
    `💵 Payer balance: ${
      payerBalance / LAMPORTS_PER_SOL
    } SOL (${payerBalance} lamports)`
  );

  // Generate mint keypair (custom or regular)
  let mintKeypair;
  if (useCustomAddress) {
    console.log("🎯 Generating custom address...");
    mintKeypair = await generateCustomAddress(addressPrefix, addressSuffix);
  } else {
    mintKeypair = Keypair.generate();
  }
  const mint = mintKeypair.publicKey;

  console.log(`🎯 Creating COMBINED transaction for mint: ${mint.toBase58()}`);

  // Calculate total platform fee
  let totalPlatformFee = PLATFORM_FEE_SOL;
  if (useCustomAddress) totalPlatformFee += CUSTOM_ADDRESS_FEE_SOL;
  if (multiWalletDistribution) totalPlatformFee += MULTI_WALLET_FEE_SOL;
  if (useCustomCreator) totalPlatformFee += CUSTOM_CREATOR_FEE_SOL;

  // Add revoke authority fees (0.1 SOL per enabled revoke option)
  let revokeCount = 0;
  if (revokeAuthorities.freezeAuthority) revokeCount++;
  if (revokeAuthorities.mintAuthority) revokeCount++;
  if (revokeAuthorities.updateAuthority) revokeCount++;
  if (revokeCount > 0) {
    totalPlatformFee += (REVOKE_AUTHORITY_FEE_SOL * revokeCount);
    console.log(`🔒 Revoking ${revokeCount} authorities (+${REVOKE_AUTHORITY_FEE_SOL * revokeCount} SOL)`);
  }

  if (useCustomCreator) {
    console.log(`✏️ Custom creator information (+${CUSTOM_CREATOR_FEE_SOL} SOL)`);
  }

  const totalPlatformFeeLamports = Math.floor(
    totalPlatformFee * LAMPORTS_PER_SOL
  );

  console.log(
    `💰 Total platform fee: ${totalPlatformFee} SOL (${totalPlatformFeeLamports} lamports)`
  );
  console.log(`💰 Platform wallet: ${PLATFORM_WALLET.toBase58()}`);

  // Process multi-wallet distribution
  let walletDistributions = [];
  if (multiWalletDistribution && multiWalletDistribution.length > 0) {
    console.log("📊 Processing multi-wallet distribution...");
    console.log(
      "📋 Received distribution data:",
      JSON.stringify(multiWalletDistribution, null, 2)
    );

    // Filter out empty/invalid wallet addresses and trim whitespace
    const validDistributions = multiWalletDistribution.filter((dist) => {
      if (!dist.wallet || typeof dist.wallet !== "string") {
        console.warn(
          `⚠️ Skipping invalid wallet entry: ${JSON.stringify(dist)}`
        );
        return false;
      }
      const trimmedWallet = dist.wallet.trim();
      if (trimmedWallet.length === 0) {
        console.warn(`⚠️ Skipping empty wallet address`);
        return false;
      }
      // Basic Solana address validation (should be 32-44 characters)
      if (trimmedWallet.length < 32 || trimmedWallet.length > 44) {
        console.warn(
          `⚠️ Skipping invalid wallet address length: ${trimmedWallet}`
        );
        return false;
      }
      return true;
    });

    if (validDistributions.length === 0) {
      throw new Error(
        "No valid wallet addresses provided in multi-wallet distribution"
      );
    }

    // Validate percentages total to 100 (only for valid wallets)
    const totalPercentage = validDistributions.reduce(
      (sum, dist) => sum + dist.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(
        `Distribution percentages must total 100%, got ${totalPercentage}%`
      );
    }

    // Create wallet distributions with validated addresses
    walletDistributions = validDistributions.map((dist) => {
      try {
        return {
          wallet: new PublicKey(dist.wallet.trim()),
          amount: Math.floor((supply * dist.percentage) / 100),
        };
      } catch (err) {
        throw new Error(
          `Invalid wallet address: ${dist.wallet.trim()} - ${err.message}`
        );
      }
    });

    console.log(`✅ Distributing to ${walletDistributions.length} wallets`);
  } else {
    // Single wallet receives all tokens
    walletDistributions = [
      {
        wallet: recipient,
        amount: supply,
      },
    ];
  }

  // Get recent blockhash with retry logic
  let blockhash, lastValidBlockHeight;
  let retries = 3;

  while (retries > 0) {
    try {
      console.log(
        `⏳ Fetching latest blockhash (attempts remaining: ${retries})...`
      );
      const result = await connection.getLatestBlockhash("confirmed");
      blockhash = result.blockhash;
      lastValidBlockHeight = result.lastValidBlockHeight;
      console.log(`✅ Got blockhash: ${blockhash}`);
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error("❌ Failed to get blockhash after all retries");
        throw new Error(
          `Failed to connect to Solana RPC (${rpcUrl}). Error: ${error.message}`
        );
      }
      console.log(
        `⚠️ Retry failed, waiting 2 seconds... (${retries} attempts left)`
      );
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
  if (priorityLevel && priorityLevel !== 'none') {
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
      console.warn('⚠️ Failed to add priority fee, continuing without it:', error.message);
    }
  } else {
    console.log(`⏭️  No priority fee requested (level: ${priorityLevel})`);
  }

  // ========================================
  // INSTRUCTION 0: PLATFORM FEE TRANSFER
  // ========================================
  console.log("💸 Adding platform fee transfer instruction...");

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: PLATFORM_WALLET,
      lamports: totalPlatformFeeLamports,
    })
  );

  console.log(
    `✅ Platform fee instruction added: ${totalPlatformFee} SOL to ${PLATFORM_WALLET.toBase58()}`
  );

  // ========================================
  // PART 1: SPL TOKEN CREATION INSTRUCTIONS
  // ========================================

  console.log("📝 Adding SPL token instructions...");

  // Instruction 1: Create the mint account
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // Instruction 2: Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_PROGRAM_ID
    )
  );

  // Create associated token accounts and mint tokens for each distribution
  for (const dist of walletDistributions) {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mint,
      dist.wallet,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAddress,
        dist.wallet,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint tokens to the wallet
    transaction.add(
      createMintToInstruction(
        mint,
        associatedTokenAddress,
        mintAuthority,
        dist.amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  console.log("✅ SPL token instructions added");

  // ========================================
  // PART 2: METADATA CREATION INSTRUCTIONS
  // ========================================

  console.log("📝 Adding metadata instructions...");

  try {
    // Create Umi instance for metadata
    const umi = createUmi(rpcUrl).use(mplTokenMetadata());

    const umiMint = publicKey(mint.toBase58());
    const umiPayer = publicKey(payer.toBase58());
    const updateAuthority = mintAuthorityAddress
      ? publicKey(mintAuthorityAddress)
      : umiPayer;

    // Create a noop signer (won't actually sign in Umi, just placeholder)
    const noopSigner = createNoopSigner(umiPayer);
    umi.use(signerIdentity(noopSigner));

    // Derive metadata account address
    const [metadataAccountAddress] = findMetadataPda(umi, {
      mint: umiMint,
    });

    console.log("Metadata Account:", metadataAccountAddress.toString());

    // Build metadata with additional fields
    const metadataData = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints, 2),
      tokenStandard: TokenStandard.Fungible,
    };

    // Add social links and tags to metadata JSON if provided
    // These will be included in the off-chain metadata (IPFS JSON)
    // The on-chain metadata only stores the URI pointing to this JSON

    // Create metadata instruction builder
    const metadataBuilder = createV1(umi, {
      mint: umiMint,
      authority: noopSigner,
      payer: noopSigner,
      updateAuthority: updateAuthority, // Always set valid authority initially
      ...metadataData,
    });

    // Get metadata instructions
    const metadataInstructions = metadataBuilder.getInstructions();

    console.log(
      `Adding ${metadataInstructions.length} metadata instruction(s)...`
    );

    // Convert Umi instructions to web3.js and add to transaction
    for (const umiIx of metadataInstructions) {
      try {
        const web3Ix = toWeb3JsInstruction(umiIx);
        transaction.add(web3Ix);
      } catch (adapterError) {
        console.log("Using manual instruction conversion...");

        const keys = (umiIx.keys || []).map((key) => ({
          pubkey: new PublicKey(key.pubkey.toString()),
          isSigner: key.isSigner || false,
          isWritable: key.isWritable || false,
        }));

        const web3Ix = new TransactionInstruction({
          keys,
          programId: new PublicKey(umiIx.programId.toString()),
          data: Buffer.from(umiIx.data),
        });

        transaction.add(web3Ix);
      }
    }

    console.log("✅ Metadata instructions added");

    // ========================================
    // PART 3: REVOKE AUTHORITIES (if requested)
    // ========================================

    if (revokeAuthorities.freezeAuthority && freezeAuthority) {
      console.log("🔒 Revoking freeze authority...");
      transaction.add(
        createSetAuthorityInstruction(
          mint,
          mintAuthority,
          AuthorityType.FreezeAccount,
          null,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    if (revokeAuthorities.mintAuthority) {
      console.log("🔒 Revoking mint authority...");
      transaction.add(
        createSetAuthorityInstruction(
          mint,
          mintAuthority,
          AuthorityType.MintTokens,
          null,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    // Revoke update authority for metadata
    if (revokeAuthorities.updateAuthority) {
      console.log("🔒 Revoking update authority...");
      try {
        const updateBuilder = updateV1(umi, {
          mint: umiMint,
          authority: updateAuthority,
          newUpdateAuthority: publicKey(PublicKey.default.toBase58()),
        });

        const updateInstructions = updateBuilder.getInstructions();

        for (const umiIx of updateInstructions) {
          try {
            const web3Ix = toWeb3JsInstruction(umiIx);
            transaction.add(web3Ix);
          } catch (adapterError) {
            const keys = (umiIx.keys || []).map((key) => ({
              pubkey: new PublicKey(key.pubkey.toString()),
              isSigner: key.isSigner || false,
              isWritable: key.isWritable || false,
            }));

            const web3Ix = new TransactionInstruction({
              keys,
              programId: new PublicKey(umiIx.programId.toString()),
              data: Buffer.from(umiIx.data),
            });

            transaction.add(web3Ix);
          }
        }

        console.log("✅ Update authority will be revoked");
      } catch (error) {
        console.warn("⚠️ Could not add update authority revoke instruction:", error.message);
      }
    }

    // Calculate total cost
    const mintRentSOL = mintRent / LAMPORTS_PER_SOL;
    const estimatedMetadataRent = 0.0015; // Approximate metadata account rent
    const estimatedFees = 0.00002 * (1 + walletDistributions.length); // Additional fees for multiple wallets
    const totalCost =
      totalPlatformFee + mintRentSOL + estimatedMetadataRent + estimatedFees;

    console.log(`💰 Total estimated cost: ${totalCost.toFixed(6)} SOL`);
    console.log(`   - Platform fee: ${totalPlatformFee} SOL`);
    console.log(`   - Mint rent: ${mintRentSOL.toFixed(6)} SOL`);
    console.log(`   - Metadata rent: ~${estimatedMetadataRent} SOL`);
    console.log(`   - Transaction fees: ~${estimatedFees} SOL`);

    if (payerBalance < totalCost * LAMPORTS_PER_SOL) {
      throw new Error(
        `Insufficient balance. Required: ${totalCost.toFixed(
          6
        )} SOL, Available: ${(payerBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`
      );
    }

    // Partially sign with mint keypair (required for creating the mint account)
    transaction.partialSign(mintKeypair);

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log("✅ Combined transaction created successfully!");
    console.log("Transaction size:", serializedTransaction.length, "bytes");

    return {
      transaction: serializedTransaction.toString("base64"),
      mintAddress: mint.toBase58(),
      recipientAddress: recipient.toBase58(),
      walletDistributions: walletDistributions.map((dist) => ({
        wallet: dist.wallet.toBase58(),
        amount: dist.amount.toString(),
        percentage: ((dist.amount * 100) / supply).toFixed(2),
      })),
      metadataAccount: metadataAccountAddress.toString(),
      supply: supply.toString(),
      decimals: decimals,
      mintSecretKey: bs58.encode(mintKeypair.secretKey),
      payerPublicKey: payer.toBase58(),
      mintAuthority: mintAuthority.toBase58(),
      updateAuthority: revokeAuthorities.updateAuthority
        ? "revoked"
        : updateAuthority.toString(),
      freezeAuthority: revokeAuthorities.freezeAuthority
        ? "revoked"
        : freezeAuthority
        ? freezeAuthority.toBase58()
        : "none",
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        socialLinks: socialLinks,
        tags: tags,
      },
      platformFee: {
        amount: totalPlatformFee,
        amountLamports: totalPlatformFeeLamports,
        recipient: PLATFORM_WALLET.toBase58(),
        breakdown: {
          base: PLATFORM_FEE_SOL,
          customAddress: useCustomAddress ? CUSTOM_ADDRESS_FEE_SOL : 0,
          multiWallet: multiWalletDistribution ? MULTI_WALLET_FEE_SOL : 0,
        },
      },
      features: {
        customAddress: useCustomAddress,
        addressPrefix: addressPrefix,
        addressSuffix: addressSuffix,
        multiWalletDistribution: !!multiWalletDistribution,
        revokedAuthorities: revokeAuthorities,
      },
    };
  } catch (error) {
    console.error("❌ Error adding metadata instructions:", error);
    throw new Error(`Failed to create combined transaction: ${error.message}`);
  }
}

// Export the functions
module.exports = {
  createCombinedMintWithMetadata,
  generateCustomAddress,
  CUSTOM_ADDRESS_FEE_SOL,
  MULTI_WALLET_FEE_SOL,
  REVOKE_AUTHORITY_FEE_SOL,
  CUSTOM_CREATOR_FEE_SOL,
};
