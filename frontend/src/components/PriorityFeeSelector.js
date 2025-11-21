import React, { useState } from "react";
import "./PriorityFeeSelector.css";

const PriorityFeeSelector = ({ isOpen, onClose, selectedLevel, onSelectLevel }) => {
  const priorityLevels = [
    {
      id: "none",
      label: "None",
      description: "No priority fee (standard transaction)",
      icon: "🔵",
    },
    {
      id: "fast",
      label: "Fast 1x",
      description: "Standard priority for normal network conditions",
      icon: "⚡",
    },
    {
      id: "turbo",
      label: "Turbo 2x",
      description: "Higher priority for faster confirmation",
      icon: "🚀",
    },
    {
      id: "ultra",
      label: "Ultra 3x",
      description: "Highest priority for immediate confirmation",
      icon: "⚡⚡",
    },
  ];

  const handleSelect = (levelId) => {
    onSelectLevel(levelId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="priority-fee-overlay" onClick={onClose}>
      <div className="priority-fee-modal" onClick={(e) => e.stopPropagation()}>
        <div className="priority-fee-header">
          <h2 className="priority-fee-title">Use Priority Fees</h2>
          <button className="priority-fee-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="priority-fee-description">
          Modify the fees you pay within Smithii Tool in order to avoid
          transactions error due to Solana congestion.
        </p>

        <div className="priority-level-section">
          <div className="priority-level-header">
            <span className="priority-level-label">Priority Level</span>
            <span className="priority-level-icon">🚀</span>
          </div>

          <div className="priority-levels-grid">
            {priorityLevels.map((level) => (
              <button
                key={level.id}
                className={`priority-level-btn ${
                  selectedLevel === level.id ? "active" : ""
                }`}
                onClick={() => handleSelect(level.id)}
              >
                <span className="level-icon">{level.icon}</span>
                <span className="level-label">{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="priority-fee-note">
          Consider that priority fees generally facilitates sending transactions to the
          network, but its effectiveness is contingent upon the current status of the
          network.
        </p>
      </div>
    </div>
  );
};

export default PriorityFeeSelector;
