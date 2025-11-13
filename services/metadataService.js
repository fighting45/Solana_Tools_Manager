const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { mplTokenMetadata } = require("@metaplex-foundation/mpl-token-metadata");
const { mplToolbox } = require("@metaplex-foundation/mpl-toolbox");
const {
  createV1,
  findMetadataPda,
  TokenStandard,
} = require("@metaplex-foundation/mpl-token-metadata");
const { publicKey, percentAmount } = require("@metaplex-foundation/umi");
const {
  Transaction,
  Connection,
  PublicKey,
  clusterApiUrl,
} = require("@solana/web3.js");
require("dotenv").config();

/**
 * Metadata Service for creating token metadata transactions
 * Creates unsigned transactions for frontend signing
 */
class MetadataService {
  constructor() {
    this.umi = createUmi(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
    )
      .use(mplTokenMetadata())
      .use(mplToolbox());
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  }

  /**
   * Create metadata transaction for a token (unsigned, for frontend signing)
   * @param {string} mintAddress - Mint address (base58)
   * @param {string} payerAddress - Payer address (base58) - will sign the transaction
   * @param {string} updateAuthorityAddress - Update authority address (base58) - defaults to payer
   * @param {Object} metadata - Metadata object with name, symbol, uri
   * @param {number} sellerFeeBasisPoints - Royalty percentage (0-100, where 100 = 100%)
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
      const mint = publicKey(mintAddress);
      const payer = publicKey(payerAddress);
      const updateAuthority = updateAuthorityAddress
        ? publicKey(updateAuthorityAddress)
        : payer;

      // Derive metadata account address
      const metadataAccountAddress = await findMetadataPda(this.umi, {
        mint: mint,
      });

      // Create metadata transaction builder
      const builder = createV1(this.umi, {
        mint,
        authority: payer, // Mint authority (payer)
        payer: payer,
        updateAuthority: updateAuthority,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints / 100),
        tokenStandard: TokenStandard.Fungible,
      });

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");

      // Build the transaction
      const umiTransaction = await builder.buildWithLatestBlockhash({
        transactions: this.umi.transactions,
        rpc: this.umi.rpc,
        payer: this.umi.payer,
      });

      // Get the message from UMI transaction
      const message = umiTransaction.message;

      // Convert UMI transaction to standard Solana Transaction
      const solanaTransaction = new Transaction({
        feePayer: new PublicKey(payerAddress),
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      });

      // Add instructions from UMI transaction message
      if (message && message.instructions) {
        message.instructions.forEach((instruction) => {
          solanaTransaction.add({
            keys: instruction.keys.map((key) => ({
              pubkey: new PublicKey(key.pubkey),
              isSigner: key.isSigner,
              isWritable: key.isWritable,
            })),
            programId: new PublicKey(instruction.programId),
            data: Buffer.from(instruction.data),
          });
        });
      }

      // Serialize the transaction
      const serializedTransaction = solanaTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return {
        transaction: serializedTransaction.toString("base64"),
        metadataAccount: metadataAccountAddress.toString(),
        mintAddress: mintAddress,
        payerAddress: payerAddress,
        updateAuthority: updateAuthority.toString(),
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      };
    } catch (error) {
      console.error("Metadata transaction creation error:", error);
      throw new Error(
        `Failed to create metadata transaction: ${error.message}`
      );
    }
  }
}

module.exports = new MetadataService();
