import React from 'react';
import { STATUS_TYPES } from '../config/constants';
import './StatusMessage.css';

const StatusMessage = ({ status }) => {
  if (!status || !status.message || !status.type) {
    return null;
  }

  const getIcon = () => {
    switch (status.type) {
      case STATUS_TYPES.SUCCESS:
        return '✅';
      case STATUS_TYPES.ERROR:
        return '❌';
      case STATUS_TYPES.INFO:
        return 'ℹ️';
      case STATUS_TYPES.WARNING:
        return '⚠️';
      default:
        return '';
    }
  };

  // Format message with line breaks for better readability
  const formatMessage = (message) => {
    if (!message) return '';
    // Split by newlines and create formatted structure
    const lines = message.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      // Check if line contains key-value pairs (e.g., "Signature: xxx")
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        return (
          <div key={index} className="status-line">
            <span className="status-key">{key.trim()}:</span>
            <span className="status-value">{value}</span>
          </div>
        );
      }
      return <div key={index} className="status-line">{line}</div>;
    });
  };

  return (
    <div className={`status-message ${status.type}`}>
      <span className="status-icon">{getIcon()}</span>
      <div className="status-content">
        {formatMessage(status.message)}
      </div>
    </div>
  );
};

export default StatusMessage;

