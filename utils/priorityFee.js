const { ComputeBudgetProgram } = require("@solana/web3.js");

/**
 * Get priority fee based on level (using fixed values)
 * @param {string} priorityLevel - Priority level: 'Medium', 'High', 'VeryHigh', or 'None'
 * @returns {number} Priority fee in micro-lamports
 */
function getPriorityFee(priorityLevel) {
  console.log(`📊 Getting priority fee for level: "${priorityLevel}"`);

  const fees = {
    None: 0, // No priority fee
    Medium: 50000, // 0.00005 SOL per CU (Fast 1x)
    High: 150000, // 0.00015 SOL per CU (Turbo 2x)
    VeryHigh: 300000, // 0.0003 SOL per CU (Ultra 3x)
  };

  const fee = fees[priorityLevel] || 0;
  console.log(`✅ Priority fee for ${priorityLevel}: ${fee} micro-lamports`);
  return fee;
}

/**
 * Add priority fee instruction to transaction
 * @param {Transaction} transaction - Transaction to add priority fee to
 * @param {number} priorityFee - Priority fee in micro-lamports
 */
function addPriorityFeeToTransaction(transaction, priorityFee) {
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee,
  });

  // Add as first instruction
  transaction.instructions.unshift(computeBudgetIx);
}

/**
 * Map UI priority level to internal level
 * @param {string} uiLevel - UI level: 'none', 'fast', 'turbo', or 'ultra'
 * @returns {string} Internal level: 'None', 'Medium', 'High', or 'VeryHigh'
 */
function mapPriorityLevel(uiLevel) {
  console.log(`🔄 Mapping UI level: "${uiLevel}"`);

  const mapping = {
    none: "None",
    fast: "Medium",
    turbo: "High",
    ultra: "VeryHigh",
  };

  const mapped = mapping[uiLevel?.toLowerCase()] || "None";
  console.log(`✅ Mapped to internal level: "${mapped}"`);
  return mapped;
}

module.exports = {
  getPriorityFee,
  addPriorityFeeToTransaction,
  mapPriorityLevel,
};
