import React from 'react';
import './EmptyState.css';

const EmptyState = ({ icon = '✨', title, description, action = null, className = '' }) => (
  <div className={`empty-state-card glass-card ${className}`.trim()}>
    <div className="empty-state-icon" aria-hidden="true">{icon}</div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export default EmptyState;
