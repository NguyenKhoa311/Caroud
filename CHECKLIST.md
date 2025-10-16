# Development Checklist - Caro Game

Track your progress through the setup and development process.

## Phase 1: Environment Setup ⚙️

- [ ] **Install Prerequisites**
  - [ ] Node.js 16+ and npm
  - [ ] Python 3.9+
  - [ ] PostgreSQL 14+
  - [ ] Redis 5+
  - [ ] Git

## Phase 2: Database Setup 💾

- [ ] **PostgreSQL Installation**
  - [ ] Install PostgreSQL
  - [ ] Start PostgreSQL service
  - [ ] Verify installation: `psql --version`

- [ ] **Database Creation**
  - [ ] Create database: `caro_game_db`
  - [ ] Create user: `caro_user`
  - [ ] Grant privileges
  - [ ] Test connection

- [ ] **Alternative: Run Setup Script**
  - [ ] Run `./setup_postgresql.sh` (macOS/Linux)
  - [ ] Or run `setup_postgresql.bat` (Windows)
  - [ ] Verify database created successfully

## Phase 3: Backend Setup 🔧

- [ ] **Environment Configuration**
  - [ ] Navigate to `backend/` directory
  - [ ] Create virtual environment: `python3 -m venv venv`
  - [ ] Activate venv: `source venv/bin/activate`
  - [ ] Install dependencies: `pip install -r requirements.txt`
  - [ ] Copy `.env.example` to `.env`
  - [ ] Configure database credentials in `.env`

- [ ] **Django Setup**
  - [ ] Run migrations: `python manage.py makemigrations`
  - [ ] Apply migrations: `python manage.py migrate`
  - [ ] Create superuser: `python manage.py createsuperuser`
  - [ ] Collect static files: `python manage.py collectstatic --noinput`

- [ ] **Verify Backend**
  - [ ] Start server: `python manage.py runserver`
  - [ ] Visit http://localhost:8000/admin
  - [ ] Login with superuser credentials
  - [ ] Check API docs: http://localhost:8000/api/

## Phase 4: Frontend Setup 🎨

- [ ] **Install Dependencies**
  - [ ] Navigate to `frontend/` directory
  - [ ] Run: `npm install`
  - [ ] Verify no errors

- [ ] **Configuration**
  - [ ] Copy `frontend/.env.example` to `frontend/.env`
  - [ ] Set `REACT_APP_API_URL=http://localhost:8000`
  - [ ] Configure other environment variables

- [ ] **Verify Frontend**
  - [ ] Start dev server: `npm start`
  - [ ] Frontend opens at http://localhost:3000
  - [ ] Check console for errors

## Phase 5: Redis Setup 🔄

- [ ] **Installation**
  - [ ] Install Redis
  - [ ] Start Redis service
  - [ ] Verify: `redis-cli ping` returns `PONG`

- [ ] **Django Configuration**
  - [ ] Update `CHANNEL_LAYERS` in settings.py
  - [ ] Set Redis host/port in `.env`
  - [ ] Test connection

## Phase 6: Basic Testing ✅

- [ ] **User Authentication**
  - [ ] Register new user
  - [ ] Login successfully
  - [ ] View profile page
  - [ ] Logout

- [ ] **Local Game**
  - [ ] Start new local game
  - [ ] Make moves (alternating players)
  - [ ] Verify win detection (5 in a row)
  - [ ] Check game saved to database

- [ ] **AI Game**
  - [ ] Start AI game (Easy)
  - [ ] Play moves against AI
  - [ ] Test Medium difficulty
  - [ ] Test Hard difficulty
  - [ ] Verify AI responds correctly

- [ ] **Leaderboard**
  - [ ] Create multiple users
  - [ ] Play games to generate ratings
  - [ ] View leaderboard page
  - [ ] Verify ELO rankings

- [ ] **Match History**
  - [ ] Play several games
  - [ ] View match history
  - [ ] Check game details
  - [ ] Verify statistics

## Phase 7: AWS Cognito Setup 🔐

- [ ] **Create User Pool**
  - [ ] Go to AWS Console → Cognito
  - [ ] Create new User Pool
  - [ ] Configure sign-in options (email)
  - [ ] Set password policy
  - [ ] Configure MFA (optional)

- [ ] **Configure App Client**
  - [ ] Add app client
  - [ ] Enable OAuth 2.0 flows
  - [ ] Add callback URLs
  - [ ] Add logout URLs
  - [ ] Note Client ID and User Pool ID

