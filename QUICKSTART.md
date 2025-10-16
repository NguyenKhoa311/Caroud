# 🚀 Quick Start Guide - Caro Game

Get your Caro game up and running in **5 minutes**!

## Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.9+
- **PostgreSQL** 14+ (will be installed by setup script if needed)

## Option 1: Automated Setup (Recommended) ⚡

### For macOS/Linux:

```bash
# Run the setup script
./setup_postgresql.sh
```

### For Windows:

```cmd
# Run the setup script
setup_postgresql.bat
```

The script will:
- ✅ Install PostgreSQL (if not installed)
- ✅ Create database and user
- ✅ Configure environment variables
- ✅ Install Python dependencies
- ✅ Run Django migrations

## Option 2: Manual Setup 🛠️

### Step 1: Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)

### Step 2: Create Database

```bash
# macOS/Linux
psql postgres

# Windows (run as postgres user)
psql -U postgres
```

Then execute:
```sql
CREATE DATABASE caro_game_db;
CREATE USER caro_user WITH PASSWORD 'your_password';
ALTER ROLE caro_user SET client_encoding TO 'utf8';
ALTER ROLE caro_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE caro_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE caro_game_db TO caro_user;

-- Connect to the database and grant schema privileges
\c caro_game_db
GRANT ALL ON SCHEMA public TO caro_user;
```

### Step 3: Configure Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `backend/.env` with your database credentials:
```env
DB_NAME=caro_game_db
DB_USER=caro_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### Step 4: Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser  # Create admin account
```

### Step 5: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running the Application 🎮

You need **3 terminals**:

### Terminal 1: Redis (for WebSocket)
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Windows - download from https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis:alpine
```

### Terminal 2: Django Backend
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python manage.py runserver
```

Backend will run on: **http://localhost:8000**

### Terminal 3: React Frontend
```bash
cd frontend
npm start
```

Frontend will open at: **http://localhost:3000**

## Quick Test ✅

1. **Open browser:** http://localhost:3000
2. **Sign up** for a new account
3. **Click "Play Now"** → Select **"Local Game"**
4. **Start playing!** Two players alternate on the same browser

## Available Features

✅ **Local Multiplayer** - Play with a friend on the same device
✅ **AI Opponent** - 3 difficulty levels (Easy, Medium, Hard)
✅ **User Authentication** - Sign up/login system
✅ **Leaderboard** - ELO ranking system
✅ **Match History** - View past games
✅ **Profile Page** - Personal statistics

⏳ **Coming Soon:**
- Online Multiplayer (requires WebSocket client setup)
- AWS Cognito (Google/Facebook login)

## Project Structure

```
caroud/
├── backend/           # Django REST API
│   ├── users/        # User auth & ELO system
│   ├── game/         # Game logic & WebSocket
│   ├── matchmaking/  # Player matching
│   └── ai/           # AI opponent engine
├── frontend/         # React application
│   ├── src/
│   │   ├── pages/   # Game, Home, Profile, etc.
│   │   ├── components/ # Board, Navbar
│   │   └── services/   # API integration
└── docs/            # Documentation

```

## API Endpoints

- **GET** `/api/users/` - List users
- **POST** `/api/users/register/` - Register new user
- **POST** `/api/users/login/` - Login
- **GET** `/api/users/profile/` - User profile
- **GET** `/api/users/leaderboard/` - Top players
- **POST** `/api/game/` - Create new game
- **POST** `/api/game/{id}/move/` - Make a move
- **POST** `/api/game/{id}/ai-move/` - AI makes a move
- **GET** `/api/matchmaking/queue/` - Join matchmaking queue

## Admin Panel

Access Django admin: **http://localhost:8000/admin**

Login with superuser credentials you created.

Here you can:
- Manage users
- View all games
- Monitor matchmaking queue
- Check statistics

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
# macOS:
brew services list | grep postgresql

# Linux:
sudo systemctl status postgresql

# Test connection:
psql -U caro_user -d caro_game_db -h localhost
```

### Port Already in Use

```bash
# Backend (8000)
lsof -ti:8000 | xargs kill -9

# Frontend (3000)
lsof -ti:3000 | xargs kill -9
```

### Missing Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Restart Redis
# macOS:
brew services restart redis

# Linux:
sudo systemctl restart redis
```

## Next Steps

1. **Read Documentation:**
   - [SETUP.md](SETUP.md) - Detailed setup instructions
   - [docs/POSTGRESQL_SETUP.md](docs/POSTGRESQL_SETUP.md) - Database guide
   - [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Technical overview
   - [ROADMAP.md](ROADMAP.md) - Development roadmap

2. **Configure AWS Services** (for production):
   - Set up AWS Cognito for authentication
   - Create RDS PostgreSQL instance
   - Deploy frontend to S3 + CloudFront
   - Deploy backend to EC2

3. **Implement Online Multiplayer:**
   - Add WebSocket client in React
   - Test real-time game updates
   - Implement matchmaking UI

4. **Enhance AI:**
   - Implement minimax algorithm
   - Add alpha-beta pruning
   - Tune difficulty levels

## Need Help?

- 📖 Check [SETUP.md](SETUP.md) for detailed instructions
- 🐛 Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) troubleshooting section
- 💾 Database issues? See [docs/POSTGRESQL_SETUP.md](docs/POSTGRESQL_SETUP.md)
- 🚀 Deployment? See AWS section in [SETUP.md](SETUP.md)

## Game Rules

- **Board:** 15×15 grid
- **Win Condition:** Get 5 stones in a row (horizontal, vertical, or diagonal)
- **Players:** Black moves first
- **ELO System:** 
  - Starting rating: 1200
  - Win: +32 points (adjusted by opponent's rating)
  - Loss: -32 points (adjusted by opponent's rating)
  - Draw: minimal change

---

**Happy Gaming! 🎮**

Built with ❤️ for Cloud Computing Course
