import React from 'react';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, showHeader = true, contentClassName = '', bodyClassName = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content glass-card ${contentClassName}`.trim()} onClick={e => e.stopPropagation()}>
        {showHeader && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="close-btn" onClick={onClose} type="button">
              <X size={20} />
            </button>
          </div>
        )}
        <div className={`modal-body ${bodyClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
