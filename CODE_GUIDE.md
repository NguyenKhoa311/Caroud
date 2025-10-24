# Hướng Dẫn Code - Caro Game Project

## 📖 Tổng Quan

Tài liệu này giải thích cấu trúc code và các module chính trong dự án Caro Game.
Tất cả các file quan trọng đã được comment chi tiết bằng tiếng Anh để dễ maintain.

## 🗂️ Cấu Trúc Backend (Django)

### 1. Users App (`backend/users/`)

#### `models.py` - User Model
- Model chính cho người dùng
- Extends AbstractUser của Django
- Fields quan trọng:
  - `elo_rating`: Điểm ELO (default: 1200)
  - `wins`, `losses`, `draws`: Thống kê trận đấu
  - `current_streak`, `best_streak`: Chuỗi thắng
- Computed properties:
  - `total_games`: Tổng số trận
  - `win_rate`: Tỷ lệ thắng (%)

#### `serializers.py` - API Serializers ⭐ (Chi tiết)
**File này đã được comment đầy đủ với:**

1. **UserRegistrationSerializer**
   - Validate username (unique, 3-150 chars)
   - Validate email (unique, valid format)
   - Validate password (min 8 chars, not common)
   - Confirm password match
   - Hash password securely với `create_user()`

2. **UserLoginSerializer**
   - Validate email & password format
   - Không authenticate (làm ở view)

3. **UserSerializer**
   - Full user data với computed fields
   - Dùng cho profile, API response

4. **UserStatsSerializer** 
   - Chỉ stats, không có email
   - Có field `rank` (phải add từ view)

5. **LeaderboardSerializer**
   - Minimal fields cho bảng xếp hạng
   - Public data only

#### `views.py` - API Endpoints ⭐ (Chi tiết)
**File này đã được comment đầy đủ với:**

1. **UserViewSet**
   - CRUD operations cho User
   - Custom actions:
     - `profile/`: Get current user
     - `{id}/stats/`: Get user stats + rank
     - `{id}/matches/`: Get match history
   - Permission logic: Public read, auth required for write

2. **UserRegistrationView**
   - POST `/api/users/register/`
   - Tạo user mới + generate token
   - Return user data + token
   - Validation errors nếu fail

3. **UserLoginView**
   - POST `/api/users/login/`
   - Login bằng email/password
   - Generate/get token
   - Generic error message (security)

4. **LeaderboardViewSet**
   - GET `/api/leaderboard/`
   - Top players sorted by ELO
   - Add rank dynamically
   - Query params: `limit`, `filter`

### 2. Game App (`backend/game/`)

#### `models.py` - Match Model
- Lưu thông tin trận đấu
- Fields:
  - `black_player`, `white_player`: ForeignKey to User
  - `winner`: Người thắng (null = draw)
  - `board_state`: JSON của bàn cờ
  - `status`: 'waiting', 'active', 'completed'

#### `consumers.py` - WebSocket Handlers
- Real-time game communication
- Handle player moves
- Broadcast game state

### 3. Matchmaking App (`backend/matchmaking/`)

#### `matchmaker.py`
- ELO-based matching algorithm
- Find opponents với rating gần nhau

### 4. AI App (`backend/ai/`)

#### `engine.py`
- AI game logic
- Minimax algorithm
- Heuristic evaluation

## 🎨 Cấu Trúc Frontend (React)

### 1. Utils (`frontend/src/utils/`)

#### `auth.js` - Authentication Utilities ⭐ (Chi tiết)
**File này đã được comment đầy đủ với:**

**Hooks:**
- `useAuth()`: React hook cho auth state
  - Returns: `{user, loading, refreshAuth}`
  - Auto-updates khi login/logout
  - Listens to events: 'auth-change', 'storage'

