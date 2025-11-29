# Submission 2 - Igor Tacu

## Team Information

- **Team Number:** 3
- **Project Name:** Financial Advisor

## Project Links

- **Repository:** https://github.com/igortacu/FinancialAdvisor
- **Task Board (GitHub Issues):** https://github.com/igortacu/FinancialAdvisor/issues
- **Milestones:** https://github.com/igortacu/FinancialAdvisor/milestones

## Teammates

- Igor Tacu - FAF-242
- Toderita Loredana - FAF-241
- Pancenco Ina - FAF-242
- Temciuc Adelina - FAF-242
- Rusnac Nikita - FAF-242

## Mentor

- Gogoi Elena & Strainu Dragos

## Changelog

- **Link:** https://github.com/igortacu/FinancialAdvisor/blob/main/CHANGELOG.md#november-28-2025

---

## My Contribution (Igor Tacu)

### Summary

From November 1st to November 29th, 2025, I focused on two main areas:
1. **CI/CD Pipeline Implementation** - Setting up automated workflows for the project
2. **Infrastructure & Configuration Fixes** - Resolving Metro bundler and monorepo configuration issues
3. **Feature Development** - Investments page overhaul with Yahoo Finance integration

---

### Pull Requests

#### 1. CI/CD Pipeline Setup - PR #76
- **Link:** https://github.com/igortacu/FinancialAdvisor/pull/76
- **Description:** Implemented GitHub Actions CI/CD pipeline for automated testing and deployment
- **Key Changes:**
  - Added `.github/workflows/ci.yml` for continuous integration
  - Configured automated linting with ESLint
  - Set up TypeScript type checking in CI pipeline

#### 2. CI Pipeline Fixes - PR #101
- **Link:** https://github.com/igortacu/FinancialAdvisor/pull/101
- **Description:** Fixed CI pipeline issues with npm install and husky
- **Key Changes:**
  - Skip husky in CI environment
  - Use `npm install` instead of `npm ci` for better compatibility
  - Fixed cache configuration issues

#### 3. PR/Issue Templates - PR #102
- **Link:** https://github.com/igortacu/FinancialAdvisor/pull/102
- **Description:** Added professional PR and issue templates
- **Key Changes:**
  - Created `.github/PULL_REQUEST_TEMPLATE.md`
  - Created issue templates for bugs and features
  - Added proper formatting and checklists

#### 4. Metro Bundler Configuration Fix
- **Commit:** https://github.com/igortacu/FinancialAdvisor/commit/81206bf
- **Description:** Fixed critical Metro bundler issue preventing app startup
- **Key Changes:**
  - Updated `metro.config.js` for npm workspaces monorepo support
  - Configured `watchFolders` to include monorepo root
  - Set up `nodeModulesPaths` for proper module resolution
  - Fixed `tsconfig.json` path resolution for ESLint compatibility

#### 5. Investments Page Overhaul - PR #73
- **Link:** https://github.com/igortacu/FinancialAdvisor/pull/73
- **Description:** Complete redesign of the investments page
- **Key Changes:**
  - Multi-brokerage account selection (Interactive Brokers, Coinbase, Fidelity)
  - Animated connection flow with progress tracking
  - Market Watch redesign with real-time sparklines
  - Yahoo Finance integration via Supabase proxy
  - Modern Victory charts UI/UX

#### 6. Release Pipeline - PR #74
- **Link:** https://github.com/igortacu/FinancialAdvisor/pull/74
- **Description:** Setup release automation
- **Key Changes:**
  - Added Husky git hooks for commit validation
  - Configured commitlint for conventional commits
  - Added standard-version for automated releases
  - Created `CONTRIBUTING.md` guide

---
