# Quick Start: AWS RDS PostgreSQL Setup

## TL;DR - 10 phút setup

### 1. Tạo RDS Instance (5 phút)
```
AWS Console → RDS → Create Database
- Engine: PostgreSQL 15.x
- Template: Free tier (db.t3.micro)
- DB identifier: caroud-db
- Master username: postgres
- Master password: [TẠO PASSWORD MẠNH]
- Initial database name: caroud ⚠️ QUAN TRỌNG
- Public access: Yes
→ Create Database
```

### 2. Mở Security Group (1 phút)
```
RDS → caroud-db → Security Group → Edit Inbound Rules
→ Add Rule:
  - Type: PostgreSQL
  - Port: 5432
  - Source: My IP
→ Save
```

### 3. Lấy Endpoint
```
RDS → caroud-db → Connectivity & Security
→ Copy Endpoint: caroud-db.xxxxx.us-east-1.rds.amazonaws.com
```

### 4. Cập nhật .env (1 phút)
```bash
cd backend
cp .env.example .env
nano .env

# Update:
DB_NAME=caroud
DB_USER=postgres
DB_PASSWORD=YOUR_RDS_PASSWORD
DB_HOST=YOUR_RDS_ENDPOINT.rds.amazonaws.com
DB_PORT=5432
```

### 5. Test Connection (1 phút)
```bash
# Test với script
./test_rds_connection.sh

# Hoặc test trực tiếp
psql -h YOUR_RDS_ENDPOINT -U postgres -d caroud
```

### 6. Run Migrations (2 phút)
```bash
source venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## ✅ Done!

Server chạy với RDS: http://127.0.0.1:8000/

---

## Chi tiết đầy đủ

Xem: [AWS_RDS_SETUP.md](AWS_RDS_SETUP.md)

## Checklist

Xem: [RDS_SETUP_CHECKLIST.md](RDS_SETUP_CHECKLIST.md)

---

## Lưu ý quan trọng

⚠️ **Initial database name** phải điền `caroud` khi tạo RDS!

⚠️ **Security Group** phải mở port 5432 cho IP của bạn!

⚠️ **Public access = Yes** chỉ dùng cho development!

💰 **Free tier**: db.t3.micro với 20GB storage (miễn phí 12 tháng)

🛑 **Stop instance** khi không dùng để tránh tốn phí (được stop tối đa 7 ngày)
