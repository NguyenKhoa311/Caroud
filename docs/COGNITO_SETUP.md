# 🔐 Hướng dẫn Config AWS Cognito - Chi tiết từng bước

## Tổng quan

AWS Cognito sẽ giúp bạn:
- ✅ Đăng nhập với Google
- ✅ Đăng nhập với Facebook  
- ✅ Đăng ký/đăng nhập với Email/Password
- ✅ Quản lý users tập trung
- ✅ JWT tokens cho authentication

## 📋 Yêu cầu trước khi bắt đầu

- [ ] Tài khoản AWS (có thể dùng Free Tier)
- [ ] Tài khoản Google Cloud Platform
- [ ] Tài khoản Facebook Developers

---

# PHẦN 1: Tạo AWS Cognito User Pool

## Bước 1.1: Đăng nhập AWS Console

1. Truy cập: https://console.aws.amazon.com/
2. Đăng nhập với tài khoản AWS
3. Tìm service **"Cognito"** (search bar trên đầu)
4. Click vào **Amazon Cognito**

## Bước 1.2: Tạo User Pool

1. Click button **"Create user pool"**

### Step 1: Configure sign-in experience

**Authentication providers:**
- ☑️ Chọn **"Federated identity providers"**
  - ☑️ Google
  - ☑️ Facebook
- ☑️ Chọn **"Email"** (cho local authentication)

**Cognito user pool sign-in options:**
- ☑️ Email

Click **Next**

### Step 2: Configure security requirements

**Password policy:**
- Chọn **"Cognito defaults"** (8 characters minimum)
- Hoặc tùy chỉnh theo ý bạn

**Multi-factor authentication (MFA):**
- Chọn **"No MFA"** (cho development)
- Production nên enable MFA

**User account recovery:**
- ☑️ Enable self-service account recovery
- Recovery method: Email only

Click **Next**

### Step 3: Configure sign-up experience

**Self-registration:**
- ☑️ Enable **"Enable self-registration"**

**Attribute verification and user account confirmation:**
- ☑️ Send email message, verify email address

**Required attributes:**
- ☑️ email
- ☑️ name (optional, nhưng recommend)

Click **Next**

### Step 4: Configure message delivery

**Email:**
- Chọn **"Send email with Cognito"** (cho development)
- Production: Dùng **Amazon SES** để gửi nhiều email

**FROM email address:**
- Để mặc định: `no-reply@verificationemail.com`

Click **Next**

### Step 5: Integrate your app

**User pool name:**
- Nhập: `caro-game-users` (hoặc tên bạn muốn)

**Hosted authentication pages:**
- ☑️ **Use the Cognito Hosted UI**

**Domain:**
- Chọn **"Use a Cognito domain"**
- Nhập prefix: `caro-game-YOUR_NAME` (phải unique)
- VD: `caro-game-khoa` → `https://caro-game-khoa.auth.us-east-1.amazoncognito.com`

**Initial app client:**

**App client name:**
- Nhập: `caro-game-web-client`

**Client secret:**
- Chọn **"Don't generate a client secret"** (vì dùng với React)

**Allowed callback URLs:**
```
http://localhost:3000
http://localhost:3000/
https://yourdomain.com
```

**Allowed sign-out URLs:**
```
http://localhost:3000
http://localhost:3000/
https://yourdomain.com
```

**Identity providers:**
- Chọn tất cả providers bạn muốn enable

**OAuth 2.0 grant types:**
- ☑️ Implicit grant
- ☑️ Authorization code grant

**OpenID Connect scopes:**
- ☑️ Email
- ☑️ OpenID
- ☑️ Profile

Click **Next**

### Step 6: Review and create

- Review tất cả settings
- Click **"Create user pool"**

⏳ Đợi 1-2 phút để AWS tạo User Pool...

## Bước 1.3: Lưu thông tin quan trọng

Sau khi tạo xong, vào User Pool vừa tạo và lưu lại:

1. **User pool ID** (tab General settings)
   - VD: `us-east-1_Abc123XyZ`

2. **App client ID** (tab App clients)
   - Click vào app client
   - Copy **"Client ID"**
   - VD: `7abcdefgh1234567890ijklmn`

3. **Cognito Domain** (tab Domain name)
   - VD: `caro-game-khoa.auth.us-east-1.amazoncognito.com`

4. **Region**
   - VD: `us-east-1`

**Lưu tất cả thông tin này vào notepad!** ✍️

---

# PHẦN 2: Setup Google OAuth

## Bước 2.1: Tạo Google Cloud Project

1. Truy cập: https://console.cloud.google.com/
2. Đăng nhập với Google account
3. Click **"Select a project"** → **"New Project"**
4. Nhập project name: `caro-game`
5. Click **"Create"**
6. Chọn project vừa tạo

## Bước 2.2: Enable Google+ API

1. Menu bên trái → **APIs & Services** → **Library**
2. Search: `Google+ API`
3. Click vào **Google+ API**
4. Click **"Enable"**

