# Hướng dẫn Setup Nginx + Gunicorn/Daphne cho Django trên EC2

## 🚨 Tại sao cần thay đổi?

**Hiện tại**: `python manage.py runserver 0.0.0.0:8000`
- ❌ Development server - không an toàn cho production
- ❌ Không handle được nhiều requests đồng thời
- ❌ Không có SSL/HTTPS
- ❌ Dễ bị crash khi có lỗi

**Sau khi setup**: Nginx → Gunicorn/Daphne → Django
- ✅ Production-ready
- ✅ Handle nhiều concurrent requests
- ✅ Nginx làm reverse proxy và serve static files
- ✅ Tự động restart khi crash

---

## Bước 1: SSH vào EC2

```bash
ssh -i your-key.pem ubuntu@13.215.198.23
# Hoặc
ssh -i your-key.pem ec2-user@13.215.198.23
```

---

## Bước 2: Cài đặt Nginx

```bash
# Update package list
sudo apt update
# hoặc (nếu dùng Amazon Linux):
# sudo yum update

# Cài Nginx
sudo apt install nginx -y
# hoặc:
# sudo yum install nginx -y

# Kiểm tra Nginx đã cài thành công
nginx -v

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx  # Auto-start khi reboot
```

---

## Bước 3: Cài Gunicorn hoặc Daphne

**Project của bạn dùng WebSocket không?**
- ❌ **Không dùng WebSocket**: Dùng **Gunicorn** (đơn giản hơn)
- ✅ **Có WebSocket**: Dùng **Daphne** (ASGI server, support WebSocket)

### 3a. Nếu dùng Gunicorn (không có WebSocket):

```bash
cd /path/to/your/django/project
source venv/bin/activate  # Nếu dùng virtual environment

pip install gunicorn

# Test Gunicorn
gunicorn caroud.wsgi:application --bind 0.0.0.0:8000
```

### 3b. Nếu dùng Daphne (có WebSocket):

```bash
cd /path/to/your/django/project
source venv/bin/activate

pip install daphne

# Test Daphne
daphne -b 0.0.0.0 -p 8000 caroud.asgi:application
```

**Ctrl+C để stop sau khi test xong**

---

## Bước 4: Cấu hình Nginx

### Tạo file cấu hình Nginx:

```bash
sudo nano /etc/nginx/sites-available/caroud
```

### Paste nội dung sau:

#### **Option 1: Nếu dùng Gunicorn (không WebSocket)**

```nginx
upstream django {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.caroud.click;

    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/caroud_access.log;
    error_log /var/log/nginx/caroud_error.log;

    # Django API requests
    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (nếu có)
    location /static/ {
        alias /path/to/your/project/staticfiles/;
    }

    # Media files (nếu có)
    location /media/ {
        alias /path/to/your/project/media/;
    }
}
```

#### **Option 2: Nếu dùng Daphne (có WebSocket)**

```nginx
upstream django {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.caroud.click;

    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/caroud_access.log;
    error_log /var/log/nginx/caroud_error.log;

    # WebSocket connections
    location /ws/ {
        proxy_pass http://django;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Django API requests
    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /path/to/your/project/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /path/to/your/project/media/;
    }
}
```

**⚠️ Chú ý**: Thay `/path/to/your/project/` bằng đường dẫn thực tế của bạn!

### Enable site và restart Nginx:

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/caroud /etc/nginx/sites-enabled/

# Xóa default site (nếu có)
sudo rm /etc/nginx/sites-enabled/default

# Test cấu hình Nginx
sudo nginx -t

# Nếu OK, restart Nginx
sudo systemctl restart nginx
```

---

## Bước 5: Tạo Systemd Service (chạy server tự động)

### 5a. Nếu dùng Gunicorn:

```bash
sudo nano /etc/systemd/system/caroud.service
```

Paste nội dung:

```ini
[Unit]
Description=Caroud Django Gunicorn Service
After=network.target

