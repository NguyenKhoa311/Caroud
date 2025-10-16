# 🎉 Caro Game - Setup hoàn tất!

## ✅ Đã cài đặt thành công

### 1. Database - PostgreSQL ✓
- ✅ PostgreSQL 14 đã được cài đặt và đang chạy
- ✅ Database `caro_game_db` đã được tạo
- ✅ User `caro_user` với password `admin` đã được tạo
- ✅ Tất cả migrations đã được apply
- ✅ Superuser admin đã được tạo

### 2. Backend - Django ✓
- ✅ Python 3.13 virtual environment
- ✅ Tất cả dependencies đã được cài đặt:
  - Django 5.2.7
  - Django REST Framework 3.16.1
  - Django Channels 4.3.1 (WebSocket)
  - Daphne 4.2.1 (ASGI server)
  - psycopg2-binary (PostgreSQL driver)
  - Redis, JWT, boto3, và nhiều hơn nữa
- ✅ Server đang chạy tại: **http://127.0.0.1:8000**

### 3. Frontend - React ✓  
- ✅ Node.js dependencies đã được cài đặt
- ✅ React app đang chạy (có một vài warnings nhỏ, không ảnh hưởng)
- ✅ Có thể truy cập ở browser

### 4. Redis ✓
- ✅ Redis 8.2.2 đã được cài đặt
- ✅ Redis service đang chạy cho WebSocket support

## 🌐 Truy cập ứng dụng

### Frontend (React)
Mở browser và truy cập: **http://localhost:3000**

### Backend API
- API endpoints: **http://127.0.0.1:8000/api/**
- Django Admin: **http://127.0.0.1:8000/admin**
  - Username: `admin`
  - Password: (password bạn đã nhập khi tạo superuser)

## 🎮 Các tính năng có thể test ngay

### 1. Đăng ký và Đăng nhập
- Truy cập http://localhost:3000
- Click "Login" để đăng nhập hoặc đăng ký tài khoản mới

### 2. Chơi game Local (2 người cùng máy)
- Sau khi login, click "Play Now"
- Chọn "Local Game" mode
- Hai người thay phiên nhau đánh trên cùng một màn hình
- Người chơi 1 (đen) đi trước, người chơi 2 (trắng) đi sau

### 3. Chơi với AI
- Click "Play Now" > "AI Game"
- Chọn độ khó: Easy / Medium / Hard
- Đấu với máy tính

### 4. Xem Leaderboard
- Click "Leaderboard" để xem bảng xếp hạng ELO
- Xem top players và rankings

### 5. Xem Profile
- Click "Profile" để xem thống kê cá nhân
- Xem số trận thắng/thua, ELO rating, match history

## 📁 Thông tin Database

### Kết nối Database
```bash
Database: caro_game_db
Host: localhost
Port: 5432
Username: caro_user
Password: admin
```

### Kiểm tra Database
```bash
psql -U caro_user -d caro_game_db -h localhost

# Trong psql, chạy:
\dt                    # Xem các tables
SELECT * FROM users_user;    # Xem users
SELECT * FROM game_match;    # Xem games
```

## 🛠️ Quản lý Servers

### Stop Servers
Nhấn `Ctrl+C` trong terminal đang chạy server

### Restart Servers

**Backend:**
```bash
cd /Users/hoangnv/Desktop/caroud/backend
source venv/bin/activate
python manage.py runserver
```

**Frontend:**
```bash
cd /Users/hoangnv/Desktop/caroud/frontend
npm start
```

**Redis:**
```bash
brew services restart redis
```

## 🐛 Một số Warnings hiện tại (không ảnh hưởng)

### Frontend Warnings
- `'BOARD_SIZE' is assigned a value but never used` - Board.js
- `'gameService' is defined but never used` - GamePage.js
- Các biến unused khác

**=> Không ảnh hưởng đến chức năng, có thể fix sau**

### Backend
- Không có lỗi nào! ✅

## ⏭️ Next Steps - Tính năng cần hoàn thiện

### 1. Online Multiplayer (Cao nhất) 🔥
Hiện tại chưa có WebSocket client trong React. Cần:
- [ ] Thêm socket.io-client vào frontend
- [ ] Implement WebSocket connection trong GamePage
- [ ] Test 2 browser chơi với nhau qua mạng
- [ ] Implement matchmaking UI

### 2. AWS Cognito Authentication 🔐
Hiện tại chỉ có local auth. Cần:
- [ ] Tạo AWS Cognito User Pool
- [ ] Configure Google OAuth
- [ ] Configure Facebook OAuth  
- [ ] Update frontend Amplify config
- [ ] Test social login

