
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import pandas as pd

# Load environment variables from .env file
load_dotenv()

def fetch_series_from_supabase() -> pd.DataFrame:
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set.")

    supabase: Client = create_client(url, key)
    
    # Fetch all data from users_current_budget_series
    # Note: Supabase limits rows by default (usually 1000). 
    # For a real app, you might need pagination or filtering by user_id.
    response = supabase.table("users_current_budget_series").select("*").execute()
    
    data = response.data
    if not data:
        return pd.DataFrame(columns=['user_id', 'tx_id', 'date', 'current_budget'])
        
    df = pd.DataFrame(data)
    return df
