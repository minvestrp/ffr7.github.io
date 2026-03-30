// ── AUTH ──
const ADMIN_EMAIL = 'minvestrp@gmail.com';
const ADMIN_PASS  = 'smartsec2025';

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPassword').value;
  const err   = document.getElementById('loginError');

  if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
    sessionStorage.setItem('smartsec_auth', '1');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    initDashboard();
  } else {
    err.textContent = 'Invalid email or password';
    setTimeout(() => err.textContent = '', 3000);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('smartsec_auth');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
});

// Auto-login if session exists
if (sessionStorage.getItem('smartsec_auth')) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  initDashboard();
}

// ── NAV ──
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
  });
});
document.querySelectorAll('.link-more[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  document.getElementById('pageTitle').textContent =
    document.querySelector(`.nav-item[data-page="${page}"] span:last-of-type`)?.textContent || page;
  if (page === 'gaming') startLiveRounds();
}

// ── SIDEBAR TOGGLE ──
document.getElementById('sidebarToggle').addEventListener('click', () => {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 600) {
    sb.classList.toggle('mobile-open');
  } else {
    sb.classList.toggle('collapsed');
  }
});

// ── CLOCK ──
function updateTime() {
  const now = new Date();
  document.getElementById('topbarTime').textContent =
    now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}
setInterval(updateTime, 1000);
updateTime();

// ── CHARTS ──
function initDashboard() {
  updateTime();
  initCharts();
  startLiveRounds();
}

function initCharts() {
  // Revenue chart (bar)
  const revenueCtx = document.getElementById('revenueChart');
  if (!revenueCtx) return;

  const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];
  const revenue = [142000, 168000, 195000, 198400, 241300, 284750];

  drawBarChart(revenueCtx, months, revenue, '#00d4ff');

  // Risk distribution (donut)
  const riskCtx = document.getElementById('riskChart');
  if (!riskCtx) return;
  drawDonutChart(riskCtx,
    ['Critical', 'High', 'Medium', 'Low'],
    [3, 12, 24, 8],
    ['#ef4444','#f97316','#eab308','#22c55e']
  );
}

function drawBarChart(canvas, labels, data, color) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth; const H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;
  const max = Math.max(...data);
  const pad = {t:20, r:16, b:40, l:60};
  const bw = Math.floor((W - pad.l - pad.r) / labels.length * 0.6);
  const gap = Math.floor((W - pad.l - pad.r) / labels.length);

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * (i / 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    const val = Math.round(max * (1 - i/4) / 1000);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText('$' + val + 'K', pad.l - 6, y + 4);
  }

  // Bars
  data.forEach((val, i) => {
    const x = pad.l + i * gap + (gap - bw) / 2;
    const h = (val / max) * (H - pad.t - pad.b);
    const y = H - pad.b - h;

    const grad = ctx.createLinearGradient(0, y, 0, H - pad.b);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '33');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, h, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw/2, H - pad.b + 16);
  });
}

function drawDonutChart(canvas, labels, data, colors) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth; const H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  const total = data.reduce((a,b) => a + b, 0);
  const cx = W / 2, cy = H / 2 - 20;
  const r = Math.min(cx, cy) - 10;
  const innerR = r * 0.6;
  let startAngle = -Math.PI / 2;

  data.forEach((val, i) => {
    const angle = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    startAngle += angle;
  });

  // Inner circle (donut hole)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#f0f0ff';
  ctx.font = 'bold 18px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 6);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px Inter';
  ctx.fillText('findings', cx, cy + 20);

  // Legend
  const legendY = H - 28;
  const itemW = W / labels.length;
  labels.forEach((label, i) => {
    const x = i * itemW + itemW/2;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x - 24, legendY, 10, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(label, x - 10, legendY + 9);
  });
}

// ── LIVE ROUNDS ──
const gameTypes = ['Slots', 'Dice', 'Crash', 'Roulette'];
const operators = ['NexaGaming', 'BetPro', 'CryptoXBet'];
let liveInterval = null;

function generateRound() {
  const bet = [10,25,50,100,200,500][Math.floor(Math.random()*6)];
  const win = Math.random() > 0.52 ? 0 : +(bet * [1.5,2,3,5,10][Math.floor(Math.random()*5)]).toFixed(0);
  const playerId = 'p_' + Math.random().toString(36).substr(2,4);
  const roundId = Math.random().toString(36).substr(2,8).toUpperCase();
  const game = gameTypes[Math.floor(Math.random()*gameTypes.length)];
  const op = operators[Math.floor(Math.random()*operators.length)];
  const now = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  return `<tr>
    <td class="mono">${roundId}</td>
    <td>${op}</td>
    <td class="mono">${playerId}</td>
    <td>${game}</td>
    <td>$${bet}</td>
    <td>${win > 0 ? '<span class="badge badge--green">+$'+win+'</span>' : '<span class="badge badge--red">-$'+bet+'</span>'}</td>
    <td>${win > 0 ? '<span class="status-badge done">Win</span>' : '<span class="status-badge" style="background:rgba(239,68,68,0.15);color:#ef4444">Loss</span>'}</td>
    <td style="color:var(--text3)">${now}</td>
  </tr>`;
}

function startLiveRounds() {
  const tbody = document.getElementById('liveRounds');
  if (!tbody) return;

  // Initial rows
  tbody.innerHTML = Array.from({length:8}, generateRound).join('');

  if (liveInterval) clearInterval(liveInterval);
  liveInterval = setInterval(() => {
    const rows = tbody.querySelectorAll('tr');
    if (rows.length >= 8) rows[rows.length-1].remove();
    tbody.insertAdjacentHTML('afterbegin', generateRound());
  }, 2000);
}

// ── MODALS ──
function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

function submitAudit() {
  closeModal('auditModal');
  showToast('✓ Audit submitted — analysis started', 'success');
}
function submitForensics() {
  closeModal('forensicsModal');
  showToast('✓ Investigation started', 'success');
}
function addOperator() {
  closeModal('operatorModal');
  showToast('✓ Operator created — API key generated', 'success');
}

// ── TOAST ──
function showToast(msg, type='success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:10px;font-size:0.875rem;font-weight:600;
    background:${type==='success'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'};
    border:1px solid ${type==='success'?'rgba(34,197,94,0.4)':'rgba(239,68,68,0.4)'};
    color:${type==='success'?'#22c55e':'#ef4444'};
    box-shadow:0 8px 24px rgba(0,0,0,0.3);
    animation:slideIn 0.3s ease;
  `;
  toast.textContent = msg;
  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function refreshData() {
  showToast('✓ Data refreshed', 'success');
  initCharts();
}

// ── RESIZE CHARTS ──
window.addEventListener('resize', () => {
  if (sessionStorage.getItem('smartsec_auth')) initCharts();
});
