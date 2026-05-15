/* ─── State ───────────────────────────────────────────────────────────── */
let bankroll = 1000;
let picks = [];
let allGames = [];
let currentLeague = 'all';

/* ─── Navigation ─────────────────────────────────────────────────────── */
function navTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('pg-' + page).classList.add('active');
  if (el) el.classList.add('active');

  const loaders = {
    top10: loadTop10,
    games: loadGames,
    parlay: loadParlayGames,
    injuries: loadInjuries,
    ats: loadATS,
    kelly: initKelly,
    trending: loadTrending,
    apis: loadAPIStatus,
  };
  if (loaders[page]) loaders[page]();
}

function updateBankroll() {
  bankroll = parseFloat(document.getElementById('bankroll-input').value) || 1000;
  calcParlay();
}

/* ─── Utilities ──────────────────────────────────────────────────────── */
function amDec(o) {
  const n = parseFloat(o);
  return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
}
function implP(o) {
  const n = parseFloat(o);
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100);
}
function fmtAm(dec) {
  if (dec >= 2) return '+' + Math.round((dec - 1) * 100);
  return '-' + Math.round(100 / (dec - 1));
}
function confColor(c) {
  if (c >= 72) return '#22c55e';
  if (c >= 58) return '#f59e0b';
  return '#ef4444';
}
function leagueChip(league) {
  const l = (league || '').toUpperCase().replace(/\s+/g,'');
  const cls = {NFL:'chip-nfl',NBA:'chip-nba',MLB:'chip-mlb',NHL:'chip-nhl',MLS:'chip-mls',EPL:'chip-epl'}[l] || 'chip-soccer';
  return `<span class="league-chip ${cls}">${l}</span>`;
}
function starsHTML(stars) {
  let h = '';
  for (let i = 1; i <= 5; i++) h += `<span class="star${i <= Math.round(stars) ? ' on' : ''}">★</span>`;
  return `<div class="stars-row">${h}</div>`;
}
function confRing(conf, size = 64) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (conf / 100);
  const color = confColor(conf);
  return `<div class="confidence-ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="conf-track" cx="${size/2}" cy="${size/2}" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="0"/>
      <circle class="conf-fill" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${circ - fill}"/>
    </svg>
    <div class="conf-text">
      <div class="conf-num" style="color:${color}">${conf}</div>
      <div class="conf-label">CONF</div>
    </div>
  </div>`;
}
function injBadge(injuries) {
  if (!injuries || !injuries.length) return '';
  return `<span class="inj-pip" title="${injuries.length} injury report(s)"></span>`;
}

