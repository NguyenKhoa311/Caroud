import React, { useEffect, useState } from 'react';
import './ELOChangeModal.css';

/**
 * ELO Change Modal Component
 * 
 * Displays ELO rating changes after a match with animation
 * Shows: Previous ELO → New ELO, change amount, and rank change
 * 
 * Props:
 * - isOpen: boolean - whether modal is visible
 * - onClose: function - callback when modal is closed
 * - matchResult: string - 'win', 'loss', or 'draw'
 * - eloData: object {
 *     oldElo: number,
 *     newElo: number,
 *     change: number,
 *     oldRank: number (optional),
 *     newRank: number (optional)
 *   }
 */
const ELOChangeModal = ({ isOpen, onClose, matchResult, eloData }) => {
  const [animatedElo, setAnimatedElo] = useState(eloData?.oldElo || 0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen && eloData) {
      // Reset animation
      setAnimatedElo(eloData.oldElo);
      setShowDetails(false);

      // Animate ELO counter
      const duration = 1500; // 1.5 seconds
      const steps = 60;
      const increment = (eloData.newElo - eloData.oldElo) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setAnimatedElo(eloData.newElo);
          setShowDetails(true);
          clearInterval(timer);
        } else {
          setAnimatedElo(Math.round(eloData.oldElo + (increment * currentStep)));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isOpen, eloData]);

  if (!isOpen || !eloData) return null;

  const isPositive = eloData.change > 0;
  const isNegative = eloData.change < 0;
  const rankChanged = eloData.oldRank && eloData.newRank && eloData.oldRank !== eloData.newRank;
  const rankImproved = rankChanged && eloData.newRank < eloData.oldRank; // Lower rank number = better

  // Determine result styling
  let resultClass = 'result-neutral';
  let resultText = 'Draw';
  let resultEmoji = '🤝';

  if (matchResult === 'win') {
    resultClass = 'result-win';
    resultText = 'Victory!';
    resultEmoji = '🎉';
  } else if (matchResult === 'loss') {
    resultClass = 'result-loss';
    resultText = 'Defeat';
    resultEmoji = '💪';
  }

  return (
    <div className="elo-modal-overlay" onClick={onClose}>
      <div className="elo-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Result Header */}
        <div className={`elo-modal-header ${resultClass}`}>
          <span className="result-emoji">{resultEmoji}</span>
          <h2>{resultText}</h2>
        </div>

        {/* ELO Display */}
        <div className="elo-display">
          <div className="elo-label">Your Rating</div>
          <div className={`elo-number ${isPositive ? 'elo-gain' : isNegative ? 'elo-loss' : ''}`}>
            {animatedElo}
          </div>
          
          {/* ELO Change Badge */}
          {showDetails && (
            <div className={`elo-change-badge ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
              {isPositive && '+'}
              {eloData.change}
              <span className="elo-arrow">{isPositive ? '↑' : isNegative ? '↓' : '→'}</span>
            </div>
          )}
        </div>

        {/* Details */}
        {showDetails && (
          <div className="elo-details">
            <div className="elo-transition">
              <span className="old-elo">{eloData.oldElo}</span>
              <span className="arrow">→</span>
              <span className="new-elo">{eloData.newElo}</span>
            </div>

            {/* Rank Change */}
            {rankChanged && (
              <div className={`rank-change ${rankImproved ? 'rank-up' : 'rank-down'}`}>
                <div className="rank-label">Leaderboard Rank</div>
                <div className="rank-transition">
                  <span className="old-rank">#{eloData.oldRank}</span>
                  <span className="arrow">→</span>
                  <span className="new-rank">#{eloData.newRank}</span>
                  {rankImproved ? (
                    <span className="rank-badge rank-improved">↑ Rank Up!</span>
                  ) : (
                    <span className="rank-badge rank-decreased">↓</span>
                  )}
                </div>
              </div>
            )}

            {!rankChanged && eloData.oldRank && (
              <div className="rank-unchanged">
                <div className="rank-label">Leaderboard Rank</div>
                <div className="rank-value">#{eloData.oldRank}</div>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <button className="elo-modal-close" onClick={onClose}>
          Continue
        </button>

        {/* Motivational Message */}
        {showDetails && (
          <div className="elo-motivation">
            {matchResult === 'win' && isPositive && "Great job! Keep up the momentum! 🚀"}
            {matchResult === 'loss' && "Every loss is a lesson. Come back stronger! 💪"}
            {matchResult === 'draw' && "A draw means you're evenly matched! 🤝"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ELOChangeModal;
