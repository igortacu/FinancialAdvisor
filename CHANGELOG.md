# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2025-11-27

### ✨ Features

#### Forecast Integration - [PR #104](https://github.com/igortacu/FinancialAdvisor/pull/104)
- **Python ML Backend**: Integrated a Python-based machine learning model to forecast user spending
- **New API Service**: Added a FastAPI server (`Forecast/ml_api.py`) for serving predictions
- **Supabase Integration**: Added support for fetching training data from Supabase
- **Analytics Visualization**: Added "Cash Flow Forecast" chart to Analytics screen
- **Dynamic Time Periods**: Added support for 1M, 3M, 6M, and 1Y forecast views

## [1.1.0] - 2025-11-25

### ✨ Features

#### Investments Page Overhaul - [PR #73](https://github.com/igortacu/FinancialAdvisor/pull/73)
- **Multi-Brokerage Account Selection**: Added support for connecting to multiple brokerage accounts
  - Interactive Brokers (Stocks & ETFs)
  - Coinbase (Cryptocurrency)
  - Fidelity (Mixed Portfolio)
- **Animated Connection Flow**: Impressive multi-step login animation with progress tracking
- **Market Watch Redesign**: New horizontal scrolling cards with real-time sparklines
- **Modern Charts UI/UX**: Enhanced Victory charts with beautiful color palette and styling
- **Yahoo Finance Integration**: Switched from Finnhub to Yahoo Finance API with Supabase proxy
- **Broker Switch Feature**: Easy switching between connected brokerage accounts

#### Settings Page - [PR #72](https://github.com/igortacu/FinancialAdvisor/pull/72)
- **Profile Avatar Display**: Fixed avatar image rendering with instant save
- **Optimistic Updates**: Profile changes save instantly with optimistic UI updates

#### Authentication Improvements - [PR #71](https://github.com/igortacu/FinancialAdvisor/pull/71)
- **UTF-8 Diacritics Support**: Properly decode UTF-8 characters in JWT tokens
- **Instant OAuth Login**: Performance improvement by decoding JWT directly
- **OAuth Callback Handling**: Fixed login redirect issues in AuthProvider

#### Analytics Page - [PR #70](https://github.com/igortacu/FinancialAdvisor/pull/70)
- **TypeScript Safety**: Improved type safety across analytics components
- **Accessibility**: Added accessibility labels to interactive elements
- **Realistic Mock Data**: Added Q4 mock data for better demonstration
- **Responsive Charts**: Mobile-compatible chart widths
- **Category Share Chart**: New pie chart for expense categories
- **Monthly Cash Flow**: Current month cash flow visualization
- **Editable Analytics**: User-editable monthly spending data

### 🐛 Bug Fixes

- Fixed NaN errors in Victory chart `cornerRadius` and `easing` props
- Added mock data fallback when Yahoo Finance blocks requests
- Removed User-Agent header causing proxy request failures
- Fixed memory leaks with proper useEffect cleanup
- Replaced `any` types with proper TypeScript definitions
- Removed unused DCAPlan type and MOCK_DCA variable

### 🔒 Security

