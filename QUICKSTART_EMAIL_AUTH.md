# ⚡ Quick Start: Test Email/Password Authentication

## 🚀 Start in 3 Steps (5 minutes)

### Step 1: Start Backend (2 minutes)
```bash
# Terminal 1
cd /Users/hoangnv/Desktop/caroud/backend
source venv/bin/activate
python manage.py runserver
```

**Wait for:**
```
✅ Starting ASGI/Daphne development server at http://127.0.0.1:8000/
```

---

### Step 2: Start Frontend (2 minutes)
```bash
# Terminal 2 (new terminal)
cd /Users/hoangnv/Desktop/caroud/frontend
npm start
```

**Wait for:**
```
✅ Compiled successfully!
✅ Local: http://localhost:3000
```

---

### Step 3: Test Registration (1 minute)

1. **Browser:** http://localhost:3000
2. **Click:** "Login" button
3. **Click:** "Create Account" link (bottom)
4. **Fill form:**
   ```
   Username:         testuser
   Email:            test@email.com
   Password:         Password123!
   Confirm Password: Password123!
   ```
5. **Click:** "Create Account"

**Expected Result:**
- ✅ Success message appears
- ✅ Auto redirect to home page
- ✅ You're logged in!

---

## 🧪 Quick Tests

### ✅ Test 1: Registration Works
```
Go to: http://localhost:3000/register
Create account → Should redirect to home ✅
```

### ✅ Test 2: Login Works
```
Logout (if logged in)
Go to: http://localhost:3000/login
Enter email + password → Should redirect to home ✅
```

### ✅ Test 3: Validation Works
```
Go to: http://localhost:3000/register
Leave password empty → Should show error ✅
Enter short password (< 8 chars) → Should show error ✅
```

### ✅ Test 4: Token Saved
```
After login, open Browser Console (F12):
localStorage.getItem('token') → Should show token string ✅
localStorage.getItem('user') → Should show user JSON ✅
```

---

## 🐛 Troubleshooting

### ❌ Backend won't start?
```bash
# Make sure you're in backend directory
cd /Users/hoangnv/Desktop/caroud/backend

# Activate venv
source venv/bin/activate

# Check if Django installed
python -c "import django; print(django.VERSION)"

# Run server
python manage.py runserver
```

### ❌ Frontend won't start?
```bash
# Make sure you're in frontend directory
cd /Users/hoangnv/Desktop/caroud/frontend

# Check if node_modules exists
ls node_modules

# If not, install
npm install

# Run server
npm start
```

### ❌ Can't register user?
Check browser console (F12) for errors:
- CORS error? → Check backend CORS settings
- 500 error? → Check backend terminal for errors
- Network error? → Make sure backend is running

---

## 📝 Test Checklist

Quick testing checklist:

- [ ] Backend running on http://127.0.0.1:8000
- [ ] Frontend running on http://localhost:3000
- [ ] Can access /register page
- [ ] Can create new account
- [ ] See success message
- [ ] Auto redirect to home
- [ ] Token saved in localStorage
- [ ] Can logout
- [ ] Can login again with same credentials
- [ ] Wrong password rejected
- [ ] Duplicate email rejected

**All checked? Perfect! ✅**

---

## 📚 Full Documentation

For detailed information:

1. **Complete Testing Guide:**
   → `docs/EMAIL_AUTH_TESTING.md`
   - All test scenarios
   - API testing with curl
   - Expected responses
   - Common issues

2. **Next Steps Guide:**
   → `docs/AUTH_UPDATES_NEEDED.md`
   - Update PrivateRoute
   - Update Navbar
   - Add logout functionality
   - Create authService

3. **Implementation Summary:**
   → `docs/EMAIL_AUTH_COMPLETE.md`
   - What was added
   - Files modified
   - Code statistics
   - Architecture overview

---

## 🎯 Quick Commands

### Check Backend:
```bash
curl http://127.0.0.1:8000/api/users/
# Should return user list
```

### Test Registration API:
```bash
curl -X POST http://127.0.0.1:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"api","email":"api@test.com","password":"Test123!","password_confirm":"Test123!"}'
# Should return user + token
```

### Test Login API:
```bash
curl -X POST http://127.0.0.1:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"api@test.com","password":"Test123!"}'
# Should return user + token
```

### Check Database:
```bash
cd /Users/hoangnv/Desktop/caroud/backend
source venv/bin/activate
python manage.py shell
```
```python
from users.models import User
User.objects.all()  # See all users
```

---

## 🎉 Success!

If you can:
1. ✅ Start both servers
2. ✅ Register a new account
3. ✅ Login with credentials
4. ✅ See token in localStorage

**Then everything is working! 🎊**

---

## 🔜 What's Next?

After successful testing:

1. **Update components** (30 min)
   - Update PrivateRoute.js
   - Update Navbar.js with logout
   - See: `docs/AUTH_UPDATES_NEEDED.md`

2. **Connect with game** (later)
   - Save game results
   - Track user stats
   - Update leaderboard

3. **Deploy** (when ready)
   - Update production settings
   - Configure AWS Cognito
   - Deploy to cloud

---

**Happy testing! 🚀**

Need help? Check the detailed guides in `docs/` folder!
