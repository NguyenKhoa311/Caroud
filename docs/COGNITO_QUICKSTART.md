# ✅ AWS Cognito - Quick Setup & Testing Guide

## 🎯 Mục tiêu

Sau khi làm theo guide này, bạn sẽ có:
- ✅ Login với Google
- ✅ Login với Facebook
- ✅ Đăng ký/đăng nhập với Email
- ✅ JWT tokens để call API

## 📝 Prerequisites

- [x] AWS Account
- [x] Google Cloud Account
- [x] Facebook Developer Account

---

## 🚀 Quick Start (5 bước chính)

### Bước 1: Setup AWS Cognito (15 phút)

```bash
1. Truy cập: https://console.aws.amazon.com/cognito/
2. Create User Pool → caro-game-users
3. Enable: Email, Google, Facebook providers
4. Configure Domain: caro-game-YOUR_NAME
5. Lưu lại:
   - User Pool ID: us-east-1_Abc123XyZ
   - App Client ID: 7abcdefgh1234567890ijklmn
   - Domain: caro-game-khoa.auth.us-east-1.amazoncognito.com
```

### Bước 2: Setup Google OAuth (10 phút)

```bash
1. Truy cập: https://console.cloud.google.com/
2. Tạo project: caro-game
3. Enable Google+ API
4. Create OAuth Client ID (Web application)
5. Add redirect URI:
   https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse
6. Lưu lại Client ID và Client Secret
7. Add vào Cognito → Identity providers → Google
```

### Bước 3: Setup Facebook OAuth (10 phút)

```bash
1. Truy cập: https://developers.facebook.com/
2. Create App → Consumer
3. Add product: Facebook Login
4. Configure Valid OAuth Redirect URI:
   https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse
5. Lưu lại App ID và App Secret
6. Add vào Cognito → Identity providers → Facebook
7. Add test users (nếu development mode)
```

### Bước 4: Update Frontend Config (5 phút)

#### 4.1: Copy .env.example to .env

```bash
cd /Users/hoangnv/Desktop/caroud/frontend
cp .env.example .env
```

#### 4.2: Edit .env file

```bash
# Mở file .env và thay đổi:
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_Abc123XyZ  # ← Thay bằng User Pool ID của bạn
REACT_APP_USER_POOL_CLIENT_ID=7abcdefgh1234567890ijklmn  # ← Thay bằng Client ID
REACT_APP_OAUTH_DOMAIN=caro-game-khoa.auth.us-east-1.amazoncognito.com  # ← Thay bằng domain

REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000/

REACT_APP_API_URL=http://127.0.0.1:8000
```

#### 4.3: Install AWS Amplify (nếu chưa có)

```bash
cd /Users/hoangnv/Desktop/caroud/frontend
npm install aws-amplify @aws-amplify/ui-react
```

### Bước 5: Update Backend Config (2 phút)

#### 5.1: Edit backend/.env

```bash
# Mở file backend/.env và thay đổi:
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_Abc123XyZ  # ← Thay bằng User Pool ID
AWS_COGNITO_APP_CLIENT_ID=7abcdefgh1234567890ijklmn  # ← Thay bằng Client ID
AWS_COGNITO_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Abc123XyZ/.well-known/jwks.json
```

**⚠️ Chú ý:** Thay `us-east-1_Abc123XyZ` trong JWKS_URL bằng User Pool ID của bạn!

---

## 🧪 Testing

### Test 1: Start Servers

```bash
# Terminal 1 - Backend
cd /Users/hoangnv/Desktop/caroud/backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 - Frontend
cd /Users/hoangnv/Desktop/caroud/frontend
npm start
```

Đợi frontend compile xong...

### Test 2: Test Google Login

1. Mở browser: http://localhost:3000
2. Click **"Login"** hoặc **"Sign In"**
3. Click **"Continue with Google"**
4. Chọn Google account
5. Click **"Allow"** để cấp quyền
6. Redirect về http://localhost:3000 với logged in ✅

**Nếu thành công:** Bạn sẽ thấy tên user trên Navbar!

### Test 3: Test Facebook Login

1. Mở browser: http://localhost:3000
2. Click **"Login"**
3. Click **"Continue with Facebook"**
4. Login Facebook (nếu chưa login)
5. Click **"Continue as [Your Name]"**
6. Redirect về http://localhost:3000 với logged in ✅

**Lưu ý:** 
- Facebook app ở **Development Mode** → Chỉ test users mới login được
- Add test users ở Facebook App Settings → Roles → Test Users

### Test 4: Check User trong Cognito

1. Truy cập AWS Console → Cognito
2. Vào User Pool
3. Tab **Users**
4. Bạn sẽ thấy user vừa login ✅

### Test 5: Test API với JWT Token

#### 5.1: Get JWT Token

Mở Browser Console (F12) và chạy:

```javascript
import { fetchAuthSession } from 'aws-amplify/auth';

const session = await fetchAuthSession();
console.log('JWT Token:', session.tokens.idToken.toString());
```

Copy JWT token...

#### 5.2: Call Protected API

```bash
# Test với curl
curl http://127.0.0.1:8000/api/users/profile/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Hoặc dùng Postman:
# GET http://127.0.0.1:8000/api/users/profile/
# Headers:
#   Authorization: Bearer YOUR_JWT_TOKEN
```

**Thành công:** Sẽ trả về user profile ✅

---

## 🐛 Troubleshooting Common Issues

### ❌ Error: "redirect_mismatch"

**Nguyên nhân:** Callback URL không khớp

**Giải pháp:**

