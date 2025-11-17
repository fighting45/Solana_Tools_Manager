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
  TYPE_SIZE,
  LENGTH_SIZE,
} = require("@solana/spl-token");
const { 
  createInitializeInstruction,
  pack,
} = require("@solana/spl-token-metadata");
const bs58 = require("bs58");
require("dotenv").config();

// Platform fee configuration from .env
const PLATFORM_WALLET = new PublicKey(process.env.PLATFORM_WALLET || "A1YrqK6SUgr1mKDLx88sy992BCx4EAGSkbAsre34tgPz");
const PLATFORM_FEE_SOL = parseFloat(process.env.PLATFORM_FEE || "0.05"); // Default 0.05 SOL
const PLATFORM_FEE_LAMPORTS = Math.floor(PLATFORM_FEE_SOL * LAMPORTS_PER_SOL);

async function createToken2022WithMetadata(
  payerAddress,
  recipientAddress,
  mintAuthorityAddress = null,
  amount,
  decimals,
  metadata
) {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  console.log(`🔗 Connecting to Solana RPC for Token-2022: ${rpcUrl}`);

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

  console.log(`💰 Supply calculation: ${amount} tokens × 10^${decimals} = ${supply.toString()}`);
  console.log(`💰 Platform fee: ${PLATFORM_FEE_SOL} SOL (${PLATFORM_FEE_LAMPORTS} lamports)`);
  console.log(`💰 Platform wallet: ${PLATFORM_WALLET.toBase58()}`);

  // Check payer balance
  const payerBalance = await connection.getBalance(payer);
  console.log(`💵 Payer balance: ${payerBalance / LAMPORTS_PER_SOL} SOL (${payerBalance} lamports)`);

  // Generate a new mint keypair for Token-2022
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log(`🎯 Creating Token-2022 mint: ${mint.toBase58()}`);
  console.log(`Recipient: ${recipient.toBase58()}`);

  // Get the associated token account address for Token-2022
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    recipient,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`📦 Associated Token Account: ${associatedTokenAddress.toBase58()}`);
  
  // Check if associated token account already exists
  let associatedTokenAccountExists = false;
  try {
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    associatedTokenAccountExists = accountInfo !== null;
    if (associatedTokenAccountExists) {
      console.log("⚠️ Associated token account already exists, will skip creation");
    }
  } catch (error) {
    console.log("✅ Associated token account will be created");
    associatedTokenAccountExists = false;
  }

  // Get recent blockhash with retry logic
  let blockhash, lastValidBlockHeight;
  let retries = 3;

  while (retries > 0) {
    try {
      console.log(`⏳ Fetching latest blockhash (attempts remaining: ${retries})...`);
      const result = await connection.getLatestBlockhash("confirmed");
      blockhash = result.blockhash;
      lastValidBlockHeight = result.lastValidBlockHeight;
      console.log(`✅ Got blockhash: ${blockhash}`);
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to connect to Solana RPC (${rpcUrl}). Error: ${error.message}`);
      }
      console.log(`⚠️ Retry failed, waiting 2 seconds... (${retries} attempts left)`);
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
  // TOKEN-2022 CREATION WITH METADATA
  // ========================================

  console.log("📝 Calculating space for Token-2022 with on-chain metadata...");

  // Space calculation 1: WITHOUT TokenMetadata extension (for account creation)
  const spaceWithoutMetadata = getMintLen([ExtensionType.MetadataPointer]);
  
  // Space calculation 2: WITH TokenMetadata extension (for rent calculation)
  const metadataData = {
    updateAuthority: updateAuthority,
    mint: mint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: [],
  };
  
  // Pack the metadata to get its exact size
  const metadataBytes = pack(metadataData);
  const metadataLen = metadataBytes.length;
  
  // Total space WITH metadata = base mint space + metadata extension overhead + metadata data
  const spaceWithMetadata = spaceWithoutMetadata + TYPE_SIZE + LENGTH_SIZE + metadataLen;
  
  console.log(`📊 Space breakdown:`);
  console.log(`   Space without metadata: ${spaceWithoutMetadata} bytes`);
  console.log(`   Metadata extension overhead: ${TYPE_SIZE + LENGTH_SIZE} bytes`);
  console.log(`   Metadata data: ${metadataLen} bytes`);
  console.log(`   Total space with metadata: ${spaceWithMetadata} bytes`);

  // Calculate rent based on the FINAL size (with metadata)
  const mintLamports = await connection.getMinimumBalanceForRentExemption(spaceWithMetadata);

  console.log(`💰 Mint rent (for full size): ${mintLamports} lamports (${mintLamports / LAMPORTS_PER_SOL} SOL)`);
  
  // Estimate total transaction cost
  const estimatedATARent = !associatedTokenAccountExists ? 0.00203928 * LAMPORTS_PER_SOL : 0;
  const estimatedFees = 10000;
  const estimatedTotalCost = PLATFORM_FEE_LAMPORTS + mintLamports + estimatedATARent + estimatedFees;
  
  console.log(`💰 Total estimated cost: ${estimatedTotalCost / LAMPORTS_PER_SOL} SOL (${estimatedTotalCost} lamports)`);
  console.log(`   - Platform fee: ${PLATFORM_FEE_SOL} SOL`);
  console.log(`   - Mint rent: ${(mintLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   - Token account rent: ${(estimatedATARent / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   - Transaction fees: ~${(estimatedFees / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  
  if (payerBalance < estimatedTotalCost) {
    throw new Error(`Insufficient balance. Required: ${(estimatedTotalCost / LAMPORTS_PER_SOL).toFixed(6)} SOL, Available: ${(payerBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  }

  // ========================================
  // Build transaction
  // ========================================

  console.log("📝 Building Token-2022 transaction...");

  // Instruction 1: Create the mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: spaceWithoutMetadata, // Create with smaller space
      lamports: mintLamports, // But pay rent for full size!
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // Instruction 2: Initialize MetadataPointer extension (BEFORE InitializeMint)
  transaction.add(
    createInitializeMetadataPointerInstruction(
      mint,
      updateAuthority,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Instruction 3: Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Instruction 4: Initialize the metadata (extends the account)
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
    })
  );

  console.log("✅ Token-2022 mint and metadata instructions added");

  // Instruction 5: Create associated token account (if needed)
  if (!associatedTokenAccountExists) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAddress,
        recipient,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    console.log("✅ Added associated token account creation instruction");
  }

  // Instruction 6: Mint tokens
  const supplyNumber = Number(supply);
  console.log(`🪙 Minting ${supplyNumber.toLocaleString()} tokens`);
  
  transaction.add(
    createMintToInstruction(
      mint,
      associatedTokenAddress,
      mintAuthority,
      supplyNumber,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  console.log("✅ Token account and minting instructions added");

  // Partially sign with mint keypair
  transaction.partialSign(mintKeypair);

  // Serialize the transaction
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  console.log("✅ Token-2022 transaction created successfully!");
  console.log("Transaction size:", serializedTransaction.length, "bytes");

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
    tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(),
    platformFee: {
      amount: PLATFORM_FEE_SOL,
      amountLamports: PLATFORM_FEE_LAMPORTS,
      recipient: PLATFORM_WALLET.toBase58(),
    },
  };
}

module.exports = {
  createToken2022WithMetadata,
};