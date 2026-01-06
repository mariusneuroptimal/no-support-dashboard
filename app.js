const BASE_URL = "./data";

// App state
const state = {
  sessions: [],
  selectedCountry: null
};

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
    bySignalType: {}, // Renamed from 'byFailureType'
    byCountry: {} // Country breakdown
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

    // Aggregate by country
    const country = s.country || 'UNK';
    if (!stats.byCountry[country]) {
      stats.byCountry[country] = { sessions: 0, pass: 0, warn: 0, fail: 0 };
    }
    stats.byCountry[country].sessions++;
    if (status === 'pass') stats.byCountry[country].pass++;
    else if (status === 'warn') stats.byCountry[country].warn++;
    else if (status === 'fail') stats.byCountry[country].fail++;
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

// Convert 2-letter country code to flag emoji
function countryCodeToFlagEmoji(code) {
  if (!code || code.length !== 2) return '\u{1F3F3}\u{FE0F}'; // White flag
  const base = 0x1F1E6;
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => base + c.charCodeAt(0) - 65)
  );
}

// Render country breakdown table
function renderCountryBreakdown(stats) {
  const container = document.getElementById('countryBreakdown');
  const entries = Object.entries(stats.byCountry);

  if (entries.length === 0) {
    container.innerHTML = '<div class="no-signals">No country data available</div>';
    return;
  }

  // Sort: failCount DESC, warnCount DESC, sessions DESC, country ASC
  entries.sort((a, b) => {
    if (b[1].fail !== a[1].fail) return b[1].fail - a[1].fail;
    if (b[1].warn !== a[1].warn) return b[1].warn - a[1].warn;
    if (b[1].sessions !== a[1].sessions) return b[1].sessions - a[1].sessions;
    return a[0].localeCompare(b[0]);
  });

  container.innerHTML = `
    <table class="country-table">
      <thead>
        <tr>
          <th>Country</th>
          <th>Sessions</th>
          <th>Pass</th>
          <th>Warn</th>
          <th>Fail</th>
          <th>Distribution</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(([code, data]) => {
          const flag = countryCodeToFlagEmoji(code);
          const failRatio = data.fail / data.sessions;
          const warnRatio = data.warn / data.sessions;
          const passRatio = data.pass / data.sessions;
          const selected = state.selectedCountry === code ? 'selected' : '';
          return `
            <tr class="clickable ${selected}" data-country="${code}">
              <td>
                <span class="country-cell">
                  <span class="flag">${flag}</span>
                  <span class="code">${code}</span>
                </span>
              </td>
              <td>${data.sessions}</td>
              <td class="status-pass">${data.pass}</td>
              <td class="status-warn">${data.warn}</td>
              <td class="status-signal">${data.fail}</td>
              <td>
                <div class="stacked-bar">
                  <div class="stacked-pass" style="width: ${passRatio * 100}%"></div>
                  <div class="stacked-warn" style="width: ${warnRatio * 100}%"></div>
                  <div class="stacked-fail" style="width: ${failRatio * 100}%"></div>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Attach click handlers
  container.querySelectorAll('tr[data-country]').forEach(row => {
    row.addEventListener('click', () => {
      const country = row.dataset.country;
      // Toggle: click same country clears filter
      state.selectedCountry = state.selectedCountry === country ? null : country;
      renderCountryBreakdown(stats);
      renderTable(state.sessions);
      updateFilterIndicator();
    });
  });
}

// Update filter indicator in Recent Sessions header
function updateFilterIndicator() {
  const header = document.querySelector('.recent-sessions h2');
  const existing = document.getElementById('countryFilter');
  if (existing) existing.remove();

  if (state.selectedCountry) {
    const flag = countryCodeToFlagEmoji(state.selectedCountry);
    const indicator = document.createElement('span');
    indicator.id = 'countryFilter';
    indicator.className = 'filter-indicator';
    indicator.innerHTML = `${flag} ${state.selectedCountry} <button class="clear-filter" aria-label="Clear filter">\u00D7</button>`;
    header.appendChild(indicator);

    indicator.querySelector('.clear-filter').addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedCountry = null;
      renderCountryBreakdown(summarize(state.sessions));
      renderTable(state.sessions);
      updateFilterIndicator();
    });
  }
}

// Render sessions table with observational status indicators
function renderTable(sessions) {
  // Apply country filter if set
  const filtered = state.selectedCountry
    ? sessions.filter(s => (s.country || 'UNK') === state.selectedCountry)
    : sessions;

  const sorted = [...filtered]
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
    state.sessions = sessions; // Cache for filtering
    const stats = summarize(sessions);

    renderSummaryCards(stats);
    renderCountryBreakdown(stats);
    renderBreakdown(stats);
    renderTable(sessions);
    renderLastIngest(sessions);
  } catch (err) {
    showError(err.message);
  }
}

main();
