#!/usr/bin/env bash
set -euo pipefail

: "${REPO:?Set REPO, e.g. export REPO=igortacu/FinancialAdvisor}"
: "${ASSIGNEE:?Set ASSIGNEE, e.g. export ASSIGNEE=nikita-login}"

# Validate the user exists and you have access
if ! gh api "users/$ASSIGNEE" --jq .login >/dev/null 2>&1; then
  echo "Error: ASSIGNEE '$ASSIGNEE' not found or API access denied."
  echo "Fix: gh auth login (with repo scope if private) or set a valid login."
  exit 1
fi

# Labels (idempotent)
mklabel() { gh label create "$1" --color "$2" --description "$3" -R "$REPO" 2>/dev/null || true; }
mklabel "area:ml" "0366D6" "ML/Classifier work"
mklabel "priority:P0" "B60205" "Must do now"
mklabel "priority:P1" "D93F0B" "Do next"
mklabel "type:enhancement" "A2EEEF" "Feature"
mklabel "type:testing" "0E8A16" "Tests"
mklabel "type:chore" "C5DEF5" "Maintenance"

new() {
  local title="$1"; shift
  gh issue create -R "$REPO" \
    --title "$title" \
    --assignee "$ASSIGNEE" \
    "$@"
}

echo "Creating ML issues for @$ASSIGNEE …"

new "Implement production-ready version of models from nikita/" \
  --label "priority:P0" --label "type:enhancement" --label "area:ml" \
  --body $'Scope:\n- Move code from nikita/ into /ml with structure: /ml/{models,features,inference,tests}\n- Add pyproject.toml; pin Python and deps\n- Make targets: setup, train, predict\nDone when:\n- make setup/train/predict work locally\n- /ml/README documents commands'

new "Unify data and feature pipeline for train and inference" \
  --label "priority:P0" --label "type:enhancement" --label "area:ml" \
  --body $'Scope:\n- Single feature pipeline shared by train and infer\n- Pydantic input schema + validation\n- Deterministic transforms; no leakage\nDone when:\n- tests cover schema and transforms\n- same inputs => same features in train vs infer'

new "Expose inference via FastAPI service" \
  --label "priority:P0" --label "type:enhancement" --label "area:ml" \
  --body $'Scope:\n- FastAPI /health and /predict (batch)\n- Typed DTOs\n- Load latest model from /ml/artifacts\nDone when:\n- container runs locally\n- example curl returns predictions'

new "Evaluation suite with acceptance thresholds" \
  --label "priority:P1" --label "type:testing" --label "area:ml" \
  --body $'Scope:\n- Metrics: ROC-AUC, PR-AUC, F1; calibration plot\n- Stratified CV; fixed seed\n- Hard fail thresholds in CI\nDone when:\n- metrics.json + plots in /ml/reports\n- CI fails on regression'

new "CI for ML: lint, unit tests, 1-minute smoke train/infer" \
  --label "priority:P1" --label "type:chore" --label "area:ml" \
  --body $'Scope:\n- Ruff + Black\n- Pytest with coverage\n- Tiny dataset for a 1-minute smoke train\nDone when:\n- GH Actions passes and blocks on failure'

new "Integrate model predictions into FinancialAdvisor flows" \
  --label "priority:P1" --label "type:enhancement" --label "area:ml" \
  --body $'Scope:\n- Define touchpoints (auto-categorization, risk flag, advice)\n- App client calls FastAPI\n- Map outputs to UI states/events\nDone when:\n- demo flow shows predictions influencing UI'