/* ─── API Calls ──────────────────────────────────────────────────────── */
async function apiFetch(endpoint) {
  const res = await fetch('/api/' + endpoint);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─── Top 10 ─────────────────────────────────────────────────────────── */
async function loadTop10() {
  document.getElementById('top10-grid').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Analyzing games across all leagues…</p></div>';

  try {
    const data = await apiFetch('top10');
    const picks = data.picks || [];

    // Summary cards
    const avgConf = picks.length ? Math.round(picks.reduce((s,p) => s + p.confidence, 0) / picks.length) : 0;
    const bestEV = picks.length ? picks.reduce((b,p) => p.expected_value > b ? p.expected_value : b, -999) : 0;
    const sGrade = picks.filter(p => p.grade === 'S' || p.grade === 'A').length;

    document.getElementById('top10-summary').innerHTML = `
      <div class="sc"><div class="sc-label">Picks Found</div><div class="sc-value blue">${picks.length}</div><div class="sc-sub">Today's slate</div></div>
      <div class="sc"><div class="sc-label">Avg Confidence</div><div class="sc-value ${avgConf>=65?'green':avgConf>=50?'amber':'red'}">${avgConf}%</div><div class="sc-sub">Model score</div></div>
      <div class="sc"><div class="sc-label">Best EV</div><div class="sc-value ${bestEV>0?'green':'red'}">${bestEV>0?'+':''}${(bestEV*100).toFixed(1)}%</div><div class="sc-sub">Expected value</div></div>
      <div class="sc"><div class="sc-label">A/S Grade Picks</div><div class="sc-value gold">${sGrade}</div><div class="sc-sub">High confidence</div></div>
    `;

    if (!picks.length) {
      document.getElementById('top10-grid').innerHTML = '<div class="loading-state"><p>No high-confidence picks found for today. Check back later or add more API keys for richer data.</p></div>';
      return;
    }

    document.getElementById('top10-grid').innerHTML = picks.map(p => renderPickCard(p)).join('');

  } catch (e) {
    document.getElementById('top10-grid').innerHTML = `<div class="loading-state"><p style="color:#ef4444">Error loading picks: ${e.message}</p></div>`;
  }
}

function renderPickCard(p) {
  const rankClass = p.rank <= 3 ? `rank-${p.rank}` : '';
  const rankEmoji = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank;
  const evColor = p.expected_value > 0 ? 'green' : 'red';
  const injList = (p.injuries || []).filter(i => i.status === 'out' || i.status === 'questionable');

  return `<div class="pick-card ${rankClass}" onclick="openGameDetail('${p.game_id}')">
    <div class="rank-badge">${rankEmoji}</div>
    <div class="pick-body">
      <div class="pick-top">
        ${leagueChip(p.league)}
        <span class="pick-matchup">${p.matchup}</span>
        ${injList.length ? `<span class="inj-pip" title="${injList.map(i=>i.player+' '+i.status).join(', ')}"></span>` : ''}
      </div>
      <div class="pick-selection">${p.pick} — ${p.pick_type} <span style="font-family:'DM Mono',monospace;font-size:14px;color:var(--muted)">${p.odds > 0 ? '+' : ''}${p.odds}</span></div>
      <div class="pick-meta">
        <span class="pm-item">Win prob: <strong class="${p.win_probability>=55?'green':'amber'}">${p.win_probability}%</strong></span>
        <span class="pm-item">EV: <strong class="${evColor}">${p.expected_value>0?'+':''}${(p.expected_value*100).toFixed(1)}%</strong></span>
        <span class="pm-item">Rec bet: <strong>$${p.recommended_bet}</strong></span>
        ${starsHTML(p.stars)}
      </div>
    </div>
    <div class="pick-right">
      ${confRing(p.confidence)}
      <div class="grade-badge grade-${p.grade}">${p.grade}</div>
    </div>
  </div>`;
}

function openGameDetail(gameId) {
  // Could open a modal — for now navigate to games
  navTo('games', null);
}

/* ─── Games ─────────────────────────────────────────────────────────── */
const LEAGUES = ['all', 'nfl', 'nba', 'mlb', 'nhl', 'mls', 'epl'];

async function loadGames(league) {
  if (league !== undefined) currentLeague = league;
  renderLeagueTabs('league-tabs', currentLeague, (l) => loadGames(l));

  document.getElementById('games-list').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    const data = await apiFetch(`games?league=${currentLeague}`);
    allGames = data.games || [];
    renderGamesList('games-list', allGames, true);
  } catch (e) {
    document.getElementById('games-list').innerHTML =
      `<div class="loading-state"><p style="color:#ef4444">Error: ${e.message}</p></div>`;
  }
}

function renderLeagueTabs(containerId, active, callback) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = LEAGUES.map(l =>
    `<button class="ltab${l===active?' on':''}" onclick="(${callback.toString()})('${l}')">${l.toUpperCase()}</button>`
  ).join('');
}

function renderGamesList(containerId, games, showOdds) {
  const el = document.getElementById(containerId);
  if (!games.length) { el.innerHTML = '<div class="loading-state"><p>No games found.</p></div>'; return; }
  el.innerHTML = games.map(g => renderGameRow(g, showOdds)).join('');
}

