const express = require("express");
const router = express.Router();
const multer = require("multer");
const mintController = require("../controllers/mintController");
const token2022Controller = require("../controllers/token2022Controller");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// SPL Token routes
router.post(
  "/create-transaction",
  upload.single("image"),
  mintController.createCombinedMintTransaction
);

// Custom address preview route
router.get(
  "/preview-address",
  mintController.previewCustomAddress
);

// Token-2022 routes
router.post(
  "/create-token2022-transaction",
  upload.single("image"),
  token2022Controller.createToken2022Transaction
);

// Get available Token-2022 extensions
router.get(
  "/token2022-extensions",
  token2022Controller.getAvailableExtensions
);

module.exports = router;
