import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import fs from "fs";
import {
  createV1,
  findMetadataPda,
  mplTokenMetadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  generateSigner,
  signerIdentity,
  sol,
  publicKey,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";

///
/// instantiate umi
///
const umi = createUmi("https://api.devnet.solana.com")
  .use(mplTokenMetadata())
  .use(mplToolbox());

// You will need to us fs and navigate the filesystem to
// load the wallet you wish to use via relative pathing.
// const walletFile = fs.readFileSync('./usama-wallet.json');
// console.log(walletFile, "wallet file");
const pk = [
  205, 234, 5, 104, 101, 167, 202, 206, 158, 169, 47, 89, 100, 133, 95, 37, 45,
  11, 116, 215, 204, 222, 224, 236, 64, 251, 183, 67, 255, 107, 214, 153, 133,
  221, 52, 164, 161, 153, 188, 49, 131, 228, 175, 82, 241, 242, 55, 78, 232, 62,
  10, 52, 93, 123, 100, 254, 173, 26, 187, 54, 109, 188, 99, 217,
];

// Convert your walletFile onto a keypair.
let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(pk));
console.log(keypair, "Keypair");

// Load the keypair into umi.
umi.use(keypairIdentity(keypair));
const tokenMetadata = {
  name: "Cool Coin",
  symbol: "CC",
  uri: "https://ipfs.io/ipfs/bafkreigvs3rpi2kkanip6ejd74bldotynwtqbmeip7javhqe3irkug2s5u",
};

// Add metadata to an existing SPL token wrapper function
async function addMetadata() {
  const mint = publicKey("6GmZhSqwxunSJBm2HSrDtasBQAeonUtCb9m8X8j7HsDk");

  // derive the metadata account that will store our metadata data onchain
  const metadataAccountAddress = await findMetadataPda(umi, {
    mint: mint,
  });
  const tx = await createV1(umi, {
    mint,
    authority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity,
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: tokenMetadata.uri,
    sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  let txSig = base58.deserialize(tx.signature);
  console.log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
}

addMetadata();

//57nCLKVJbgsAZdk8JRhDtqphZ8BEr6wXM7HPpiVXbM3njvC9fd1xgc9vFMdxL3jYzPQT5KyVk82YZn7TPT8Z5fqa
