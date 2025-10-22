# 🧪 Email/Password Authentication Testing Guide

## ✅ Completed Features

Mình đã thêm xong feature đăng ký và đăng nhập với Email/Password! Đây là những gì đã làm:

### Backend (Django):
1. ✅ **UserRegistrationSerializer** - Validate và tạo user mới
2. ✅ **UserLoginSerializer** - Validate email/password login
3. ✅ **UserRegistrationView** - API endpoint `/api/users/register/`
4. ✅ **UserLoginView** - API endpoint `/api/users/login/`
5. ✅ **Token Authentication** - Sử dụng Django REST Framework Token
6. ✅ **Migrations** - Tạo authtoken table

### Frontend (React):
1. ✅ **RegisterPage.js** - Form đăng ký với validation
2. ✅ **RegisterPage.css** - Styling đẹp cho register page
3. ✅ **LoginPage.js** - Updated với Email/Password form
4. ✅ **LoginPage.css** - Updated styling cho login form
5. ✅ **App.js** - Added `/register` route
6. ✅ **Token Storage** - Lưu token vào localStorage

---

## 🚀 How to Test

### Step 1: Start Backend Server

```bash
# Terminal 1 - Backend
cd /Users/hoangnv/Desktop/caroud/backend
source venv/bin/activate
python manage.py runserver
```

**Expected Output:**
```
System check identified no issues (0 silenced).
October 16, 2025 - XX:XX:XX
Django version 5.2.7, using settings 'caroud.settings'
Starting ASGI/Daphne version 4.2.1 development server at http://127.0.0.1:8000/
```

### Step 2: Start Frontend Server

```bash
# Terminal 2 - Frontend
cd /Users/hoangnv/Desktop/caroud/frontend
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## 🧪 Test Scenarios

### ✅ Test 1: User Registration

1. **Open browser:** http://localhost:3000
2. **Navigate to:** Click "Login" → Click "Create Account" (bottom link)
3. **Or direct:** http://localhost:3000/register

**Fill the registration form:**
```
Username: testuser123
Email: test@example.com
Password: SecurePass123!
Confirm Password: SecurePass123!
```

**Click "Create Account"**

**Expected Result:**
- ✅ Success message: "Registration successful! Redirecting..."
- ✅ Auto redirect to home page after 1 second
- ✅ Token saved in localStorage
- ✅ User logged in automatically

**Verify in Browser Console (F12):**
```javascript
localStorage.getItem('token')  // Should show token string
localStorage.getItem('user')   // Should show user JSON
```

**Verify in Backend:**
```bash
# Django shell
cd /Users/hoangnv/Desktop/caroud/backend
source venv/bin/activate
python manage.py shell

# Run in shell:
from users.models import User
User.objects.all()  # Should see your new user
User.objects.get(email='test@example.com')  # Check specific user
```

---

### ✅ Test 2: Email/Password Login

1. **Open browser:** http://localhost:3000/login
2. **Fill login form:**
```
Email: test@example.com
Password: SecurePass123!
```
3. **Click "Sign In"**

**Expected Result:**
- ✅ Success login
- ✅ Token saved in localStorage
- ✅ Redirect to home page
- ✅ Navbar shows username

---

### ✅ Test 3: Validation Errors

**Test Case 3.1: Empty Fields**
1. Go to register page
2. Leave all fields empty
3. Click "Create Account"

**Expected:**
- ❌ Error: "Username is required"
- ❌ Error: "Email is required"
- ❌ Error: "Password is required"

**Test Case 3.2: Short Username**
1. Username: `ab` (less than 3 chars)
2. Fill other fields correctly
3. Submit

**Expected:**
- ❌ Error: "Username must be at least 3 characters"

**Test Case 3.3: Invalid Email**
1. Email: `notanemail` (no @)
2. Fill other fields correctly
3. Submit

**Expected:**
- ❌ Error: "Email is invalid"

**Test Case 3.4: Short Password**
1. Password: `123` (less than 8 chars)
2. Fill other fields correctly
3. Submit

**Expected:**
- ❌ Error: "Password must be at least 8 characters"

**Test Case 3.5: Password Mismatch**
1. Password: `SecurePass123!`
2. Confirm Password: `DifferentPass456!`
3. Submit

**Expected:**
- ❌ Error: "Passwords do not match"

---

### ✅ Test 4: Duplicate Account

1. Register with same email twice:
   - First time: `test@example.com` → Success ✅
   - Second time: Same email → Should fail ❌

**Expected Result:**
- ❌ Error: "Email already exists."

---

### ✅ Test 5: Wrong Login Credentials

**Test Case 5.1: Wrong Password**
```
Email: test@example.com
Password: WrongPassword123!
```

**Expected:**
- ❌ Error: "Invalid email or password."

**Test Case 5.2: Non-existent Email**
```
Email: notexist@example.com
Password: AnyPassword123!
```

**Expected:**
- ❌ Error: "Invalid email or password."

---

### ✅ Test 6: API Testing với cURL

**Test Registration API:**
```bash
curl -X POST http://127.0.0.1:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "apiuser",
    "email": "api@example.com",
    "password": "ApiPassword123!",
    "password_confirm": "ApiPassword123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": 2,
    "username": "apiuser",
    "email": "api@example.com",
    "elo_rating": 1200,
    "wins": 0,
    "losses": 0,
    "draws": 0,
    "total_games": 0,
    "win_rate": 0.0
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "Registration successful!"
}
```

**Test Login API:**
```bash
curl -X POST http://127.0.0.1:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@example.com",
    "password": "ApiPassword123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": 2,
    "username": "apiuser",
    "email": "api@example.com",
    ...
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "Login successful!"
}
```

---

### ✅ Test 7: Protected Routes với Token

**Test Profile API with Token:**
```bash
# Get token from login response first
TOKEN="YOUR_TOKEN_HERE"

