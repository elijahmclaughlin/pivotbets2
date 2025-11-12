from flask import Flask, jsonify, send_from_directory
from data_handler import (
    fetch_data, 
    fetch_header_data, 
    fetch_dashboard_data, 
    prepare_df_for_json
)
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# API Endpoints

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
        return jsonify(df.iloc[0].to_dict())
    return jsonify({}), 404

@app.route('/api/games/<string:league>', methods=['GET'])
def get_league_games(league):
    """API endpoint for game predictions (nfl_games, nba_games, etc.)."""
    table_name = f"{league.lower()}_games"
    df = fetch_data(table_name)
    
    return jsonify(prepare_df_for_json(df))

# Frontend

# Home page route
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Static files route
@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)
