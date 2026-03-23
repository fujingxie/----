import React, { useState } from 'react';
import Modal from '../Common/Modal';
import './InteractionModal.css';

const InteractionModal = ({ isOpen, onClose, student, onInteract, rules = [], title = null, positiveOnly = false, emptyHint = null }) => {
  const [activeType, setActiveType] = useState('positive'); // positive, negative

  const filteredRules = rules.filter((rule) => rule.type === (positiveOnly ? 'positive' : activeType));
  const resolvedTitle = title || `对 ${student?.name} 的宠物进行互动`;
  const resolvedEmptyHint = emptyHint || '暂无此类规则，请在系统设置中添加';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resolvedTitle}
      contentClassName="interaction-modal-shell"
      bodyClassName="interaction-modal-body"
    >
      <div className="interaction-container">
        {!positiveOnly && (
          <div className="interaction-tabs">
            <button
              className={activeType === 'positive' ? 'active' : ''}
              onClick={() => setActiveType('positive')}
            >
              表现活跃
            </button>
            <button
              className={activeType === 'negative' ? 'active negative' : ''}
              onClick={() => setActiveType('negative')}
            >
              需要改进
            </button>
          </div>
        )}

        <div className="rules-grid">
          {filteredRules.length === 0 ? (
            <p className="empty-hint">{resolvedEmptyHint}</p>
          ) : (
            filteredRules.map((rule) => (
              <div
                key={rule.id} 
                className={`rule-card ${positiveOnly ? 'positive' : activeType}`}
                onClick={() => onInteract(rule)}
              >
                <div className="rule-icon">{rule.icon}</div>
                <div className="rule-info">
                  <span className="rule-name">{rule.name}</span>
                  <div className="rule-changes">
                    <span className="exp-change">{rule.exp > 0 ? `+${rule.exp}` : rule.exp} EXP</span>
                    <span className="coin-change">{rule.coins > 0 ? `+${rule.coins}` : rule.coins} 金币</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default InteractionModal;
