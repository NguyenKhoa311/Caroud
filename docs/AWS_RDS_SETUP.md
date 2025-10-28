# AWS RDS PostgreSQL Setup Guide

Hướng dẫn chi tiết để setup AWS RDS PostgreSQL cho Caroud Game.

## Mục lục
1. [Tạo RDS Instance](#1-tạo-rds-instance)
2. [Cấu hình Security Group](#2-cấu-hình-security-group)
3. [Kết nối từ Local](#3-kết-nối-từ-local)
4. [Cấu hình Django](#4-cấu-hình-django)
5. [Migration và Test](#5-migration-và-test)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Tạo RDS Instance

### Bước 1.1: Truy cập AWS Console
1. Đăng nhập AWS Console: https://console.aws.amazon.com/
2. Tìm và chọn service **RDS**
3. Click **"Create database"**

### Bước 1.2: Engine Configuration
- **Engine type**: PostgreSQL
- **Engine version**: PostgreSQL 15.5 (hoặc 14.x)
- **Templates**: 
  - ✅ **Free tier** (cho testing/development)
  - 🚀 **Production** (cho production)

### Bước 1.3: Settings
- **DB instance identifier**: `caroud-db` (hoặc tên tùy chọn)
- **Master username**: `postgres` 
- **Master password**: Tạo password mạnh
  - ⚠️ **LƯU Ý**: Lưu password này lại, sẽ cần dùng để kết nối!

### Bước 1.4: Instance Configuration
**Free Tier:**
- DB instance class: `db.t3.micro` (1 vCPU, 1GB RAM)
- Storage type: General Purpose SSD (gp2)
- Allocated storage: 20 GB

**Production:**
- DB instance class: `db.t3.small` hoặc cao hơn
- Storage type: General Purpose SSD (gp3)
- Allocated storage: 50 GB+
- ✅ Enable storage autoscaling

### Bước 1.5: Storage
- Allocated storage: **20 GB** (minimum)
- Storage autoscaling: 
  - ✅ Enable (recommended)
  - Maximum storage threshold: 100 GB

### Bước 1.6: Connectivity
- **Compute resource**: Don't connect to an EC2 compute resource (nếu chưa có EC2)
- **Network type**: IPv4
- **Virtual private cloud (VPC)**: Default VPC
- **DB subnet group**: default
- **Public access**: 
  - ✅ **Yes** (để kết nối từ local - CHỈ CHO DEV)
  - ❌ **No** (cho production, chỉ EC2 trong VPC kết nối)
- **VPC security group**: 
  - Create new (sẽ tạo SG mới)
  - Security group name: `caroud-db-sg`
- **Availability Zone**: No preference

### Bước 1.7: Database Authentication
- **Database authentication options**: Password authentication

### Bước 1.8: Monitoring
- ✅ Enable Enhanced monitoring (recommended cho production)
- ✅ Enable Performance Insights (free tier có 7 days retention)

### Bước 1.9: Additional Configuration
**QUAN TRỌNG:**
- **Initial database name**: `caroud` 
  - ⚠️ **BẮT BUỘC nhập này**, nếu không sẽ phải tạo database sau!
  
**Backup:**
- ✅ Enable automated backups
- Backup retention period: 7 days (recommended)
- Backup window: Default

**Encryption:**
- ✅ Enable encryption (recommended)
- Master key: (default) aws/rds

**Maintenance:**
- ✅ Enable auto minor version upgrade

### Bước 1.10: Tạo Database
1. Click **"Create database"**
2. ⏱️ Đợi 5-10 phút để RDS instance được tạo
3. Status sẽ chuyển từ "Creating" → "Available"

---

## 2. Cấu hình Security Group

Sau khi RDS được tạo, cần mở port PostgreSQL để kết nối.

### Bước 2.1: Truy cập Security Group
1. Vào RDS Dashboard
2. Click vào DB instance vừa tạo (`caroud-db`)
3. Tab **"Connectivity & security"**
4. Trong phần **"Security"**, click vào Security group đang được sử dụng (vd: `caroud-db-sg`)

### Bước 2.2: Thêm Inbound Rule
1. Tab **"Inbound rules"**
2. Click **"Edit inbound rules"**
3. Click **"Add rule"**

**Cho Development (kết nối từ local):**
- Type: `PostgreSQL`
- Protocol: `TCP`
- Port range: `5432`
- Source: `My IP` (hoặc `0.0.0.0/0` - không khuyến khích)
- Description: `Allow PostgreSQL from my IP`

**Cho Production (kết nối từ EC2):**
- Type: `PostgreSQL`
- Protocol: `TCP`
- Port range: `5432`
- Source: `Custom` → chọn Security Group của EC2
- Description: `Allow PostgreSQL from EC2`

4. Click **"Save rules"**

---

## 3. Kết nối từ Local

### Bước 3.1: Lấy Connection Information
1. Vào RDS instance detail
2. Tab **"Connectivity & security"**
3. Copy các thông tin:
   - **Endpoint**: `caroud-db.xxxxxx.us-east-1.rds.amazonaws.com`
   - **Port**: `5432`
   - **Database name**: `caroud`
   - **Master username**: `postgres`

### Bước 3.2: Test kết nối bằng psql
```bash
# Install psql nếu chưa có (macOS)
brew install postgresql

# Test connection
psql -h caroud-db.xxxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d caroud \
     -p 5432

# Nhập password khi được hỏi
# Nếu kết nối thành công, bạn sẽ thấy prompt: caroud=>
```

### Bước 3.3: Kiểm tra database
```sql
-- List all databases
\l

-- Connect to caroud database
\c caroud

-- List all tables (sẽ rỗng ban đầu)
\dt

-- Exit
\q
```

---

## 4. Cấu hình Django

### Bước 4.1: Install Python Packages
```bash
cd /Users/hoangnv/Desktop/caroud/backend

# Activate virtual environment
source venv/bin/activate  # hoặc ./venv/bin/activate

# psycopg2 đã được cài trong requirements.txt
# Nếu chưa có:
pip install psycopg2-binary
```

### Bước 4.2: Tạo file .env
```bash
# Copy từ example
cp .env.example .env

# Edit file .env
nano .env
```

### Bước 4.3: Cập nhật .env với RDS credentials
```bash
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# AWS RDS PostgreSQL
DB_NAME=caroud
DB_USER=postgres
DB_PASSWORD=YOUR_RDS_MASTER_PASSWORD_HERE
DB_HOST=caroud-db.xxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Bước 4.4: Verify settings.py
File `caroud/settings.py` đã được cấu hình để đọc từ environment variables:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'caro_game_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}
```

---

## 5. Migration và Test

### Bước 5.1: Load environment variables
```bash
# Với python-dotenv, Django tự động load .env
# Hoặc export manually:
export $(cat .env | xargs)
```

### Bước 5.2: Test database connection
```bash
cd backend

# Test connection
python manage.py dbshell

# Nếu kết nối thành công, bạn sẽ vào psql prompt
# Type \q để thoát
```

### Bước 5.3: Run migrations
```bash
# Make migrations (nếu có thay đổi models)
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Expected output:
# Operations to perform:
#   Apply all migrations: admin, auth, contenttypes, game, matchmaking, sessions, users
# Running migrations:
#   Applying contenttypes.0001_initial... OK
#   Applying auth.0001_initial... OK
#   ...
```

### Bước 5.4: Tạo superuser
```bash
python manage.py createsuperuser

# Nhập thông tin:
# Username: admin
# Email: admin@caroud.com
# Password: ***
```

### Bước 5.5: Test server
```bash
# Start Django server
python manage.py runserver

# Server sẽ chạy trên http://127.0.0.1:8000/
# Truy cập admin: http://127.0.0.1:8000/admin/
```

### Bước 5.6: Verify data trong RDS
```bash
# Connect to RDS
psql -h caroud-db.xxxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d caroud

# Check tables
\dt

# Should see tables:
# - auth_user
# - game_match
# - users_customuser
# - etc.

# Count users
SELECT COUNT(*) FROM users_customuser;
```

---

## 6. Troubleshooting

### ❌ Error: Could not connect to server
**Nguyên nhân:**
- Security Group chưa mở port 5432
- Public access = No (không thể kết nối từ ngoài VPC)
- Wrong endpoint

**Giải pháp:**
1. Kiểm tra Security Group inbound rules
2. Đảm bảo Public access = Yes (cho dev)
3. Verify endpoint và credentials

### ❌ Error: password authentication failed
**Nguyên nhân:**
- Sai password
- Sai username

**Giải pháp:**
1. Reset master password trong RDS console:
   - RDS → Database → Modify
   - New master password
   - Apply immediately
2. Cập nhật `.env` với password mới

### ❌ Error: database "caroud" does not exist
**Nguyên nhân:**
- Không nhập "Initial database name" khi tạo RDS

**Giải pháp:**
```bash
# Connect to default postgres database
psql -h your-rds-endpoint -U postgres -d postgres

# Create database
CREATE DATABASE caroud;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE caroud TO postgres;

# Exit and reconnect to caroud
\q
```

### ❌ Error: TimeoutError / Connection timed out
**Nguyên nhân:**
- Network connectivity issues
- VPC/Subnet không có internet access

**Giải pháp:**
1. Check security group
2. Check VPC route tables
3. Verify subnet có NAT gateway (nếu private)

### ❌ Error: SSL connection required
**Nguyên nhân:**
- RDS yêu cầu SSL connection

**Giải pháp:**
Update `settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
        'OPTIONS': {
            'sslmode': 'require',
        },
    }
}
```

---

## Best Practices

### 🔒 Security
1. **Không bao giờ commit `.env` vào Git**
   - Đã có trong `.gitignore`
2. **Sử dụng IAM authentication** thay vì password (advanced)
3. **Rotate password định kỳ**
4. **Enable encryption at rest**
5. **Restrict Security Group** chỉ cho phép IP/SG cần thiết

### 💰 Cost Optimization
1. Sử dụng **Free Tier** cho development (`db.t3.micro`)
2. Stop RDS instance khi không dùng (được free 7 days stopped)
3. Giảm backup retention nếu không cần (mặc định 7 days)
4. Delete RDS khi không còn dùng để tránh phí

### 🚀 Performance
1. Enable **Performance Insights** để monitor
2. Tăng instance class nếu CPU/Memory cao
3. Sử dụng **Read Replicas** cho read-heavy workload
4. Enable **Connection pooling** (pgBouncer) nếu nhiều connections

### 📊 Monitoring
1. Enable **Enhanced Monitoring**
2. Setup **CloudWatch Alarms** cho:
   - High CPU usage (>80%)
   - Low storage space (<20%)
   - High number of connections
3. Check **RDS Events** thường xuyên

---

## Useful Commands

### psql Commands
```bash
# Connect
psql -h <endpoint> -U <username> -d <database>

# List databases
\l

# Connect to database
\c database_name

# List tables
\dt

# Describe table
\d table_name

# Show table data
SELECT * FROM table_name LIMIT 10;

# Exit
\q
```

### Django Management Commands
```bash
# Check database connection
python manage.py dbshell

# Show migrations
python manage.py showmigrations

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Dump data
python manage.py dumpdata > backup.json

# Load data
python manage.py loaddata backup.json
```

---

## Next Steps

Sau khi setup RDS thành công:

1. ✅ **Deploy Backend lên EC2/ECS**
2. ✅ **Setup Redis trên AWS ElastiCache** (cho Django Channels)
3. ✅ **Setup S3** cho static/media files
4. ✅ **Setup CloudFront** CDN
5. ✅ **Setup Route53** cho domain
6. ✅ **Setup SSL Certificate** (AWS Certificate Manager)

---

## Resources

- [AWS RDS PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Django PostgreSQL Notes](https://docs.djangoproject.com/en/5.0/ref/databases/#postgresql-notes)
- [psycopg2 Documentation](https://www.psycopg.org/docs/)

---

**Lưu ý:** Hướng dẫn này được viết cho AWS region `us-east-1`. Nếu sử dụng region khác, thay đổi endpoint cho phù hợp.
