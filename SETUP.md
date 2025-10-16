# Caro Game - Setup Guide

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL 14+ (local or AWS RDS)
- Redis Server
- AWS Account (for Cognito, EC2, S3, etc.)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd /Users/hoangnv/Desktop/caroud
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your AWS Cognito details
# REACT_APP_USER_POOL_ID=your-user-pool-id
# REACT_APP_USER_POOL_CLIENT_ID=your-client-id
# etc.

# Start development server
npm start
```

Frontend will run on http://localhost:3000

### 3. Backend Setup

```bash
cd ../backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Update .env with your configuration
# SECRET_KEY, MONGODB_URI, AWS_COGNITO_* etc.

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

Backend will run on http://localhost:8000

### 4. Start Redis (required for WebSocket)

```bash
# macOS (with Homebrew)
brew services start redis

# Linux
sudo service redis-server start

# Or run in Docker
docker run -d -p 6379:6379 redis:alpine
```

### 5. Start PostgreSQL

```bash
# macOS (with Homebrew)
brew services start postgresql@14

# Linux
sudo service postgresql start

# Create database
psql postgres
CREATE DATABASE caro_game_db;
CREATE USER caro_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE caro_game_db TO caro_user;
\q

# Or use AWS RDS (recommended for production)
# Update DB_* variables in .env
```

## 🔐 AWS Cognito Setup

### 1. Create User Pool

1. Go to AWS Console → Cognito → User Pools
2. Create a new User Pool
3. Configure:
   - Sign-in options: Email
   - Password requirements: Default
   - MFA: Optional
   - User account recovery: Email only

### 2. Configure App Client

1. In your User Pool → App integration → App clients
2. Create app client:
   - App type: Public client
   - Authentication flows: ALLOW_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH
   - OAuth 2.0 grant types: Authorization code grant
   - OAuth scopes: email, openid, profile

### 3. Set up Social Login

1. In User Pool → Sign-in experience → Federated identity providers
2. Add Google:
   - Get credentials from Google Cloud Console
   - Add Google OAuth 2.0 Client ID
3. Add Facebook:
   - Get credentials from Facebook Developers
   - Add Facebook App ID and Secret

### 4. Configure Hosted UI

1. App integration → Domain → Create Cognito domain
2. Update callback URLs:
   - Callback URLs: http://localhost:3000/
   - Sign out URLs: http://localhost:3000/

### 5. Update Environment Variables

Copy the following from Cognito to your `.env` files:

**Frontend (.env):**
```env
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
REACT_APP_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REACT_APP_OAUTH_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
```

**Backend (.env):**
```env
AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
AWS_COGNITO_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/jwks.json
```

## 🎮 Testing the Application

### Test Local Multiplayer
1. Go to http://localhost:3000
2. Click "Play Local"
3. Play with a friend on the same device

### Test AI Mode
1. Click "Play vs AI"
2. Make moves and watch AI respond

### Test Online Matchmaking
1. Create account / Login with Google or Facebook
2. Click "Find Match"
3. System will match you with players of similar ELO

### View Leaderboard
1. Go to "Leaderboard" page
2. See top players ranked by ELO

### View Profile
1. Login
2. Go to "Profile"
3. See your stats, ELO, match history

## 🏗️ AWS Deployment

### Frontend Deployment (S3 + CloudFront)

```bash
cd frontend

# Build production version
npm run build

# Upload to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Create CloudFront distribution
# Point to S3 bucket
# Enable HTTPS
```

### Backend Deployment (EC2)

```bash
# Launch EC2 instance (Ubuntu)
# SSH into instance

# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv nginx redis-server

# Clone repository
git clone your-repo-url
cd caroud/backend

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Setup environment variables
cp .env.example .env
# Edit .env with production values

# Run migrations
python manage.py migrate
python manage.py collectstatic

# Configure Gunicorn
gunicorn caroud.wsgi:application --bind 0.0.0.0:8000

# Configure Nginx as reverse proxy
# Configure SSL with Let's Encrypt

# Setup Daphne for WebSocket
daphne -b 0.0.0.0 -p 8001 caroud.asgi:application

# Use supervisor or systemd to manage processes
```

### Alternative: Use AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create caro-game-env

# Deploy
eb deploy
```

## 📊 PostgreSQL Setup

### Local PostgreSQL
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Create database and user
psql postgres
CREATE DATABASE caro_game_db;
CREATE USER caro_user WITH PASSWORD 'your_password';
ALTER ROLE caro_user SET client_encoding TO 'utf8';
ALTER ROLE caro_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE caro_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE caro_game_db TO caro_user;
\q

# Linux
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql
# Run the same SQL commands as above
```

### AWS RDS PostgreSQL (Recommended for Production)
1. Go to AWS Console → RDS
2. Create PostgreSQL database
3. Choose instance type (t3.micro for free tier)
4. Set master username and password
5. Configure VPC and security groups
6. Enable public access (if needed for development)
7. Get endpoint URL
8. Update DB_* variables in .env:
   ```
   DB_HOST=your-rds-endpoint.amazonaws.com
   DB_NAME=caro_game_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

## 🔧 Troubleshooting

### Frontend Issues

**CORS Errors:**
- Check CORS_ALLOWED_ORIGINS in backend settings
- Verify backend URL in frontend .env

**Cognito Auth Fails:**
- Verify all Cognito IDs in .env
- Check callback URLs match exactly
- Ensure OAuth scopes are correct

### Backend Issues

**Database Connection:**
```bash
# Test PostgreSQL connection
psql -h localhost -U caro_user -d caro_game_db
# Or
psql postgresql://caro_user:your_password@localhost:5432/caro_game_db
```

**Redis Connection:**
```bash
# Test Redis
redis-cli ping
# Should return: PONG
```

**Django Migrations:**
```bash
python manage.py makemigrations
python manage.py migrate --run-syncdb
```

## 📝 Next Steps

1. **Implement AI Logic:** Enhance AI player in `backend/ai/` app
2. **Add WebSocket:** Complete real-time game updates
3. **Implement Matchmaking:** Complete ELO-based matching
4. **Add Tests:** Write unit tests and integration tests
5. **Monitoring:** Setup CloudWatch for logging
6. **CI/CD:** Setup GitHub Actions for automatic deployment

## 🎓 Architecture Diagram

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   CloudFront CDN    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   S3 Static Site    │  ◄── React Frontend
└─────────────────────┘
       │
       │ API Calls
       ▼
┌─────────────────────┐
│   API Gateway       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   EC2 / Lambda      │  ◄── Django Backend
│   - REST API        │
│   - WebSocket       │
└──────┬──────────────┘
       │
       ├──► RDS PostgreSQL (Database)
       ├──► Redis (Cache & Channels)
       └──► Cognito (Authentication)
```

## 📚 Documentation

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [AWS Cognito](https://docs.aws.amazon.com/cognito/)
- [Django Channels](https://channels.readthedocs.io/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [AWS RDS](https://docs.aws.amazon.com/rds/)

## 🤝 Contributing

This is a student project for Cloud Computing course.

## 📄 License

MIT
