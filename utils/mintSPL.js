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

// Platform fee configuration from .env
const PLATFORM_WALLET = new PublicKey(process.env.PLATFORM_WALLET || "A1YrqK6SUgr1mKDLx88sy992BCx4EAGSkbAsre34tgPz");
const PLATFORM_FEE_SOL = parseFloat(process.env.PLATFORM_FEE || "0.05"); // Default 0.05 SOL
const PLATFORM_FEE_LAMPORTS = Math.floor(PLATFORM_FEE_SOL * LAMPORTS_PER_SOL);

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

  // Check payer balance (ONLY for the payer, not platform wallet)
  const payerBalance = await connection.getBalance(payer);
  console.log(`💵 Payer balance: ${payerBalance / LAMPORTS_PER_SOL} SOL (${payerBalance} lamports)`);

  // Generate a new mint keypair
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log(`🎯 Creating COMBINED transaction for mint: ${mint.toBase58()}`);
  console.log(`Recipient: ${recipient.toBase58()}`);
  console.log(`💰 Platform fee: ${PLATFORM_FEE_SOL} SOL (${PLATFORM_FEE_LAMPORTS} lamports)`);
  console.log(`💰 Platform wallet: ${PLATFORM_WALLET.toBase58()}`);

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
  // INSTRUCTION 0: PLATFORM FEE TRANSFER
  // ========================================
  console.log("💸 Adding platform fee transfer instruction...");
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: PLATFORM_WALLET,
      lamports: PLATFORM_FEE_LAMPORTS,
    })
  );

  console.log(`✅ Platform fee instruction added: ${PLATFORM_FEE_SOL} SOL to ${PLATFORM_WALLET.toBase58()}`);

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

    // Calculate total cost
    const mintRentSOL = mintRent / LAMPORTS_PER_SOL;
    const estimatedMetadataRent = 0.0015; // Approximate metadata account rent
    const estimatedFees = 0.00002; // ~20000 lamports for transaction fees
    const totalCost = PLATFORM_FEE_SOL + mintRentSOL + estimatedMetadataRent + estimatedFees;
    
    console.log(`💰 Total estimated cost: ${totalCost.toFixed(6)} SOL`);
    console.log(`   - Platform fee: ${PLATFORM_FEE_SOL} SOL`);
    console.log(`   - Mint rent: ${mintRentSOL.toFixed(6)} SOL`);
    console.log(`   - Metadata rent: ~${estimatedMetadataRent} SOL`);
    console.log(`   - Transaction fees: ~${estimatedFees} SOL`);

    if (payerBalance < totalCost * LAMPORTS_PER_SOL) {
      throw new Error(`Insufficient balance. Required: ${totalCost.toFixed(6)} SOL, Available: ${(payerBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
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
      platformFee: {
        amount: PLATFORM_FEE_SOL,
        amountLamports: PLATFORM_FEE_LAMPORTS,
        recipient: PLATFORM_WALLET.toBase58(),
      },
    };
  } catch (error) {
    console.error("❌ Error adding metadata instructions:", error);
    throw new Error(`Failed to create combined transaction: ${error.message}`);
  }
}

// Export the function
module.exports = {
  createCombinedMintWithMetadata,
};