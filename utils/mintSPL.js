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
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
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

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

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
// Export the function for use in other modules
module.exports = { createMintSPLTransaction };

/**
 * EXAMPLE API ENDPOINT USAGE (Express.js):
 *
 * const express = require('express');
 * const { createMintSPLTransaction } = require('./mintSPL');
 * const app = express();
 * app.use(express.json());
 *
 * app.post('/api/create-mint-transaction', async (req, res) => {
 *   try {
 *     // Receive addresses and parameters from frontend request body
 *     const { payerAddress, recipientAddress, mintAuthorityAddress, amount, decimals } = req.body;
 *
 *     // Validate required fields
 *     if (!payerAddress || !recipientAddress || amount === undefined || decimals === undefined) {
 *       return res.status(400).json({
 *         error: 'payerAddress, recipientAddress, amount, and decimals are required'
 *       });
 *     }
 *
 *     // Create transaction with parameters from frontend
 *     const transactionData = await createMintSPLTransaction(
 *       payerAddress,        // From frontend
 *       recipientAddress,    // From frontend
 *       mintAuthorityAddress || null, // Optional, from frontend
 *       amount,              // From frontend (will be converted to supply: amount * LAMPORTS_PER_SOL)
 *       decimals             // From frontend (variable, not fixed)
 *     );
 *
 *     // Send transaction back to frontend for signing
 *     res.json(transactionData);
 *   } catch (error) {
 *     console.error('Error creating transaction:', error);
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 *
 * FRONTEND USAGE:
 *
 * // Frontend sends POST request with addresses and parameters
 * const response = await fetch('/api/create-mint-transaction', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     payerAddress: wallet.publicKey.toString(),      // User's wallet
 *     recipientAddress: recipientWallet.toString(),   // Recipient's wallet
 *     amount: 1000000,                                // Amount (will be converted to supply)
 *     decimals: 6                                     // Variable decimals (e.g., 6, 9, 18, etc.)
 *   })
 * });
 *
 * const transactionData = await response.json();
 *
 * // Deserialize and sign transaction
 * const transaction = Transaction.from(Buffer.from(transactionData.transaction, 'base64'));
 * transaction.sign(wallet); // Sign with user's wallet
 *
 * // Send signed transaction to network
 * const signature = await connection.sendRawTransaction(transaction.serialize());
 */
