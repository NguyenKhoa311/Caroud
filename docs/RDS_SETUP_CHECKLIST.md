# AWS RDS PostgreSQL Setup Checklist

## Pre-requisites
- [ ] Tài khoản AWS đã được tạo
- [ ] AWS CLI installed (optional)
- [ ] psql client installed (`brew install postgresql`)
- [ ] Python environment active

---

## Phase 1: Create RDS Instance

### Step 1: Basic Configuration
- [ ] Đăng nhập AWS Console
- [ ] Truy cập RDS service
- [ ] Click "Create database"
- [ ] Chọn PostgreSQL engine
- [ ] Chọn version 15.x hoặc 14.x
- [ ] Chọn template (Free tier hoặc Production)

### Step 2: Instance Settings
- [ ] DB instance identifier: `caroud-db`
- [ ] Master username: `postgres`
- [ ] Master password: `_______________` (lưu lại!)
- [ ] Confirm password

### Step 3: Instance Size
- [ ] DB instance class: `db.t3.micro` (free tier)
- [ ] Storage type: General Purpose SSD (gp2/gp3)
- [ ] Allocated storage: 20 GB
- [ ] Enable storage autoscaling (optional)

### Step 4: Connectivity
- [ ] VPC: Default VPC
- [ ] Public access: **Yes** (cho development)
- [ ] VPC security group: Create new `caroud-db-sg`
- [ ] Availability Zone: No preference

### Step 5: Database Configuration
- [ ] **Initial database name: `caroud`** ⚠️ QUAN TRỌNG!
- [ ] Port: 5432
- [ ] Parameter group: default
- [ ] Option group: default

### Step 6: Backup & Monitoring
- [ ] Enable automated backups
- [ ] Backup retention: 7 days
- [ ] Enable encryption
- [ ] Enable Enhanced Monitoring (optional)
- [ ] Enable Performance Insights (optional)

### Step 7: Create
- [ ] Click "Create database"
- [ ] Wait 5-10 minutes for status = "Available"
- [ ] Copy RDS endpoint: `_________________________________`

---

## Phase 2: Security Group Configuration

### Step 1: Access Security Group
- [ ] Go to RDS instance details
- [ ] Click on VPC security group
- [ ] Go to "Inbound rules" tab

### Step 2: Add PostgreSQL Rule
- [ ] Click "Edit inbound rules"
- [ ] Add rule:
  - Type: PostgreSQL
  - Protocol: TCP
  - Port: 5432
  - Source: My IP (hoặc 0.0.0.0/0 cho test)
  - Description: Allow PostgreSQL access
- [ ] Save rules

### Step 3: Verify
- [ ] Security group có rule cho port 5432
- [ ] Source IP đúng với IP hiện tại

---

## Phase 3: Connection Testing

### Step 1: Get Connection Details
```
Endpoint: _____________________________________
Port: 5432
Database: caroud
Username: postgres
Password: _____________________________________
```

### Step 2: Test with psql
```bash
psql -h YOUR_RDS_ENDPOINT \
     -U postgres \
     -d caroud \
     -p 5432
```
- [ ] Connection successful
- [ ] Can run `SELECT version();`
- [ ] Can see database with `\l`

### Step 3: Test with Script
```bash
cd backend
chmod +x test_rds_connection.sh
./test_rds_connection.sh
```
- [ ] Script shows "✅ Connection successful!"
- [ ] Database info displayed correctly

---

## Phase 4: Django Configuration

### Step 1: Create .env File
```bash
cd backend
cp .env.example .env
nano .env
```

### Step 2: Update .env
```
DB_NAME=caroud
DB_USER=postgres
DB_PASSWORD=YOUR_RDS_PASSWORD
DB_HOST=YOUR_RDS_ENDPOINT.rds.amazonaws.com
DB_PORT=5432
```
- [ ] Đã cập nhật DB_HOST
- [ ] Đã cập nhật DB_PASSWORD
- [ ] Các biến khác đã set

### Step 3: Verify Django Settings
```python
# settings.py should read from environment
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        ...
    }
}
```
- [ ] settings.py đọc từ os.getenv()
- [ ] psycopg2 đã được install

---

