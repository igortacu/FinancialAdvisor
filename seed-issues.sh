#!/usr/bin/env bash
set -euo pipefail

: "${REPO:?Set REPO, e.g. export REPO=igortacu/FinancialAdvisor}"

# ---------- Labels ----------
mklabel() { gh label create "$1" --color "$2" --description "$3" -R "$REPO" 2>/dev/null || true; }

mklabel "priority:P0" "B60205" "Must do now"
mklabel "priority:P1" "D93F0B" "Do next"
mklabel "priority:P2" "FBCA04" "Nice to have"
mklabel "type:bug" "D73A4A" "Defect"
mklabel "type:enhancement" "A2EEEF" "Feature"
mklabel "type:chore" "C5DEF5" "Maintenance"
mklabel "type:security" "5319E7" "Security"
mklabel "type:documentation" "0075CA" "Docs"
mklabel "type:testing" "0E8A16" "Tests"
mklabel "area:infra" "BFD4F2" "Tooling/CI"
mklabel "area:domain" "5319E7" "Money/FX logic"
mklabel "area:data" "1D76DB" "DB/RLS"
mklabel "area:ux" "7057FF" "UX/UI"
mklabel "area:observability" "B60205" "Logs/metrics"
mklabel "area:performance" "5319E7" "Perf"
mklabel "good first issue" "7057FF" "Starter task"
mklabel "a11y" "000000" "Accessibility"

# ---------- Milestones ----------
# Today: 2025-10-01 (Europe/Chisinau)
mkmilestone() { gh milestone create "$1" --due-date "$2" -R "$REPO" 2>/dev/null || true; }

mkmilestone "M0 • Repo hygiene"        "2025-10-04"
mkmilestone "M1 • Tooling & CI"        "2025-10-08"
mkmilestone "M2 • Domain & Data"       "2025-10-15"
mkmilestone "M3 • UX & A11y"           "2025-10-22"
mkmilestone "M4 • Observability"       "2025-10-24"
mkmilestone "M5 • Delivery & Docs"     "2025-10-29"

# Helper to create issues
new() {
  local title="$1"; shift
  gh issue create -R "$REPO" --title "$title" "$@"
}

# ---------- M0 • Repo hygiene ----------
new "Add README with setup, scripts, env, screenshots" \
  --milestone "M0 • Repo hygiene" \
  --label "priority:P0" --label "type:documentation" \
  --body $'Goal: make onboarding take under 5 minutes.\n\nInclude:\n- Purpose and feature list\n- Tech stack\n- Local setup (npm, Expo/Web)\n- Env vars (.env.example)\n- Scripts table (dev, build, start, lint, test)\n- Screenshots/GIF of main flows\n- Security notes (no secrets in repo)'

new "Tighten .gitignore and remove IDE/Expo artifacts" \
  --milestone "M0 • Repo hygiene" \
  --label "priority:P0" --label "type:chore" \
  --body $'- Keep source, config, lockfiles\n- Exclude .idea, .expo, build outputs, logs, .DS_Store\n- Delete committed junk\n- Add .gitattributes for text normalization'

new "Add LICENSE headers to source files (GPL-3.0)" \
  --milestone "M0 • Repo hygiene" \
  --label "priority:P1" --label "type:chore" \
  --body $'- Ensure each source file includes the GPL-3.0 notice\n- Match root LICENSE'

new "Restructure repo: /app + /packages or single /app" \
  --milestone "M0 • Repo hygiene" \
  --label "priority:P1" --label "type:chore" \
  --body $'- Pick one structure\n- Move code into /app\n- Keep configs at root\n- Update paths in scripts'

new "Issue/PR templates" \
  --milestone "M0 • Repo hygiene" \
  --label "priority:P1" --label "type:documentation" \
  --body $'- Add .github/ISSUE_TEMPLATE/bug.yml and feature.yml\n- Add PULL_REQUEST_TEMPLATE.md\n- Include checklists for tests, docs, screenshots'

