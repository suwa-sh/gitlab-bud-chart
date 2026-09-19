# Contributing to GitLab Bud Chart

Thank you for your interest in contributing to GitLab Bud Chart! This document provides guidelines for contributing to this project.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for frontend development)
- **Python** 3.8+ (for backend development)
- **Git** for version control
- **GitLab** instance access (for testing)

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd gitlab-bud-chart
   ```

2. **Environment setup**

   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your GitLab credentials
   # NEVER commit .env files!
   ```

3. **Install dependencies**

   ```bash
   # Run setup script
   ./scripts/setup.sh

   # Or manually:
   # Backend
   cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

   # Frontend
   cd frontend && npm install && npx playwright install
   ```

## 🛡️ Security Guidelines

### **🔒 NEVER Commit Sensitive Data**

- **GitLab tokens and API keys**
- **Environment files (`.env`, `.env.local`, etc.)**
- **Configuration files with secrets**
- **Database files**
- **Private keys or certificates**

### **✅ Use .env.example Template**

- Always update `.env.example` when adding new environment variables
- Document what each variable is for
- Provide example values (not real secrets!)

### **🔍 Before Committing**

```bash
# Check what you're about to commit
git status
git diff --cached

# Verify no sensitive files are included
git ls-files | grep -E "\.(env|key|secret)" && echo "❌ Sensitive files detected!" || echo "✅ Safe to commit"
```

## 📁 Project Structure

```
gitlab-bud-chart/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API clients
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx
│   ├── tests/
│   │   ├── unit/           # Unit tests
│   │   └── e2e/            # Playwright E2E tests
│   └── package.json        # Node.js dependencies
├── docs/                   # Documentation
│   └── develop/            # Development documentation
├── scripts/                # Automation scripts
└── .env.example            # Environment template
```

## 🧪 Testing

### **Backend Tests**

```bash
cd backend
source venv/bin/activate
pytest tests/ -v --cov=app
```

### **Frontend Unit Tests**

```bash
cd frontend
npm run test:unit
```

### **E2E Tests**

```bash
cd frontend
npm run test:e2e
```

### **Full Test Suite**

```bash
./scripts/run-tests.sh  # Will be created in future tasks
```

## 📝 Code Style

### **Backend (Python)**

- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Maximum line length: 88 characters

### **Frontend (TypeScript)**

- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Consistent naming conventions

### **Commits**

- Use conventional commit format
- Examples:
  - `feat(frontend): add burn-up chart component`
  - `fix(backend): resolve GitLab API timeout issue`
  - `docs: update installation guide`
  - `test: add E2E tests for dashboard`

## 🔄 Development Workflow

### **1. Create Feature Branch**

```bash
git checkout -b feature/your-feature-name
```

### **2. Make Changes**

- Write code following project conventions
- Add/update tests
- Update documentation if needed

### **3. Test Locally**

```bash
# Run all tests
npm run test  # Frontend
pytest        # Backend

# Test E2E
npm run test:e2e
```

### **4. Commit Changes**

```bash
git add .
git commit -m "feat: add new feature"
```

### **5. Push and Create PR**

```bash
git push origin feature/your-feature-name
# Create pull request via GitHub interface
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment details** (OS, Node.js/Python versions)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Error messages or logs**
5. **Screenshots if applicable**

## 💡 Feature Requests

For new features:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** and problem it solves
3. **Provide implementation suggestions** if possible
4. **Consider backward compatibility**

## 📋 Pull Request Guidelines

### **Before Submitting**

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] No sensitive data in commits
- [ ] Conventional commit messages

### **PR Description Should Include**

- **Summary** of changes
- **Testing** performed
- **Screenshots** for UI changes
- **Breaking changes** if any

## ⚠️ Important Notes

### **GitLab Credentials**

- Use personal access tokens, not passwords
- Required scopes: `api`, `read_user`, `read_repository`
- Store in `.env` file (never commit!)

### **Supported GitLab Versions**

- GitLab CE/EE 13.0+
- Self-hosted and GitLab.com
- API v4

### **Browser Support**

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🆘 Getting Help

- **Issues**: Create a GitHub issue
- **Documentation**: Check `docs/` directory
- **API Reference**: FastAPI docs at `http://localhost:8000/docs`

## 📜 License

This project is licensed under [MIT License](LICENSE).

---

**Remember**: Never commit sensitive data! When in doubt, ask before committing.
