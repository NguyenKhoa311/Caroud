import React from 'react';
import './AIResultModal.css';

function AIResultModal({ isOpen, onClose, result }) {
  if (!isOpen) return null;

  const getResultContent = () => {
    if (result === 'win') {
      return {
        icon: '🎉',
        title: 'Congratulations!',
        message: 'You defeated the AI! Excellent strategy!',
        className: 'winner'
      };
    } else if (result === 'loss') {
      return {
        icon: '💪',
        title: 'Keep Practicing!',
        message: "Don't give up! Every game makes you stronger!",
        className: 'loser'
      };
    } else {
      return {
        icon: '🤝',
        title: 'Well Played!',
        message: "It's a draw! You matched the AI's skill!",
        className: 'draw'
      };
    }
  };

  const content = getResultContent();

  return (
    <div className="ai-result-modal-overlay">
      <div className="ai-result-modal">
        <div className={`modal-icon ${content.className}`}>
          {content.icon}
        </div>
        <h2 className={`modal-title ${content.className}`}>
          {content.title}
        </h2>
        <p className="modal-message">
          {content.message}
        </p>
        
        <div className="modal-actions">
          <button 
            onClick={onClose}
            className="btn btn-primary"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIResultModal;
