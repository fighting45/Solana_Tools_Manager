/**
 * IPFS Service for uploading files
 * Using a simple HTTP-based approach for IPFS uploads
 */
const https = require("https");
const FormData = require("form-data");

class IpfsService {
  constructor() {
    // Using Pinata v3 Uploads API for IPFS uploads
    this.pinataJwt = process.env.PINATA_JWT;
    this.pinataGateway =
      process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";
  }

  /**
   * Upload to IPFS using Pinata v3 Uploads API
   */
  async uploadToIPFS(fileBuffer, fileName) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: fileName,
        contentType: "application/octet-stream",
      });
      form.append("network", "public");

      const options = {
        hostname: "uploads.pinata.cloud",
        port: 443,
        path: "/v3/files",
        method: "POST",
        headers: form.getHeaders(),
      };

      options.headers.authorization = `Bearer ${this.pinataJwt}`;

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            const cid = result.data?.cid;
            if (cid) {
              resolve(`${this.pinataGateway}/ipfs/${cid}`);
            } else {
              reject(new Error("No CID returned from Pinata"));
            }
          } catch (error) {
            reject(
              new Error(`Failed to parse Pinata response: ${error.message}`)
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Pinata upload failed: ${error.message}`));
      });

      form.pipe(req);
    });
  }

  /**
   * Upload file to IPFS
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} fileName - Name of the file
   * @returns {Promise<string>} IPFS hash/URI
   */
  async uploadFile(fileBuffer, fileName) {
    try {
      return await this.uploadToIPFS(fileBuffer, fileName);
    } catch (error) {
      console.error("IPFS upload error:", error);
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload JSON metadata to IPFS
   * @param {Object} metadata - Metadata object
   * @returns {Promise<string>} IPFS URI
   */
  async uploadMetadata(metadata) {
    try {
      const metadataJson = JSON.stringify(metadata);
      const buffer = Buffer.from(metadataJson, "utf-8");
      return await this.uploadToIPFS(buffer, "metadata.json");
    } catch (error) {
      console.error("IPFS metadata upload error:", error);
      throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
    }
  }
}

module.exports = new IpfsService();