function renderGameRow(g, showOdds) {
  const conf = g.confidence || 55;
  const cc = confColor(conf);
  const selected = picks.find(p => p.gid === g.id) ? ' selected' : '';
  const injCount = (g.injuries || []).filter(i => i.status === 'out' || i.status === 'questionable').length;

  return `<div class="game-row${selected}" id="gr-${g.id}">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        ${leagueChip(g.league)}
        <span style="font-size:11px;color:var(--muted)">${formatGameTime(g.time)}</span>
        ${injCount ? `<span style="font-size:11px;color:var(--amber)">⚠ ${injCount} injury</span>` : ''}
        <span style="font-size:11px;color:var(--muted);margin-left:auto">${g.status || ''}</span>
      </div>
      <div class="game-teams-row">
        <div class="team-col">
          <span class="tn">${g.away}</span>
          <span class="tr">${g.awayRec || '—'} · ATS: ${g.awayATS || '—'}</span>
        </div>
        <span class="at-sep">@</span>
        <div class="team-col r">
          <span class="tn">${g.home}</span>
          <span class="tr">${g.homeRec || '—'} · ATS: ${g.homeATS || '—'}</span>
        </div>
      </div>
      <div class="conf-bar-mini"><div class="cbm-fill" style="width:${conf}%;background:${cc}"></div></div>
      ${showOdds ? `<div style="margin-top:8px">
        <div class="odds-chips">
          <div class="oc${isPicked(g.id,'aml')?' on':''}" onclick="addPick('${g.id}','aml','${g.awayML}','${g.away} ML')">
            <div class="oc-label">Away ML</div><div class="oc-val">${fmtOdds(g.awayML)}</div>
          </div>
          <div class="oc${isPicked(g.id,'spr')?' on':''}" onclick="addPick('${g.id}','spr','-110','${g.away} ${g.spread}')">
            <div class="oc-label">Spread</div><div class="oc-val">${g.spread || '—'}</div>
          </div>
          <div class="oc${isPicked(g.id,'ovr')?' on':''}" onclick="addPick('${g.id}','ovr','-110','Over ${g.total}')">
            <div class="oc-label">Over</div><div class="oc-val">${g.total || '—'}</div>
          </div>
          <div class="oc${isPicked(g.id,'und')?' on':''}" onclick="addPick('${g.id}','und','-110','Under ${g.total}')">
            <div class="oc-label">Under</div><div class="oc-val">${g.total || '—'}</div>
          </div>
          <div class="oc${isPicked(g.id,'hml')?' on':''}" onclick="addPick('${g.id}','hml','${g.homeML}','${g.home} ML')">
            <div class="oc-label">Home ML</div><div class="oc-val">${fmtOdds(g.homeML)}</div>
          </div>
        </div>
      </div>` : ''}
    </div>
    <div style="text-align:center;flex-shrink:0">
      ${confRing(conf, 56)}
      <div style="font-size:10px;color:var(--muted);margin-top:4px">${g.grade || '—'} grade</div>
    </div>
  </div>`;
}

function formatGameTime(t) {
  if (!t) return '—';
  try {
    return new Date(t).toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) + ' ET';
  } catch { return t; }
}

function fmtOdds(o) {
  if (!o || o === '-110') return '-110';
  const n = parseFloat(o);
  return n > 0 ? '+' + n : '' + n;
}

/* ─── Parlay Builder ────────────────────────────────────────────────── */
async function loadParlayGames() {
  document.getElementById('parlay-game-list').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';
  try {
    if (!allGames.length) {
      const data = await apiFetch('games?league=all');
      allGames = data.games || [];
    }
    document.getElementById('parlay-game-list').innerHTML = allGames.map(g => renderGameRow(g, true)).join('');
  } catch (e) {
    document.getElementById('parlay-game-list').innerHTML =
      `<div class="loading-state"><p style="color:#ef4444">Error: ${e.message}</p></div>`;
  }
  renderSlip();
}

function isPicked(gid, type) {
  return picks.some(p => p.gid === gid && p.type === type);
}

function addPick(gid, type, odds, label) {
  const maxLegs = 10;
  const existIdx = picks.findIndex(p => p.gid === gid);
  if (existIdx >= 0 && picks[existIdx].type === type) {
    picks.splice(existIdx, 1);
  } else if (existIdx >= 0) {
    picks[existIdx] = { gid, type, odds: parseFloat(odds), label };
  } else {
    if (picks.length >= maxLegs) { alert('Max 10 legs!'); return; }
    picks.push({ gid, type, odds: parseFloat(odds), label });
  }
  // Re-render game rows
  allGames.forEach(g => {
    const el = document.getElementById('gr-' + g.id);
    if (el) {
      const sel = picks.find(p => p.gid === g.id);
      el.classList.toggle('selected', !!sel);
      // Update chip highlights
      el.querySelectorAll('.oc').forEach(oc => oc.classList.remove('on'));
      if (sel) {
        const typeMap = {aml:0, spr:1, ovr:2, und:3, hml:4};
        const chips = el.querySelectorAll('.oc');
        if (chips[typeMap[sel.type]]) chips[typeMap[sel.type]].classList.add('on');
      }
    }
  });
  renderSlip();
}

function removePick(gid) {
  picks = picks.filter(p => p.gid !== gid);
  const el = document.getElementById('gr-' + gid);
  if (el) {
    el.classList.remove('selected');
    el.querySelectorAll('.oc').forEach(oc => oc.classList.remove('on'));
  }
  renderSlip();
}

