# Contributing to Caro Game

Thank you for your interest in contributing to the Caro Game project! This document provides guidelines for contributing.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/caroud.git
   cd caroud
   ```
3. **Set up the development environment** following [SETUP.md](SETUP.md)

## 🔄 Development Workflow

1. **Create a new branch** for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** on GitHub

## 📝 Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat: add online multiplayer support"
git commit -m "fix: resolve ELO calculation bug"
git commit -m "docs: update API documentation"
```

## 🧪 Testing

Before submitting a PR:

1. **Run backend tests:**
   ```bash
   cd backend
   source venv/bin/activate
   pytest
   ```

2. **Test frontend:**
   ```bash
   cd frontend
   npm test
   ```

3. **Manual testing:**
   - Test all game modes (local, AI, online)
   - Verify authentication works
   - Check leaderboard updates correctly

## 🎨 Code Style

### Python (Backend)
- Follow [PEP 8](https://pep8.org/)
- Use meaningful variable names
- Add docstrings to functions/classes
- Maximum line length: 120 characters

### JavaScript/React (Frontend)
- Use ES6+ features
- Functional components with hooks
- Meaningful component/variable names
- Follow existing code structure

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New features include tests
- [ ] Documentation updated if needed
- [ ] No console errors or warnings
- [ ] Branch is up to date with main

### PR Description Should Include

1. **What** - What changes were made
2. **Why** - Why these changes were needed
3. **How** - How the changes solve the problem
4. **Testing** - How to test the changes
5. **Screenshots** - If UI changes are involved

**Example:**
```markdown
## Description
Implements online multiplayer using WebSocket

## Changes
- Added WebSocket client in React
- Implemented room management
- Added matchmaking UI

## Testing
1. Open two browsers
2. Login as different users
3. Both join matchmaking
4. Play a game together

## Screenshots
[Add screenshots here]
```

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - Detailed steps
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, browser, versions
6. **Screenshots/Logs** - If applicable

## 💡 Suggesting Features

For feature requests:

1. **Use Case** - Why is this feature needed?
2. **Proposed Solution** - How should it work?
3. **Alternatives** - Other approaches considered
4. **Additional Context** - Mockups, examples, etc.

## 🌳 Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-refactored` - Code refactoring
- `test/what-tested` - Tests

## 🏗️ Project Structure

```
caroud/
├── backend/          # Django backend
│   ├── users/       # User management
│   ├── game/        # Game logic
│   ├── matchmaking/ # Matchmaking system
│   └── ai/          # AI opponent
├── frontend/        # React frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
└── docs/            # Documentation
```

## 📚 Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Django Channels](https://channels.readthedocs.io/)
- [AWS Documentation](https://docs.aws.amazon.com/)

## ❓ Questions?

If you have questions:
- Check existing [Issues](https://github.com/YOUR_USERNAME/caroud/issues)
- Read the [Documentation](README.md)
- Ask in [Discussions](https://github.com/YOUR_USERNAME/caroud/discussions)

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎮
