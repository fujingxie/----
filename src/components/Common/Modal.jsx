import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, showHeader = true, contentClassName = '', bodyClassName = '' }) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    document.body.classList.add('modal-open');

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
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
    </div>,
    document.body,
  );
};

export default Modal;
