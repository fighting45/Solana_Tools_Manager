const express = require("express");
const cors = require("cors");
const mintSPLRoute = require("./routes/mintSPLRoute.js");
require("dotenv").config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/mint", mintSPLRoute);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Better error handling - log but don't exit immediately during development
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
