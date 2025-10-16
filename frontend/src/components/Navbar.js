import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import './Navbar.css';

function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🎮 Caro Game
        </Link>
        
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/" className="navbar-link">Home</Link>
          </li>
          <li className="navbar-item">
            <Link to="/leaderboard" className="navbar-link">Leaderboard</Link>
          </li>
          
          {!loading && (
            <>
              {user ? (
                <>
                  <li className="navbar-item">
                    <Link to="/profile" className="navbar-link">Profile</Link>
                  </li>
                  <li className="navbar-item">
                    <button onClick={handleSignOut} className="navbar-btn">
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li className="navbar-item">
                  <Link to="/login" className="navbar-btn navbar-btn-primary">
                    Login
                  </Link>
                </li>
              )}
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
