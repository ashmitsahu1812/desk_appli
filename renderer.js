// renderer.js - Frontend Logic for JalSuraksha-NE Dashboard
/* global Chart, lucide */

// State
let dashboardState = {
  stations: [],
  stats: {},
  recentAlerts: [],
  recentReadings: [],
  selectedStation: 'All', // 'All' or specific station name
  searchQuery: '',
};

// Chart instances
let turbidityChart = null;
let phChart = null;
let doChart = null;
let matrixChart = null;

// DOM Elements
const liveClockEl = document.getElementById('liveClock');
const statWQI = document.getElementById('statWQI');
const statWQIGrade = document.getElementById('statWQIGrade');
const statWQIBars = document.getElementById('statWQIBars');
const statStations = document.getElementById('statStations');
const statCases = document.getElementById('statCases');
const statAlerts = document.getElementById('statAlerts');
const statAlertSeverity = document.getElementById('statAlertSeverity');

const stationsSummaryRow = document.getElementById('stationsSummaryRow');
const stationsGrid = document.getElementById('stationsGrid');
const healthLogsTableBody = document.getElementById('healthLogsTableBody');
const alertsContainer = document.getElementById('alertsContainer');
const alertsCountLabel = document.getElementById('alertsCountLabel');
const tabAlertCount = document.getElementById('tabAlertCount');
const tabHealthCaseCount = document.getElementById('tabHealthCaseCount');
const tabStationCount = document.getElementById('tabStationCount');

const latestTurbidityValue = document.getElementById('latestTurbidityValue');
const latestPhValue = document.getElementById('latestPhValue');
const latestDoValue = document.getElementById('latestDoValue');

const riskBanner = document.getElementById('riskBanner');
const riskTitle = document.getElementById('riskTitle');
const riskDescription = document.getElementById('riskDescription');
const riskBadge = document.getElementById('riskBadge');
const riskIconContainer = document.getElementById('riskIconContainer');

const logModal = document.getElementById('logModal');
const logForm = document.getElementById('logForm');
const stationSelect = document.getElementById('stationSelect');
const toastContainer = document.getElementById('toastContainer');