- [ ] **Google OAuth Setup**
  - [ ] Go to Google Cloud Console
  - [ ] Create OAuth 2.0 Client ID
  - [ ] Add authorized redirect URIs
  - [ ] Copy Client ID and Secret
  - [ ] Add to Cognito identity providers

- [ ] **Facebook OAuth Setup**
  - [ ] Go to Facebook Developers
  - [ ] Create new app
  - [ ] Add Facebook Login product
  - [ ] Configure OAuth redirect URIs
  - [ ] Copy App ID and Secret
  - [ ] Add to Cognito identity providers

- [ ] **Frontend Integration**
  - [ ] Update `frontend/.env` with Cognito credentials
  - [ ] Configure Amplify in `src/App.js`
  - [ ] Test Google login
  - [ ] Test Facebook login
  - [ ] Verify tokens work with backend

- [ ] **Backend Integration**
  - [ ] Update `backend/.env` with Cognito credentials
  - [ ] Configure JWT verification
  - [ ] Test protected endpoints
  - [ ] Verify user creation from Cognito

## Phase 8: Online Multiplayer 🌐

- [ ] **WebSocket Client**
  - [ ] Install `socket.io-client` in frontend
  - [ ] Create WebSocket service
  - [ ] Implement connection logic
  - [ ] Handle reconnection

- [ ] **Game Room Management**
  - [ ] Join game room
  - [ ] Send moves via WebSocket
  - [ ] Receive opponent moves
  - [ ] Handle disconnections

- [ ] **Matchmaking**
  - [ ] Implement queue UI
  - [ ] Show "Finding opponent..." status
  - [ ] Handle match found
  - [ ] Navigate to game page

- [ ] **Testing**
  - [ ] Open two browsers
  - [ ] Login as different users
  - [ ] Join matchmaking
  - [ ] Play game together
  - [ ] Verify real-time updates

## Phase 9: AWS RDS Setup ☁️

- [ ] **Create RDS Instance**
  - [ ] Go to AWS Console → RDS
  - [ ] Create PostgreSQL database
  - [ ] Choose instance type (db.t3.micro for dev)
  - [ ] Configure VPC and security groups
  - [ ] Set master password
  - [ ] Note endpoint and port

- [ ] **Security Configuration**
  - [ ] Configure security group
  - [ ] Allow PostgreSQL port (5432)
  - [ ] Restrict to EC2 instance IP
  - [ ] Enable encryption at rest

- [ ] **Database Migration**
  - [ ] Update production `.env` with RDS credentials
  - [ ] Run migrations on RDS
  - [ ] Test connection from EC2
  - [ ] Backup local data
  - [ ] Import data to RDS (if needed)

## Phase 10: EC2 Deployment 🚀

- [ ] **Launch EC2 Instance**
  - [ ] Go to AWS Console → EC2
  - [ ] Launch Ubuntu 20.04 LTS instance
  - [ ] Choose instance type (t2.micro for free tier)
  - [ ] Configure security group
  - [ ] Add SSH, HTTP, HTTPS, WebSocket ports
  - [ ] Download key pair

- [ ] **Server Setup**
  - [ ] SSH into instance
  - [ ] Update system: `sudo apt update && sudo apt upgrade`
  - [ ] Install Python 3.9+
  - [ ] Install PostgreSQL client
  - [ ] Install Redis
  - [ ] Install Nginx
  - [ ] Install Supervisor (for process management)

- [ ] **Deploy Backend**
  - [ ] Clone repository
  - [ ] Create virtual environment
  - [ ] Install dependencies
  - [ ] Configure `.env` for production
  - [ ] Run migrations
  - [ ] Collect static files
  - [ ] Configure Gunicorn
  - [ ] Configure Daphne for WebSocket

- [ ] **Configure Nginx**
  - [ ] Create Nginx config
  - [ ] Set up reverse proxy
  - [ ] Configure WebSocket proxy
  - [ ] Enable HTTPS with Let's Encrypt
  - [ ] Test configuration

- [ ] **Process Management**
  - [ ] Create Supervisor config for Gunicorn
  - [ ] Create Supervisor config for Daphne
  - [ ] Start services
  - [ ] Enable auto-restart

## Phase 11: S3 + CloudFront 📦

- [ ] **Create S3 Bucket**
  - [ ] Go to AWS Console → S3
  - [ ] Create bucket (e.g., `caro-game-frontend`)
  - [ ] Disable "Block all public access"
  - [ ] Enable static website hosting

