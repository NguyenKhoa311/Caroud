# 🚀 Hướng dẫn Push Code lên GitHub

## Bước 1: Kiểm tra các file sẽ được commit

```bash
cd /Users/hoangnv/Desktop/caroud
git status
```

Các file sẽ KHÔNG được push (đã ignore):
- ✅ `backend/venv/` - Python virtual environment
- ✅ `backend/.env` - Environment variables (secrets)
- ✅ `node_modules/` - Node dependencies
- ✅ `__pycache__/` - Python cache files
- ✅ `.DS_Store` - macOS system files
- ✅ `*.log` - Log files
- ✅ `*.pyc` - Compiled Python files

Các file SẼ được push:
- ✅ Source code (.py, .js, .jsx, .css)
- ✅ Configuration templates (.env.example)
- ✅ Documentation (.md files)
- ✅ Requirements files (requirements.txt, package.json)
- ✅ Migration files (nếu có)

## Bước 2: Add tất cả file

```bash
git add .
```

## Bước 3: Commit với message

```bash
git commit -m "feat: initial commit - Caro game with Django & React"
```

Hoặc commit có message chi tiết hơn:

```bash
git commit -m "feat: initial setup Caro game

- Django backend với PostgreSQL
- React frontend
- WebSocket support (Django Channels)
- AI opponent với 3 độ khó
- ELO rating system
- Authentication & user profiles
- Complete documentation"
```

## Bước 4: Tạo repository trên GitHub

1. Đăng nhập GitHub: https://github.com
2. Click nút "+" góc trên bên phải → "New repository"
3. Điền thông tin:
   - **Repository name:** `caroud` hoặc `caro-game`
   - **Description:** "Web-based Caro (Gomoku) game on AWS Cloud - Cloud Computing Project"
   - **Visibility:** Public hoặc Private (tùy bạn)
   - **KHÔNG** check "Initialize with README" (vì đã có sẵn)
4. Click "Create repository"

## Bước 5: Connect với remote repository

GitHub sẽ hiển thị các lệnh. Chọn "...or push an existing repository":

```bash
git remote add origin https://github.com/YOUR_USERNAME/caroud.git
git branch -M main
git push -u origin main
```

**Thay `YOUR_USERNAME` bằng username GitHub của bạn!**

## Bước 6: Verify

Kiểm tra trên GitHub xem code đã được push chưa:
```
https://github.com/YOUR_USERNAME/caroud
```

## 🔐 QUAN TRỌNG: Bảo mật

### ⚠️ KHÔNG BAO GIỜ commit các file này:

1. **`.env`** - Chứa secrets, passwords, API keys
2. **`venv/`** - Virtual environment (rất lớn)
3. **`node_modules/`** - Dependencies (rất lớn)
4. **`*.pem, *.key`** - SSL certificates và private keys
5. **Database dumps** - Có thể chứa sensitive data

### ✅ File `.gitignore` đã được tạo để tự động ignore các file này!

## 📋 Commands Tổng hợp

### Lần đầu tiên push code:

```bash
# 1. Kiểm tra status
git status

# 2. Add tất cả file
git add .

# 3. Commit
git commit -m "feat: initial commit - Caro game"

# 4. Connect với GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/caroud.git

# 5. Push
git branch -M main
git push -u origin main
```

### Những lần sau (đã có remote):

```bash
# 1. Kiểm tra thay đổi
git status

# 2. Add file đã thay đổi
git add .

# 3. Commit với message
git commit -m "feat: add online multiplayer"

# 4. Push
git push
```

## 🌿 Branch Strategy (Optional - cho team)

Nếu làm việc team, nên dùng branches:

```bash
# Tạo branch mới cho feature
git checkout -b feature/online-multiplayer

# Làm việc trên branch này
# ... code code code ...

# Commit changes
git add .
git commit -m "feat: implement WebSocket client"

# Push branch
git push origin feature/online-multiplayer

# Sau đó tạo Pull Request trên GitHub
```

## 🔄 Cập nhật code từ remote

```bash
# Pull latest changes
git pull origin main

# Hoặc nếu có conflicts
git fetch origin
git merge origin/main
```

## 🛠️ Useful Git Commands

```bash
# Xem history
git log --oneline

# Xem thay đổi chưa commit
git diff

# Undo changes (chưa add)
git checkout -- filename

# Unstage file (đã add nhưng chưa commit)
git reset HEAD filename

# Undo last commit (giữ changes)
git reset --soft HEAD~1

# Xem remote URL
git remote -v

# Đổi remote URL
git remote set-url origin NEW_URL
```

## ⚠️ Lỗi thường gặp

### 1. "Permission denied (publickey)"

**Giải pháp:** Dùng HTTPS thay vì SSH, hoặc setup SSH key

```bash
# Dùng HTTPS
git remote set-url origin https://github.com/USERNAME/caroud.git
```

### 2. "fatal: remote origin already exists"

**Giải pháp:**

```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/caroud.git
```

### 3. "Updates were rejected"

**Giải pháp:** Pull trước rồi mới push

```bash
git pull origin main --rebase
git push origin main
```

### 4. Accidentally committed sensitive file

**Giải pháp:** Remove from git history

```bash
# Remove file khỏi git nhưng giữ local
git rm --cached backend/.env

# Commit the removal
git commit -m "chore: remove .env from git"

# Push
git push
```

## 📦 Tạo Release (Optional)

Khi hoàn thành version:

```bash
# Tạo tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0

# Hoặc push tất cả tags
git push --tags
```

Sau đó tạo Release trên GitHub từ tag này.

## 📝 Best Practices

1. ✅ **Commit thường xuyên** với messages rõ ràng
2. ✅ **Pull trước khi push** để tránh conflicts
3. ✅ **Không commit files lớn** (>50MB)
4. ✅ **Review code trước khi commit**
5. ✅ **Dùng branches** cho features mới
6. ✅ **Write meaningful commit messages**
7. ✅ **Test trước khi push**

## 🎯 Commit Message Examples

**Good ✅:**
```bash
git commit -m "feat: add WebSocket support for online multiplayer"
git commit -m "fix: resolve ELO calculation bug in matchmaking"
git commit -m "docs: update API documentation for new endpoints"
git commit -m "refactor: improve AI algorithm performance"
```

**Bad ❌:**
```bash
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
git commit -m "aaa"
```

## 📚 Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Happy Coding! 🚀**
