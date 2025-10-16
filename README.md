# Caro Game - Cloud Computing Project

Web-based Caro (Gomoku/Five in a Row) game deployed on AWS Cloud Platform.

## 🚀 Quick Start

**New to the project?** → Start here: **[QUICKSTART.md](QUICKSTART.md)**

For detailed setup instructions → See: **[SETUP.md](SETUP.md)**

### 5-Minute Setup

```bash
# Automated setup (macOS/Linux)
./setup_postgresql.sh

# Then start the servers
cd backend && source venv/bin/activate && python manage.py runserver
cd frontend && npm start
```

Visit http://localhost:3000 to play!

## 🎮 Features

- **Multiple Game Modes:**
  - Local multiplayer (2 players on same device)
  - Online matchmaking (ELO-based)
  - Play against AI

- **User System:**
  - Authentication via AWS Cognito (Google, Facebook login)
  - User profiles with statistics
  - Match history
  - ELO rating system
  - Global leaderboard

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React.js
- **Backend:** Django (Python) + Django Channels (WebSocket)
- **Database:** PostgreSQL
- **Authentication:** AWS Cognito
- **Cloud Services:** AWS (EC2, S3, CloudFront, RDS, API Gateway, Lambda)

### AWS Services
- **S3 + CloudFront:** Static file hosting for React frontend
- **EC2:** Django backend and WebSocket server
- **Cognito:** User authentication and authorization
- **API Gateway:** REST API endpoints
- **Lambda:** Serverless functions for specific tasks
- **RDS:** Optional backup database

## 📁 Project Structure

```
caroud/
├── frontend/              # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── utils/        # Utility functions
│   │   └── App.js
│   └── package.json
│
├── backend/              # Django backend
│   ├── caroud/          # Main Django project
│   ├── game/            # Game app
│   ├── users/           # User management
│   ├── matchmaking/     # Matchmaking system
│   ├── ai/              # AI player logic
│   └── requirements.txt
│
├── infrastructure/       # AWS infrastructure code
│   ├── terraform/       # Terraform configs
│   └── cloudformation/  # CloudFormation templates
│
└── docs/                # Documentation
    ├── API.md
    └── DEPLOYMENT.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Redis Server
- AWS Account

### Local Development

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## 🎯 Game Rules

- Board size: 15x15
- Win condition: 5 stones in a row (horizontal, vertical, or diagonal)
- Black plays first

## 📊 ELO Rating System

- Initial rating: 1200
- K-factor: 32 (adjustable)
- Rating changes based on match results

## 🔐 Authentication Flow

1. User clicks "Login with Google/Facebook"
2. Redirected to AWS Cognito hosted UI
3. After authentication, receive JWT token
4. Token used for API authorization

## 📝 License

MIT License

## 👥 Team

Cloud Computing Course Project - 2025
