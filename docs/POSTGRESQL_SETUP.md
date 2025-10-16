# PostgreSQL Setup Guide for Caro Game

## 🗄️ Why PostgreSQL?

PostgreSQL is better suited for this project because:
- ✅ **Native Django Support**: Django ORM works seamlessly with PostgreSQL
- ✅ **ACID Compliance**: Ensures data integrity for game transactions
- ✅ **JSON Support**: Can store board state and move history as JSONB
- ✅ **Better Performance**: Faster queries for leaderboards and statistics
- ✅ **AWS RDS**: Easy deployment with managed service
- ✅ **Free Tier**: RDS offers free tier for 12 months

## 📦 Installation

### macOS (using Homebrew)

```bash
# Install PostgreSQL 14
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Follow the installation wizard
4. Remember the superuser password

## 🔧 Database Setup

### 1. Create Database and User

```bash
# Access PostgreSQL shell
psql postgres

# Or on Linux
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE caro_game_db;

-- Create user
CREATE USER caro_user WITH PASSWORD 'your_secure_password';

-- Configure user settings
ALTER ROLE caro_user SET client_encoding TO 'utf8';
ALTER ROLE caro_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE caro_user SET timezone TO 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE caro_game_db TO caro_user;

-- Connect to database
\c caro_game_db

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO caro_user;

-- Exit
\q
```

### 2. Test Connection

```bash
# Test connection with new user
psql -U caro_user -d caro_game_db -h localhost

# Or with connection string
psql postgresql://caro_user:your_secure_password@localhost:5432/caro_game_db
```

### 3. Configure Django

Update `backend/.env`:

```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=caro_game_db
DB_USER=caro_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

### 4. Install Python PostgreSQL Driver

```bash
cd backend
source venv/bin/activate
pip install psycopg2-binary
```

### 5. Run Django Migrations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser for admin
python manage.py createsuperuser
```

## 🌐 AWS RDS Setup (Production)

### 1. Create RDS Instance

1. Go to AWS Console → RDS → Databases
2. Click "Create database"
3. Choose PostgreSQL
4. Select version: PostgreSQL 14.x
5. Templates: Free tier (for learning) or Production
6. Settings:
   - DB instance identifier: `caro-game-db`
   - Master username: `postgres`
   - Master password: (set a strong password)
7. Instance configuration:
   - Free tier: `db.t3.micro`
   - Production: `db.t3.small` or higher
8. Storage:
   - Allocated storage: 20 GB
   - Enable storage autoscaling: Yes
9. Connectivity:
   - VPC: Default VPC
   - Public access: Yes (for development)
   - VPC security group: Create new
   - Availability Zone: No preference
10. Database authentication: Password authentication
11. Additional configuration:
    - Initial database name: `caro_game_db`
    - Enable automated backups: Yes
    - Backup retention: 7 days
12. Click "Create database"

### 2. Configure Security Group

1. Go to EC2 → Security Groups
2. Find the RDS security group
3. Edit inbound rules:
   - Add rule: PostgreSQL (port 5432)
   - Source: 
     - Development: My IP or 0.0.0.0/0
     - Production: EC2 security group only

### 3. Connect to RDS

Get the endpoint from RDS console:
```
caro-game-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
```

Update `backend/.env`:

```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=caro_game_db
DB_USER=postgres
DB_PASSWORD=your_rds_master_password
DB_HOST=caro-game-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
```

Test connection:
```bash
psql -h caro-game-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d caro_game_db
```

### 4. Run Migrations on RDS

```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
```

## 📊 Database Schema

The Django ORM will automatically create these tables:

### Core Tables

```sql
-- Users table (created by Django auth + custom fields)
users (
  id, username, email, password,
  cognito_id, elo_rating, wins, losses, draws,
  current_streak, best_streak,
  date_joined, last_login
)

-- Matches table
matches (
  id, mode, black_player_id, white_player_id,
  status, result, board_state (JSONB),
  move_history (JSONB), current_turn,
  winning_line (JSONB),
  black_elo_before, white_elo_before,
  black_elo_change, white_elo_change,
  created_at, updated_at
)

-- Matchmaking queue
matchmaking_queue (
  id, player_id, elo_rating,
  status, matched_with_id, joined_at
)
```

## 🔍 Useful PostgreSQL Commands

### Database Management

```sql
-- List all databases
\l

-- Connect to database
\c caro_game_db

-- List all tables
\dt

