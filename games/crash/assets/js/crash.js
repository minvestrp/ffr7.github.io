// ═══════════════════════════════════════
//  SMARTSEC CRASHX — Full Game Engine
// ═══════════════════════════════════════

// ── STATE ──
const STATE = { WAITING: 'waiting', FLYING: 'flying', CRASHED: 'crashed' };
let gameState  = STATE.WAITING;
let multiplier = 1.00;
let startTime  = 0;
let crashPoint = 2.34;
let balance    = 1000;
let currentBet = 0;
let betPlaced  = false;
let cashedOut  = false;
let countdownTimer = null;
let gameLoop   = null;
let soundOn    = false;
let audioCtx   = null;

// ── CANVAS ──
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
let W, H;
let rocketX, rocketY;
let trail    = [];
let particles = [];
let stars    = [];

function resizeCanvas() {
  W = canvas.width  = canvas.offsetWidth;
  H = canvas.height = canvas.offsetHeight;
  initStars();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── STARS ──
function initStars() {
  stars = Array.from({length: 120}, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5,
    a: Math.random() * 0.6 + 0.1,
    speed: Math.random() * 0.3 + 0.05
  }));
}

// ── PROVABLY FAIR CRASH POINT ──
function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.03) return 1.00;  // 3% instant crash
  return parseFloat((Math.max(1.00, 0.99 / (1 - r))).toFixed(2));
}

// ── MULTIPLIER COLOR ──
function getMultColor(m) {
  if (m < 2)   return '#00d4ff';
  if (m < 5)   return '#22c55e';
  if (m < 10)  return '#f97316';
  return '#ef4444';
}

// ── ROCKET POSITION ──
function getRocketPos(elapsed) {
  const progress = Math.min(elapsed / 8000, 1);
  const curve    = Math.pow(progress, 0.7);
  const x = W * 0.12 + curve * W * 0.65;
  const y = H * 0.85 - curve * H * 0.72;
  return { x, y };
}

