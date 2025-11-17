// const express = require("express");
// const multer = require("multer");
// const router = express.Router();
// const {
//   createCombinedMintTransaction,
// } = require("../controllers/mintController");

// // Configure multer for memory storage
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   },
// });

// //creates a single combined transaction for metadata and mint
// router.post(
//   "/createCombinedMint",
//   upload.single("image"),
//   createCombinedMintTransaction
// );

// module.exports = router;
