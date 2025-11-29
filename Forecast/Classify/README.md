# Classification Model (Text → Category)

This module provides a small GPT-like classifier to map free-text transaction descriptions into one of 16 categories (e.g., Groceries, Utilities, Subscriptions).

- CLI entry: `classify.py`
- API entry: `api.py` (FastAPI)
- Weights file: `category_classifier.pth`

## Quick Start (Windows PowerShell)

Use the same virtual environment as the main ML API or create a new one.

```powershell
cd .\Forecast
python -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r .\Classify\requirements.txt
```

Get the model weights:
- If tracked with Git LFS: in the repo root, run `git lfs install` once, then `git lfs pull`.
- Or train locally: open `Forecast/Classify/TrainClassificationModel.ipynb` and run all cells; ensure it saves to `Forecast/Classify/category_classifier.pth`.
- Or download from a team-provided link and place at `Forecast/Classify/category_classifier.pth`.

### CLI Usage

```powershell
cd .\Forecast\Classify
python classify.py "Starbucks latte"
```

Outputs a single category label, e.g. `Food`.

### Run the API

```powershell
cd .\Forecast\Classify
uvicorn api:app --host 0.0.0.0 --port 8092 --reload
```

Check health and classify a sample:

```powershell
curl.exe -i http://localhost:8092/health
$body = @{ text = "Netflix monthly subscription" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8092/classify -Body $body -ContentType "application/json"
```

Expected response:

```json
{"category":"Subscriptions"}
```

## Notes

- PyTorch: CPU build installs by default via `pip` on Windows. For GPU/CUDA, follow https://pytorch.org/get-started/locally/.
- Large file handling: if `category_classifier.pth` exceeds GitHub's 100MB limit, store it with Git LFS or keep it in a release/artifact store. Teammates must run `git lfs install` and `git lfs pull` to fetch LFS files.
- Categories are defined in `id2label` inside `classify.py`.
