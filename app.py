from flask import Flask, jsonify, send_from_directory
from data_handler import (
    fetch_data, 
    fetch_header_data, 
    fetch_dashboard_data, 
    prepare_df_for_json
)
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='.') # Set up app to serve static files from current directory
CORS(app) # Enable Cross-Origin Resource Sharing

# --- API Endpoints ---

@app.route('/api/dashboard/performance', methods=['GET'])
def get_performance_data():
    """API endpoint for historical charts data."""
    df = fetch_dashboard_data()
    return jsonify(prepare_df_for_json(df))

@app.route('/api/results/<string:league>', methods=['GET'])
def get_league_results(league):
    """API endpoint for model accuracy headers (nfl_results, nba_results, etc.)."""
    table_name = f"{league.lower()}_results"
    df = fetch_header_data(table_name)
    
    if not df.empty:
        # We only expect one row for the overall results
        return jsonify(df.iloc[0].to_dict())
    return jsonify({}), 404

@app.route('/api/games/<string:league>', methods=['GET'])
def get_league_games(league):
    """API endpoint for game predictions (nfl_games, nba_games, etc.)."""
    table_name = f"{league.lower()}_games"
    df = fetch_data(table_name)
    
    # prepare_df_for_json will also handle date formatting for the frontend
    return jsonify(prepare_df_for_json(df))

# --- Serve Static Files (Frontend) ---

# This route serves the index.html file as the main page
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# This route serves all other static files (CSS, JS)
@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    # For local testing, ensure you set the env vars locally
    # e.g., export SUPABASE_URL="your_url"
    print("WARNING: Running in development mode. Set environment variables for production.")
    app.run(debug=True, port=5000)