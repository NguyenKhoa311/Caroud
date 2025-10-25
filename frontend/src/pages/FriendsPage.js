/**
 * Friends Page Component
 * 
 * Displays and manages user's social connections:
 * - Friends list with stats
 * - Pending friend requests (received and sent)
 * - Search users to add friends
 * - Generate and share invite links
 * 
 * Features:
 * - Accept/reject friend requests
 * - Cancel sent requests
 * - Search users by username
 * - Create shareable invite links
 * - Real-time friend status (can be extended with WebSocket)
 */

import React, { useState, useEffect } from 'react';
import friendService from '../services/friendService';
import './FriendsPage.css';

function FriendsPage() {
  // State management
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [inviteLinks, setInviteLinks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, search, invites

  /**
   * Load all friend-related data on component mount
   */
  useEffect(() => {
    loadFriendsData();
  }, []);

  /**
   * Fetch friends, requests, and invite links
   */
  const loadFriendsData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [friendsData, requestsData, sentData, linksData] = await Promise.all([
        friendService.getFriends(),
        friendService.getReceivedRequests(),
        friendService.getSentRequests(),
        friendService.getInviteLinks()
      ]);
      
      // Debug logging
      console.log('Friends data loaded:', {
        friends: friendsData,
        receivedRequests: requestsData,
        sentRequests: sentData,
        inviteLinks: linksData
      });
      
      setFriends(friendsData || []);
      setReceivedRequests(requestsData || []);
      setSentRequests(sentData || []);
      setInviteLinks(linksData || []);
    } catch (err) {
      setError('Failed to load friends data. Please try again.');
      console.error('Error loading friends:', err);
      // Set empty arrays on error to prevent runtime errors
      setFriends([]);
      setReceivedRequests([]);
      setSentRequests([]);
      setInviteLinks([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search for users by username
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (searchQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }
    
    try {
      const results = await friendService.searchUsers(searchQuery);
      setSearchResults(results);
      setError('');
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Error searching users:', err);
    }
  };

  /**
   * Send friend request to a user
   */
  const handleSendRequest = async (userId, username) => {
    try {
      const response = await friendService.sendFriendRequest(userId, `Hi ${username}! Let's be friends!`);
      setSuccessMessage(`Friend request sent to ${username}!`);
      
      // Update the user in search results to show "Request Pending" status
      setSearchResults(searchResults.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            friend_request_status: 'sent',
            friend_request_id: response.id  // Get request ID from response
          };
        }
        return user;
      }));
      
      loadFriendsData(); // Refresh to show in sent requests
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send friend request');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Accept a friend request
   */
  const handleAcceptRequest = async (requestId) => {
    try {
      await friendService.acceptFriendRequest(requestId);
      setSuccessMessage('Friend request accepted!');
      loadFriendsData(); // Refresh all data
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to accept request');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Reject a friend request
   */
  const handleRejectRequest = async (requestId) => {
    try {
      await friendService.rejectFriendRequest(requestId);
      setSuccessMessage('Friend request rejected');
      loadFriendsData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to reject request');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Cancel a sent friend request
   */
  const handleCancelRequest = async (requestId) => {
    try {
      await friendService.cancelFriendRequest(requestId);
      setSuccessMessage('Friend request cancelled');
      
      // Update search results to remove the pending status
      setSearchResults(searchResults.map(user => {
        if (user.friend_request_id === requestId) {
          return {
            ...user,
            friend_request_status: 'none',
            friend_request_id: undefined
          };
        }
        return user;
      }));
      
      loadFriendsData(); // Refresh sent requests list
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error cancelling friend request:', err);
      setError(err.response?.data?.error || 'Failed to cancel request');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Create a new invite link
   */
  const handleCreateInviteLink = async () => {
    try {
      const newLink = await friendService.createInviteLink({
        max_uses: 10,
        expires_at: null // Never expires
      });
      setInviteLinks([newLink, ...inviteLinks]);
      setSuccessMessage('Invite link created!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to create invite link');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Copy invite link to clipboard
   */
  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setSuccessMessage('Link copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  /**
   * Deactivate an invite link
   */
  const handleDeactivateLink = async (code) => {
    try {
      await friendService.deactivateInviteLink(code);
      setInviteLinks(inviteLinks.filter(link => link.code !== code));
      setSuccessMessage('Invite link deactivated');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to deactivate link');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return <div className="friends-page loading">Loading friends...</div>;
  }

  return (
    <div className="friends-page">
      <h1>Friends & Social</h1>

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'friends' ? 'active' : ''}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({Array.isArray(friends) ? friends.length : 0})
        </button>
        <button
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({Array.isArray(receivedRequests) ? receivedRequests.length : 0})
        </button>
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          Search Users
        </button>
        <button
          className={activeTab === 'invites' ? 'active' : ''}
          onClick={() => setActiveTab('invites')}
        >
          Invite Links ({Array.isArray(inviteLinks) ? inviteLinks.length : 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Friends List Tab */}
        {activeTab === 'friends' && (
          <div className="friends-list">
            <h2>My Friends</h2>
            {!Array.isArray(friends) || friends.length === 0 ? (
              <p className="empty-state">No friends yet. Search for users or share an invite link!</p>
            ) : (
              <div className="friends-grid">
                {friends.map(friendship => (
                  <div key={friendship.id} className="friend-card">
                    <div className="friend-header">
                      <h3>{friendship.friend?.username || 'Unknown User'}</h3>
                      <span className="friend-source">{friendship.social_source || 'direct'}</span>
                    </div>
                    <div className="friend-stats">
                      <p>ELO: {friendship.friend?.elo_rating || 1200}</p>
                      <p>Wins: {friendship.friend?.wins || 0}</p>
                      <p>Games: {friendship.friend?.total_games || 0}</p>
                    </div>
                    <p className="friend-date">
                      Friends since {new Date(friendship.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <div className="requests-section">
            <div className="received-requests">
              <h2>Received Requests</h2>
              {!Array.isArray(receivedRequests) || receivedRequests.length === 0 ? (
                <p className="empty-state">No pending requests</p>
              ) : (
                <div className="requests-list">
                  {receivedRequests.map(request => (
                    <div key={request.id} className="request-card">
                      <div className="request-info">
                        <h3>{request.from_user?.username || 'Unknown User'}</h3>
                        {request.message && <p className="request-message">"{request.message}"</p>}
                        <p className="request-date">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn-accept"
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sent-requests">
              <h2>Sent Requests</h2>
              {!Array.isArray(sentRequests) || sentRequests.length === 0 ? (
                <p className="empty-state">No sent requests</p>
              ) : (
                <div className="requests-list">
                  {sentRequests.map(request => (
                    <div key={request.id} className="request-card">
                      <div className="request-info">
                        <h3>To: {request.to_user?.username || 'Unknown User'}</h3>
                        <p className="request-status">{request.status || 'pending'}</p>
                        <p className="request-date">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      {request.status === 'pending' && (
                        <div className="request-actions">
                          <button
                            className="btn-cancel"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Users Tab */}
        {activeTab === 'search' && (
          <div className="search-section">
            <h2>Search Users</h2>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Enter username (min 2 characters)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="btn-search">Search</button>
            </form>

            {Array.isArray(searchResults) && searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                <div className="users-grid">
                  {searchResults.map(user => (
                    <div key={user.id} className="user-card">
                      <h3>{user.username || 'Unknown User'}</h3>
                      <div className="user-stats">
                        <p>ELO: {user.elo_rating || 1200}</p>
                        <p>Wins: {user.wins || 0}</p>
                        <p>Games: {user.total_games || 0}</p>
                      </div>
                      {user.friend_request_status === 'sent' ? (
                        <div className="request-status-section">
                          <span className="status-badge pending">Request Pending</span>
                          <button
                            className="btn-cancel-request"
                            onClick={() => handleCancelRequest(user.friend_request_id)}
                          >
                            Cancel Request
                          </button>
                        </div>
                      ) : user.friend_request_status === 'received' ? (
                        <span className="status-badge received">Request Received (Check Requests tab)</span>
                      ) : (
                        <button
                          className="btn-add-friend"
                          onClick={() => handleSendRequest(user.id, user.username)}
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Links Tab */}
        {activeTab === 'invites' && (
          <div className="invites-section">
            <h2>Invite Links</h2>
            <button className="btn-create-link" onClick={handleCreateInviteLink}>
              Create New Invite Link
            </button>

            {!Array.isArray(inviteLinks) || inviteLinks.length === 0 ? (
              <p className="empty-state">No active invite links</p>
            ) : (
              <div className="links-list">
                {inviteLinks.map(link => (
                  <div key={link.id} className="link-card">
                    <div className="link-info">
                      <p className="link-url">{link.invite_url || 'N/A'}</p>
                      <p className="link-stats">
                        Uses: {link.uses_count || 0} / {link.max_uses || '∞'}
                        {link.expires_at && ` • Expires: ${new Date(link.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="link-actions">
                      <button
                        className="btn-copy"
                        onClick={() => handleCopyLink(link.invite_url)}
                      >
                        Copy Link
                      </button>
                      <button
                        className="btn-deactivate"
                        onClick={() => handleDeactivateLink(link.code)}
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsPage;