-- Describe table structure
\d users
\d matches

-- Show table with data
SELECT * FROM users;
SELECT * FROM matches;
```

### Common Queries

```sql
-- Top 10 players by ELO
SELECT username, elo_rating, wins, losses 
FROM users 
ORDER BY elo_rating DESC 
LIMIT 10;

-- Recent matches
SELECT m.id, m.mode, m.status, m.result,
       b.username as black_player,
       w.username as white_player,
       m.created_at
FROM matches m
LEFT JOIN users b ON m.black_player_id = b.id
LEFT JOIN users w ON m.white_player_id = w.id
ORDER BY m.created_at DESC
LIMIT 20;

-- User statistics
SELECT 
  username,
  elo_rating,
  wins,
  losses,
  draws,
  (wins::float / NULLIF(wins + losses + draws, 0) * 100)::numeric(5,2) as win_rate
FROM users
WHERE wins + losses + draws > 0
ORDER BY elo_rating DESC;
```

### Maintenance

```sql
-- Vacuum database (clean up)
VACUUM ANALYZE;

-- Check database size
SELECT pg_size_pretty(pg_database_size('caro_game_db'));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🛠️ Troubleshooting

### Connection Issues

**Error: `psql: error: connection to server at "localhost", port 5432 failed`**

```bash
# Check if PostgreSQL is running
brew services list
# or
sudo systemctl status postgresql

# Start PostgreSQL
brew services start postgresql@14
# or
sudo systemctl start postgresql
```

**Error: `FATAL: role "postgres" does not exist`**

```bash
# Create postgres user
createuser -s postgres
```

**Error: `FATAL: database "caro_game_db" does not exist`**

```bash
# Create database
createdb caro_game_db -O caro_user
```

### Django Migration Issues

**Error: `django.db.utils.OperationalError: FATAL: password authentication failed`**

- Check credentials in `.env`
- Verify user exists: `psql -U caro_user -l`
- Reset password if needed

**Error: `permission denied for schema public`**

```sql
-- Connect as superuser
psql caro_game_db

-- Grant permissions
GRANT ALL ON SCHEMA public TO caro_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO caro_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO caro_user;
```

### Performance Issues

```sql
-- Create indexes for better performance
CREATE INDEX idx_users_elo ON users(elo_rating DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_matches_players ON matches(black_player_id, white_player_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created ON matches(created_at DESC);

-- Analyze tables
ANALYZE users;
ANALYZE matches;
```

## 💾 Backup & Restore

### Local Backup

```bash
# Backup database
pg_dump -U caro_user -d caro_game_db -F c -f backup.dump

# Restore database
pg_restore -U caro_user -d caro_game_db -c backup.dump

# Backup as SQL
pg_dump -U caro_user -d caro_game_db > backup.sql

# Restore from SQL
psql -U caro_user -d caro_game_db < backup.sql
```

### RDS Backup

AWS RDS automatically creates backups. Manual snapshot:
1. Go to RDS → Databases
2. Select your database
3. Actions → Take snapshot
4. Name: `caro-game-snapshot-YYYY-MM-DD`

### Restore from Snapshot

1. Go to RDS → Snapshots
2. Select snapshot
3. Actions → Restore snapshot
4. Configure new instance
5. Update `.env` with new endpoint

## 📚 Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/14/)
- [Django PostgreSQL Documentation](https://docs.djangoproject.com/en/4.2/ref/databases/#postgresql-notes)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `caro_game_db` created
- [ ] User `caro_user` created with proper permissions
- [ ] Connection test successful
- [ ] `.env` file configured correctly
- [ ] Django migrations completed
- [ ] Admin user created
- [ ] Can access Django admin at http://localhost:8000/admin
- [ ] Can create and query test data

## 🚀 Next Steps

1. Run the backend server: `python manage.py runserver`
2. Test API endpoints: http://localhost:8000/api/
3. View API documentation: http://localhost:8000/swagger/
4. Test database with Django shell: `python manage.py shell`

```python
# Test in Django shell
from users.models import User
from game.models import Match

# Create test user
user = User.objects.create_user(
    username='testuser',
    email='test@example.com',
    password='testpass123'
)

# Create test match
match = Match.objects.create(
    mode='local',
    black_player=user,
    status='in_progress'
)
match.initialize_board()

# Query data
print(User.objects.count())
print(Match.objects.count())
```

Good luck with your PostgreSQL setup! 🎉
