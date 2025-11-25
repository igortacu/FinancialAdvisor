# Contributing to Financial Advisor

Thank you for your interest in contributing to Financial Advisor! This document provides guidelines and instructions for contributing.

## 🚀 Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/FinancialAdvisor.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Commit using conventional commits: `npm run commit`
7. Push and create a PR

## 📝 Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages and automated changelog generation.

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add biometric login` |
| `fix` | Bug fix | `fix(charts): resolve NaN error in pie chart` |
| `docs` | Documentation only | `docs(readme): update installation steps` |
| `style` | Code style (formatting, etc.) | `style(lint): fix eslint warnings` |
| `refactor` | Code refactoring | `refactor(api): simplify fetch logic` |
| `perf` | Performance improvement | `perf(charts): optimize rendering` |
| `test` | Adding tests | `test(auth): add login unit tests` |
| `build` | Build system changes | `build(deps): upgrade expo to v54` |
| `ci` | CI configuration | `ci(github): add deploy workflow` |
| `chore` | Maintenance tasks | `chore(deps): update lockfile` |
| `security` | Security improvements | `security(auth): fix token vulnerability` |
| `revert` | Revert a commit | `revert: feat(auth): add biometric login` |

### Scopes (Optional)

Common scopes for this project:
- `auth` - Authentication related
- `analytics` - Analytics page
- `investments` - Investments page
- `transactions` - Transactions page
- `profile` - Profile/settings
- `charts` - Chart components
- `api` - API and data fetching
- `ui` - UI components
- `deps` - Dependencies

### Examples

```bash
# Feature
feat(investments): add multi-brokerage account selection

# Bug fix
fix(auth): resolve JWT decoding for UTF-8 characters

# With body
feat(charts): add sparkline charts for market watch

Added real-time sparkline charts showing price movement
for each position in the market watch section.

Closes #73

# Breaking change
feat(api)!: switch from Finnhub to Yahoo Finance

BREAKING CHANGE: API responses now use Yahoo Finance format.
Update all consumers to handle new response structure.
```

## 🛠️ Development Workflow

### Using Commitizen (Recommended)

```bash
# Interactive commit helper
npm run commit
```

This will guide you through creating a properly formatted commit message.

### Manual Commits

If you prefer manual commits, ensure they follow the conventional format:

```bash
git commit -m "feat(scope): description"
```

Commits are validated by commitlint via husky hooks.

## 📦 Release Process

### Creating a Release

```bash
# Automatic version bump based on commits
npm run release

# Specific version bumps
npm run release:patch  # 1.0.0 -> 1.0.1
npm run release:minor  # 1.0.0 -> 1.1.0
npm run release:major  # 1.0.0 -> 2.0.0

# Dry run (preview without changes)
npm run release:dry
```

### What the Release Script Does

1. Analyzes commits since last release
2. Bumps version in `package.json`
3. Updates `CHANGELOG.md`
4. Creates a git commit
5. Creates a git tag

### Manual Changelog Update

```bash
# Update changelog only
npm run changelog
```

## 🔍 Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Run `npm run lint` before committing
- Pre-commit hooks will validate your code

## 🐛 Bug Reports

When reporting bugs, please include:
- Device/Platform (iOS, Android, Web)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 💡 Feature Requests

For feature requests, please:
- Check existing issues first
- Describe the use case
- Explain the expected behavior

## 📄 Pull Request Guidelines

1. **Branch naming**: `feature/`, `fix/`, `docs/`, `refactor/`
2. **PR title**: Follow conventional commit format
3. **Description**: Explain what and why
4. **Tests**: Add/update if applicable
5. **Documentation**: Update if needed

## 📞 Questions?

Feel free to open an issue for any questions!
