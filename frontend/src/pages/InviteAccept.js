import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { useAuth } from '../utils/auth';
import './InviteAccept.css';

const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // If user is logged in, auto-accept the invite
    if (!authLoading && user && token) {
      handleAcceptInvite();
    }
  }, [user, authLoading, token]);

  const handleAcceptInvite = async () => {
    if (accepting) return;
    
    try {
      setAccepting(true);
      await userService.acceptInvite(token);
      // Navigate to friends list after successful accept
      navigate('/friends');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invite');
      console.error('Error accepting invite:', err);
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading) {
    return <div className="invite-accept-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="invite-accept-container">
        <h2>Friend Invite</h2>
        <p>Please log in to accept this friend invite.</p>
        <button
          onClick={() => navigate('/login')}
          className="btn-login"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="invite-accept-container">
      <h2>Friend Invite</h2>
      
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <p>Click the button below to accept the friend request:</p>
          <button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="btn-accept-invite"
          >
            {accepting ? 'Accepting...' : 'Accept Invite'}
          </button>
        </>
      )}
    </div>
  );
};

export default InviteAccept;