### 3. AI Improvement 🤖
AI hiện tại còn basic. Cần:
- [ ] Implement minimax algorithm cho Hard mode
- [ ] Add alpha-beta pruning
- [ ] Tune difficulty levels
- [ ] Add thinking time indicator

### 4. UI/UX Enhancements 🎨
- [ ] Thêm animations cho moves
- [ ] Sound effects
- [ ] Better mobile responsive
- [ ] Loading states
- [ ] Error handling và messages đẹp hơn

### 5. Deploy lên AWS ☁️
- [ ] Setup AWS RDS PostgreSQL
- [ ] Deploy backend lên EC2
- [ ] Build và upload frontend lên S3
- [ ] Configure CloudFront
- [ ] Setup domain và SSL

## 📊 Database Schema

### Users Table (users_user)
```sql
- id (Serial, Primary Key)
- username (VARCHAR, unique)
- email (VARCHAR, unique)
- password (VARCHAR, hashed)
- elo_rating (INTEGER, default 1200)
- games_played (INTEGER, default 0)
- games_won (INTEGER, default 0)
- games_lost (INTEGER, default 0)
- created_at (TIMESTAMP)
```

### Matches Table (game_match)
```sql
- id (Serial, Primary Key)
- white_player_id (Foreign Key -> users_user)
- black_player_id (Foreign Key -> users_user)
- winner (VARCHAR: 'white'/'black'/'draw')
- board_state (JSONB)
- move_history (JSONB array)
- status (VARCHAR: 'waiting'/'in_progress'/'finished')
- created_at (TIMESTAMP)
- finished_at (TIMESTAMP)
```

### Matchmaking Queue (matchmaking_matchmakingqueue)
```sql
- id (Serial, Primary Key)
- player_id (Foreign Key -> users_user)
- elo_rating (INTEGER)
- matched_with_id (Foreign Key -> users_user, nullable)
- created_at (TIMESTAMP)
```

## 🔍 Testing Commands

### Test Backend API
```bash
# Test user registration
curl -X POST http://127.0.0.1:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"testpass123"}'

# Test login
curl -X POST http://127.0.0.1:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Test leaderboard
curl http://127.0.0.1:8000/api/users/leaderboard/
```

### Check Services Status
```bash
# PostgreSQL
brew services list | grep postgresql

# Redis
redis-cli ping    # Should return PONG

# Backend
curl http://127.0.0.1:8000/api/

# Frontend  
curl http://localhost:3000
```

## 📚 Documentation

- **QUICKSTART.md** - Quick setup guide (5 phút)
- **SETUP.md** - Detailed setup instructions
- **docs/POSTGRESQL_SETUP.md** - PostgreSQL guide
- **PROJECT_SUMMARY.md** - Technical overview
- **ROADMAP.md** - Development roadmap
- **CHECKLIST.md** - Development checklist

## 🎯 Game Rules

- **Board:** 15×15 grid
- **Win:** 5 stones in a row (horizontal, vertical, diagonal)
- **Black moves first**
- **ELO System:**
  - Starting: 1200
  - Win: +32 (adjusted by opponent rating)
  - Loss: -32 (adjusted by opponent rating)

## 💡 Tips

1. **Mở Django Admin** để xem và quản lý data:
   - http://127.0.0.1:8000/admin
   - Login với superuser đã tạo

2. **Check database** khi cần:
   ```bash
   psql -U caro_user -d caro_game_db -h localhost
   ```

3. **View logs** khi có lỗi:
   - Backend: Xem terminal đang chạy Django
   - Frontend: Xem browser Console (F12)
   - PostgreSQL: `/usr/local/var/log/postgresql@14.log`

4. **Reset database** nếu cần:
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py flush    # Xóa all data
   python manage.py migrate  # Tạo lại
   python manage.py createsuperuser  # Tạo admin mới
   ```

## 🎊 Kết luận

**Setup đã hoàn tất 100%!** 🎉

Bạn có thể:
- ✅ Chơi game local ngay bây giờ
- ✅ Test AI opponent
- ✅ Đăng ký/login accounts
- ✅ Xem leaderboard và profile
- ✅ Quản lý data qua Django admin

**Next:** Implement online multiplayer để 2 người có thể chơi với nhau qua mạng!

---

**Servers đang chạy:**
- 🔴 Backend: http://127.0.0.1:8000
- 🔵 Frontend: http://localhost:3000
- 🟢 Redis: localhost:6379
- 🟣 PostgreSQL: localhost:5432

**Happy Gaming! 🎮**
