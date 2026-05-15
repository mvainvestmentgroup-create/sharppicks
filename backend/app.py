import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time
from predictor import BettingPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder='../templates', static_folder='../frontend/static')
CORS(app)

predictor = BettingPredictor()

# Cache layer
cache = {}
cache_lock = threading.Lock()
CACHE_TTL = 300  # 5 minutes

def get_cached(key):
    with cache_lock:
        if key in cache:
            data, ts = cache[key]
            if time.time() - ts < CACHE_TTL:
                return data
    return None

def set_cached(key, data):
    with cache_lock:
        cache[key] = (data, time.time())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/top10')
def top10():
    """Top 10 picks with confidence scores across all leagues"""
    cached = get_cached('top10')
    if cached:
        return jsonify(cached)
    
    try:
        picks = predictor.get_top10_picks()
        result = {
            'picks': picks,
            'generated_at': datetime.utcnow().isoformat(),
            'count': len(picks)
        }
        set_cached('top10', result)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Top10 error: {e}")
        return jsonify({'error': str(e), 'picks': []}), 500

@app.route('/api/games')
def games():
    """All games for today/upcoming"""
    league = request.args.get('league', 'all')
    cached = get_cached(f'games_{league}')
    if cached:
        return jsonify(cached)
    
    try:
        data = predictor.fetch_all_games(league)
        set_cached(f'games_{league}', data)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Games error: {e}")
        return jsonify({'games': [], 'error': str(e)}), 500

@app.route('/api/game/<game_id>/analysis')
def game_analysis(game_id):
    """Deep analysis for a specific game"""
    cached = get_cached(f'analysis_{game_id}')
    if cached:
        return jsonify(cached)
    
    try:
        analysis = predictor.analyze_game(game_id)
        set_cached(f'analysis_{game_id}', analysis)
        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/parlay/analyze', methods=['POST'])
def analyze_parlay():
    """Analyze a custom parlay"""
    data = request.json
    picks = data.get('picks', [])
    wager = data.get('wager', 10)
    bankroll = data.get('bankroll', 1000)
    
    try:
        result = predictor.analyze_parlay(picks, wager, bankroll)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Parlay error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/injuries')
def injuries():
    """Injury reports across all leagues"""
    cached = get_cached('injuries')
    if cached:
        return jsonify(cached)
    
    try:
        data = predictor.fetch_injuries()
        set_cached('injuries', data)
        return jsonify(data)
    except Exception as e:
        return jsonify({'injuries': [], 'error': str(e)}), 500

@app.route('/api/odds')
def odds():
    """Live odds from The Odds API"""
    league = request.args.get('league', 'all')
    cached = get_cached(f'odds_{league}')
    if cached:
        return jsonify(cached)
    
    try:
        data = predictor.fetch_odds(league)
        set_cached(f'odds_{league}', data)
        return jsonify(data)
    except Exception as e:
        return jsonify({'odds': [], 'error': str(e)}), 500

@app.route('/api/kelly', methods=['POST'])
def kelly():
    """Kelly Criterion calculator"""
    data = request.json
    bankroll = float(data.get('bankroll', 1000))
    win_pct = float(data.get('win_pct', 0.55))
    odds = float(data.get('odds', -110))
    fraction = float(data.get('fraction', 0.25))
    
    result = predictor.kelly_criterion(bankroll, win_pct, odds, fraction)
    return jsonify(result)

@app.route('/api/stats/ats')
def ats_stats():
    """ATS records"""
    league = request.args.get('league', 'all')
    cached = get_cached(f'ats_{league}')
    if cached:
        return jsonify(cached)
    
    try:
        data = predictor.fetch_ats_records(league)
        set_cached(f'ats_{league}', data)
        return jsonify(data)
    except Exception as e:
        return jsonify({'teams': [], 'error': str(e)}), 500

@app.route('/api/trending')
def trending():
    """Trending bets and sharp money movement"""
    cached = get_cached('trending')
    if cached:
        return jsonify(cached)
    
    try:
        data = predictor.get_trending()
        set_cached('trending', data)
        return jsonify(data)
    except Exception as e:
        return jsonify({'trends': [], 'error': str(e)}), 500

@app.route('/api/status')
def status():
    """API connection status"""
    return jsonify(predictor.get_api_status())

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    with cache_lock:
        cache.clear()
    return jsonify({'status': 'cleared'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)