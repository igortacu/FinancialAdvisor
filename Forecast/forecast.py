# Requires: current_budget_series_model.py and users_current_budget_series.csv

from current_budget_series_model import load_series, predict_from_series_holt as _predict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def forecast(user_index, n, series_path=None):
    """
    Forecast next `n` values of current_budget for a user.

    Args:
        user_index: 
            - str UUID for the first two users:
              "698841bd-189c-4407-b582-9d5fa2689336" (Ina),
              "5c8251ce-1fe3-4225-97e8-33ec05f85927" (Igor)
            - int >= 3 for other users (e.g., 884)
        n (int): number of future steps to predict
        series_path (str): path to users_current_budget_series.csv or "SUPABASE"

    Returns:
        list[float]: length n
    """
    if series_path is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if url and key and "your_supabase_url" not in url:
            series_path = "SUPABASE"
        else:
            series_path = "users_current_budget_series.csv"

    df = load_series(series_path)
    return _predict(user_index, n, df)