- [ ] **Build Frontend**
  - [ ] Update `REACT_APP_API_URL` to EC2 endpoint
  - [ ] Run: `npm run build`
  - [ ] Test build locally
  - [ ] Upload build files to S3

- [ ] **Create CloudFront Distribution**
  - [ ] Go to AWS Console → CloudFront
  - [ ] Create distribution
  - [ ] Set S3 bucket as origin
  - [ ] Configure cache behavior
  - [ ] Set up custom domain (optional)
  - [ ] Request SSL certificate

- [ ] **Configure CORS**
  - [ ] Update S3 bucket CORS policy
  - [ ] Update Django CORS settings
  - [ ] Test cross-origin requests

## Phase 12: Testing & Optimization 🧪

- [ ] **Functional Testing**
  - [ ] Test all game modes
  - [ ] Test authentication flows
  - [ ] Test matchmaking
  - [ ] Test WebSocket connections
  - [ ] Test on mobile devices
  - [ ] Test on different browsers

- [ ] **Performance Testing**
  - [ ] Load test API endpoints
  - [ ] Test concurrent WebSocket connections
  - [ ] Check database query performance
  - [ ] Monitor memory usage
  - [ ] Check Redis performance

- [ ] **Security Testing**
  - [ ] Test JWT expiration
  - [ ] Test unauthorized access
  - [ ] Check SQL injection protection
  - [ ] Verify CORS configuration
  - [ ] Test rate limiting

- [ ] **Optimization**
  - [ ] Add database indexes
  - [ ] Implement query optimization
  - [ ] Enable gzip compression
  - [ ] Configure CloudFront caching
  - [ ] Optimize images
  - [ ] Minify CSS/JS

## Phase 13: Monitoring & Logging 📊

- [ ] **CloudWatch Setup**
  - [ ] Enable CloudWatch logs for EC2
  - [ ] Enable RDS monitoring
  - [ ] Set up custom metrics
  - [ ] Create alarms for errors

- [ ] **Application Logging**
  - [ ] Configure Django logging
  - [ ] Log important events
  - [ ] Set up log rotation
  - [ ] Monitor error logs

- [ ] **Performance Monitoring**
  - [ ] Set up APM (Application Performance Monitoring)
  - [ ] Monitor API response times
  - [ ] Track user sessions
  - [ ] Monitor WebSocket connections

## Phase 14: Documentation 📚

- [ ] **Update Documentation**
  - [ ] Finalize README.md
  - [ ] Update SETUP.md with production steps
  - [ ] Document API endpoints
  - [ ] Add troubleshooting guide
  - [ ] Create user manual

- [ ] **Code Documentation**
  - [ ] Add docstrings to Python functions
  - [ ] Add JSDoc comments to React components
  - [ ] Document complex algorithms
  - [ ] Add inline comments

## Phase 15: Presentation 🎤

- [ ] **Prepare Demo**
  - [ ] Create demo video
  - [ ] Prepare live demo
  - [ ] Prepare backup demo (screenshots)

- [ ] **Create Presentation**
  - [ ] Architecture diagram
  - [ ] AWS services overview
  - [ ] Feature demonstration
  - [ ] Technical challenges
  - [ ] Future improvements

- [ ] **Project Report**
  - [ ] Write technical report
  - [ ] Add screenshots
  - [ ] Include code snippets
  - [ ] Document AWS setup
  - [ ] Cost analysis

---

## Quick Commands Reference

### Development
```bash
# Start all services
# Terminal 1:
cd backend && source venv/bin/activate && python manage.py runserver

# Terminal 2:
cd frontend && npm start

# Terminal 3:
redis-server
```

### Database
```bash
# Connect to database
psql -U caro_user -d caro_game_db -h localhost

# Create backup
pg_dump -U caro_user caro_game_db > backup.sql

# Restore backup
psql -U caro_user -d caro_game_db < backup.sql
```

### Django
```bash
# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Shell
python manage.py shell
```

### Production Deployment
```bash
# Build frontend
cd frontend && npm run build

# Deploy to S3
aws s3 sync build/ s3://your-bucket-name/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Restart services on EC2
sudo supervisorctl restart all
```

---

**Progress:** ☐ Not Started | ▶ In Progress | ✅ Completed

**Current Phase:** _____________________

**Last Updated:** _____________________