curl http://127.0.0.1:8000/api/users/profile/ \
  -H "Authorization: Token $TOKEN"
```

**Expected Response:**
```json
{
  "id": 2,
  "username": "apiuser",
  "email": "api@example.com",
  "elo_rating": 1200,
  ...
}
```

**Test without Token (should fail):**
```bash
curl http://127.0.0.1:8000/api/users/profile/
```

**Expected Response:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 🎨 UI Features

### Registration Page (`/register`):
- ✅ Clean, modern design
- ✅ Real-time error validation
- ✅ Password strength requirement (min 8 chars)
- ✅ Confirm password matching
- ✅ Loading state during submission
- ✅ Success message with auto-redirect
- ✅ Link to login page

### Login Page (`/login`):
- ✅ Email/Password form at top
- ✅ "OR" divider
- ✅ Social login buttons (Google/Facebook) below
- ✅ "Create Account" link
- ✅ Error messages display
- ✅ Loading state during login
- ✅ Auto-redirect after successful login

---

## 📝 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users/register/` | Register new user | No |
| POST | `/api/users/login/` | Login with email/password | No |
| GET | `/api/users/profile/` | Get current user profile | Yes (Token) |
| GET | `/api/users/<id>/` | Get user by ID | No |
| GET | `/api/users/<id>/stats/` | Get user statistics | No |
| GET | `/api/leaderboard/` | Get leaderboard | No |

---

## 🔐 Authentication Flow

### Registration Flow:
1. User fills registration form
2. Frontend validates input (client-side)
3. POST to `/api/users/register/`
4. Backend validates (server-side):
   - Username unique?
   - Email unique?
   - Password strength?
   - Passwords match?
5. Create user with hashed password
6. Generate auth token
7. Return user + token
8. Frontend stores token in localStorage
9. Redirect to home page

### Login Flow:
1. User enters email + password
2. POST to `/api/users/login/`
3. Backend finds user by email
4. Verify password (Django authenticate)
5. Generate/retrieve auth token
6. Return user + token
7. Frontend stores token in localStorage
8. Redirect to home page

### Protected Route Access:
1. Frontend checks localStorage for token
2. Include token in API request header:
   ```
   Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
   ```
3. Backend validates token
4. Return protected resource

---

## 🐛 Common Issues & Solutions

### ❌ Issue 1: "CORS error when calling API"

**Solution:** Check `backend/caroud/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

### ❌ Issue 2: "Token authentication not working"

**Solution:** Make sure `rest_framework.authtoken` is in INSTALLED_APPS and migrations are applied:
```bash
python manage.py migrate
```

### ❌ Issue 3: "Can't login after registration"

**Solution:** Check if token is saved in localStorage:
```javascript
console.log(localStorage.getItem('token'));
```

### ❌ Issue 4: "Password validation too strict"

**Solution:** Adjust in `backend/caroud/settings.py`:
```python
AUTH_PASSWORD_VALIDATORS = [
    # Comment out some validators if needed
]
```

---

## ✅ Complete Test Checklist

- [ ] Backend server running on http://127.0.0.1:8000
- [ ] Frontend server running on http://localhost:3000
- [ ] Register new user successfully
- [ ] See user in Django admin or shell
- [ ] Login with registered credentials
- [ ] Token saved in localStorage
- [ ] Username shows in Navbar after login
- [ ] Validation errors display correctly
- [ ] Duplicate email/username rejected
- [ ] Wrong credentials rejected
- [ ] Protected routes work with token
- [ ] Protected routes fail without token
- [ ] Social login buttons still visible
- [ ] "Create Account" link works
- [ ] Form clearing after errors
- [ ] Loading states work

---

## 🎉 Next Steps

After successful testing:

1. **Update PrivateRoute.js** to check for token in localStorage
2. **Update Navbar.js** to show username from localStorage
3. **Add Logout functionality**
4. **Integrate with game features** (save scores, track stats)
5. **Deploy to production** (update CORS, SECRET_KEY, etc.)

---

## 📚 Related Files Modified

### Backend:
- `users/serializers.py` - Added UserRegistrationSerializer, UserLoginSerializer
- `users/views.py` - Added UserRegistrationView, UserLoginView
- `users/urls.py` - Added /register/ and /login/ endpoints
- `caroud/settings.py` - Added rest_framework.authtoken, TokenAuthentication

### Frontend:
- `pages/RegisterPage.js` - New registration page
- `pages/RegisterPage.css` - Styling for registration
- `pages/LoginPage.js` - Updated with email/password form
- `pages/LoginPage.css` - Updated styling
- `App.js` - Added /register route

---

**Happy Testing! 🚀**

If you encounter any issues, check:
1. Both servers are running
2. No console errors in browser (F12)
3. API endpoints return correct responses
4. Tokens are being saved/sent correctly
