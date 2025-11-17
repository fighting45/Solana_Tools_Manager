// API Configuration
export const API_BASE_URL = "http://localhost:3001";

// API Endpoints - Updated to match backend routes
export const API_ENDPOINTS = {
  // Original endpoints - keeping for backward compatibility
  CREATE_MINT: "/mint/createCombinedMint",
  CREATE_TOKEN2022: "/token2022/createToken2022",
  
  // Updated endpoints for new backend structure
  CREATE_TOKEN2022_NEW: "/token2022/create-token2022-transaction",
  TOKEN2022_EXTENSIONS: "/token2022/token2022-extensions",
  
  HEALTH: "/health",
};

// Token Types
export const TOKEN_TYPES = {
  SPL: "SPL",
  TOKEN2022: "TOKEN2022",
};

// Transaction Status Types
export const STATUS_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
};

// Default Form Values
export const DEFAULT_FORM_VALUES = {
  recipientAddress: "",
  amount: "",
  decimals: "9",
  mintAuthorityAddress: "",
  name: "",
  symbol: "",
  description: "",
  image: null,
  extensions: [], // Add extensions array
};

// Validation Messages
export const VALIDATION_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet first",
  REQUIRED_FIELDS: "Please fill in all required fields",
  INVALID_ADDRESS: "Please enter a valid Solana address",
  INVALID_AMOUNT: "Amount must be greater than 0",
  INVALID_DECIMALS: "Decimals must be between 0 and 18",
};

// Status Messages
export const STATUS_MESSAGES = {
  TRANSACTION_CREATED: "Transaction created! Signing...",
  APPROVE_TRANSACTION: "Please approve the transaction in your wallet...",
  SENDING_TRANSACTION: "Sending transaction to network...",
  CONFIRMING_TRANSACTION: "Confirming transaction...",
  TRANSACTION_SUCCESS: (signature) =>
    `Success! Transaction confirmed. Signature: ${signature}`,
};