function renderSlip() {
  document.getElementById('slip-count').textContent = `${picks.length} / 10`;
  const legsEl = document.getElementById('slip-legs');
  const mathEl = document.getElementById('slip-math');
  const btn = document.getElementById('analyze-btn');

  if (!picks.length) {
    legsEl.innerHTML = '<p class="empty-msg">No picks yet — add legs from the game list</p>';
    if (mathEl) mathEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = 'Add picks to analyze'; }
    return;
  }

  legsEl.innerHTML = picks.map(p =>
    `<div class="slip-leg">
      <span>${p.label} <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--muted)">${p.odds > 0 ? '+' : ''}${p.odds}</span></span>
      <span class="leg-x" onclick="removePick('${p.gid}')">×</span>
    </div>`
  ).join('');

  if (mathEl) mathEl.style.display = 'block';
  if (btn) { btn.disabled = false; btn.textContent = `Analyze ${picks.length}-leg Parlay with AI ↗`; }
  calcParlay();
}

function calcParlay() {
  if (!picks.length) return;
  let dec = 1, prob = 1;
  picks.forEach(p => { dec *= amDec(p.odds); prob *= implP(p.odds); });
  const wager = parseFloat(document.getElementById('wager-input')?.value) || 10;
  const payout = (wager * dec).toFixed(2);
  const ev = (dec - 1) * prob - (1 - prob);
  const fullK = ev / (dec - 1);
  const fracK = fullK * 0.25;
  const recBet = Math.max(0, fracK * bankroll);

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('ss-odds', fmtAm(dec));
  setEl('ss-prob', (prob * 100).toFixed(1) + '%');
  const evEl = document.getElementById('ss-ev');
  if (evEl) { evEl.textContent = (ev > 0 ? '+' : '') + (ev * 100).toFixed(1) + '%'; evEl.className = 'ss-v ' + (ev > 0 ? 'green' : 'red'); }
  setEl('ss-pay', '$' + payout);
  setEl('kb-wager', '$' + wager.toFixed(2));
  setEl('kb-full', (fullK * 100).toFixed(1) + '%');
  const fEl = document.getElementById('kb-frac');
  if (fEl) { fEl.textContent = '$' + recBet.toFixed(2); fEl.className = 'kb-val ' + (recBet > 0 ? 'green' : 'red'); }

  const vEl = document.getElementById('verdict-box');
  if (vEl) {
    vEl.textContent = ev > 0 ? '✓ PLAY — Positive expected value' : '✗ FADE — Negative expected value';
    vEl.className = 'verdict-box ' + (ev > 0 ? 'verdict-play' : 'verdict-fade');
  }
}