// ----------------- CLOCK TICKER -----------------
function initClock() {
  function updateTime() {
    const now = new Date();
    if (liveClockEl) {
      liveClockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// ----------------- TOAST SYSTEM -----------------
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-slate-800 border-cyan-500/50 text-cyan-200',
    warning: 'bg-slate-800 border-amber-500/50 text-amber-200',
    danger: 'bg-slate-800 border-rose-500/50 text-rose-200',
    success: 'bg-slate-800 border-emerald-500/50 text-emerald-200',
  };

  const icons = {
    info: 'info',
    warning: 'alert-triangle',
    danger: 'alert-octagon',
    success: 'check-circle-2',
  };

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs backdrop-blur-lg transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
    <span class="font-medium">${message}</span>
  `;

  toastContainer.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----------------- TAB NAVIGATION -----------------
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');

      tabs.forEach(t => {
        t.classList.remove('active', 'bg-brand-500/15', 'text-brand-400', 'border-brand-500/30');
        t.classList.add('text-slate-400');
      });
      tab.classList.add('active', 'bg-brand-500/15', 'text-brand-400', 'border-brand-500/30');
      tab.classList.remove('text-slate-400');

      panels.forEach(p => p.classList.add('hidden'));
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.remove('hidden');

      if (window.lucide) lucide.createIcons();
    });
  });
}

// ----------------- CHARTS INITIALIZATION -----------------
function initCharts() {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: 'rgba(148, 163, 184, 0.7)', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(148, 163, 184, 0.7)', font: { size: 10 } },
      },
    },
  };

  // 1. Turbidity Chart
  const turbCtx = document.getElementById('turbidityChart').getContext('2d');
  const turbGradient = turbCtx.createLinearGradient(0, 0, 0, 200);
  turbGradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
  turbGradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

  turbidityChart = new Chart(turbCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Turbidity (NTU)',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: turbGradient,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#f59e0b',
      }],
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: { ...commonOptions.scales.y, min: 0, suggestedMax: 12 },
      },
    },
  });

  // 2. pH Chart
  const phCtx = document.getElementById('phChart').getContext('2d');
  const phGradient = phCtx.createLinearGradient(0, 0, 0, 200);
  phGradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
  phGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  phChart = new Chart(phCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'pH Level',
        data: [],
        borderColor: '#06b6d4',
        backgroundColor: phGradient,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#06b6d4',
      }],
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: { ...commonOptions.scales.y, min: 5.5, max: 9.0 },
      },
    },
  });

  // 3. Dissolved Oxygen Chart
  const doCtx = document.getElementById('doChart').getContext('2d');
  const doGradient = doCtx.createLinearGradient(0, 0, 0, 180);
  doGradient.addColorStop(0, 'rgba(20, 184, 166, 0.35)');
  doGradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)');

  doChart = new Chart(doCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'DO (mg/L)',
        data: [],
        borderColor: '#14b8a6',
        backgroundColor: doGradient,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      }],
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: { ...commonOptions.scales.y, min: 2, suggestedMax: 10 },
      },
    },
  });

  // 4. Parameter Matrix Bar Chart
  const matrixCtx = document.getElementById('matrixChart').getContext('2d');
  matrixChart = new Chart(matrixCtx, {
    type: 'bar',
    data: {
      labels: ['pH (std)', 'Turbidity (NTU)', 'TDS (ppm/10)', 'Temp (°C)', 'DO (mg/L)', 'Chlorine (x10)'],
      datasets: [{
        label: 'Current Reading',
        data: [7.2, 3.4, 12, 23.5, 6.8, 4.5],
        backgroundColor: [
          'rgba(6, 182, 212, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(59, 130, 246, 0.7)',
        ],
        borderRadius: 6,
      }],
    },
    options: {
      ...commonOptions,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(148, 163, 184, 0.7)', font: { size: 9 } },
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(148, 163, 184, 0.7)', font: { size: 9 } },
        },
      },
    },
  });
}

// ----------------- RENDER FUNCTIONS -----------------
function renderKPIs(stats) {
  if (!stats) return;
  if (statWQI) statWQI.textContent = stats.avgWQI ?? 78;
  if (statWQIGrade) {
    let grade = 'Good';
    let colorClass = 'bg-cyan-950 text-cyan-300 border-cyan-800';
    if (stats.avgWQI >= 80) { grade = 'Excellent'; colorClass = 'bg-emerald-950 text-emerald-300 border-emerald-800'; }
    else if (stats.avgWQI < 60 && stats.avgWQI >= 40) { grade = 'Fair'; colorClass = 'bg-amber-950 text-amber-300 border-amber-800'; }
    else if (stats.avgWQI < 40) { grade = 'Critical'; colorClass = 'bg-rose-950 text-rose-300 border-rose-800'; }
    statWQIGrade.textContent = grade;
    statWQIGrade.className = `text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`;
  }
  if (statWQIBars) {
    statWQIBars.style.width = `${Math.min(100, stats.avgWQI || 78)}%`;
  }
  if (statStations) statStations.textContent = `${stats.onlineStations ?? 6} / ${stats.stationCount ?? 6}`;
  if (statCases) statCases.textContent = stats.totalCases ?? 0;
  if (statAlerts) statAlerts.textContent = stats.activeAlerts ?? 0;
  if (tabAlertCount) tabAlertCount.textContent = stats.activeAlerts ?? 0;
  if (tabHealthCaseCount) tabHealthCaseCount.textContent = stats.totalCases ?? 0;
  if (tabStationCount) tabStationCount.textContent = stats.stationCount ?? 6;

  if (statAlertSeverity) {
    if (stats.activeAlerts > 0) {
      statAlertSeverity.textContent = `${stats.activeAlerts} Triggered`;
      statAlertSeverity.className = 'text-xs text-rose-400 font-semibold';
    } else {
      statAlertSeverity.textContent = 'All Normal';
      statAlertSeverity.className = 'text-xs text-emerald-400 font-medium';
    }
  }
}

function renderRiskBanner(stations, stats) {
  const activeAlerts = stats?.activeAlerts || 0;
  const criticalStations = stations.filter(s => s.latestReading && (s.latestReading.turbidity > 8 || s.wqi?.score < 40));

  if (criticalStations.length > 0 || activeAlerts > 2) {
    riskBanner.className = 'mx-6 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all duration-300 bg-rose-950/50 border-rose-800/60 text-rose-200 neon-glow-rose';
    riskTitle.textContent = `CRITICAL WARNING: Water Contamination at ${criticalStations.map(s => s.name).join(', ') || 'Multiple Stations'}`;
    riskDescription.textContent = 'Advisory: Issue community boil-water notice immediately and notify Primary Health Centre.';
    riskBadge.textContent = 'Critical Risk Level';
    riskBadge.className = 'px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase bg-rose-900/80 border border-rose-600 text-rose-200 animate-pulse';
    riskIconContainer.className = 'p-2 rounded-lg bg-rose-500/20 text-rose-300';
    riskIconContainer.innerHTML = '<i data-lucide="alert-octagon" class="w-4 h-4"></i>';
  } else if (activeAlerts > 0) {
    riskBanner.className = 'mx-6 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all duration-300 bg-amber-950/40 border-amber-800/50 text-amber-200';
    riskTitle.textContent = 'Moderate Water Anomaly Detected';
    riskDescription.textContent = 'Elevated turbidity or parameter drift observed. Continuous automated surveillance active.';
    riskBadge.textContent = 'Monitoring Advisory';
    riskBadge.className = 'px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase bg-amber-900/60 border border-amber-700/60 text-amber-300';
    riskIconContainer.className = 'p-2 rounded-lg bg-amber-500/20 text-amber-300';
    riskIconContainer.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4"></i>';
  } else {
    riskBanner.className = 'mx-6 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all duration-300 bg-emerald-950/40 border-emerald-800/50 text-emerald-200';
    riskTitle.textContent = 'All Rural Water Supply Zones Within Safe Thresholds';
    riskDescription.textContent = 'Real-time parameters across Assam, Meghalaya, and Manipur reflect safe drinking limits.';
    riskBadge.textContent = 'Normal Status';
    riskBadge.className = 'px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase bg-emerald-900/60 border border-emerald-700/60 text-emerald-300';
    riskIconContainer.className = 'p-2 rounded-lg bg-emerald-500/20 text-emerald-300';
    riskIconContainer.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4"></i>';
  }
  if (window.lucide) lucide.createIcons();
}

function renderStationPills(stations) {
  if (!stationsSummaryRow) return;
  stationsSummaryRow.innerHTML = '';

  // "All" button pill
  const allBtn = document.createElement('button');
  const isAllActive = dashboardState.selectedStation === 'All';
  allBtn.className = `p-2.5 rounded-xl text-left border transition-all ${
    isAllActive
      ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-md shadow-cyan-500/10'
      : 'glass-card text-slate-300 hover:border-slate-600'
  }`;
  allBtn.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <span class="font-bold">All Stations</span>
      <span class="w-2 h-2 rounded-full ${isAllActive ? 'bg-cyan-400' : 'bg-slate-500'}"></span>
    </div>
    <div class="text-[10px] text-slate-400 mt-1">Aggregated View</div>
  `;
  allBtn.onclick = () => {
    dashboardState.selectedStation = 'All';
    renderStationPills(dashboardState.stations);
    refreshChartsWithCurrentSelection();
  };
  stationsSummaryRow.appendChild(allBtn);

  stations.forEach(st => {
    const isSelected = dashboardState.selectedStation === st.name;
    const btn = document.createElement('button');
    const isCritical = st.latestReading && st.latestReading.turbidity > 8;
    const isWarning = st.latestReading && st.latestReading.turbidity > 5;

    let badgeColor = 'bg-emerald-400';
    if (isCritical) badgeColor = 'bg-rose-400 animate-ping';
    else if (isWarning) badgeColor = 'bg-amber-400';

    btn.className = `p-2.5 rounded-xl text-left border transition-all ${
      isSelected
        ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-md shadow-cyan-500/10'
        : 'glass-card text-slate-300 hover:border-slate-600'
    }`;

    btn.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold truncate">${st.name}</span>
        <span class="relative flex h-2 w-2">
          <span class="relative inline-flex rounded-full h-2 w-2 ${badgeColor}"></span>
        </span>
      </div>
      <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
        <span>WQI: <strong class="text-white">${st.wqi?.score || '--'}</strong></span>
        <span>${st.latestReading?.turbidity || '--'} NTU</span>
      </div>
    `;

    btn.onclick = () => {
      dashboardState.selectedStation = st.name;
      renderStationPills(dashboardState.stations);
      refreshChartsWithCurrentSelection();
    };

    stationsSummaryRow.appendChild(btn);
  });
}

function renderStationCards(stations) {
  if (!stationsGrid) return;
  stationsGrid.innerHTML = '';

  const query = (dashboardState.searchQuery || '').toLowerCase();
  const filtered = stations.filter(s =>
    s.name.toLowerCase().includes(query) ||
    (s.district && s.district.toLowerCase().includes(query)) ||
    (s.village && s.village.toLowerCase().includes(query))
  );

  filtered.forEach(st => {
    const latest = st.latestReading;
    const card = document.createElement('div');
    const wqi = st.wqi || { score: 70, grade: 'Good', color: '#06b6d4' };

    card.className = 'glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <!-- Station Header -->
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white">${st.name}</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" style="background-color: ${wqi.color}20; color: ${wqi.color}; border: 1px solid ${wqi.color}40">
                WQI ${wqi.score} &bull; ${wqi.grade}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">${st.village ? `${st.village}, ` : ''}${st.district || 'Northeast Zone'} &bull; Pop. ${st.population?.toLocaleString() || '1,200'}</p>
          </div>
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800 text-[10px] font-mono text-emerald-400 border border-slate-700">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Online</span>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-3 gap-2.5 my-4">
          <div class="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span class="text-[10px] text-slate-400 block">pH Level</span>
            <span class="text-sm font-bold font-mono text-cyan-300">${latest?.pH ?? '--'}</span>
            <span class="text-[9px] text-slate-500 block">6.5-8.5 safe</span>
          </div>
          <div class="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span class="text-[10px] text-slate-400 block">Turbidity</span>
            <span class="text-sm font-bold font-mono ${latest && latest.turbidity > 5 ? 'text-amber-400' : 'text-slate-200'}">${latest?.turbidity ?? '--'} <span class="text-[9px] font-normal">NTU</span></span>
            <span class="text-[9px] text-slate-500 block">&lt; 5 safe</span>
          </div>
          <div class="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span class="text-[10px] text-slate-400 block">Dissolved O₂</span>
            <span class="text-sm font-bold font-mono text-teal-300">${latest?.dissolved_oxygen ?? '--'} <span class="text-[9px] font-normal">mg/L</span></span>
            <span class="text-[9px] text-slate-500 block">&gt; 4.0 safe</span>
          </div>
          <div class="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span class="text-[10px] text-slate-400 block">TDS</span>
            <span class="text-sm font-bold font-mono text-slate-200">${latest?.tds ?? '--'} <span class="text-[9px] font-normal">ppm</span></span>
            <span class="text-[9px] text-slate-500 block">&lt; 300 safe</span>
          </div>
          <div class="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span class="text-[10px] text-slate-400 block">Water Temp</span>
            <span class="text-sm font-bold font-mono text-slate-200">${latest?.temperature ?? '22'} <span class="text-[9px] font-normal">°C</span></span>
            <span class="text-[9px] text-slate-500 block">ambient</span>
          </div>
          <div class="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span class="text-[10px] text-slate-400 block">Residual Cl</span>
            <span class="text-sm font-bold font-mono text-blue-300">${latest?.residual_chlorine ?? '0.4'} <span class="text-[9px] font-normal">mg/L</span></span>
            <span class="text-[9px] text-slate-500 block">0.2-1.0</span>
          </div>
        </div>
      </div>

      <!-- Station Footer -->
      <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
        <span class="text-slate-400 flex items-center gap-1.5">
          <i data-lucide="activity" class="w-3.5 h-3.5 text-rose-400"></i>
          Health Cases: <strong class="text-white">${st.cases ?? 0}</strong>
        </span>
        <button class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all select-station-btn" data-station="${st.name}">
          Inspect Trends &rarr;
        </button>
      </div>
    `;

    stationsGrid.appendChild(card);
  });

  // Attach inspection click handlers
  document.querySelectorAll('.select-station-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const stName = e.currentTarget.getAttribute('data-station');
      dashboardState.selectedStation = stName;
      // Switch to overview tab
      document.querySelector('[data-tab="tab-overview"]').click();
      renderStationPills(dashboardState.stations);
      refreshChartsWithCurrentSelection();
      showToast(`Filtered charts for ${stName}`, 'info');
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderHealthLogs(logs) {
  if (!healthLogsTableBody) return;
  healthLogsTableBody.innerHTML = '';

  if (!logs || logs.length === 0) {
    healthLogsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-8 text-center text-slate-500">
          <i data-lucide="clipboard-check" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          No community health incidents logged yet. Clean epidemiological surveillance record.
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  logs.forEach(log => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-800/40 transition-colors';

    let severityClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
    if (log.severity === 'critical') severityClass = 'bg-rose-950/70 text-rose-300 border-rose-800/60';
    else if (log.severity === 'moderate') severityClass = 'bg-amber-950/70 text-amber-300 border-amber-800/60';

    const formattedDate = new Date(log.timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    row.innerHTML = `
      <td class="px-5 py-3 font-semibold text-white">${log.stationName || log.station || 'Unknown'}</td>
      <td class="px-5 py-3">
        <span class="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">${log.cases}</span>
      </td>
      <td class="px-5 py-3 text-slate-200">${log.symptoms || 'Acute Gastroenteritis'}</td>
      <td class="px-5 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border ${severityClass} uppercase">
          ${log.severity || 'moderate'}
        </span>
      </td>
      <td class="px-5 py-3 text-slate-400 font-mono text-[11px]">${formattedDate}</td>
      <td class="px-5 py-3 text-slate-400 truncate max-w-xs">${log.notes || 'Routine field report'}</td>
    `;
    healthLogsTableBody.appendChild(row);
  });

  if (window.lucide) lucide.createIcons();
}

function renderAlerts(alerts) {
  if (!alertsContainer) return;
  alertsContainer.innerHTML = '';

  const unresolved = alerts.filter(a => !a.resolved);
  if (alertsCountLabel) alertsCountLabel.textContent = `${unresolved.length} active warnings`;

  if (unresolved.length === 0) {
    alertsContainer.innerHTML = `
      <div class="glass-card p-8 rounded-2xl text-center text-slate-400">
        <i data-lucide="shield-check" class="w-10 h-10 text-emerald-400 mx-auto mb-2"></i>
        <h3 class="text-sm font-bold text-white">All Clear</h3>
        <p class="text-xs text-slate-400 mt-1">No anomalous sensor spikes or health alerts currently unresolved.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  unresolved.forEach(al => {
    const card = document.createElement('div');
    const isCritical = al.severity === 'critical';
    const bgClass = isCritical ? 'border-rose-500/40 bg-rose-950/20' : 'border-amber-500/40 bg-amber-950/20';
    const iconColor = isCritical ? 'text-rose-400' : 'text-amber-400';

    card.className = `glass-card p-4 rounded-xl border flex items-center justify-between ${bgClass}`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-slate-900/80 ${iconColor}">
          <i data-lucide="${isCritical ? 'alert-octagon' : 'alert-triangle'}" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-xs">${al.station} Hub</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${isCritical ? 'bg-rose-900/80 text-rose-300' : 'bg-amber-900/80 text-amber-300'}">
              ${al.severity}
            </span>
          </div>
          <p class="text-xs text-slate-300 mt-0.5">${al.message}</p>
          <span class="text-[10px] text-slate-500 font-mono">${new Date(al.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      <button class="resolve-alert-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1" data-id="${al.id}">
        <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>
        <span>Resolve</span>
      </button>
    `;
    alertsContainer.appendChild(card);
  });

  // Attach resolve handlers
  document.querySelectorAll('.resolve-alert-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
      const res = await window.api.resolveAlert(id);
      if (res.success) {
        showToast('Alert marked as resolved', 'success');
        loadDashboard();
      }
    });
  });

  if (window.lucide) lucide.createIcons();
}

