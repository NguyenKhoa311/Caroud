# 🔒 Next Steps: Update Authentication Components

## What to Update Next

Sau khi test email/password authentication xong, bạn cần update 2 components này để hoàn thiện authentication flow:

---

## 1. Update `PrivateRoute.js`

Hiện tại PrivateRoute chỉ check Cognito auth. Cần update để check cả token-based auth.

### Current Code:
```javascript
// components/PrivateRoute.js
import { Navigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';

const PrivateRoute = ({ children }) => {
  const { user } = useAuthenticator();
  return user ? children : <Navigate to="/login" />;
};
```

### Updated Code:
```javascript
// components/PrivateRoute.js
import { Navigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useState, useEffect } from 'react';

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    // Check for token-based auth (email/password)
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      return;
    }
    
    // Check for Cognito auth (Google/Facebook)
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        setIsAuthenticated(true);
        return;
      }
    } catch (error) {
      console.log('Not authenticated:', error);
    }
    
    setIsAuthenticated(false);
  };
  
  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
```

---

## 2. Update `Navbar.js`

Cần update Navbar để:
- Hiển thị username từ localStorage (email/password login)
- Hiển thị username từ Cognito (social login)
- Thêm logout functionality

### Expected Updates:

```javascript
// components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAuthSession, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Check token-based auth (email/password)
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
      return;
    }

    // Check Cognito auth (Google/Facebook)
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        const attributes = await fetchUserAttributes();
        setUser({
          username: attributes.preferred_username || attributes.email,
          email: attributes.email
        });
        setIsAuthenticated(true);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleLogout = async () => {
    // Clear token-based auth
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Sign out from Cognito (if logged in via social)
    try {
      await signOut();
    } catch (error) {
      console.log('Cognito logout error:', error);
    }

    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🎮 Caro Game
        </Link>
        
        <ul className="navbar-menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/leaderboard">Leaderboard</Link></li>
          
          {isAuthenticated ? (
            <>
              <li><Link to="/profile">Profile</Link></li>
              <li className="navbar-user">
                👤 {user?.username}
              </li>
              <li>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register" className="register-btn">Sign Up</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
```

### Update CSS:
```css
/* components/Navbar.css */
.navbar-user {
  color: #667eea;
  font-weight: 600;
  padding: 0 15px;
}

.logout-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

.register-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white !important;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}
```

---

## 3. Create Auth Service (Optional but Recommended)

Tạo một centralized auth service để manage authentication logic:

### Create `services/authService.js`:
```javascript
// services/authService.js
import axios from 'axios';
import { fetchAuthSession, signOut, fetchUserAttributes } from 'aws-amplify/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

class AuthService {
  // Check if user is authenticated
  async isAuthenticated() {
    // Check token auth
    const token = localStorage.getItem('token');
    if (token) {
      return true;
    }

    // Check Cognito auth
    try {
      const session = await fetchAuthSession();
      return !!session.tokens;
    } catch {
      return false;
    }
  }

  // Get current user
  async getCurrentUser() {
    // Check token auth
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }

    // Check Cognito auth
    try {
      const attributes = await fetchUserAttributes();
      return {
        username: attributes.preferred_username || attributes.email,
        email: attributes.email
      };
    } catch {
      return null;
    }
  }

  // Get auth token for API calls
  async getAuthToken() {
    // Token auth
    const token = localStorage.getItem('token');
    if (token) {
      return token;
    }

    // Cognito auth
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch {
      return null;
    }
  }

  // Login with email/password
  async login(email, password) {
    const response = await axios.post(`${API_URL}/api/users/login/`, {
      email,
      password
    });
    
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  }

  // Register new user
  async register(username, email, password, password_confirm) {
    const response = await axios.post(`${API_URL}/api/users/register/`, {
      username,
      email,
      password,
      password_confirm
    });
    
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  }

  // Logout
  async logout() {
    // Clear token auth
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Sign out from Cognito
    try {
      await signOut();
    } catch (error) {
      console.log('Cognito logout error:', error);
    }
  }
}

export default new AuthService();
```

### Usage Example:
```javascript
// In any component
import authService from '../services/authService';

// Check auth
const isAuth = await authService.isAuthenticated();

// Get current user
const user = await authService.getCurrentUser();

// Login
await authService.login('email@example.com', 'password');

// Logout
await authService.logout();
```

---

## 4. Update API Service to Include Auth Token

Update `services/api.js` để automatically include auth token:

```javascript
// services/api.js
import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    const token = await authService.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 5. Testing Checklist

After making these updates:

### Test PrivateRoute:
- [ ] Login with email/password → Navigate to `/profile` → Should work ✅
- [ ] Logout → Try to access `/profile` → Should redirect to `/login` ✅
- [ ] Login with Google → Navigate to `/profile` → Should work ✅

### Test Navbar:
- [ ] Not logged in → Shows "Login" and "Sign Up" buttons ✅
- [ ] Login with email/password → Shows username and "Logout" ✅
- [ ] Login with Google → Shows username and "Logout" ✅
- [ ] Click logout → Redirects to login page ✅
- [ ] Username displays correctly ✅

### Test Auth Persistence:
- [ ] Login → Refresh page → Still logged in ✅
- [ ] Login → Close browser → Open again → Still logged in ✅
- [ ] Logout → Refresh page → Still logged out ✅

---

## 6. Implementation Order

Recommend làm theo thứ tự:

1. **First:** Update `PrivateRoute.js` (5 minutes)
   - Test protected routes work

2. **Second:** Create `authService.js` (10 minutes)
   - Centralize auth logic
   - Easier to maintain

3. **Third:** Update `Navbar.js` (10 minutes)
   - Show username
   - Add logout button
   - Test logout functionality

4. **Fourth:** Update `api.js` (5 minutes)
   - Auto-include token in requests
   - Handle 401 errors

5. **Finally:** Test everything (15 minutes)
   - Use testing checklist above

---

## 7. Quick Implementation Script

Nếu muốn làm nhanh, copy những files này:

```bash
# 1. Update PrivateRoute
# Copy code từ section 1

# 2. Create authService
# Copy code từ section 3

# 3. Update Navbar
# Copy code từ section 2

# 4. Update api.js
# Copy code từ section 4

# 5. Test
# Follow testing checklist
```

---

**Sau khi làm xong những updates này, authentication system sẽ hoàn chỉnh! 🎉**

You'll have:
- ✅ Email/Password registration & login
- ✅ Google/Facebook social login
- ✅ Token-based authentication
- ✅ Protected routes
- ✅ User display in navbar
- ✅ Logout functionality
- ✅ Auth persistence across page refreshes

**Ready to implement? Let me know if you need help with any specific part!**
