const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createToken2022Transaction,
} = require("../controllers/token2022Controller");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Creates a Token-2022 transaction with on-chain metadata
router.post(
  "/createToken2022",
  upload.single("image"),
  createToken2022Transaction
);

module.exports = router;
