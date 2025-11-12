import pandas as pd
from supabase import create_client
import os
from datetime import datetime
import numpy as np

# -- Supabase Connection
def init_connection():
    """Initializes a connection to the Supabase client using environment variables."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set as environment variables.")

    return create_client(url, key)

# Initialize Supabase client globally
try:
    supabase = init_connection()
except ValueError as e:
    print(f"Connection Error: {e}")
    supabase = None

# -- Data Fetching Functions

def execute_supabase_query(table_name, select_query="*", order_col="gameday", order_desc=False):
    if not supabase:
        return pd.DataFrame()
    
    try:
        query = supabase.table(table_name).select(select_query)
        if order_col:
            query = query.order(order_col, desc=order_desc)
        
        response = query.execute()
        
        if not response.data:
            print(f"No data found in the '{table_name}'.")
            return pd.DataFrame()
            
        return pd.DataFrame(response.data)
        
    except Exception as e:
        print(f"An error occurred while fetching data from '{table_name}': {e}")
        return pd.DataFrame()

def fetch_dashboard_data(view_name='league_dashboard'):
    """Fetches data from the league_dashboard view for performance charts."""
    df = execute_supabase_query(
        view_name, 
        select_query="*", 
        order_col="game_week_start", 
        order_desc=False
    )
    if not df.empty and 'game_week_start' in df.columns:
        df['game_week_start'] = pd.to_datetime(df['game_week_start'])
    return df

def fetch_data(table_name):
    """Fetches game/prediction data from a specified table."""
    df = execute_supabase_query(table_name, select_query="*", order_col="gameday", order_desc=False)
    if not df.empty and 'gameday' in df.columns:
        try:
            df['gameday'] = pd.to_datetime(df['gameday'])
        except:
            pass
    return df

def fetch_header_data(table_name):
    """Fetches results for accuracy headers (no specific ordering needed)."""
    return execute_supabase_query(table_name, select_query="*", order_col=None)

# -- Date Format Function
def format_gameday(date_str):
    """Formats a date string/object to 'Weekday, Month DD'."""
    try:
        if isinstance(date_str, (datetime, pd.Timestamp)):
            date_obj = date_str.to_pydatetime() if isinstance(date_str, pd.Timestamp) else date_str
        else:
            date_obj = datetime.strptime(str(date_str).split('T')[0], '%Y-%m-%d')
        return date_obj.strftime('%A, %B %d')
    except (ValueError, TypeError):
        return str(date_str)

# JSON output function to format data
def prepare_df_for_json(df):
    """Converts DataFrame to JSON records, applying formatting needed for frontend."""
    if df.empty:
        return []
    
    # Apply date formatting for gameday column if present
    if 'gameday' in df.columns:
        df['gameday_formatted'] = df['gameday'].apply(format_gameday)
        
    # Convert any numpy types to Python types for JSON serialization
    return df.replace({np.nan: None}).to_dict('records')