// ----------------- UPDATE CHARTS -----------------
function appendReadingToCharts(reading) {
  // Only push if selectedStation is 'All' or matches reading.station
  if (dashboardState.selectedStation !== 'All' && dashboardState.selectedStation !== reading.station) {
    return;
  }

  const timeLabel = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Update Turbidity
  if (turbidityChart) {
    turbidityChart.data.labels.push(timeLabel);
    turbidityChart.data.datasets[0].data.push(parseFloat(reading.turbidity));
    if (turbidityChart.data.labels.length > 25) {
      turbidityChart.data.labels.shift();
      turbidityChart.data.datasets[0].data.shift();
    }
    turbidityChart.update('none');
  }
  if (latestTurbidityValue) {
    latestTurbidityValue.textContent = `${reading.turbidity} NTU`;
    latestTurbidityValue.className = parseFloat(reading.turbidity) > 5 ? 'text-amber-400 font-bold' : 'text-slate-200 font-bold';
  }

  // Update pH
  if (phChart) {
    phChart.data.labels.push(timeLabel);
    phChart.data.datasets[0].data.push(parseFloat(reading.pH));
    if (phChart.data.labels.length > 25) {
      phChart.data.labels.shift();
      phChart.data.datasets[0].data.shift();
    }
    phChart.update('none');
  }
  if (latestPhValue) {
    latestPhValue.textContent = `${reading.pH} pH`;
  }

  // Update Dissolved Oxygen
  if (doChart) {
    doChart.data.labels.push(timeLabel);
    doChart.data.datasets[0].data.push(parseFloat(reading.dissolvedOxygen || reading.dissolved_oxygen || 6.5));
    if (doChart.data.labels.length > 25) {
      doChart.data.labels.shift();
      doChart.data.datasets[0].data.shift();
    }
    doChart.update('none');
  }
  if (latestDoValue) {
    latestDoValue.textContent = `${reading.dissolvedOxygen || reading.dissolved_oxygen || '6.5'} mg/L`;
  }

  // Update Matrix chart with latest snapshot
  if (matrixChart) {
    matrixChart.data.datasets[0].data = [
      parseFloat(reading.pH),
      parseFloat(reading.turbidity),
      parseFloat(reading.tds) / 10,
      parseFloat(reading.temperature || 22),
      parseFloat(reading.dissolvedOxygen || reading.dissolved_oxygen || 6.5),
      parseFloat(reading.residualChlorine || reading.residual_chlorine || 0.4) * 10,
    ];
    matrixChart.update();
  }
}

