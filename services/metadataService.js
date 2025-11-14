const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { mplTokenMetadata } = require("@metaplex-foundation/mpl-token-metadata");
const { mplToolbox } = require("@metaplex-foundation/mpl-toolbox");
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
const {
  Connection,
  clusterApiUrl,
  Transaction,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");
require("dotenv").config();

/**
 * Metadata Service for creating token metadata transactions
 * Creates unsigned transactions for frontend signing
 */
class MetadataService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || clusterApiUrl("devnet"),
      "confirmed"
    );
  }

  /**
   * Create metadata transaction for a token (unsigned, for frontend signing)
   * @param {string} mintAddress - Mint address (base58)
   * @param {string} payerAddress - Payer address (base58) - will sign the transaction
   * @param {string} updateAuthorityAddress - Update authority address (base58) - defaults to payer
   * @param {Object} metadata - Metadata object with name, symbol, uri
   * @param {number} sellerFeeBasisPoints - Royalty percentage (0-10000, where 10000 = 100%)
   * @returns {Promise<Object>} Transaction data ready for frontend signing
   */
  async createMetadataTransaction(
    mintAddress,
    payerAddress,
    updateAuthorityAddress,
    metadata,
    sellerFeeBasisPoints = 0
  ) {
    try {
      // Validate required parameters
      if (!mintAddress) {
        throw new Error("mintAddress is required");
      }
      if (!payerAddress) {
        throw new Error("payerAddress is required");
      }
      if (!metadata || !metadata.name || !metadata.symbol || !metadata.uri) {
        throw new Error("metadata must include name, symbol, and uri");
      }

      // Default updateAuthority to payer if not provided
      const finalUpdateAuthority = updateAuthorityAddress || payerAddress;

      console.log("Creating metadata transaction with:");
      console.log("  Mint:", mintAddress);
      console.log("  Payer:", payerAddress);
      console.log("  Update Authority:", finalUpdateAuthority);
      console.log("  Metadata:", JSON.stringify(metadata, null, 2));

      // Create Umi instance
      const umi = createUmi(
        process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
      )
        .use(mplTokenMetadata())
        .use(mplToolbox());

      const mint = publicKey(mintAddress);
      const payer = publicKey(payerAddress);
      const updateAuthority = publicKey(finalUpdateAuthority);

      // Create a noop signer for the payer (won't actually sign, just placeholder)
      const noopSigner = createNoopSigner(payer);
      umi.use(signerIdentity(noopSigner));

      // Derive metadata account address
      const [metadataAccountAddress] = findMetadataPda(umi, {
        mint: mint,
      });

      // Create metadata instruction builder
      const builder = createV1(umi, {
        mint,
        authority: noopSigner,
        payer: noopSigner,
        updateAuthority: updateAuthority,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints, 2),
        tokenStandard: TokenStandard.Fungible,
      });

      // Get the instructions from the builder
      const instructions = builder.getInstructions();

      console.log(
        `Creating metadata transaction with ${instructions.length} instruction(s)`
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");

      // Create a standard Solana web3.js transaction
      const transaction = new Transaction({
        feePayer: new PublicKey(payerAddress),
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      });

      // Convert Umi instructions to web3.js instructions
      for (const umiIx of instructions) {
        try {
          // Try using the adapter first
          const web3Ix = toWeb3JsInstruction(umiIx);
          transaction.add(web3Ix);
        } catch (adapterError) {
          console.log("Adapter failed, using manual conversion");

          // Fallback: Manual conversion
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

      // Serialize the transaction (unsigned)
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      console.log("✅ Metadata transaction created successfully");
      console.log("Transaction size:", serializedTransaction.length, "bytes");
      console.log("Metadata Account:", metadataAccountAddress.toString());

      return {
        transaction: serializedTransaction.toString("base64"),
        metadataAccount: metadataAccountAddress.toString(),
        mintAddress: mintAddress,
        payerAddress: payerAddress,
        updateAuthority: updateAuthority.toString(),
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        readyToCreate: true,
      };
    } catch (error) {
      console.error("Metadata transaction creation error:", error);
      console.error("Error stack:", error.stack);
      throw new Error(
        `Failed to create metadata transaction: ${error.message}`
      );
    }
  }

  /**
   * Verify if metadata exists for a mint
   */
  async verifyMetadata(mintAddress) {
    try {
      const umi = createUmi(
        process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
      ).use(mplTokenMetadata());

      const mint = publicKey(mintAddress);
      const [metadataAddress] = findMetadataPda(umi, { mint });

      const accountInfo = await this.connection.getAccountInfo(
        new PublicKey(metadataAddress.toString())
      );

      if (accountInfo) {
        console.log("✅ Metadata account exists!");
        return {
          exists: true,
          metadataAccount: metadataAddress.toString(),
        };
      } else {
        console.log("❌ Metadata account does not exist");
        return {
          exists: false,
          metadataAccount: metadataAddress.toString(),
        };
      }
    } catch (error) {
      console.error("Error verifying metadata:", error);
      return { exists: false, error: error.message };
    }
  }
}

module.exports = new MetadataService();
