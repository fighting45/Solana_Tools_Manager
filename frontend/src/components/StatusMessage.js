import React from 'react';
import { STATUS_TYPES } from '../config/constants';
import './StatusMessage.css';

const StatusMessage = ({ status }) => {
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

  return (
    <div className={`status-message ${status.type}`}>
      <span className="status-icon">{getIcon()}</span>
      <p>{status.message}</p>
    </div>
  );
};

export default StatusMessage;

