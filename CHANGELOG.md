# Changelog

All notable changes to this project will be documented in this file.

---

## November 28, 2025

We released [v1.2.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v1.2.0) of Financial Advisor. This includes the following fixes and improvements:

### Features

#### Transaction Classification - [PR #106](https://github.com/igortacu/FinancialAdvisor/pull/106) - @Nichita111
- **ML Pipeline Integration**: Implemented the classification model into the data processing pipeline for real-time transaction analysis
- **Smart Categorization**: Added regex-based merchant categorization for Groceries, Fuel, Utilities, and more
- **Risk Assessment**: Introduced heuristic-based risk analysis to flag high-value or unusual transactions
- **Actionable Advice**: System now provides contextual financial advice based on spending patterns
- **LLM Weights**: Added new weights for the Large Language Model to improve categorization accuracy
- **Documentation**: Updated documentation for the classification system

#### Forecast Integration - [PR #104](https://github.com/igortacu/FinancialAdvisor/pull/104) - @inap235
- **Python ML Backend**: Integrated a Python-based machine learning model to forecast user spending
- **New API Service**: Added a FastAPI server (`Forecast/ml_api.py`) for serving predictions
- **Supabase Integration**: Added support for fetching training data from Supabase
- **Analytics Visualization**: Added "Cash Flow Forecast" chart to Analytics screen
- **Dynamic Time Periods**: Added support for 1M, 3M, 6M, and 1Y forecast views

#### Insights Fix - [PR #103](https://github.com/igortacu/FinancialAdvisor/pull/103) - @inap235
- **Market Insights**: Fixed market insights display and data fetching
- **Portfolio Growth**: Fixed portfolio growth to show data for different domains
- **Monthly Mix**: Added monthly mix with savings and spendings visualization
- **Performance**: Improved speed for fetching data from Finnhub
- **Tests**: Added tests for insights page

### Infrastructure

#### CI/CD Pipeline - [PR #76](https://github.com/igortacu/FinancialAdvisor/pull/76), [PR #101](https://github.com/igortacu/FinancialAdvisor/pull/101), [PR #102](https://github.com/igortacu/FinancialAdvisor/pull/102) - @igortacu
- **GitHub Actions Workflow**: Implemented automated CI/CD pipeline for testing and deployment
- **ESLint Integration**: Added automated code quality checks on every PR
- **TypeScript Verification**: Set up TypeScript compilation checks in CI
- **Husky Pre-commit Hooks**: Added local development quality gates
- **CI Fixes**: Fixed npm install and husky skip in CI environment
- **PR/Issue Templates**: Added professional templates for PRs and issues

---

## November 25, 2025

We released [v1.1.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v1.1.0) of Financial Advisor. This includes the following fixes and improvements:

### Features

#### Investments Page Overhaul - [PR #73](https://github.com/igortacu/FinancialAdvisor/pull/73) - @igortacu
- **Multi-Brokerage Account Selection**: Added support for connecting to multiple brokerage accounts
  - Interactive Brokers (Stocks & ETFs)
  - Coinbase (Cryptocurrency)
  - Fidelity (Mixed Portfolio)
- **Animated Connection Flow**: Impressive multi-step login animation with progress tracking
- **Market Watch Redesign**: New horizontal scrolling cards with real-time sparklines
- **Modern Charts UI/UX**: Enhanced Victory charts with beautiful color palette and styling
- **Yahoo Finance Integration**: Switched from Finnhub to Yahoo Finance API with Supabase proxy
- **Broker Switch Feature**: Easy switching between connected brokerage accounts

#### Settings Page - [PR #72](https://github.com/igortacu/FinancialAdvisor/pull/72) - @loredanatoredita
- **Profile Avatar Display**: Fixed avatar image rendering with instant save
- **Optimistic Updates**: Profile changes save instantly with optimistic UI updates

#### Authentication Improvements - [PR #71](https://github.com/igortacu/FinancialAdvisor/pull/71) - @loredanatoredita
- **UTF-8 Diacritics Support**: Properly decode UTF-8 characters in JWT tokens
- **Instant OAuth Login**: Performance improvement by decoding JWT directly
- **OAuth Callback Handling**: Fixed login redirect issues in AuthProvider

