const BASE_URL = "./data";

// Fetch index and all session files
async function loadAllSessions() {
  const res = await fetch(`${BASE_URL}/index.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load index");

  const index = await res.json();

  const sessions = await Promise.all(
    index.files.map(f =>
      fetch(`${BASE_URL}/${f}`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )
  );

  return sessions.filter(Boolean);
}

// Compute statistics
function summarize(sessions) {
  const stats = {
    total: sessions.length,
    pass: 0,
    warn: 0,
    signal: 0, // Renamed from 'fail' - observational language
    bySignalType: {} // Renamed from 'byFailureType'
  };

  for (const s of sessions) {
    const status = s.summary?.status?.toLowerCase() || 'unknown';
    if (status === 'pass') stats.pass++;
    else if (status === 'warn') stats.warn++;
    else if (status === 'fail') stats.signal++;

    // Collect signal types (formerly failure types)
    if (status === 'fail' && s.checks) {
      for (const c of s.checks) {
        if (c.status === 'FAIL') {
          stats.bySignalType[c.name] = (stats.bySignalType[c.name] || 0) + 1;
        }
      }
    }
  }

  return stats;
}

// Render summary cards with observational language
function renderSummaryCards(stats) {
  document.getElementById('summaryCards').innerHTML = `
    <div class="card">
      <div class="card-label">Sessions</div>
      <div class="card-value">${stats.total}</div>
    </div>
    <div class="card pass">
      <div class="card-label">Pass</div>
      <div class="card-value">${stats.pass}</div>
    </div>
    <div class="card signal">
      <div class="card-label">Issues Detected</div>
      <div class="card-value">${stats.signal}</div>
      <div class="card-sub">Warnings: ${stats.warn}</div>
    </div>
  `;
}

// Render signal breakdown bars (formerly failure breakdown)
function renderBreakdown(stats) {
  const container = document.getElementById('breakdownBars');
  const entries = Object.entries(stats.bySignalType).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = '<div class="no-signals">No diagnostic signals detected</div>';
    return;
  }

  const maxCount = Math.max(...entries.map(e => e[1]));

  container.innerHTML = entries.map(([name, count]) => `
    <div class="bar-row">
      <span class="bar-label">${name}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
      </div>
      <span class="bar-count">${count}</span>
    </div>
  `).join('');
}

// Render sessions table with observational status indicators
function renderTable(sessions) {
  const sorted = [...sessions]
    .sort((a, b) => (b.generated_at || '').localeCompare(a.generated_at || ''))
    .slice(0, 20);

  // Softer status indicators - observational rather than judgmental
  const statusIcon = {
    pass: '\u2713', // checkmark
    warn: '\u25B3', // triangle (softer than warning emoji)
    fail: '\u25CF'  // filled circle (neutral signal indicator)
  };

  // Map status labels to observational language
  const statusLabel = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'SIGNAL'
  };

  // CSS class mapping - 'fail' status uses 'signal' styling
  const statusClass = {
    pass: 'pass',
    warn: 'warn',
    fail: 'signal'
  };

  document.getElementById('sessionsBody').innerHTML = sorted.map(s => {
    const status = s.summary?.status?.toLowerCase() || 'unknown';
    const rowClass = statusClass[status] || '';
    const icon = statusIcon[status] || '?';
    const label = statusLabel[status] || 'UNKNOWN';

    return `
      <tr class="${rowClass}">
        <td>${s.session_id || '\u2014'}</td>
        <td>${s.country || '\u2014'}</td>
        <td>${formatTier(s.tier)}</td>
        <td class="status-${statusClass[status] || 'unknown'}">${icon} ${label}</td>
      </tr>
    `;
  }).join('');
}

// Format tier with semantic labels
function formatTier(tier) {
  if (!tier) return '\u2014';

  // Add semantic context to P0/P1 tiers
  const tierLabels = {
    'P0': 'P0',
    'P1': 'P1'
  };

  return tierLabels[tier] || tier;
}

// Update last ingest timestamp
function renderLastIngest(sessions) {
  const latest = sessions
    .filter(s => s.generated_at)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0];

  if (latest) {
    const date = new Date(latest.generated_at);
    document.getElementById('lastIngest').textContent =
      `Last ingest: ${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  } else {
    document.getElementById('lastIngest').textContent = 'No data';
  }
}

// Show error
function showError(message) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = `ERROR: ${message}`;
  banner.hidden = false;
}

// Main
async function main() {
  try {
    const sessions = await loadAllSessions();
    const stats = summarize(sessions);

    renderSummaryCards(stats);
    renderBreakdown(stats);
    renderTable(sessions);
    renderLastIngest(sessions);
  } catch (err) {
    showError(err.message);
  }
}

main();