# ---------- M1 • Tooling & CI ----------
new "Enable TypeScript strict mode" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P0" --label "type:chore" --label "area:infra" \
  --body $'- tsconfig: "strict": true, noImplicitAny, noUncheckedIndexedAccess\n- Fix resulting type errors'

new "Add ESLint + Prettier + import/order" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P0" --label "type:chore" --label "area:infra" \
  --body $'- ESLint config for React/TS\n- Prettier config\n- import/order plugin\n- Add npm scripts: lint, lint:fix'

new "Pre-commit hooks with Husky + lint-staged" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P1" --label "type:chore" --label "area:infra" \
  --body $'- Run eslint --fix and prettier on staged files\n- Block commits on errors'

new "Unit tests setup (Vitest/Jest) + coverage" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P0" --label "type:testing" --label "area:infra" \
  --body $'- Add Vitest or Jest\n- Configure ts-node/ts-jest as needed\n- Add coverage threshold (80%)\n- Sample tests for Money utils'

new "E2E tests with Playwright (smoke)" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P1" --label "type:testing" --label "area:infra" \
  --body $'- Cover critical flows: add transaction, edit category, create budget\n- Run in CI headless'

new "GitHub Actions CI: typecheck, lint, test" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P0" --label "area:infra" --label "type:chore" \
  --body $'- Matrix: node LTS\n- Jobs: install, typecheck, lint, test, upload coverage\n- Status badge in README'

new "Dependabot + CodeQL" \
  --milestone "M1 • Tooling & CI" \
  --label "priority:P1" --label "type:security" --label "area:infra" \
  --body $'- Enable npm weekly updates\n- Enable GitHub Advanced Security code scanning\n- Fix alerts promptly'

# ---------- M2 • Domain & Data ----------
new "Introduce Money value object (decimals, no floats)" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P0" --label "type:enhancement" --label "area:domain" \
  --body $'- Create Money(amountMinor: bigint, currency: string)\n- Helpers: add, sub, mul, div, format\n- Replace raw number usage across code'

new "FX normalization to base currency" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P0" --label "type:enhancement" --label "area:domain" \
  --body $'- Store original amount + currency + rate + timestamp\n- Store normalized amount in base currency\n- Show both in UI'

new "Transaction schema and test fixtures" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P1" --label "type:testing" --label "area:data" \
  --body $'- Define types: Transaction, Account, Category\n- Seed realistic fixtures including refunds, transfers, splits'

new "Categorization engine (rules + manual override)" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P1" --label "type:enhancement" --label "area:domain" \
  --body $'- Rules: merchant match, MCC, text tokens\n- Confidence score\n- Manual override with audit trail'

new "Budgets by category with envelope carryover" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P1" --label "type:enhancement" --label "area:domain" \
  --body $'- Monthly budgets per category\n- Carryover option\n- Alerts on 80/100% thresholds'

new "Simple forecast (30/90 days cash flow)" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P2" --label "type:enhancement" --label "area:domain" \
  --body $'- Project balance based on recurring inflows/outflows\n- Show confidence band'

new "Data privacy: Delete My Data flow" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P0" --label "type:security" --label "area:data" \
  --body $'- Add user-initiated deletion\n- Wipe PII and financial records\n- Log deletion event'

new "Env management: .env.example + secrets policy" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P0" --label "type:chore" --label "area:infra" \
  --body $'- Add .env.example\n- Document secret handling\n- Refuse to start if critical env vars missing'

new "Supabase RLS: strict policies + tests" \
  --milestone "M2 • Domain & Data" \
  --label "priority:P0" --label "type:security" --label "area:data" \
  --body $'- Deny by default\n- Allow row access only for owner\n- Write unit tests for policies'

# ---------- M3 • UX & A11y ----------
new "Home dashboard: balance trend, spend by category, upcoming bills" \
  --milestone "M3 • UX & A11y" \
  --label "priority:P1" --label "type:enhancement" --label "area:ux" \
  --body $'- Above-the-fold KPIs\n- Mini charts\n- Links to budgets and transactions'

