
import os
import pandas as pd
from supabase_client import fetch_series_from_supabase

def test_supabase():
    print("Testing Supabase Connection...")
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL or SUPABASE_KEY environment variables are missing.")
        print("Please set them in your terminal before running this script.")
        print("Example (PowerShell):")
        print('$env:SUPABASE_URL="your_url"')
        print('$env:SUPABASE_KEY="your_key"')
        return

    try:
        df = fetch_series_from_supabase()
        print("\n✅ Successfully fetched data from Supabase!")
        print(f"Rows fetched: {len(df)}")
        print("\nFirst 5 rows:")
        print(df.head())
        
        if 'current_budget' in df.columns and 'date' in df.columns:
             print("\n✅ Required columns 'current_budget' and 'date' are present.")
        else:
             print("\n⚠️ Missing required columns for forecast model.")
             
    except Exception as e:
        print(f"\n❌ Error fetching from Supabase: {e}")

if __name__ == "__main__":
    test_supabase()
