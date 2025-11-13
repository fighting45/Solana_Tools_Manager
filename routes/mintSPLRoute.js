const express = require("express");
const multer = require('multer');
const router = express.Router();
const { createMintTransaction } = require('../controllers/mintController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.post('/createMint', upload.single('image'), createMintTransaction);

module.exports = router;