async function refreshChartsWithCurrentSelection() {
  const station = dashboardState.selectedStation;
  try {
    const resp = await window.api.getHistoricalData(station === 'All' ? 'Majuli' : station, 1);
    const readings = resp.data || [];

    if (turbidityChart) {
      turbidityChart.data.labels = readings.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      turbidityChart.data.datasets[0].data = readings.map(r => parseFloat(r.turbidity));
      turbidityChart.update();
    }
    if (phChart) {
      phChart.data.labels = readings.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      phChart.data.datasets[0].data = readings.map(r => parseFloat(r.pH));
      phChart.update();
    }
    if (doChart) {
      doChart.data.labels = readings.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      doChart.data.datasets[0].data = readings.map(r => parseFloat(r.dissolved_oxygen || 6.5));
      doChart.update();
    }
    if (readings.length > 0) {
      const last = readings[readings.length - 1];
      if (latestTurbidityValue) latestTurbidityValue.textContent = `${last.turbidity} NTU`;
      if (latestPhValue) latestPhValue.textContent = `${last.pH} pH`;
      if (latestDoValue) latestDoValue.textContent = `${last.dissolved_oxygen || '6.5'} mg/L`;
    }
  } catch (err) {
    console.error('Failed to refresh historical charts:', err);
  }
}

