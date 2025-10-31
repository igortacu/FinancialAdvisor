from typing import List, Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import random
from starlette.middleware.base import BaseHTTPMiddleware

# Reuse forecast logic
from forecast import forecast as _forecast


class AnalyzeRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="User id (UUID or int-like)")
    merchant: Optional[str] = None
    amount: float
    currency: str = "MDL"
    date_iso: Optional[str] = None
    meta: Optional[dict] = None


class Risk(BaseModel):
    flag: bool
    level: str = Field("low", pattern="^(low|medium|high)$")
    reasons: List[str] = []


class AnalyzeResponse(BaseModel):
    category: str
    risk: Risk
    advice: List[str]


class ForecastResponse(BaseModel):
    user_id: str
    n: int
    values: List[float]


ALLOW_ORIGINS = [o.strip() for o in os.getenv("ML_API_CORS", "*").split(",") if o.strip()]

app = FastAPI(title="ML Advisor API", version="0.1.0")

# Configure CORS: if wildcard requested, use regex with credentials disabled
allow_all = "*" in ALLOW_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if allow_all else ALLOW_ORIGINS,
    allow_origin_regex=r".*" if allow_all else None,
    allow_credentials=False,  # keep false when using wildcard to satisfy browsers
    allow_methods=["*"],
    allow_headers=["*"],
)


class EnsureCORSHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin:
            ok = allow_all or origin in ALLOW_ORIGINS
            if ok and "access-control-allow-origin" not in (k.lower() for k in response.headers.keys()):
                response.headers["Access-Control-Allow-Origin"] = "*" if allow_all else origin
                response.headers.setdefault("Vary", "Origin")
        return response


app.add_middleware(EnsureCORSHeaderMiddleware)


@app.get("/health")
def health():
    return {"ok": True}


def _guess_category(merchant: Optional[str]) -> str:
    if not merchant:
        return "General"
    m = merchant.upper()
    import re

    if re.search(r"(KAUFLAND|LINELLA|GREEN HILLS|SUPERMARKET|MARKET)", m):
        return "Groceries"
    if re.search(r"(LUKOIL|MOL|PETROM|ROMPETROL|VENTO)", m):
        return "Fuel"
    if re.search(r"(ORANGE|MOLDTELECOM|DIGI|VODAFONE|MTS)", m):
        return "Utilities"
    if re.search(r"(PHARM|APTEKA|FARM)", m):
        return "Health"
    if re.search(r"(UBER|YANGO|TAXI|PARK)", m):
        return "Transport"
    if re.search(r"(H&M|ZARA|UNIQLO|CCC|LC WAIKIKI)", m):
        return "Shopping"
    return "General"


def _risk_and_advice(amount: float, category: str) -> Risk:
    # Simple heuristics for demo
    reasons: List[str] = []
    flag = False
    level = "low"

    # Amount-based heuristic
    if amount <= -1000:  # expense over 1000
        flag = True
        level = "medium"
        reasons.append("Large expense detected (> 1000)")
    if category == "Shopping" and amount <= -500:
        flag = True
        level = "high"
        reasons.append("High shopping spend")
    if category == "Fuel" and amount <= -300:
        flag = True
        reasons.append("Unusually high fuel purchase")

    return Risk(flag=flag, level=level, reasons=reasons)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # Note: amount is signed; negative = expense in app's ledger
    category = _guess_category(req.merchant or "")
    risk = _risk_and_advice(req.amount, category)

    advice: List[str] = []
    if risk.flag:
        if risk.level == "high":
            advice.append("Consider setting a weekly cap for Shopping and review subscriptions.")
        if "Fuel" == category:
            advice.append("Check if this is a bulk purchase; consider fuel discount programs.")
        advice.append("Move discretionary spend to 'General' budget envelope.")
    else:
        advice.append("Looks normal. Keep tracking to stay on budget.")

    return AnalyzeResponse(category=category, risk=risk, advice=advice)


@app.get("/forecast", response_model=ForecastResponse)
def get_forecast(user_id: str, n: int = 6):
    def _fallback(n: int) -> List[float]:
        vals: List[float] = []
        v = random.uniform(120, 200)
        for _ in range(n):
            v = max(50.0, min(300.0, v + random.uniform(-15, 15)))
            vals.append(round(v, 2))
        return vals

    try:
        vals = _forecast(user_id, n)
        # ensure sane bounds for demo UI
        if not vals or not isinstance(vals, list):
            vals = _fallback(n)
        else:
            vals = [float(max(50.0, min(300.0, v))) for v in vals]
    except Exception as e:
        # In dev, never fail CORS due to backend compute; return fallback
        print("/forecast error:", e)
        vals = _fallback(n)
    return ForecastResponse(user_id=str(user_id), n=n, values=vals)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_API_PORT", "8091"))
    reload = os.getenv("ML_API_RELOAD", "0").lower() in ("1", "true", "yes")
    print(f"Starting ML Advisor API on 0.0.0.0:{port} (CORS={ALLOW_ORIGINS}, reload={reload})")
    uvicorn.run(app, host="0.0.0.0", port=port, reload=reload)
