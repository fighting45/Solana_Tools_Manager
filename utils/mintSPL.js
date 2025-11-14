const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} = require("@solana/spl-token");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { mplTokenMetadata } = require("@metaplex-foundation/mpl-token-metadata");
const {
  createV1,
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
require("dotenv").config();

/**
 * Creates a transaction with multiple instructions to mint an SPL token
 * @param {string} payerAddress - The payer's wallet address (base58) - will sign the transaction
 * @param {string} recipientAddress - The recipient's wallet address (base58)
 * @param {string} mintAuthorityAddress - The mint authority address (base58) - defaults to payer
 * @param {number} amount - Amount of tokens to mint (will be converted to supply: amount * LAMPORTS_PER_SOL)
 * @param {number} decimals - Number of decimals for the token (variable, provided by frontend)
 * @returns {Promise<Object>} Transaction object ready for frontend signing
 */
async function createMintSPLTransaction(
  payerAddress,
  recipientAddress,
  mintAuthorityAddress = null,
  amount,
  decimals
) {
  // Use RPC from environment or fallback to reliable public RPCs
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  console.log(`🔗 Connecting to Solana RPC: ${rpcUrl}`);

  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  const supply = amount * LAMPORTS_PER_SOL;
  const payer = new PublicKey(payerAddress);
  const recipient = new PublicKey(recipientAddress);
  const mintAuthority = payer;

  // Generate a new mint keypair
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log(`Creating transaction for mint: ${mint.toBase58()}`);
  console.log(`Recipient: ${recipient.toBase58()}`);

  // Get the associated token account address for the recipient
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

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
          `Failed to connect to Solana RPC (${rpcUrl}). Please check your internet connection or try again later. Error: ${error.message}`
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
      mintAuthority, // mint authority
      mintAuthority, // freeze authority (can be null)
      TOKEN_PROGRAM_ID
    )
  );

  // Instruction 3: Create associated token account (if it doesn't exist)
  // Note: This will fail if the account already exists, but that's okay
  // In production, you might want to check if it exists first
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer, // payer
      associatedTokenAddress, // associatedToken
      recipient, // owner
      mint, // mint
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // Instruction 4: Mint tokens to the recipient's associated token account
  transaction.add(
    createMintToInstruction(
      mint, // mint
      associatedTokenAddress, // destination
      mintAuthority, // authority (mint authority)
      supply, // amount
      [], // multiSigners
      TOKEN_PROGRAM_ID
    )
  );

  // Partially sign the transaction with the mint keypair (required for creating the mint account)
  transaction.partialSign(mintKeypair);

  // Serialize the transaction for frontend
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  // Return transaction data for frontend
  return {
    transaction: serializedTransaction.toString("base64"),
    mintAddress: mint.toBase58(),
    recipientAddress: recipient.toBase58(),
    associatedTokenAddress: associatedTokenAddress.toBase58(),
    supply: supply.toString(),
    decimals: decimals,
    // Include the mint keypair's secret key so frontend can complete signing if needed
    // In production, handle this more securely - the mint keypair signature is already included
    mintSecretKey: bs58.encode(mintKeypair.secretKey),
    payerPublicKey: payer.toBase58(),
    mintAuthority: mintAuthority.toBase58(),
    blockhash: blockhash,
    lastValidBlockHeight: lastValidBlockHeight,
  };
}

/**
 * Creates a COMBINED transaction with both SPL token mint AND metadata creation
 * This is more efficient and ensures atomicity - either both succeed or both fail
 * @param {string} payerAddress - The payer's wallet address (base58) - will sign the transaction
 * @param {string} recipientAddress - The recipient's wallet address (base58)
 * @param {string} mintAuthorityAddress - The mint authority address (base58) - defaults to payer
 * @param {number} amount - Amount of tokens to mint
 * @param {number} decimals - Number of decimals for the token
 * @param {Object} metadata - Metadata object with name, symbol, uri
 * @param {number} sellerFeeBasisPoints - Royalty percentage (0-10000)
 * @returns {Promise<Object>} Combined transaction ready for frontend signing
 */
async function createCombinedMintWithMetadata(
  payerAddress,
  recipientAddress,
  mintAuthorityAddress = null,
  amount,
  decimals,
  metadata,
  sellerFeeBasisPoints = 0
) {
  // Use RPC from environment or fallback to reliable public RPCs
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  console.log(`🔗 Connecting to Solana RPC: ${rpcUrl}`);

  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  const supply = amount * LAMPORTS_PER_SOL;
  const payer = new PublicKey(payerAddress);
  const recipient = new PublicKey(recipientAddress);
  const mintAuthority = payer;

  // Generate a new mint keypair
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log(`🎯 Creating COMBINED transaction for mint: ${mint.toBase58()}`);
  console.log(`Recipient: ${recipient.toBase58()}`);

  // Get the associated token account address for the recipient
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

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
      mintAuthority,
      TOKEN_PROGRAM_ID
    )
  );

  // Instruction 3: Create associated token account
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer,
      associatedTokenAddress,
      recipient,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // Instruction 4: Mint tokens to the recipient
  transaction.add(
    createMintToInstruction(
      mint,
      associatedTokenAddress,
      mintAuthority,
      supply,
      [],
      TOKEN_PROGRAM_ID
    )
  );

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

    // Create metadata instruction builder
    const metadataBuilder = createV1(umi, {
      mint: umiMint,
      authority: noopSigner,
      payer: noopSigner,
      updateAuthority: updateAuthority,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints, 2),
      tokenStandard: TokenStandard.Fungible,
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
      associatedTokenAddress: associatedTokenAddress.toBase58(),
      metadataAccount: metadataAccountAddress.toString(),
      supply: supply.toString(),
      decimals: decimals,
      mintSecretKey: bs58.encode(mintKeypair.secretKey),
      payerPublicKey: payer.toBase58(),
      mintAuthority: mintAuthority.toBase58(),
      updateAuthority: updateAuthority.toString(),
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
      },
    };
  } catch (error) {
    console.error("❌ Error adding metadata instructions:", error);
    throw new Error(`Failed to create combined transaction: ${error.message}`);
  }
}

// Export both functions
module.exports = {
  createMintSPLTransaction,
  createCombinedMintWithMetadata,
};
