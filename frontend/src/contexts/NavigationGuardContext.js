import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationGuardContext = createContext();

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider');
  }
  return context;
};

export const NavigationGuardProvider = ({ children }) => {
  const [isBlocking, setIsBlocking] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [onConfirmCallback, setOnConfirmCallback] = useState(null);
  const [onLeaveCallback, setOnLeaveCallback] = useState(null); // Cleanup before navigation

  // Enable navigation blocking with optional cleanup callback
  const enableBlocking = useCallback((leaveCallback) => {
    setIsBlocking(true);
    if (leaveCallback) {
      setOnLeaveCallback(() => leaveCallback);
    }
  }, []);

  // Disable navigation blocking (called from GamePage when game ends)
  const disableBlocking = useCallback(() => {
    setIsBlocking(false);
    setShowConfirmModal(false);
    setPendingNavigation(null);
  }, []);

  // Check if navigation should be blocked
  const shouldBlock = useCallback(() => {
    return isBlocking;
  }, [isBlocking]);

  // Request navigation with blocking check
  const requestNavigation = useCallback((to, onConfirm) => {
    if (isBlocking) {
      setPendingNavigation(to);
      setOnConfirmCallback(() => onConfirm);
      setShowConfirmModal(true);
      return false; // Block navigation
    }
    return true; // Allow navigation
  }, [isBlocking]);

  // Confirm navigation (user clicked "Leave")
  const confirmNavigation = useCallback(() => {
    console.log('🔴 User confirmed leaving game');
    setShowConfirmModal(false);
    setIsBlocking(false);
    
    // Run cleanup with destination (e.g., close WebSocket and wait for ELO)
    if (onLeaveCallback) {
      console.log('🔴 Running leave cleanup callback with destination:', pendingNavigation);
      onLeaveCallback(pendingNavigation);
    } else {
      // No cleanup callback, navigate immediately
      if (onConfirmCallback) {
        console.log('🔴 Executing navigation...');
        onConfirmCallback();
      }
    }
  }, [onConfirmCallback, onLeaveCallback, pendingNavigation]);

  // Cancel navigation (user clicked "Stay")
  const cancelNavigation = useCallback(() => {
    setShowConfirmModal(false);
    setPendingNavigation(null);
    setOnConfirmCallback(null);
  }, []);

  const value = {
    isBlocking,
    pendingNavigation,
    showConfirmModal,
    enableBlocking,
    disableBlocking,
    shouldBlock,
    requestNavigation,
    confirmNavigation,
    cancelNavigation,
  };

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      
      {/* Global Leave Confirmation Modal */}
      {showConfirmModal && (
        <div className="game-over-modal" style={{ zIndex: 10000 }}>
          <div className="modal-content">
            <div className="modal-icon">⚠️</div>
            <h2 className="modal-title" style={{ color: '#ef4444' }}>Leave Game?</h2>
            <p className="modal-message">
              You are in an active online game. <br />
              <strong style={{ color: '#ef4444' }}>Leaving now will count as a loss!</strong>
            </p>
            
            <div className="modal-actions">
              <button 
                onClick={cancelNavigation}
                className="btn btn-secondary btn-large"
                style={{ marginRight: '15px' }}
              >
                ❌ Stay in Game
              </button>
              <button 
                onClick={confirmNavigation}
                className="btn btn-danger btn-large"
              >
                ✅ Leave (Count as Loss)
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationGuardContext.Provider>
  );
};
