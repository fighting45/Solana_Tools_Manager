import React, { createContext, useContext, useState, useEffect } from 'react';

const PriorityFeeContext = createContext();

export const usePriorityFee = () => {
  const context = useContext(PriorityFeeContext);
  if (!context) {
    throw new Error('usePriorityFee must be used within PriorityFeeProvider');
  }
  return context;
};

export const PriorityFeeProvider = ({ children }) => {
  // Initialize from localStorage, default to 'none'
  const [priorityLevel, setPriorityLevel] = useState(() => {
    const saved = localStorage.getItem('priorityLevel');
    console.log('🎯 [Context] Initializing priority level from localStorage:', saved);
    return saved || 'none';
  });

  // Sync to localStorage whenever it changes
  useEffect(() => {
    console.log('🎯 [Context] Priority level changed to:', priorityLevel);
    localStorage.setItem('priorityLevel', priorityLevel);
  }, [priorityLevel]);

  const updatePriorityLevel = (level) => {
    console.log('🎯 [Context] Updating priority level to:', level);
    setPriorityLevel(level);
  };

  const value = {
    priorityLevel,
    updatePriorityLevel,
  };

  return (
    <PriorityFeeContext.Provider value={value}>
      {children}
    </PriorityFeeContext.Provider>
  );
};