- **Dependency Updates** - [PR #68](https://github.com/igortacu/FinancialAdvisor/pull/68), [PR #67](https://github.com/igortacu/FinancialAdvisor/pull/67)
  - Bumped `glob` to fix security vulnerability
  - Bumped `js-yaml` to latest secure version
  - Bumped `tar` package ([PR #62](https://github.com/igortacu/FinancialAdvisor/pull/62))

### 🔧 Chores

- **Disabled Registration** - [PR #66](https://github.com/igortacu/FinancialAdvisor/pull/66): Temporarily disabled new user registration
- **Localization Template** - [PR #61](https://github.com/igortacu/FinancialAdvisor/pull/61): Added currency localization template
- **Model Integration** - [PR #65](https://github.com/igortacu/FinancialAdvisor/pull/65): FastAPI model server setup
- **Changelog & Contributions** - [PR #64](https://github.com/igortacu/FinancialAdvisor/pull/64): Added contribution guidelines

### 📚 Documentation

- Added submission details for Toderita Loredana
- Fixed mobile opening issues
- Enhanced forecast documentation

---

## [1.0.1] - 2025-11-01

### 🐛 Bug Fixes

- **Registration Alert** - [PR #63](https://github.com/igortacu/FinancialAdvisor/pull/63): Fixed `handleRegistration()` alert to work on web and mobile
- **Authentication Updates**: Improved commit handling for auth flow

---

## [1.0.0] - 2025-10-28
### Added
- Biometric authentication (Face ID/Touch ID) integration
- Complete profile management system with editable fields
- Advanced budget management system with monthly tracking
- Dark mode support across the application

### Security
- Major security enhancements across the application
- Removed vulnerable dependencies
- Package audit and cleanup
- Improved dependency management

### Changed
- Complete repository restructuring for better organization - [PR #60](https://github.com/igortacu/FinancialAdvisor/pull/60)
- Streamlined development workflow
- Enhanced documentation organization
- Optimized project root structure

## [0.9.0] - 2025-10-27
### Added
- Dynamic budget management features - [PR #59](https://github.com/igortacu/FinancialAdvisor/pull/59):
  - Editable monthly budget allocations
  - Flexible budget adjustment capabilities
  - Smart monthly distribution system
  - Real-time budget tracking
- Enhanced profile system integration - [PR #58](https://github.com/igortacu/FinancialAdvisor/pull/58)
- Advanced budget visualization components

### Changed
- Improved budget distribution algorithms
- Enhanced user interface for budget management
- Upgraded profile page interactions

## [0.8.0] - 2025-10-26
### Added
- New authentication system features - [PR #57](https://github.com/igortacu/FinancialAdvisor/pull/57)
- Enhanced profile management capabilities
- Improved UI components:
  - Hero image implementation
  - Enhanced visual aesthetics
  - Better user flow

### Changed
- Updated media asset management
- Improved authentication flow
- Enhanced user experience patterns

## [0.7.0] - 2025-10-24
### Added
- Comprehensive dark mode implementation
- New profile features:
  - Profile tab in main navigation
  - Enhanced user settings
  - Improved logout flow
- Background theming system

### Fixed
- Multiple UI/UX improvements:
  - JSX syntax optimizations
  - Scrolling behavior in login
  - Authentication screen layouts
  - Background handling logic

### Security
- Enhanced environment security - [PR #51](https://github.com/igortacu/FinancialAdvisor/pull/51):
  - Secure environment variable handling
  - Added .env.example template
  - Improved configuration management

### Changed
- Major documentation improvements
- Enhanced development workflow
- Updated dependency management
- Improved asset handling

## [0.6.0] - 2025-10-22
### Added
- Financial Analysis Features - [PR #50](https://github.com/igortacu/FinancialAdvisor/pull/50):
  - Future revenue projection engine
  - Advanced cash flow analysis
  - Monthly financial forecasting
  - Balangitce projection system
- New analytical tools and visualizations

### Fixed
- Fixed issue with registering not saving on db - [PR #49](https://github.com/igortacu/FinancialAdvisor/pull/49)

### Enhanced
- Financial calculation accuracy
- Data visualization components
- User interaction with financial data

## [0.5.0] - 2025-10-20
### Added
- Robust user authentication system
- Secure database integration
- Enhanced user management

### Fixed
- Authentication flow issues
- Database connectivity
- User data persistence

## [0.4.0] - 2025-10-02
### Added
- Comprehensive architecture documentation
- Project structure definition
- Development guidelines

### Security
- Environment configuration security
- Database security measures
- Virtual environment management
- Dependency security protocols

### Infrastructure
- Initial project setup
- Basic development workflow
- Documentation framework
- **Team Number**: 3
- **Project Name**: Financial Advisor
- **Repository**: [https://github.com/igortacu/FinancialAdvisor](https://github.com/igortacu/FinancialAdvisor)

### Team Members
- Igor Tacu - FAF-242
- Toderita Loredana - FAF-241
- Pancenco Ina - FAF-242
- Temciuc Adelina - FAF-242
- Rusnac Nikita - FAF-242

---

## Pull Requests (November 2025)

| PR | Title | Type | Date |
|----|-------|------|------|
| [#73](https://github.com/igortacu/FinancialAdvisor/pull/73) | Investments Page Fix | feat | 2025-11-25 |
| [#72](https://github.com/igortacu/FinancialAdvisor/pull/72) | Settings Page Fix | fix | 2025-11-20 |
| [#71](https://github.com/igortacu/FinancialAdvisor/pull/71) | Login Page Auth Fix | fix | 2025-11-18 |
| [#70](https://github.com/igortacu/FinancialAdvisor/pull/70) | Analytics Page Improvements | feat | 2025-11-15 |
| [#69](https://github.com/igortacu/FinancialAdvisor/pull/69) | Ina Tasks | feat | 2025-11-12 |
| [#68](https://github.com/igortacu/FinancialAdvisor/pull/68) | Bump glob | security | 2025-11-10 |
| [#67](https://github.com/igortacu/FinancialAdvisor/pull/67) | Bump js-yaml | security | 2025-11-08 |
| [#66](https://github.com/igortacu/FinancialAdvisor/pull/66) | Disable Registration | chore | 2025-11-06 |
| [#65](https://github.com/igortacu/FinancialAdvisor/pull/65) | Model | feat | 2025-11-05 |
| [#64](https://github.com/igortacu/FinancialAdvisor/pull/64) | Adding Changelog | docs | 2025-11-04 |
| [#63](https://github.com/igortacu/FinancialAdvisor/pull/63) | Authentication Updating | fix | 2025-11-02 |
| [#62](https://github.com/igortacu/FinancialAdvisor/pull/62) | Bump tar | security | 2025-11-01 |

---

## Pull Requests (October 2025)

| PR | Title | Type | Date |
|----|-------|------|------|
| [#61](https://github.com/igortacu/FinancialAdvisor/pull/61) | Currency | feat | 2025-10-30 |
| [#60](https://github.com/igortacu/FinancialAdvisor/pull/60) | Organization fixes | fix | 2025-10-28 |
| [#59](https://github.com/igortacu/FinancialAdvisor/pull/59) | Budgets | feat | 2025-10-27 |
| [#58](https://github.com/igortacu/FinancialAdvisor/pull/58) | Auth/profile | feat | 2025-10-27 |
| [#57](https://github.com/igortacu/FinancialAdvisor/pull/57) | Loredana tasks before midterm | feat | 2025-10-26 |
| [#51](https://github.com/igortacu/FinancialAdvisor/pull/51) | Env | chore | 2025-10-24 |
| [#50](https://github.com/igortacu/FinancialAdvisor/pull/50) | Analytics | feat | 2025-10-22 |
| [#49](https://github.com/igortacu/FinancialAdvisor/pull/49) | fixed issue with registering not saving on db | fix | 2025-10-22 |

---

## Version Links

[1.1.0]: https://github.com/igortacu/FinancialAdvisor/compare/v1.0.0...v1.1.0
[1.0.1]: https://github.com/igortacu/FinancialAdvisor/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/igortacu/FinancialAdvisor/releases/tag/v1.0.0