## Bước 2.3: Tạo OAuth 2.0 Credentials

1. Menu bên trái → **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**

### Configure Consent Screen (nếu chưa setup)

**OAuth consent screen:**
- User Type: **External**
- Click **Create**

**App information:**
- App name: `Caro Game`
- User support email: Your email
- Developer contact email: Your email
- Click **Save and Continue**

**Scopes:**
- Click **Save and Continue** (dùng default scopes)

**Test users:** (Optional)
- Add test email nếu muốn
- Click **Save and Continue**

**Summary:**
- Review và click **Back to Dashboard**

### Create OAuth Client ID

1. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Caro Game Web Client`

**Authorized JavaScript origins:**
```
http://localhost:3000
https://yourdomain.com
```

**Authorized redirect URIs:**
```
https://caro-game-khoa.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**⚠️ QUAN TRỌNG:** Thay `caro-game-khoa.auth.us-east-1` bằng Cognito domain của bạn!

4. Click **Create**

## Bước 2.4: Lưu Google Credentials

Sau khi tạo xong, copy:
- **Client ID**: `123456789-abc...xyz.apps.googleusercontent.com`
- **Client secret**: `GOCSPX-abc...xyz`

**Lưu lại!** ✍️

## Bước 2.5: Add Google Provider vào Cognito

1. Quay lại AWS Cognito Console
2. Vào User Pool của bạn
3. Tab **Sign-in experience** → **Federated identity provider sign-in**
4. Click **"Add identity provider"**

**Provider type:** Google

**Client ID:** (paste Client ID từ Google)

**Client secret:** (paste Client secret từ Google)

**Authorized scopes:**
```
profile email openid
```

**Attribute mapping:**
- email → email
- name → name

5. Click **"Add identity provider"**

---

# PHẦN 3: Setup Facebook OAuth

## Bước 3.1: Tạo Facebook App

1. Truy cập: https://developers.facebook.com/
2. Đăng nhập với Facebook account
3. Click **"My Apps"** → **"Create App"**

**Use case:** Other

Click **Next**

**App type:** Consumer

Click **Next**

**App details:**
- App name: `Caro Game`
- App contact email: Your email

Click **Create app**

Verify security check...

## Bước 3.2: Add Facebook Login Product

1. Dashboard → **Add Products**
2. Tìm **Facebook Login**
3. Click **Set Up**

**Select platform:** Web

**Site URL:**
```
https://caro-game-khoa.auth.us-east-1.amazoncognito.com
```

**⚠️ Thay bằng Cognito domain của bạn!**

Click **Save** → **Continue**

## Bước 3.3: Configure Facebook Login Settings

1. Menu bên trái → **Facebook Login** → **Settings**

**Valid OAuth Redirect URIs:**
```
https://caro-game-khoa.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**⚠️ Thay bằng Cognito domain của bạn!**

2. Click **Save Changes**

## Bước 3.4: Get App ID and Secret

1. Menu bên trái → **Settings** → **Basic**

Copy:
- **App ID**: `1234567890123456`
- **App Secret**: Click **Show** → Copy secret

**Lưu lại!** ✍️

## Bước 3.5: Make App Public (khi sẵn sàng production)

**Development Mode:**
- App đang ở mode Development
- Chỉ test users mới login được

**Để public app:**
1. Menu top → Toggle switch từ "In development" → "Live"
2. Cần complete App Review cho production

**Cho development:** Thêm test users:
1. **Roles** → **Test Users**
2. Click **Add** để thêm test accounts

## Bước 3.6: Add Facebook Provider vào Cognito

1. Quay lại AWS Cognito Console
2. Vào User Pool của bạn
3. Tab **Sign-in experience** → **Federated identity provider sign-in**
4. Click **"Add identity provider"**

**Provider type:** Facebook

**App ID:** (paste App ID từ Facebook)

**App secret:** (paste App secret từ Facebook)

**Authorized scopes:**
```
public_profile,email
```

**Attribute mapping:**
- email → email
- name → name

5. Click **"Add identity provider"**

---

# PHẦN 4: Update Frontend (React)

## Bước 4.1: Install AWS Amplify

```bash
cd /Users/hoangnv/Desktop/caroud/frontend
npm install aws-amplify @aws-amplify/ui-react
```

## Bước 4.2: Create Cognito Config File

Tạo file: `frontend/src/config/cognito.js`

```javascript
const cognitoConfig = {
  region: 'us-east-1',  // Thay bằng region của bạn
  userPoolId: 'us-east-1_Abc123XyZ',  // Thay bằng User Pool ID
  userPoolWebClientId: '7abcdefgh1234567890ijklmn',  // Thay bằng App Client ID
  oauth: {
    domain: 'caro-game-khoa.auth.us-east-1.amazoncognito.com',  // Thay bằng Cognito domain
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: 'http://localhost:3000/',
    redirectSignOut: 'http://localhost:3000/',
    responseType: 'code'  // or 'token'
  }
};