// ----------------- LOAD DASHBOARD -----------------
async function loadDashboard() {
  try {
    const [dashResp, logsResp] = await Promise.all([
      window.api.getDashboardData(),
      window.api.getHealthLogs(),
    ]);

    if (!dashResp.success) throw new Error(dashResp.error);

    const data = dashResp.data;
    dashboardState.stations = data.stations || [];
    dashboardState.stats = data.stats || {};
    dashboardState.recentAlerts = data.recentAlerts || [];
    dashboardState.recentReadings = data.recentReadings || [];

    // Populate modal station dropdown
    if (stationSelect && dashboardState.stations.length > 0) {
      stationSelect.innerHTML = '';
      dashboardState.stations.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = `${s.name} (${s.district || 'Hub'})`;
        stationSelect.appendChild(opt);
      });
    }

    renderKPIs(dashboardState.stats);
    renderRiskBanner(dashboardState.stations, dashboardState.stats);
    renderStationPills(dashboardState.stations);
    renderStationCards(dashboardState.stations);
    renderAlerts(dashboardState.recentAlerts);
    renderHealthLogs(logsResp.logs || []);

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to connect to local telemetry service', 'danger');
  }
}

// ----------------- EVENT LISTENERS -----------------
function initEventListeners() {
  // Modal openers
  const openModal = () => logModal.showModal();
  const closeModal = () => logModal.close();

  document.getElementById('addLogBtn')?.addEventListener('click', openModal);
  document.getElementById('addLogBtn2')?.addEventListener('click', openModal);
  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);

  // Form submit
  logForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entry = {
      station: stationSelect.value,
      timestamp: Date.now(),
      cases: parseInt(document.getElementById('casesInput').value, 10),
      severity: document.getElementById('severitySelect').value,
      symptoms: document.getElementById('symptomsInput').value,
      notes: document.getElementById('notesInput').value,
    };

    const res = await window.api.addHealthLog(entry);
    if (res.success) {
      logModal.close();
      logForm.reset();
      showToast(`Logged ${entry.cases} case(s) at ${entry.station}`, 'success');
      loadDashboard();
    } else {
      showToast('Error recording incident: ' + res.error, 'danger');
    }
  });

  // Simulate Spike button
  document.getElementById('simulateSpikeBtn')?.addEventListener('click', () => {
    const targetStation = dashboardState.stations[Math.floor(Math.random() * dashboardState.stations.length)]?.name || 'Majuli';
    const spikeReading = {
      station: targetStation,
      timestamp: Date.now(),
      pH: '5.40',
      turbidity: '14.80',
      tds: '420',
      temperature: '24.2',
      dissolvedOxygen: '3.1',
      residualChlorine: '0.10',
    };
    showToast(`⚠️ Contamination Spike Injected at ${targetStation}! Turbidity: 14.8 NTU`, 'warning');
    appendReadingToCharts(spikeReading);
    loadDashboard();
  });

  // Search filter
  document.getElementById('stationSearch')?.addEventListener('input', (e) => {
    dashboardState.searchQuery = e.target.value;
    renderStationCards(dashboardState.stations);
  });

  // Export handlers
  document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
    const res = await window.api.exportReport('csv');
    if (res.success) {
      downloadFile(res.report, 'jalsuraksha_telemetry.csv', 'text/csv');
      showToast('Exported CSV dataset successfully', 'success');
    }
  });

  document.getElementById('exportJsonBtn')?.addEventListener('click', async () => {
    const res = await window.api.exportReport('json');
    if (res.success) {
      downloadFile(res.report, 'jalsuraksha_telemetry.json', 'application/json');
      showToast('Exported JSON dataset successfully', 'success');
    }
  });

  // Live telemetry listener
  window.api.onSensorUpdate((reading) => {
    appendReadingToCharts(reading);
    loadDashboard();
  });
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------- STARTUP -----------------
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initTabs();
  initCharts();
  initEventListeners();
  loadDashboard();
  setTimeout(refreshChartsWithCurrentSelection, 400);
});