## Phase 5: Database Migration

### Step 1: Test Connection
```bash
python test_rds_connection.py
```
- [ ] Python script kết nối thành công
- [ ] Hiển thị database info

### Step 2: Run Migrations
```bash
python manage.py migrate
```
- [ ] All migrations applied successfully
- [ ] No errors

### Step 3: Create Superuser
```bash
python manage.py createsuperuser
```
- [ ] Superuser created
- [ ] Username: `___________`
- [ ] Email: `___________`

### Step 4: Verify Tables
```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d caroud
\dt
```
- [ ] auth_user table exists
- [ ] game_match table exists
- [ ] users_customuser table exists
- [ ] All expected tables present

---

## Phase 6: Application Testing

### Step 1: Start Server
```bash
python manage.py runserver
```
- [ ] Server starts without errors
- [ ] Can access http://127.0.0.1:8000/admin/
- [ ] Can login with superuser

### Step 2: Test API Endpoints
- [ ] POST /api/users/register/ works
- [ ] POST /api/users/login/ works
- [ ] GET /api/users/rooms/ works
- [ ] Game creation works

### Step 3: Test WebSocket
- [ ] WebSocket connects successfully
- [ ] Real-time game works
- [ ] Moves sync between players

### Step 4: Verify Data in RDS
```sql
-- Connect to RDS
psql -h YOUR_RDS_ENDPOINT -U postgres -d caroud

-- Check user count
SELECT COUNT(*) FROM users_customuser;

-- Check game count
SELECT COUNT(*) FROM game_match;

-- Check room count
SELECT COUNT(*) FROM users_gameroom;
```
- [ ] Data persists in RDS
- [ ] Queries work correctly

---

## Phase 7: Production Preparation (Optional)

### Security
- [ ] Change master password to strong password
- [ ] Restrict Security Group to specific IPs/Security Groups
- [ ] Set Public access = No
- [ ] Enable SSL/TLS for connections
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit

### Performance
- [ ] Enable Performance Insights
- [ ] Enable Enhanced Monitoring
- [ ] Setup CloudWatch alarms
- [ ] Consider Read Replicas if needed
- [ ] Tune database parameters if needed

### Backup & Recovery
- [ ] Verify automated backups working
- [ ] Test restore from snapshot
- [ ] Setup manual snapshots schedule
- [ ] Document backup retention policy

### Cost Optimization
- [ ] Review instance size (right-sizing)
- [ ] Setup CloudWatch budget alerts
- [ ] Consider Reserved Instances (for production)
- [ ] Stop instance when not in use (dev only)

---

## Troubleshooting Checklist

### Connection Issues
- [ ] Verified Security Group rules
- [ ] Checked RDS instance status
- [ ] Verified endpoint and port
- [ ] Tested with psql directly
- [ ] Checked local firewall
- [ ] Verified VPC/subnet configuration

### Authentication Issues
- [ ] Verified master username
- [ ] Verified master password
- [ ] Checked IAM permissions (if using IAM auth)
- [ ] Verified SSL requirements

### Django Issues
- [ ] Verified .env file exists
- [ ] Checked environment variables loaded
- [ ] Verified psycopg2 installed
- [ ] Checked settings.py configuration
- [ ] Reviewed Django logs

### Performance Issues
- [ ] Check Performance Insights
- [ ] Review CloudWatch metrics
- [ ] Check connection pool settings
- [ ] Review slow query logs
- [ ] Consider instance upgrade

---

## Post-Setup Tasks

- [ ] Document all credentials securely (password manager)
- [ ] Share connection details with team (securely)
- [ ] Setup monitoring and alerts
- [ ] Create backup/restore runbook
- [ ] Schedule regular backups
- [ ] Plan for scaling (if needed)
- [ ] Update documentation

---

## Resources

- AWS RDS Documentation: https://docs.aws.amazon.com/rds/
- Django PostgreSQL: https://docs.djangoproject.com/en/5.0/ref/databases/#postgresql-notes
- psycopg2 Docs: https://www.psycopg.org/docs/

---

**Completion Date:** _______________

**Completed By:** _______________

**Notes:**
```
[Add any notes, issues encountered, or special configurations here]
```
