const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

/**
 * IPFS Service for uploading files and metadata to Pinata
 */
class IPFSService {
  constructor() {
    this.pinataJWT = process.env.PINATA_JWT;
    this.pinataGateway =
      process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";

    if (!this.pinataJWT) {
      console.warn("⚠️ Pinata JWT not found in environment variables");
    }
  }

  /**
   * Upload file to IPFS via Pinata
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Name of the file
   * @returns {Promise<Object>} IPFS upload result with hash and URL
   */
  async uploadFile(fileBuffer, fileName) {
    try {
      const formData = new FormData();
      formData.append("file", fileBuffer, fileName);

      const pinataMetadata = JSON.stringify({
        name: fileName,
      });
      formData.append("pinataMetadata", pinataMetadata);

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            Authorization: `Bearer ${this.pinataJWT}`,
          },
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const imageUrl = `${this.pinataGateway}/ipfs/${ipfsHash}`;

      console.log(`✅ File uploaded to IPFS: ${imageUrl}`);
      return {
        hash: ipfsHash,
        url: imageUrl,
      };
    } catch (error) {
      console.error(
        "Error uploading file to IPFS:",
        error.response?.data || error.message
      );
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload token metadata to IPFS following Metaplex Token Metadata Standard
   * @param {Object} metadata - Token metadata
   * @param {string} metadata.name - Token name
   * @param {string} metadata.symbol - Token symbol
   * @param {string} metadata.description - Token description
   * @param {string} metadata.imageUrl - Image URL (IPFS or external)
   * @param {string} metadata.imageType - Image MIME type (e.g., "image/png")
   * @param {Array} metadata.attributes - Optional attributes array
   * @param {Object} metadata.externalUrl - Optional external URL
   * @returns {Promise<Object>} IPFS upload result with hash and URL
   */
  async uploadMetadata(metadata) {
    try {
      // Construct Metaplex-compatible metadata JSON
      const metadataJson = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description || `${metadata.name} Token`,
        image: metadata.imageUrl, // CRITICAL: This must be present for image to show
        external_url: metadata.externalUrl || "",
        attributes: metadata.attributes || [],
        properties: {
          files: [
            {
              uri: metadata.imageUrl,
              type: metadata.imageType || "image/png",
            },
          ],
          category: "image",
          creators: metadata.creators || [],
        },
      };

      console.log(
        "📝 Metadata JSON structure:",
        JSON.stringify(metadataJson, null, 2)
      );

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadataJson,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.pinataJWT}`,
          },
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const metadataUrl = `${this.pinataGateway}/ipfs/${ipfsHash}`;

      console.log(`✅ Metadata uploaded to IPFS: ${metadataUrl}`);

      // Verify the metadata can be fetched
      await this.verifyMetadata(metadataUrl);

      return {
        hash: ipfsHash,
        url: metadataUrl,
        json: metadataJson,
      };
    } catch (error) {
      console.error(
        "Error uploading metadata to IPFS:",
        error.response?.data || error.message
      );
      throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
    }
  }

  /**
   * Verify metadata JSON is accessible and valid
   * @param {string} metadataUrl - Metadata URL to verify
   */
  async verifyMetadata(metadataUrl) {
    try {
      const response = await axios.get(metadataUrl, { timeout: 10000 });
      const metadata = response.data;

      console.log("🔍 Verifying metadata structure...");

      if (!metadata.image) {
        console.warn("⚠️ WARNING: Metadata missing 'image' field!");
      } else {
        console.log("✅ Metadata has image field:", metadata.image);
      }

      if (!metadata.name) {
        console.warn("⚠️ WARNING: Metadata missing 'name' field!");
      }

      if (!metadata.symbol) {
        console.warn("⚠️ WARNING: Metadata missing 'symbol' field!");
      }

      return metadata;
    } catch (error) {
      console.error("⚠️ Could not verify metadata:", error.message);
      // Don't throw - verification is optional
    }
  }

  /**
   * Upload complete token metadata package (image + metadata JSON)
   * @param {Object} params - Upload parameters
   * @param {Buffer} params.imageBuffer - Image file buffer
   * @param {string} params.imageName - Image file name
   * @param {string} params.imageType - Image MIME type
   * @param {string} params.name - Token name
   * @param {string} params.symbol - Token symbol
   * @param {string} params.description - Token description
   * @param {Array} params.attributes - Optional attributes
   * @returns {Promise<Object>} Complete upload result
   */
  async uploadTokenPackage(params) {
    try {
      console.log("📦 Starting token package upload...");

      // Step 1: Upload image
      console.log("1️⃣ Uploading image to IPFS...");
      const imageResult = await this.uploadFile(
        params.imageBuffer,
        params.imageName
      );

      // Step 2: Upload metadata JSON with image reference
      console.log("2️⃣ Uploading metadata to IPFS...");
      const metadataResult = await this.uploadMetadata({
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        imageUrl: imageResult.url,
        imageType: params.imageType,
        attributes: params.attributes,
        externalUrl: params.externalUrl,
        creators: params.creators,
      });

      console.log("✅ Token package uploaded successfully!");

      return {
        image: imageResult,
        metadata: metadataResult,
      };
    } catch (error) {
      console.error("Error uploading token package:", error);
      throw error;
    }
  }

  /**
   * Get file type from buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} MIME type
   */
  getFileType(buffer) {
    // Check magic numbers for common image types
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";

    return "image/png"; // Default fallback
  }
}

module.exports = new IPFSService();