#### Analytics Page - [PR #70](https://github.com/igortacu/FinancialAdvisor/pull/70) - @loredanatoredita
- **TypeScript Safety**: Improved type safety across analytics components
- **Accessibility**: Added accessibility labels to interactive elements
- **Realistic Mock Data**: Added Q4 mock data for better demonstration
- **Responsive Charts**: Mobile-compatible chart widths
- **Category Share Chart**: New pie chart for expense categories
- **Monthly Cash Flow**: Current month cash flow visualization
- **Editable Analytics**: User-editable monthly spending data

### Bug Fixes

- Fixed NaN errors in Victory chart `cornerRadius` and `easing` props
- Added mock data fallback when Yahoo Finance blocks requests
- Removed User-Agent header causing proxy request failures
- Fixed memory leaks with proper useEffect cleanup
- Replaced `any` types with proper TypeScript definitions
- Removed unused DCAPlan type and MOCK_DCA variable

### Security

- **Dependency Updates** - [PR #68](https://github.com/igortacu/FinancialAdvisor/pull/68), [PR #67](https://github.com/igortacu/FinancialAdvisor/pull/67)
  - Bumped `glob` to fix security vulnerability
  - Bumped `js-yaml` to latest secure version
  - Bumped `tar` package ([PR #62](https://github.com/igortacu/FinancialAdvisor/pull/62))

### Chores

- **Disabled Registration** - [PR #66](https://github.com/igortacu/FinancialAdvisor/pull/66) - @Adelina1905: Temporarily disabled new user registration
- **Localization Template** - [PR #61](https://github.com/igortacu/FinancialAdvisor/pull/61) - @Adelina1905: Added currency localization template
- **Model Integration** - [PR #65](https://github.com/igortacu/FinancialAdvisor/pull/65) - @Nichita111: FastAPI model server setup
- **Changelog & Contributions** - [PR #64](https://github.com/igortacu/FinancialAdvisor/pull/64) - @Adelina1905: Added contribution guidelines

### Documentation

- Added submission details for Toderita Loredana
- Fixed mobile opening issues
- Enhanced forecast documentation

---

## November 1, 2025

We released [v1.0.1](https://github.com/igortacu/FinancialAdvisor/releases/tag/v1.0.1) of Financial Advisor. This includes the following fixes and improvements:

### Bug Fixes

- **Registration Alert** - [PR #63](https://github.com/igortacu/FinancialAdvisor/pull/63) - @Adelina1905: Fixed `handleRegistration()` alert to work on web and mobile
- **Authentication Updates**: Improved commit handling for auth flow

---

## October 28, 2025

We released [v1.0.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v1.0.0) of Financial Advisor. This includes the following fixes and improvements:

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

---

## October 27, 2025

We released [v0.9.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v0.9.0) of Financial Advisor. This includes the following fixes and improvements:

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

---

## October 26, 2025

We released [v0.8.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v0.8.0) of Financial Advisor. This includes the following fixes and improvements:

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

---

## October 24, 2025

We released [v0.7.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v0.7.0) of Financial Advisor. This includes the following fixes and improvements:

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

---

## October 22, 2025

We released [v0.6.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v0.6.0) of Financial Advisor. This includes the following fixes and improvements:

### Added
- Financial Analysis Features - [PR #50](https://github.com/igortacu/FinancialAdvisor/pull/50):
  - Future revenue projection engine
  - Advanced cash flow analysis
  - Monthly financial forecasting
  - Balance projection system
- New analytical tools and visualizations

### Fixed
- Fixed issue with registering not saving on db - [PR #49](https://github.com/igortacu/FinancialAdvisor/pull/49)

### Enhanced
- Financial calculation accuracy
- Data visualization components
- User interaction with financial data

---

## October 20, 2025

We released [v0.5.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v0.5.0) of Financial Advisor. This includes the following fixes and improvements:

### Added
- Robust user authentication system
- Secure database integration
- Enhanced user management

### Fixed
- Authentication flow issues
- Database connectivity
- User data persistence

---

## October 2, 2025

We released [v0.4.0](https://github.com/igortacu/FinancialAdvisor/releases/tag/v0.4.0) of Financial Advisor. This includes the following fixes and improvements:

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