1. **Check Google Console:**
   - APIs & Services → Credentials
   - OAuth Client ID → Authorized redirect URIs
   - Phải có: `https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse`

2. **Check Facebook App:**
   - Facebook Login → Settings
   - Valid OAuth Redirect URIs
   - Phải có: `https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse`

3. **Check Cognito:**
   - User Pool → App integration → App clients
   - Allowed callback URLs
   - Phải có: `http://localhost:3000/`

### ❌ Error: "User pool does not exist"

**Nguyên nhân:** User Pool ID hoặc Region sai

**Giải pháp:**

1. Check `frontend/.env`:
   ```bash
   REACT_APP_USER_POOL_ID=us-east-1_Abc123XyZ  # Đúng format?
   REACT_APP_AWS_REGION=us-east-1  # Đúng region?
   ```

2. Verify trên AWS Console:
   - Cognito → User pools → General settings
   - Copy chính xác User Pool ID

### ❌ Google Login không hiện popup

**Nguyên nhân:** Google+ API chưa enable hoặc OAuth Consent Screen chưa setup

**Giải pháp:**

1. **Enable Google+ API:**
   - Google Cloud Console
   - APIs & Services → Library
   - Search "Google+ API" → Enable

2. **Setup OAuth Consent Screen:**
   - APIs & Services → OAuth consent screen
   - Fill app info → Save

### ❌ Facebook Login error: "App Not Setup"

**Nguyên nhân:** Facebook app ở Development mode và user không phải test user

**Giải pháp:**

**Option 1:** Add test users
```bash
1. Facebook App → Roles → Test Users
2. Click "Add" → Create test user
3. Login with test account
```

**Option 2:** Make app public (production)
```bash
1. Top menu → Toggle "Development" to "Live"
2. Complete App Review (cần review cho production)
```

### ❌ CORS Error khi call API

**Nguyên nhân:** Backend chưa configure CORS cho Cognito

**Giải pháp:**

Check `backend/caroud/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

### ❌ "Invalid JWT token"

**Nguyên nhân:** JWT signature không hợp lệ hoặc expired

**Giải pháp:**

1. **Check JWKS URL trong backend/.env:**
   ```bash
   AWS_COGNITO_JWKS_URL=https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID/.well-known/jwks.json
   ```
   Phải đúng region và User Pool ID!

2. **Token expired?** 
   - Refresh token
   - Login lại

3. **Test JWT verification:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py shell
   
   from users.authentication import CognitoAuthentication
   auth = CognitoAuthentication()
   # Test với token
   ```

---

## 📊 Verification Checklist

### AWS Cognito Setup
- [ ] User Pool created
- [ ] Domain configured
- [ ] Google provider added
- [ ] Facebook provider added
- [ ] App client created
- [ ] Callback URLs configured

### Google OAuth
- [ ] Project created
- [ ] Google+ API enabled
- [ ] OAuth Client ID created
- [ ] Redirect URI added
- [ ] Credentials saved

### Facebook OAuth
- [ ] App created
- [ ] Facebook Login added
- [ ] Redirect URI configured
- [ ] App ID & Secret saved
- [ ] Test users added (if dev mode)

### Frontend Config
- [ ] .env file created
- [ ] All Cognito values filled
- [ ] AWS Amplify installed
- [ ] App.js configured
- [ ] LoginPage working

### Backend Config
- [ ] .env file updated
- [ ] Cognito values filled
- [ ] JWKS URL correct
- [ ] Authentication working

### Testing
- [ ] Google login works
- [ ] Facebook login works
- [ ] User appears in Cognito
- [ ] JWT token received
- [ ] API calls with JWT work
- [ ] User profile displays

---

## 🎯 Quick Commands Reference

### Check Cognito Config

```javascript
// In browser console
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

// Get current session
const session = await fetchAuthSession();
console.log('Session:', session);

// Get user attributes
const user = await fetchUserAttributes();
console.log('User:', user);

// Get JWT token
const token = session.tokens.idToken.toString();
console.log('Token:', token);
```

### Test API with JWT

```bash
# Get token from browser console first
TOKEN="YOUR_JWT_TOKEN_HERE"

# Test profile endpoint
curl http://127.0.0.1:8000/api/users/profile/ \
  -H "Authorization: Bearer $TOKEN"

# Test protected endpoint
curl http://127.0.0.1:8000/api/game/ \
  -H "Authorization: Bearer $TOKEN"
```

### Sign Out

```javascript
// In browser console or in your app
import { signOut } from 'aws-amplify/auth';

await signOut();
```

---

## 📚 Useful Links

- **AWS Cognito Console:** https://console.aws.amazon.com/cognito/
- **Google Cloud Console:** https://console.cloud.google.com/
- **Facebook Developers:** https://developers.facebook.com/
- **AWS Amplify Docs:** https://docs.amplify.aws/react/
- **Cognito JWT Docs:** https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html

---

## 🎓 Detailed Documentation

Xem file chi tiết: [`docs/COGNITO_SETUP.md`](COGNITO_SETUP.md)

Bao gồm:
- Setup từng bước chi tiết
- Screenshots minh họa
- Advanced configurations
- Production deployment guide

---

## 💡 Tips

1. **Development:** Dùng test users cho Facebook
2. **Security:** Không commit .env files
3. **Testing:** Dùng Incognito mode để test multiple accounts
4. **Debugging:** Check browser console và network tab
5. **Production:** Update redirect URLs khi deploy

---

**Setup xong! Enjoy your Cognito-powered authentication! 🎉**
