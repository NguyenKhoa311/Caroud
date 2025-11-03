import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import './FriendRequests.css';

const FriendRequests = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load pending friend requests on mount
  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      // TODO: Add endpoint to get pending requests
      // const response = await userService.getPendingRequests();
      // setRequests(response);
      setError(null);
    } catch (err) {
      setError('Failed to load requests');
      console.error('Error loading requests:', err);
    }
  };

  // Search for users (debounced)
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        try {
          setLoading(true);
          const response = await userService.searchUsers(searchQuery);
          setSearchResults(response.results);
          setError(null);
        } catch (err) {
          setError('Failed to search users');
          console.error('Error searching users:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSendRequest = async (username) => {
    try {
      await userService.sendFriendRequest(username);
      setSearchQuery('');  // Clear search
      setSearchResults([]); // Clear results
      setError(null);
      // Optional: Show success message
    } catch (err) {
      setError('Failed to send friend request');
      console.error('Error sending request:', err);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await userService.acceptFriendRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
      setError(null);
    } catch (err) {
      setError('Failed to accept request');
      console.error('Error accepting request:', err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await userService.rejectFriendRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
      setError(null);
    } catch (err) {
      setError('Failed to reject request');
      console.error('Error rejecting request:', err);
    }
  };

  const handleCreateInviteLink = async () => {
    try {
      const response = await userService.createInviteLink();
      // Assuming your API returns base URL + token
      const fullLink = `${window.location.origin}/invite/accept/${response.token}`;
      setInviteLink(fullLink);
      setError(null);
    } catch (err) {
      setError('Failed to create invite link');
      console.error('Error creating invite:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        // Optional: Show success message
        console.log('Link copied!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  return (
    <div className="friend-requests-container">
      <div className="search-section">
        <h3>Add Friends</h3>
        <input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        
        {loading && <div className="loading">Searching...</div>}
        
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map(user => (
              <li key={user.id} className="search-result-item">
                <span>{user.username}</span>
                <button 
                  onClick={() => handleSendRequest(user.username)}
                  className="btn-add-friend"
                >
                  Add Friend
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="invite-section">
          <button 
            onClick={handleCreateInviteLink}
            className="btn-create-invite"
          >
            Create Invite Link
          </button>
          
          {inviteLink && (
            <div className="invite-link-container">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="invite-link-input"
              />
              <button 
                onClick={handleCopyLink}
                className="btn-copy-link"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="pending-requests">
        <h3>Pending Requests</h3>
        {requests.length === 0 ? (
          <p className="no-requests">No pending friend requests</p>
        ) : (
          <ul className="request-list">
            {requests.map(request => (
              <li key={request.id} className="request-item">
                <span>From: {request.from_user.username}</span>
                <div className="request-actions">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="btn-accept"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    className="btn-reject"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FriendRequests;