new "Transactions list: virtualization + filters + search" \
  --milestone "M3 • UX & A11y" \
  --label "priority:P1" --label "type:enhancement" --label "area:performance" --label "area:ux" \
  --body $'- Infinite scroll/virtual list\n- Filters by account, category, amount, date\n- Free text search on merchant/notes'

new "Empty states, loading skeletons, error boundaries" \
  --milestone "M3 • UX & A11y" \
  --label "priority:P1" --label "type:enhancement" --label "area:ux" \
  --body $'- Add consistent states across screens\n- Show retry on failure'

new "Form validation for amounts, dates, currency" \
  --milestone "M3 • UX & A11y" \
  --label "priority:P0" --label "type:bug" --label "area:ux" \
  --body $'- Block invalid inputs\n- Inline messages with examples\n- Unit tests for validators'

new "Localization for ro-MD (numbers, dates, currency)" \
  --milestone "M3 • UX & A11y" \
  --label "priority:P2" --label "type:enhancement" --label "area:ux" \
  --body $'- Use Intl APIs\n- Format MDL and RON correctly'

new "Accessibility baseline (WCAG AA)" \
  --milestone "M3 • UX & A11y" \
  --label "priority:P1" --label "a11y" --label "type:enhancement" \
  --body $'- Color contrast\n- Keyboard focus order\n- ARIA labels for charts and controls\n- Screen reader labels on buttons'

# ---------- M4 • Observability ----------
new "App analytics events" \
  --milestone "M4 • Observability" \
  --label "priority:P1" --label "area:observability" --label "type:enhancement" \
  --body $'- Track: AddTransaction, EditCategory, CreateBudget, ImportCSV, HitBudgetLimit\n- Respect privacy (no PII)'

new "Error reporting with Sentry" \
  --milestone "M4 • Observability" \
  --label "priority:P1" --label "area:observability" --label "type:chore" \
  --body $'- Init Sentry\n- Upload source maps in CI\n- Tag releases and environment'

new "Feature flags (env-driven)" \
  --milestone "M4 • Observability" \
  --label "priority:P2" --label "area:observability" --label "type:enhancement" \
  --body $'- Toggle experimental screens\n- Hide behind env/remote config'

# ---------- M5 • Delivery & Docs ----------
new "Performance: lazy-load charts and heavy code" \
  --milestone "M5 • Delivery & Docs" \
  --label "priority:P2" --label "area:performance" --label "type:enhancement" \
  --body $'- Code-split charts and data-heavy views\n- Measure with Lighthouse/React Profiler'

new "Offline support for last N transactions and budgets" \
  --milestone "M5 • Delivery & Docs" \
  --label "priority:P2" --label "area:performance" --label "type:enhancement" \
  --body $'- Cache core data\n- Queue writes\n- Show offline banner'

new "Release pipeline: build, version, changelog" \
  --milestone "M5 • Delivery & Docs" \
  --label "priority:P1" --label "area:infra" --label "type:chore" \
  --body $'- npm scripts for build and release\n- Conventional Commits\n- Auto-generate CHANGELOG.md'

new "Demo build + README badges and links" \
  --milestone "M5 • Delivery & Docs" \
  --label "priority:P2" --label "type:documentation" \
  --body $'- Publish web preview or mobile beta\n- Add shields (CI, coverage, license)\n- Link to demo in README'

# ---------- Good first issues (on-ramps) ----------
new "Add .editorconfig" \
  --milestone "M0 • Repo hygiene" \
  --label "good first issue" --label "priority:P2" --label "type:chore" \
  --body $'- Set indent, line endings, charset for consistency'

new "Add CONTRIBUTING.md" \
  --milestone "M5 • Delivery & Docs" \
  --label "good first issue" --label "priority:P2" --label "type:documentation" \
  --body $'- Explain branch model, commit style, how to run tests and CI'

echo "Done seeding issues for $REPO"
