import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth, clearAuthData } from '../utils/auth';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import ConfirmModal from './ConfirmModal';
import ThemeToggle from './ThemeToggle';
import LoadingOverlay from './LoadingOverlay';
import './Navbar.css';

function Navbar() {
  const { user, loading } = useAuth();
  const oidcAuth = useOidcAuth();
  const navigate = useNavigate();
  const { requestNavigation } = useNavigationGuard();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle navigation with guard check
  const handleNavigation = (e, path) => {
    e.preventDefault();
    
    // Check if navigation is blocked
    const allowed = requestNavigation(path, () => {
      navigate(path);
    });
    
    // If not blocked, navigate immediately
    if (allowed) {
      navigate(path);
    }
  };

  const handleSignOutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmSignOut = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    
    try {
      if (user?.authType === 'token') {
        // Token-based logout (email/password)
        clearAuthData();
        navigate('/');
      } else if (user?.authType === 'cognito') {
        // Cognito logout (OIDC)
        
        // Clear OIDC user from storage using removeUser()
        await oidcAuth.removeUser();
        
        // Clear our custom auth data
        clearAuthData();
        
        // Build Cognito logout URL manually
        const logoutUrl = new URL('https://ap-southeast-1mffqbwhoj.auth.ap-southeast-1.amazoncognito.com/logout');
        logoutUrl.searchParams.set('client_id', '7r5jtsi7pmgvpuu3hroso4qm7m');
        logoutUrl.searchParams.set('logout_uri', window.location.origin);
        
        // Redirect to Cognito logout page
        window.location.href = logoutUrl.toString();
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Force logout even if OIDC signout fails
      clearAuthData();
      setIsLoggingOut(false);
      navigate('/');
    }
  };

  const handleCancelSignOut = () => {
    setShowLogoutModal(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" onClick={(e) => handleNavigation(e, '/')} className="navbar-logo">
          🎮 Caro Game
        </Link>
        
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/" onClick={(e) => handleNavigation(e, '/')} className="navbar-link">Home</Link>
          </li>
          <li className="navbar-item">
            <Link to="/leaderboard" onClick={(e) => handleNavigation(e, '/leaderboard')} className="navbar-link">Leaderboard</Link>
          </li>
          
          {!loading && (
            <>
              {user ? (
                <>
                  <li className="navbar-item">
                    <Link to="/friends" onClick={(e) => handleNavigation(e, '/friends')} className="navbar-link">👥 Friends</Link>
                  </li>
                  <li className="navbar-item">
                    <Link to="/rooms" onClick={(e) => handleNavigation(e, '/rooms')} className="navbar-link">🏠 Rooms</Link>
                  </li>
                  <li className="navbar-item">
                    <Link to="/profile" onClick={(e) => handleNavigation(e, '/profile')} className="navbar-link">Profile</Link>
                  </li>
                  <li className="navbar-item navbar-user">
                    <span className="navbar-username">👤 {user.username}</span>
                  </li>
                  <li className="navbar-item">
                    <button onClick={handleSignOutClick} className="navbar-btn navbar-btn-logout">
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li className="navbar-item">
                  <Link to="/login" onClick={(e) => handleNavigation(e, '/login')} className="navbar-btn navbar-btn-primary">
                    Login
                  </Link>
                </li>
              )}
            </>
          )}
          <li className="navbar-item">
            <ThemeToggle />
          </li>
        </ul>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?"
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancelSignOut}
      />

      {/* Loading Overlay during logout */}
      {isLoggingOut && <LoadingOverlay message="Đang đăng xuất..." />}
    </nav>
  );
}

export default Navbar;
