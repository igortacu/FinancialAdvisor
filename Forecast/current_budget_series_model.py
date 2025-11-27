
# current_budget_series_model.py (series-only, Holt trend, robust matching for string-stored ints)
import pandas as pd
import numpy as np
from typing import List, Tuple, Union

UUID_1 = "698841bd-189c-4407-b582-9d5fa2689336"
UUID_2 = "5c8251ce-1fe3-4225-97e8-33ec05f85927"

def load_series(series_path: str) -> pd.DataFrame:
    if series_path == "SUPABASE":
        from supabase_client import fetch_series_from_supabase
        df = fetch_series_from_supabase()
        # Supabase returns ISO strings usually, so we need to parse them
        if 'date' in df.columns:
             df['date'] = pd.to_datetime(df['date'])
    else:
        df = pd.read_csv(series_path, engine='python')
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(
                df['date'],
                format="%d/%m/%Y %H:%M",
                dayfirst=True,
                errors="coerce",
            )

    required = {'user_id','tx_id','date','current_budget'}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Series file missing columns: {missing}")
    return df

def _resolve_user_key(user_index: Union[str, int], series_df: pd.DataFrame) -> str:
    """Return the key to filter on series_df['user_id'] after casting to str."""
    unique_str = set(series_df['user_id'].astype(str).dropna().unique().tolist())
    if isinstance(user_index, str):
        if user_index not in (UUID_1, UUID_2):
            raise ValueError(f"Unknown string index: {user_index!r}. Expected {UUID_1} or {UUID_2}.")
        if user_index not in unique_str:
            raise ValueError(f"String index {user_index!r} not found in series user_id values.")
        return user_index
    elif isinstance(user_index, (int, np.integer)):
        uid = int(user_index)
        if uid < 3:
            raise ValueError("Numeric user_index must be >= 3 (first two are strings)." )
        key = str(uid)
        if key not in unique_str:
            # Build a small sample of available integer-like ids
            ints_avail = sorted([int(v) for v in unique_str if v.isdigit()])
            raise ValueError(f"user_id {uid} not present in series. Sample ints present: {ints_avail[:10]}")
        return key
    else:
        raise TypeError("user_index must be a UUID string or an integer >= 3")

def _holt_one_step(y: np.ndarray, alpha: float, beta: float) -> Tuple[np.ndarray, float, float]:
    y = y.astype(float)
    T = len(y)
    if T == 0:
        return np.array([]), 0.0, 0.0
    l = y[0]
    b = (y[1]-y[0]) if T >= 2 else 0.0
    fitted = np.zeros(T)
    for t in range(T):
        fitted[t] = l + b
        new_l = alpha*y[t] + (1-alpha)*(l + b)
        new_b = beta*(new_l - l) + (1-beta)*b
        l, b = new_l, new_b
    return fitted, l, b

def _holt_cv_select(y: np.ndarray, grid_alpha=None, grid_beta=None, val_frac: float=0.2) -> Tuple[float,float]:
    if grid_alpha is None: grid_alpha = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]
    if grid_beta  is None: grid_beta  = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]
    T = len(y)
    if T < 4:  # tiny series
        return 0.5, 0.3
    split = max(2, int(T*(1.0 - val_frac)))
    y_train, y_val = y[:split], y[split:]
    best = (float('inf'), 0.5, 0.3)
    for a in grid_alpha:
        for b in grid_beta:
            _, lT, bT = _holt_one_step(y_train, a, b)
            l, t = lT, bT
            preds = []
            for yt in y_val:
                pred = l + t
                new_l = a*yt + (1-a)*(l+t)
                new_t = b*(new_l - l) + (1-b)*t
                l, t = new_l, new_t
                preds.append(pred)
            se = ((np.array(preds) - y_val)**2).mean()
            if se < best[0]:
                best = (se, a, b)
    return best[1], best[2]

def predict_from_series_holt(user_index: Union[str,int], n: int, series_df: pd.DataFrame, min_points: int = 3) -> List[float]:
    key = _resolve_user_key(user_index, series_df)
    s = series_df[series_df['user_id'].astype(str) == key].sort_values(['date','tx_id'])
    if s.empty:
        raise ValueError(f"user_id {user_index} has no rows in the series dataset")
    y = s['current_budget'].astype(float).to_numpy()
    last_val = float(y[-1])
    if len(y) < min_points:
        return [round(last_val, 2) for _ in range(n)]
    a, b = _holt_cv_select(y)
    _, lT, bT = _holt_one_step(y, a, b)
    preds = [lT + (h+1)*bT for h in range(n)]
    return [round(float(v), 2) for v in preds]