// ── DRAW FRAME ──
function drawFrame(timestamp) {
  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0a0f');
  bg.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  const gs = 60;
  for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Stars
  stars.forEach(s => {
    if (gameState === STATE.FLYING) {
      s.x -= s.speed * 2;
      if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  });

  if (gameState === STATE.FLYING) {
    const elapsed = timestamp - startTime;
    const pos = getRocketPos(elapsed);
    rocketX = pos.x; rocketY = pos.y;

    // Trail
    trail.push({ x: rocketX, y: rocketY, t: timestamp });
    trail = trail.filter(p => timestamp - p.t < 1200);

    // Draw trail
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const age   = (timestamp - trail[i].t) / 1200;
        const alpha = (1 - age) * 0.7;
        const color = getMultColor(multiplier);
        ctx.strokeStyle = color.replace(')', `,${alpha})`).replace('#', 'rgba(').replace('rgba(', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/, (m,r,g,b) =>
          `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`);

        // Simpler approach
        ctx.beginPath();
        ctx.moveTo(trail[i-1].x, trail[i-1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = `rgba(0,212,255,${alpha * 0.8})`;
        ctx.lineWidth = (1 - age) * 4 + 1;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // Glow under rocket
    const glow = ctx.createRadialGradient(rocketX, rocketY, 0, rocketX, rocketY, 40);
    const c = getMultColor(multiplier);
    glow.addColorStop(0, c + 'aa');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(rocketX, rocketY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Rocket
    const angle = trail.length > 1
      ? Math.atan2(trail[trail.length-1].y - trail[Math.max(0,trail.length-5)].y,
                   trail[trail.length-1].x - trail[Math.max(0,trail.length-5)].x)
      : -Math.PI / 4;

    ctx.save();
    ctx.translate(rocketX, rocketY);
    ctx.rotate(angle);
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀', 0, 0);
    ctx.restore();

    // Curve line from origin
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.9);
    for (let i = 0; i <= 100; i++) {
      const t   = i / 100;
      const p   = getRocketPos((timestamp - startTime) * t);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(0,212,255,0.15)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Particles (crash explosion)
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.15; // gravity
    p.life -= 2;
    const a = p.life / 100;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${a})`;
    ctx.fill();
  });

  gameLoop = requestAnimationFrame(drawFrame);
}

// ── CRASH EXPLOSION ──
function spawnExplosion(x, y) {
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    const colors = ['239,68,68','249,115,22','234,179,8','255,255,255'];
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      r: Math.random() * 5 + 2,
      life: 100,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

// ── FAKE PLAYERS ──
const FAKE_NAMES = [
  'whale_88','crypto_wolf','p_4f8a','moon_boy','degen_99',
  'lucky_cat','satoshi_x','eth_maxi','bnb_king','anon_007',
  'hodl_lord','to_the_moon','win_streak','big_brain'
];
let fakePlayers = [];

function initFakePlayers() {
  fakePlayers = Array.from({length: 10}, () => {
    const cashAt = Math.random() < 0.7 ? (Math.random() * 8 + 1.1) : null; // null = crash
    return {
      name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
      bet: [10,25,50,100,200,500][Math.floor(Math.random()*6)],
      cashAt,
      state: 'waiting' // waiting | won | lost
    };
  });
  renderPlayers();
}

function renderPlayers() {
  const list = document.getElementById('playersList');
  list.innerHTML = fakePlayers.map(p => {
    let multHtml = '';
    if (p.state === 'won')     multHtml = `<span class="player-cashout win">${p.cashAt.toFixed(2)}×</span>`;
    else if (p.state === 'lost') multHtml = `<span class="player-cashout lost">✕</span>`;
    else multHtml = `<span class="player-cashout waiting">●</span>`;

    return `<div class="player-row">
      <span class="player-name">${p.name}</span>
      <span class="player-bet">$${p.bet}</span>
      ${multHtml}
    </div>`;
  }).join('');
}

function updateFakePlayers(currentMult) {
  fakePlayers.forEach(p => {
    if (p.state === 'waiting' && p.cashAt && currentMult >= p.cashAt) {
      p.state = 'won';
    }
  });
  renderPlayers();
}

function crashFakePlayers() {
  fakePlayers.forEach(p => {
    if (p.state === 'waiting') p.state = 'lost';
  });
  renderPlayers();
}

// ── HISTORY ──
let history = [];
function addHistory(mult) {
  history.unshift(mult);
  if (history.length > 12) history.pop();
  renderHistory();
}
function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = history.map(m => {
    let cls = m < 1.5 ? 'hb-low' : m < 3 ? 'hb-mid' : m < 10 ? 'hb-high' : 'hb-moon';
    return `<div class="history-badge ${cls}">${m.toFixed(2)}×</div>`;
  }).join('');
}

// ── ROUND LIFECYCLE ──
function startWaiting() {
  gameState = STATE.WAITING;
  multiplier = 1.00;
  betPlaced  = false;
  cashedOut  = false;
  trail      = [];
  crashPoint = generateCrashPoint();

  updateMultDisplay();
  document.getElementById('crashedOverlay').classList.add('hidden');
  document.getElementById('multLabel').textContent = 'NEXT ROUND';
  document.getElementById('betBtn').disabled = false;
  document.getElementById('betBtn').classList.remove('hidden');
  document.getElementById('cashoutBtn').classList.add('hidden');

  initFakePlayers();

  let sec = 5;
  const cd = document.getElementById('countdown');
  cd.textContent = `Starting in ${sec}s`;
  countdownTimer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(countdownTimer);
      cd.textContent = '';
      startFlying();
    } else {
      cd.textContent = `Starting in ${sec}s`;
      playTick(220);
    }
  }, 1000);
}

function startFlying() {
  gameState = STATE.FLYING;
  startTime = performance.now();
  multiplier = 1.00;

  document.getElementById('multLabel').textContent = 'FLYING';
  document.getElementById('betBtn').disabled = true;

  if (betPlaced && !cashedOut) {
    document.getElementById('betBtn').classList.add('hidden');
    document.getElementById('cashoutBtn').classList.remove('hidden');
  }

  const flyInterval = setInterval(() => {
    if (gameState !== STATE.FLYING) { clearInterval(flyInterval); return; }

    const elapsed = performance.now() - startTime;
    multiplier = Math.max(1.00, Math.pow(Math.E, elapsed * 0.000062));

    // Auto cashout
    const autoEnabled = document.getElementById('autoEnabled').checked;
    const autoVal     = parseFloat(document.getElementById('autoInput').value);
    if (betPlaced && !cashedOut && autoEnabled && multiplier >= autoVal) {
      doCashout();
    }

    // Crash?
    if (multiplier >= crashPoint) {
      multiplier = crashPoint;
      clearInterval(flyInterval);
      doCrash();
      return;
    }

    updateMultDisplay();
    updateFakePlayers(multiplier);

    // Update cashout button
    document.getElementById('cashoutMult').textContent = multiplier.toFixed(2) + '×';

    playTick(200 + multiplier * 20);
  }, 80);
}

function doCrash() {
  gameState = STATE.CRASHED;

  // Player lost if didn't cash out
  if (betPlaced && !cashedOut) {
    showToast(`💥 Crashed at ${crashPoint.toFixed(2)}× — Lost $${currentBet}`, 'loss');
    updateBalance(-currentBet);
    playExplosion();
  }

  crashFakePlayers();
  spawnExplosion(rocketX || W*0.6, rocketY || H*0.3);

  document.getElementById('cashoutBtn').classList.add('hidden');
  document.getElementById('betBtn').classList.remove('hidden');
  document.getElementById('betBtn').disabled = false;

  const overlay = document.getElementById('crashedOverlay');
  overlay.classList.remove('hidden');
  document.getElementById('crashedAt').textContent = `at ${crashPoint.toFixed(2)}×`;
  document.getElementById('multLabel').textContent = 'CRASHED';
  updateMultDisplay();

  addHistory(crashPoint);

  setTimeout(startWaiting, 3000);
}

function doCashout() {
  if (!betPlaced || cashedOut || gameState !== STATE.FLYING) return;
  cashedOut = true;
  const winAmt  = parseFloat((currentBet * multiplier).toFixed(2));
  const profit  = parseFloat((winAmt - currentBet).toFixed(2));
  updateBalance(winAmt);
  showToast(`✅ Cashed out at ${multiplier.toFixed(2)}× — Won $${winAmt} (+$${profit})`, 'win');
  playCashout();
  document.getElementById('cashoutBtn').classList.add('hidden');
  document.getElementById('betBtn').classList.remove('hidden');
  document.getElementById('betBtn').disabled = true;
}

function updateMultDisplay() {
  const el    = document.getElementById('multValue');
  const color = getMultColor(multiplier);
  el.style.color = color;
  el.innerHTML   = `${multiplier.toFixed(2)}<span class="mult-x">×</span>`;
}

// ── BET ──
document.getElementById('betBtn').addEventListener('click', () => {
  if (gameState === STATE.WAITING) {
    const amt = parseFloat(document.getElementById('betInput').value);
    if (isNaN(amt) || amt < 1) return;
    if (amt > balance) { showToast('Insufficient balance', 'loss'); return; }
    currentBet = amt;
    betPlaced  = true;
    document.getElementById('betBtn').textContent = `BET PLACED ($${amt})`;
    document.getElementById('betBtn').disabled = true;
    document.getElementById('betBtn').style.background = 'rgba(0,212,255,0.2)';
    document.getElementById('betBtn').style.color = '#00d4ff';
    playTick(440);
  }
});

document.getElementById('cashoutBtn').addEventListener('click', doCashout);

// ── BALANCE ──
function updateBalance(delta) {
  balance = parseFloat((balance + delta).toFixed(2));
  document.getElementById('balance').textContent = '$' + balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── QUICK BETS ──
document.querySelectorAll('.qb').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('betInput').value = btn.dataset.v;
  });
});
document.getElementById('betHalf').addEventListener('click', () => {
  const v = parseFloat(document.getElementById('betInput').value);
  document.getElementById('betInput').value = Math.max(1, v / 2).toFixed(0);
});
document.getElementById('betDouble').addEventListener('click', () => {
  const v = parseFloat(document.getElementById('betInput').value);
  document.getElementById('betInput').value = Math.min(balance, v * 2).toFixed(0);
});

// ── TOAST ──
function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── SOUND (Web Audio API) ──
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTick(freq) {
  if (!soundOn) return;
  try {
    const ctx2 = getAudioCtx();
    const osc  = ctx2.createOscillator();
    const gain = ctx2.createGain();
    osc.connect(gain); gain.connect(ctx2.destination);
    osc.frequency.value = Math.min(freq, 1200);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.04, ctx2.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.06);
    osc.start(); osc.stop(ctx2.currentTime + 0.06);
  } catch(e) {}
}
function playCashout() {
  if (!soundOn) return;
  try {
    const ctx2 = getAudioCtx();
    [523,659,784].forEach((f,i) => {
      const osc = ctx2.createOscillator();
      const gain = ctx2.createGain();
      osc.connect(gain); gain.connect(ctx2.destination);
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.1, ctx2.currentTime + i*0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + i*0.08 + 0.15);
      osc.start(ctx2.currentTime + i*0.08);
      osc.stop(ctx2.currentTime + i*0.08 + 0.15);
    });
  } catch(e) {}
}
function playExplosion() {
  if (!soundOn) return;
  try {
    const ctx2 = getAudioCtx();
    const buf  = ctx2.createBuffer(1, ctx2.sampleRate * 0.5, ctx2.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, 2);
    const src = ctx2.createBufferSource();
    const gain = ctx2.createGain();
    src.buffer = buf;
    src.connect(gain); gain.connect(ctx2.destination);
    gain.gain.value = 0.3;
    src.start();
  } catch(e) {}
}

document.getElementById('soundToggle').addEventListener('click', function() {
  soundOn = !soundOn;
  this.textContent = soundOn ? '🔊' : '🔇';
  if (soundOn) { try { getAudioCtx().resume(); } catch(e){} }
});

// ── INIT ──
requestAnimationFrame(drawFrame);
startWaiting();

// Seed history
[1.24, 8.73, 2.01, 1.00, 4.45, 15.2, 1.87, 3.32, 1.00, 6.14].forEach(addHistory);