async function analyzeParlay() {
  const btn = document.getElementById('analyze-btn');
  const out = document.getElementById('parlay-ai-out');
  btn.disabled = true; btn.textContent = 'Analyzing…';
  out.innerHTML = '<div class="ai-out-card"><div class="ai-out-title">AI Analysis</div><div class="ai-out-body">Analyzing your parlay…</div></div>';

  try {
    const res = await fetch('/api/parlay/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        picks: picks.map(p => ({ label: p.label, odds: p.odds })),
        wager: parseFloat(document.getElementById('wager-input')?.value) || 10,
        bankroll,
      }),
    });
    const data = await res.json();

    let html = `<div class="ai-out-card">
      <div class="ai-out-title">AI Parlay Analysis</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div class="kr"><div class="kr-label">Combined odds</div><div class="kr-val ${data.expected_value>0?'green':'red'}">${data.combined_odds}</div></div>
        <div class="kr"><div class="kr-label">Win prob</div><div class="kr-val">${data.combined_prob_pct}%</div></div>
        <div class="kr"><div class="kr-label">Verdict</div><div class="kr-val ${data.verdict==='PLAY'?'green':'red'}">${data.verdict}</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">`;

    (data.leg_analysis || []).forEach((l, i) => {
      html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <span>Leg ${i+1}: ${l.pick}</span>
        <span>Implied: <strong>${l.implied_prob}%</strong> · EV: <strong class="${l.ev>0?'green':'red'}">${l.ev>0?'+':''}${(l.ev*100).toFixed(1)}%</strong></span>
      </div>`;
    });

    html += `</div>
      <div style="margin-top:10px;font-size:13px;color:var(--muted)">
        Recommended wager: <strong style="color:var(--text)">$${data.recommended_wager}</strong> based on Kelly Criterion with your $${bankroll} bankroll.
      </div>
    </div>`;

    out.innerHTML = html;
  } catch (e) {
    out.innerHTML = `<div class="ai-out-card"><div class="ai-out-body" style="color:var(--red)">Error: ${e.message}</div></div>`;
  }
  btn.disabled = false;
  btn.textContent = `Analyze ${picks.length}-leg Parlay with AI ↗`;
}

/* ─── Injuries ──────────────────────────────────────────────────────── */
async function loadInjuries() {
  document.getElementById('injuries-content').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Loading injuries…</p></div>';
  try {
    const data = await apiFetch('injuries');
    const injuries = data.injuries || [];
    if (!injuries.length) {
      document.getElementById('injuries-content').innerHTML = '<div class="loading-state"><p>No injury data available. Connect ESPN API keys for live reports.</p></div>';
      return;
    }

    // Group by team
    const byTeam = {};
    injuries.forEach(i => {
      const key = i.team || 'Unknown';
      if (!byTeam[key]) byTeam[key] = { league: i.league, injuries: [] };
      byTeam[key].injuries.push(i);
    });

    let html = '';
    Object.entries(byTeam).forEach(([team, info]) => {
      html += `<div class="inj-card">
        <div class="inj-header">
          <strong>${team}</strong>
          ${leagueChip(info.league)}
        </div>
        ${info.injuries.map(i => `
          <div class="inj-row">
            <span>${i.player} <span style="color:var(--dim);font-size:11px">${i.pos || ''}</span></span>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
              <span class="inj-status status-${i.status.toLowerCase().replace(/\s+/g,'')}">${i.status}</span>
              ${i.return_date ? `<span style="font-size:10px;color:var(--dim)">RTG: ${i.return_date}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>`;
    });

    document.getElementById('injuries-content').innerHTML = html;
  } catch (e) {
    document.getElementById('injuries-content').innerHTML =
      `<div class="loading-state"><p style="color:#ef4444">Error: ${e.message}</p></div>`;
  }
}

/* ─── ATS ─────────────────────────────────────────────────────────── */
async function loadATS() {
  document.getElementById('ats-content').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Loading ATS data…</p></div>';
  try {
    const data = await apiFetch('stats/ats');
    const teams = data.teams || [];

    document.getElementById('ats-content').innerHTML = `
      <div style="overflow-x:auto">
      <table class="ats-table">
        <thead><tr>
          <th>Team</th><th>League</th><th>ATS Record</th><th>ATS %</th>
          <th>Home ATS</th><th>Away ATS</th><th>O/U Over</th><th>O/U Under</th>
        </tr></thead>
        <tbody>
        ${teams.map(t => `
          <tr>
            <td><strong>${t.team}</strong></td>
            <td>${leagueChip(t.league)}</td>
            <td style="font-family:'DM Mono',monospace">${t.record}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="ats-bar" style="width:80px"><div class="ats-bar-fill" style="width:${t.ats_pct}%;background:${confColor(t.ats_pct)}"></div></div>
                <span class="${t.ats_pct>=55?'green':t.ats_pct>=45?'amber':'red'}" style="font-family:'DM Mono',monospace;font-weight:600">${t.ats_pct}%</span>
              </div>
            </td>
            <td style="font-family:'DM Mono',monospace">${t.home_ats}</td>
            <td style="font-family:'DM Mono',monospace">${t.away_ats}</td>
            <td style="color:var(--green);font-family:'DM Mono',monospace">${t.ou_over}</td>
            <td style="color:var(--blue);font-family:'DM Mono',monospace">${t.ou_under}</td>
          </tr>
        `).join('')}
        </tbody>
      </table>
      </div>`;
  } catch (e) {
    document.getElementById('ats-content').innerHTML =
      `<div class="loading-state"><p style="color:#ef4444">Error: ${e.message}</p></div>`;
  }
}

/* ─── Kelly Page ─────────────────────────────────────────────────── */
function initKelly() { calcKellyPage(); }

async function calcKellyPage() {
  const bank = parseFloat(document.getElementById('kc-bank')?.value) || 1000;
  const odds = parseFloat(document.getElementById('kc-odds')?.value) || -110;
  const winPct = parseFloat(document.getElementById('kc-win')?.value) / 100 || 0.55;
  const frac = parseFloat(document.getElementById('kc-frac')?.value) || 0.25;

  try {
    const res = await fetch('/api/kelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankroll: bank, win_pct: winPct, odds, fraction: frac }),
    });
    const d = await res.json();
    const evClass = d.expected_value > 0 ? 'green' : 'red';

    document.getElementById('kelly-results').innerHTML = `
      <div class="kr"><div class="kr-label">Full Kelly %</div><div class="kr-val ${evClass}">${d.full_kelly_pct}%</div></div>
      <div class="kr"><div class="kr-label">Fractional Kelly</div><div class="kr-val ${evClass}">${d.fractional_kelly_pct}%</div></div>
      <div class="kr"><div class="kr-label">Recommended Bet</div><div class="kr-val ${evClass}">$${d.recommended_bet}</div></div>
      <div class="kr"><div class="kr-label">Expected Value</div><div class="kr-val ${evClass}">${d.expected_value > 0 ? '+' : ''}${(d.expected_value * 100).toFixed(2)}%</div></div>
      <div class="kr"><div class="kr-label">ROI %</div><div class="kr-val ${evClass}">${d.roi_pct > 0 ? '+' : ''}${d.roi_pct}%</div></div>
      <div class="kr"><div class="kr-label">Breakeven Win %</div><div class="kr-val">${d.breakeven_pct}%</div></div>
    `;
  } catch (e) {
    document.getElementById('kelly-results').innerHTML =
      `<div class="kr"><div class="kr-label">Error</div><div class="kr-val red">${e.message}</div></div>`;
  }
}

/* ─── Trending ──────────────────────────────────────────────────────── */
async function loadTrending() {
  document.getElementById('trending-content').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';
  try {
    const data = await apiFetch('trending');
    const trends = data.trends || [];
    const icons = { sharp: '🔵', public: '👥', line_move: '📊', injury: '🏥', weather: '🌬️' };

    document.getElementById('trending-content').innerHTML = trends.map(t => `
      <div class="trend-card">
        <div class="trend-icon">${icons[t.type] || '📌'}</div>
        <div class="trend-body">
          <div class="trend-desc">${t.description}</div>
          <div class="trend-meta">${leagueChip(t.league)} <span style="margin-left:6px;text-transform:capitalize">${t.type.replace('_',' ')}</span></div>
        </div>
        <div class="trend-conf ${t.confidence>=65?'green':t.confidence>=50?'amber':'red'}"
          style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700">
          ${t.confidence}%
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('trending-content').innerHTML =
      `<div class="loading-state"><p style="color:#ef4444">Error: ${e.message}</p></div>`;
  }
}

/* ─── API Status ─────────────────────────────────────────────────── */
async function loadAPIStatus() {
  document.getElementById('api-status-content').innerHTML =
    '<div class="loading-state"><div class="spinner"></div><p>Checking…</p></div>';
  try {
    const data = await apiFetch('status');
    const apis = data.apis || {};

    const descriptions = {
      espn: 'Scores, rosters, injuries for NFL, NBA, MLB, NHL, MLS',
      the_odds_api: 'Real-time moneylines, spreads, totals from 40+ books',
      balldontlie: 'Deep NBA player and team statistics',
      football_data: 'International soccer — EPL, Champions League, La Liga, Serie A',
      thesportsdb: 'Multi-sport event data, historical records',
      api_sports: 'NFL, NBA, MLB stats — extended coverage',
    };

    document.getElementById('api-status-content').innerHTML = `
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div class="sc" style="flex:1"><div class="sc-label">Connected</div><div class="sc-value green">${data.connected_count}</div></div>
        <div class="sc" style="flex:1"><div class="sc-label">Total APIs</div><div class="sc-value">${data.total}</div></div>
      </div>
      <div class="api-grid">
        ${Object.entries(apis).map(([name, info]) => `
          <div class="api-card">
            <div class="api-top">
              <div class="api-name">${name.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
              <div class="api-status-dot ${info.connected?'dot-on':'dot-off'}"></div>
            </div>
            <div class="api-note">${descriptions[name] || ''}</div>
            ${info.env ? `<div class="api-env">ENV: ${info.env} ${info.connected ? '✓' : '— not set'}</div>` : ''}
            ${info.note ? `<div class="api-env">${info.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div style="margin-top:20px;background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px">
        <div style="font-size:14px;font-weight:600;margin-bottom:10px">Set API keys in Railway → Variables</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;line-height:2;color:var(--muted)">
          ODDS_API_KEY=your_key_from_the-odds-api.com<br>
          FOOTBALL_DATA_KEY=your_key_from_football-data.org<br>
          BALLDONTLIE_KEY=your_key_from_balldontlie.io<br>
          API_SPORTS_KEY=your_key_from_api-sports.io<br>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('api-status-content').innerHTML =
      `<div class="loading-state"><p style="color:#ef4444">Error: ${e.message}</p></div>`;
  }
}

/* ─── Init ──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadTop10();
});
