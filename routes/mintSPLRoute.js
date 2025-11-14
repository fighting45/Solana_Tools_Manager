const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createMintTransaction,
  createCombinedMintTransaction,
} = require("../controllers/mintController");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Original endpoint - creates separate mint and metadata transactions
router.post("/createMint", upload.single("image"), createMintTransaction);

// NEW endpoint - creates a single combined transaction (RECOMMENDED)
router.post(
  "/createCombinedMint",
  upload.single("image"),
  createCombinedMintTransaction
);

module.exports = router;
