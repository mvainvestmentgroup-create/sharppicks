# SharpPicks Pro — Sports Betting Predictor

A production-grade predictive sports betting dashboard deployable on Railway.

## Features
- **Top 10 Picks** with confidence scores (0–100), star ratings (1–5), and letter grades (S/A/B/C/D/F)
- **All Leagues**: NFL, NBA, MLB, NHL, MLS, EPL, La Liga, Serie A, Bundesliga, Champions League
- **Live Odds** from The Odds API (40+ sportsbooks)
- **Injury Reports** from ESPN public feeds (no key needed)
- **ATS Records** (Against-the-Spread)
- **Kelly Criterion** bet sizing calculator
- **Parlay Builder** up to 10 legs with math (EV, combined odds, payout)
- **Trending** — sharp money, line moves, public betting %
- **API Status** dashboard

## Free API Sources
| API | Key Required | What It Provides |
|-----|-------------|-----------------|
| ESPN Public | ❌ No | Scores, injuries, rosters — NFL/NBA/MLB/NHL/MLS |
| The Odds API | ✅ Yes (free tier) | Live moneylines, spreads, totals from 40+ books |
| Ball Don't Lie | ⚡ Optional | Deep NBA player/team stats |
| Football-Data.org | ✅ Yes (free) | EPL, Champions League, La Liga, Serie A, Bundesliga |
| TheSportsDB | ❌ No | Multi-sport event data |
| API-Sports | ✅ Yes (free tier) | NFL/NBA/MLB extended stats |

## Deploy to Railway

### 1. Push to GitHub
```bash
cd sharppicks
git init
git add .
git commit -m "Initial commit — SharpPicks Pro"
git remote add origin https://github.com/YOUR_USERNAME/sharppicks.git
git push -u origin main
```

### 2. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `sharppicks` repo
4. Railway auto-detects Python and deploys

### 3. Set Environment Variables
In Railway → your project → **Variables** tab, add:

```
ODDS_API_KEY=your_key_from_the-odds-api.com
FOOTBALL_DATA_KEY=your_key_from_football-data.org
BALLDONTLIE_KEY=your_key_from_balldontlie.io
API_SPORTS_KEY=your_key_from_api-sports.io
```

> **Without keys**: App still works using ESPN public API + TheSportsDB. Add keys to unlock live odds and soccer data.

### 4. Get Your Free API Keys
- **The Odds API**: https://the-odds-api.com → Sign up → Free tier: 500 requests/month
- **Football-Data.org**: https://www.football-data.org/client/register → Free: 10 req/min
- **Ball Don't Lie**: https://www.balldontlie.io → Free tier, optional key for higher limits
- **API-Sports**: https://api-sports.io → Free: 100 req/day

## Project Structure
```
sharppicks/
├── backend/
│   ├── app.py          # Flask routes + caching
│   └── predictor.py    # All API integrations + prediction engine
├── frontend/
│   └── static/
│       ├── css/main.css
│       └── js/main.js
├── templates/
│   └── index.html
├── requirements.txt
├── Procfile
├── railway.json
├── nixpacks.toml
└── README.md
```

## Confidence Score Formula
The model scores each game 0–100 based on:
1. **Implied probability edge** — how strongly the market favors one side
2. **ATS record** — teams covering > 55% get a boost
3. **Injury impact** — key injuries subtract from confidence
4. **Home advantage** — home favorites score slightly higher
5. **Win streak** — current form factor

## Grade Scale
| Grade | Confidence | Action |
|-------|-----------|--------|
| S | 80–100 | Strong play |
| A | 72–79 | High confidence |
| B | 64–71 | Good value |
| C | 54–63 | Moderate |
| D | 44–53 | Low edge |
| F | < 44 | Pass |

## Local Development
```bash
pip install -r requirements.txt
cd backend
python app.py
# Visit http://localhost:8080
```

## Disclaimer
This tool is for informational and entertainment purposes. Always gamble responsibly. Past performance does not guarantee future results.
