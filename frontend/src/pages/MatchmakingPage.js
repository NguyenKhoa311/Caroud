import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import matchmakingService from '../services/matchmakingService';
import { useAuth } from '../utils/auth';
import './MatchmakingPage.css';

function MatchmakingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, searching, matched, error
  const [matchData, setMatchData] = useState(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [queueStats, setQueueStats] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [opponent, setOpponent] = useState(null);
  const pollingIntervalRef = useRef(null);
  const localTimerRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Start matchmaking
  const handleStartMatchmaking = async () => {
    try {
      setStatus('searching');
      setErrorMessage('');
      setWaitingTime(0);
      
      const result = await matchmakingService.joinQueue();
      
      if (result.status === 'matched') {
        // Matched immediately!
        handleMatchFound(result);
      } else if (result.status === 'waiting') {
        // Start polling
        setQueueStats(result.queue_stats);
        startPolling();
        startLocalTimer();
      } else if (result.status === 'already_in_queue') {
        setErrorMessage('You are already in matchmaking queue');
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error starting matchmaking:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to join matchmaking');
      setStatus('error');
    }
  };

  // Cancel matchmaking
  const handleCancelMatchmaking = async () => {
    try {
      await matchmakingService.leaveQueue();
      stopPolling();
      stopLocalTimer();
      setStatus('idle');
      setWaitingTime(0);
      setQueueStats(null);
    } catch (error) {
      console.error('Error canceling matchmaking:', error);
    }
  };

  // Start polling for match status
  const startPolling = () => {
    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await matchmakingService.checkStatus();
        
        if (result.status === 'matched') {
          handleMatchFound(result);
        } else if (result.status === 'waiting') {
          setWaitingTime(result.waiting_time);
          setQueueStats(result.queue_stats);
        } else if (result.status === 'not_in_queue') {
          // Kicked out of queue somehow
          stopPolling();
          stopLocalTimer();
          setStatus('idle');
          setErrorMessage('You were removed from the queue');
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Start local timer for better UX
  const startLocalTimer = () => {
    localTimerRef.current = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
  };

  // Stop local timer
  const stopLocalTimer = () => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
      localTimerRef.current = null;
    }
  };

  // Handle match found
  const handleMatchFound = (result) => {
    stopPolling();
    stopLocalTimer();
    setStatus('matched');
    setMatchData(result.match);
    setOpponent(result.opponent);
    
    // Navigate to game after 2 seconds
    setTimeout(() => {
      navigate(`/game?mode=online&matchId=${result.match.id}`);
    }, 2000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopLocalTimer();
      
      // Leave queue if still searching
      if (status === 'searching') {
        matchmakingService.leaveQueue().catch(console.error);
      }
    };
  }, [status]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="matchmaking-page">
      <div className="matchmaking-container">
        <h1>🎮 Online Matchmaking</h1>
        
        {authLoading && (
          <div className="loading">Loading...</div>
        )}

        {!authLoading && user && (
          <>
            <div className="player-info">
              <h3>{user.username}</h3>
            </div>

            {status === 'idle' && (
              <div className="matchmaking-idle">
                <p className="description">
                  Find opponents with similar skill level based on your ELO rating.
                  The system will match you with the best available opponent.
                </p>
                <button 
                  className="btn-primary btn-large"
                  onClick={handleStartMatchmaking}
                >
                  🔍 Find Match
                </button>
              </div>
            )}

            {status === 'searching' && (
              <div className="matchmaking-searching">
                <div className="searching-animation">
                  <div className="spinner"></div>
                  <h2>Searching for opponent...</h2>
                </div>
                
                <div className="waiting-time">
                  <span className="time-label">Waiting time:</span>
                  <span className="time-value">{formatTime(waitingTime)}</span>
                </div>

                {queueStats && (
                  <div className="queue-stats">
                    <div className="stat-item">
                      <span className="stat-label">Players in queue:</span>
                      <span className="stat-value">{queueStats.total_waiting}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Average ELO:</span>
                      <span className="stat-value">{Math.round(queueStats.average_elo)}</span>
                    </div>
                  </div>
                )}

                <button 
                  className="btn-secondary btn-large"
                  onClick={handleCancelMatchmaking}
                >
                  ❌ Cancel
                </button>

                <div className="search-tips">
                  <p>💡 <strong>Tip:</strong> ELO range expands over time to find you a match faster!</p>
                </div>
              </div>
            )}

            {status === 'matched' && matchData && opponent && (
              <div className="matchmaking-matched">
                <div className="match-found-animation">
                  <h2>🎉 Match Found!</h2>
                </div>
                
                <div className="opponent-info">
                  <h3>Your Opponent:</h3>
                  <div className="opponent-card">
                    <div className="opponent-name">{opponent.username}</div>
                    <div className="opponent-elo">
                      <span className="elo-label">ELO:</span>
                      <span className="elo-value">{opponent.elo_rating}</span>
                    </div>
                  </div>
                </div>

                <div className="match-details">
                  <p>Starting game in a moment...</p>
                  <div className="loading-bar">
                    <div className="loading-bar-fill"></div>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="matchmaking-error">
                <h3>❌ Error</h3>
                <p>{errorMessage}</p>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setStatus('idle');
                    setErrorMessage('');
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MatchmakingPage;