[Service]
Type=notify
User=ubuntu
Group=www-data
WorkingDirectory=/path/to/your/django/project
Environment="PATH=/path/to/your/venv/bin"
ExecStart=/path/to/your/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    caroud.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5b. Nếu dùng Daphne:

```bash
sudo nano /etc/systemd/system/caroud.service
```

Paste nội dung:

```ini
[Unit]
Description=Caroud Django Daphne Service
After=network.target

[Service]
Type=simple
User=ubuntu
Group=www-data
WorkingDirectory=/path/to/your/django/project
Environment="PATH=/path/to/your/venv/bin"
ExecStart=/path/to/your/venv/bin/daphne \
    -b 127.0.0.1 \
    -p 8000 \
    caroud.asgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**⚠️ Thay thế**:
- `/path/to/your/django/project` → Đường dẫn thực tế
- `/path/to/your/venv/bin` → Đường dẫn virtual environment
- `ubuntu` → Username EC2 của bạn (có thể là `ec2-user`)

### Start service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start caroud

# Enable auto-start
sudo systemctl enable caroud

# Kiểm tra status
sudo systemctl status caroud
```

---

## Bước 6: Cập nhật Django Settings

Trong file `backend/caroud/settings.py`:

```python
# ALLOWED_HOSTS cần bao gồm:
ALLOWED_HOSTS = [
    'api.caroud.click',
    '13.215.198.23',
    'localhost',
    '127.0.0.1',
]

# Nếu dùng Nginx reverse proxy:
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

---

## Bước 7: Cập nhật CloudFront Origin

Trong AWS Console → CloudFront → Origins → `api.caroud.click`:

**Thay đổi**:
- **Protocol**: `HTTP only`
- **HTTP port**: `80` (KHÔNG phải 8000)

CloudFront sẽ gọi: `http://api.caroud.click:80` → Nginx → Gunicorn/Daphne (port 8000)

---

## Bước 8: Test

```bash
# 1. Test trực tiếp từ EC2
curl http://localhost/api/users/login/

# 2. Test từ internet
curl http://api.caroud.click/api/users/login/

# 3. Test từ CloudFront
curl https://caroud.click/api/users/login/
```

---

## 🔧 Các lệnh hữu ích

```bash
# Xem log Nginx
sudo tail -f /var/log/nginx/caroud_error.log
sudo tail -f /var/log/nginx/caroud_access.log

# Xem log Django service
sudo journalctl -u caroud -f

# Restart service
sudo systemctl restart caroud
sudo systemctl restart nginx

# Stop service
sudo systemctl stop caroud

# Kiểm tra status
sudo systemctl status caroud
sudo systemctl status nginx
```

---

## 🎯 Tóm tắt luồng request:

```
Browser (HTTPS)
    ↓
CloudFront (HTTPS → HTTP)
    ↓
api.caroud.click:80 (Nginx)
    ↓
localhost:8000 (Gunicorn/Daphne)
    ↓
Django Application
```

---

## ⚠️ Lưu ý về Security Group EC2

Đảm bảo Security Group cho phép:
- **Port 80** (HTTP) từ **CloudFront IP ranges** hoặc **0.0.0.0/0**
- **Port 22** (SSH) từ IP của bạn

**KHÔNG** cần mở port 8000 ra internet!

---

## 📝 Checklist

- [ ] Cài Nginx
- [ ] Cài Gunicorn hoặc Daphne
- [ ] Tạo file cấu hình Nginx
- [ ] Enable site trong Nginx
- [ ] Tạo systemd service
- [ ] Start và enable service
- [ ] Cập nhật Django ALLOWED_HOSTS
- [ ] Cập nhật CloudFront origin (port 80)
- [ ] Test từ EC2, internet, và CloudFront
- [ ] Kiểm tra logs nếu có lỗi

---

## 🚀 Sau khi setup xong

Bạn có thể:
- Thêm SSL certificate cho `api.caroud.click` (dùng Let's Encrypt)
- Setup monitoring (CloudWatch, Datadog)
- Scale với Load Balancer nếu cần

Good luck! 💪
