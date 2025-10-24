import React from 'react';
import FriendList from '../components/FriendList';
import FriendRequests from '../components/FriendRequests';
import './FriendsPage.css';

const FriendsPage = () => {
  return (
    <div className="friends-page">
      <div className="friends-header">
        <h1>Friends</h1>
      </div>

      <div className="friends-content">
        <div className="friends-section">
          <FriendRequests />
        </div>
        
        <div className="friends-section">
          <FriendList />
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;