export default cognitoConfig;
```

## Bước 4.3: Update .env file

Tạo file `frontend/.env`:

```bash
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_Abc123XyZ
REACT_APP_USER_POOL_WEB_CLIENT_ID=7abcdefgh1234567890ijklmn
REACT_APP_COGNITO_DOMAIN=caro-game-khoa.auth.us-east-1.amazoncognito.com
REACT_APP_API_URL=http://127.0.0.1:8000
```

## Bước 4.4: Configure Amplify in App.js

Update `frontend/src/App.js`:

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import cognitoConfig from './config/cognito';

// Configure Amplify
Amplify.configure({
  Auth: cognitoConfig
});

// ... rest of your App.js
```

## Bước 4.5: Create Login Component with Cognito

Update `frontend/src/pages/LoginPage.js` - Mình sẽ làm ở step tiếp theo!

---

# PHẦN 5: Update Backend (Django)

## Bước 5.1: Update .env file

Edit `backend/.env`:

```bash
# AWS Cognito
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_Abc123XyZ
AWS_COGNITO_APP_CLIENT_ID=7abcdefgh1234567890ijklmn
AWS_COGNITO_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Abc123XyZ/.well-known/jwks.json
```

**⚠️ QUAN TRỌNG:** Thay tất cả values bằng thông tin của bạn!

## Bước 5.2: Test Backend Authentication

Backend đã có sẵn `users/authentication.py` để verify JWT tokens từ Cognito.

Test bằng cách:
1. Login qua frontend
2. Get JWT token
3. Call API endpoint với Authorization header:
   ```
   Authorization: Bearer <JWT_TOKEN>
   ```

---

# PHẦN 6: Testing

## Bước 6.1: Test Local Login (Email/Password)

1. Start servers:
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm start
```

2. Truy cập: http://localhost:3000
3. Click "Sign Up"
4. Đăng ký với email/password
5. Verify email (check inbox)
6. Login

## Bước 6.2: Test Google Login

1. Truy cập: http://localhost:3000
2. Click "Sign in with Google"
3. Chọn Google account
4. Allow permissions
5. Redirect về app với logged in

## Bước 6.3: Test Facebook Login

1. Truy cập: http://localhost:3000
2. Click "Sign in with Facebook"
3. Login Facebook (nếu chưa login)
4. Allow permissions
5. Redirect về app với logged in

---

# 📝 Checklist Hoàn thành

## AWS Cognito
- [ ] Tạo User Pool
- [ ] Lưu User Pool ID
- [ ] Lưu App Client ID
- [ ] Lưu Cognito Domain
- [ ] Configure callback URLs

## Google OAuth
- [ ] Tạo Google Cloud Project
- [ ] Enable Google+ API
- [ ] Tạo OAuth Client ID
- [ ] Lưu Client ID và Secret
- [ ] Add redirect URI
- [ ] Add Google provider vào Cognito

## Facebook OAuth
- [ ] Tạo Facebook App
- [ ] Add Facebook Login product
- [ ] Configure OAuth redirect URI
- [ ] Lưu App ID và Secret
- [ ] Add Facebook provider vào Cognito
- [ ] Add test users (nếu development)

## Frontend Config
- [ ] Install AWS Amplify
- [ ] Create cognito.js config
- [ ] Update .env file
- [ ] Configure Amplify in App.js
- [ ] Update LoginPage.js

## Backend Config
- [ ] Update .env file
- [ ] Test JWT verification

## Testing
- [ ] Test email/password login
- [ ] Test Google login
- [ ] Test Facebook login
- [ ] Test API calls with JWT token

---

# 🐛 Troubleshooting

## Error: "redirect_mismatch"
**Giải pháp:** Check callback URLs ở cả Cognito, Google Console, và Facebook App Settings

## Error: "Invalid client"
**Giải pháp:** Check App Client ID và Client Secret

## Error: "User pool does not exist"
**Giải pháp:** Check User Pool ID và Region trong config

## Google Login không hiện
**Giải pháp:** 
- Check Google+ API đã enable chưa
- Check OAuth consent screen đã configure chưa

## Facebook Login không work
**Giải pháp:**
- Check app đã thêm test users chưa (nếu development mode)
- Check redirect URI đã đúng chưa

---

# 🎯 Next Steps

Sau khi config xong Cognito:

1. **Implement UI** - Update LoginPage với Google/Facebook buttons
2. **Sync Users** - Sync Cognito users với Django database
3. **Handle Tokens** - Store và refresh JWT tokens
4. **Protected Routes** - Add authentication guards
5. **User Profile** - Fetch user info từ Cognito
6. **Production Deploy** - Update callback URLs cho production domain

---

**Hướng dẫn này đã cover toàn bộ process! Bước tiếp theo mình sẽ giúp bạn update code để integrate Cognito vào app.** 🚀