**Helper Functions:**
- `setAuthData(token, userData)`: Lưu auth info
- `clearAuthData()`: Xóa auth info  
- `triggerAuthChange()`: Trigger event
- `isAuthenticated()`: Check nhanh có token không
- `getCurrentUserData()`: Get user từ sessionStorage
- `getAuthToken()`: Get token cho API calls

**Event System:**
- `auth-change`: Custom event (same tab)
- `storage`: Browser event (cross-tab sync)

**Storage:**
- Dùng `sessionStorage` (không phải localStorage)
- Auto-clear khi đóng browser → Security
- Migrate từ localStorage nếu tồn tại

### 2. Components (`frontend/src/components/`)

#### `PrivateRoute.js` - Route Protection ⭐ (Chi tiết)
**File này đã được comment đầy đủ:**

- Wrap protected pages
- Check auth với `useAuth()`
- Redirect to `/login` nếu chưa login
- Show loading state
- Example usage trong App.js

#### `ConfirmModal.js` - Confirmation Dialog ⭐ (Chi tiết)
**File này đã được comment đầy đủ:**

- Reusable modal component
- Props: `isOpen`, `title`, `message`, `onConfirm`, `onCancel`
- Click outside to close
- Animations: fadeIn + slideUp
- Responsive design

#### `Navbar.js` - Navigation
- Show auth status
- Conditional rendering based on `user`
- Logout confirmation với ConfirmModal

#### `Board.js` - Game Board
- Render 15x15 grid
- Handle click events
- Display X/O pieces

### 3. Pages (`frontend/src/pages/`)

#### `LoginPage.js`
- Email/password login form
- Validation
- Auto-redirect if already logged in
- Call `setAuthData()` on success

#### `RegisterPage.js`
- Registration form
- Password confirmation
- Validation errors display
- Auto-redirect if already logged in

#### `DashboardPage.js`
- User stats overview
- Quick play buttons
- Recent matches

#### `ProfilePage.js`
- User profile display
- Fetch stats từ API
- Match history
- Empty states handling

#### `LeaderboardPage.js`
- Top players table
- ELO rankings
- Filter options

#### `GamePage.js`
- Game board UI
- Player turns
- Game status

### 4. Services (`frontend/src/services/`)

#### `api.js`
- Axios instance với base URL
- Auto-add Authorization header

#### `userService.js`
- `login(credentials)`
- `register(userData)`
- `getProfile()`
- `getStats(userId)`

#### `gameService.js`
- `createGame()`
- `makeMove(gameId, move)`
- `getGameState(gameId)`

## 🔄 Luồng Hoạt Động

### Đăng Ký (Registration Flow)
```
1. User điền form trong RegisterPage
2. Frontend call: POST /api/users/register/
3. Backend (UserRegistrationView):
   - Validate dữ liệu qua UserRegistrationSerializer
   - Check username/email unique
   - Check password strength
   - Create user với hashed password
   - Generate token
   - Return {user, token, message}
4. Frontend:
   - Lưu token + user vào sessionStorage
   - Call setAuthData(token, user)
   - Trigger 'auth-change' event
   - useAuth() hook update → components re-render
   - Auto-redirect to /dashboard
```

### Đăng Nhập (Login Flow)
```
1. User điền form trong LoginPage
2. Frontend call: POST /api/users/login/
3. Backend (UserLoginView):
   - Validate email format
   - Find user by email
   - Authenticate với Django's authenticate()
   - Generate/get token
   - Return {user, token, message}
4. Frontend:
   - Lưu token + user vào sessionStorage
   - Call setAuthData(token, user)
   - Components auto-update qua useAuth()
   - Auto-redirect to /dashboard
```

### Đăng Xuất (Logout Flow)
```
1. User click "Sign Out" button
2. ConfirmModal hiện lên
3. User click "Xác nhận"
4. Frontend:
   - Call clearAuthData()
   - Remove token + user từ sessionStorage
   - Trigger 'auth-change' event
   - useAuth() hook update → user = null
   - Navbar shows "Login" button
   - Navigate to "/"
```

