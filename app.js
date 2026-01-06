const BASE_URL = "http://192.168.2.90:8081/diagnostics";

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
    fail: 0,
    byFailureType: {}
  };

  for (const s of sessions) {
    const status = s.summary?.status?.toLowerCase() || 'unknown';
    if (status === 'pass') stats.pass++;
    else if (status === 'warn') stats.warn++;
    else if (status === 'fail') stats.fail++;

    if (status === 'fail' && s.checks) {
      for (const c of s.checks) {
        if (c.status === 'FAIL') {
          stats.byFailureType[c.name] = (stats.byFailureType[c.name] || 0) + 1;
        }
      }
    }
  }

  return stats;
}

// Render summary cards
function renderSummaryCards(stats) {
  document.getElementById('summaryCards').innerHTML = `
    <div class="card">
      <div class="card-label">Total</div>
      <div class="card-value">${stats.total}</div>
    </div>
    <div class="card pass">
      <div class="card-label">Pass</div>
      <div class="card-value">${stats.pass}</div>
    </div>
    <div class="card fail">
      <div class="card-label">Fail</div>
      <div class="card-value">${stats.fail}</div>
      <div class="card-sub">WARN: ${stats.warn}</div>
    </div>
  `;
}

// Render failure breakdown bars
function renderBreakdown(stats) {
  const container = document.getElementById('breakdownBars');
  const entries = Object.entries(stats.byFailureType).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = '<div class="no-failures">No failures detected</div>';
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

// Render sessions table
function renderTable(sessions) {
  const sorted = [...sessions]
    .sort((a, b) => (b.generated_at || '').localeCompare(a.generated_at || ''))
    .slice(0, 20);

  const statusIcon = {
    pass: '✓',
    warn: '⚠',
    fail: '✕'
  };

  document.getElementById('sessionsBody').innerHTML = sorted.map(s => {
    const status = s.summary?.status?.toLowerCase() || 'unknown';
    return `
      <tr class="${status}">
        <td>${s.session_id || '—'}</td>
        <td>${s.country || '—'}</td>
        <td>${s.tier || '—'}</td>
        <td class="status-${status}">${statusIcon[status] || '?'} ${s.summary?.status || 'UNKNOWN'}</td>
      </tr>
    `;
  }).join('');
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