### Protected Route Access
```
1. User truy cập /dashboard
2. PrivateRoute component check:
   - Call useAuth()
   - If loading → Show "Loading..."
   - If user exists → Render <DashboardPage />
   - If no user → <Navigate to="/login" />
```

### API Call với Authentication
```javascript
// Get token
const token = getAuthToken();

// Call API
const response = await axios.get('/api/users/profile/', {
  headers: {
    Authorization: `Token ${token}`
  }
});
```

## 🛡️ Security Best Practices

### Session-based Storage
```javascript
// ❌ Không dùng localStorage (persistent)
localStorage.setItem('token', token);

// ✅ Dùng sessionStorage (auto-clear)
sessionStorage.setItem('token', token);
```

### Password Handling
```python
# ❌ Không lưu password plaintext
user.password = request.data['password']

# ✅ Dùng create_user() để hash
User.objects.create_user(
    username=username,
    password=password  # Auto-hashed
)
```

### Error Messages
```python
# ❌ Specific error (user enumeration)
if not user_exists:
    return "User not found"
if wrong_password:
    return "Wrong password"

# ✅ Generic error
return "Invalid email or password"
```

### Token Protection
```javascript
// ✅ Always write_only for password
password = serializers.CharField(write_only=True)

// ✅ Never return token in user object
fields = ['id', 'username', 'email']  # No 'token'
```

## 📝 Code Convention

### Python (Backend)
```python
# Docstrings format
def function_name(param1, param2):
    """
    Short description.
    
    Longer explanation if needed.
    
    Args:
        param1 (type): Description
        param2 (type): Description
        
    Returns:
        type: Description
        
    Raises:
        ExceptionType: When this happens
        
    Example:
        >>> function_name('a', 'b')
        'result'
    """
    pass
```

### JavaScript (Frontend)
```javascript
/**
 * Function description.
 * 
 * @param {type} paramName - Description
 * @returns {type} Description
 * 
 * @example
 * functionName('value');
 */
function functionName(paramName) {
  // Code
}
```

## 🔧 Development Tips

### Debug Authentication
```javascript
// Check current auth state
console.log('Token:', getAuthToken());
console.log('User:', getCurrentUserData());
console.log('Is authenticated:', isAuthenticated());
```

### Test API Endpoints
```bash
# Register
curl -X POST http://localhost:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test1234!","password_confirm":"Test1234!"}'

# Login
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'

# Get profile (with token)
curl http://localhost:8000/api/users/profile/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

### Clear Session
```javascript
// In browser console (F12)
sessionStorage.clear();
localStorage.clear();
location.reload();
```

## 📚 Files với Comments Chi Tiết

### Backend
✅ `backend/users/serializers.py` - Full docstrings  
✅ `backend/users/views.py` - Full docstrings  

### Frontend  
✅ `frontend/src/utils/auth.js` - JSDoc comments  
✅ `frontend/src/components/PrivateRoute.js` - JSDoc comments  
✅ `frontend/src/components/ConfirmModal.js` - JSDoc comments  

### Các file khác
- Comments ngắn gọn trong code
- Self-explanatory function names
- README.md cho overview

## 🚀 Tiếp Theo

### Files cần comment thêm (optional):
- [ ] `backend/game/consumers.py` - WebSocket handlers
- [ ] `backend/matchmaking/matchmaker.py` - Matching algorithm  
- [ ] `backend/ai/engine.py` - AI logic
- [ ] `frontend/src/services/api.js` - API service
- [ ] `frontend/src/pages/*` - Page components

### Features cần develop:
- [ ] Real-time game với WebSocket
- [ ] AI opponent implementation
- [ ] Online matchmaking
- [ ] Friend system
- [ ] Chat system

---

**Lưu ý:** Khi develop thêm tính năng mới, hãy maintain cùng coding style và comment format như các file hiện tại để code dễ đọc và maintain!
