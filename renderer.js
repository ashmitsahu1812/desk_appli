// renderer.js - Frontend logic for JalSuraksha‑NE Dashboard
/* global Chart */

const stationsDiv = document.getElementById('stations');
const alertBanner = document.getElementById('alertBanner');
const addLogBtn = document.getElementById('addLogBtn');
const exportBtn = document.getElementById('exportBtn');
const logModal = document.getElementById('logModal');
const logForm = document.getElementById('logForm');
const stationSelect = document.getElementById('stationSelect');

let turbidityChart, phChart;
let turbidityData = [];
let phData = [];

function initCharts() {
  const turbCtx = document.getElementById('turbidityChart').getContext('2d');
  const phCtx = document.getElementById('phChart').getContext('2d');

  turbidityChart = new Chart(turbCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Turbidity (NTU)',
        data: [],
        borderColor: 'hsl(45,85%,45%)',
        backgroundColor: 'hsla(45,85%,45%,0.2)',
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } },
    },
  });

  phChart = new Chart(phCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'pH',
        data: [],
        borderColor: 'hsl(200,80%,55%)',
        backgroundColor: 'hsla(200,80%,55%,0.2)',
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      scales: { y: { min: 5, max: 9 } },
    },
  });
}

function updateCharts(reading) {
  const timeLabel = new Date(reading.timestamp).toLocaleTimeString();
  // Turbidity
  turbidityChart.data.labels.push(timeLabel);
  turbidityChart.data.datasets[0].data.push(parseFloat(reading.turbidity));
  if (turbidityChart.data.labels.length > 30) {
    turbidityChart.data.labels.shift();
    turbidityChart.data.datasets[0].data.shift();
  }
  turbidityChart.update('none');

  // pH
  phChart.data.labels.push(timeLabel);
  phChart.data.datasets[0].data.push(parseFloat(reading.pH));
  if (phChart.data.labels.length > 30) {
    phChart.data.labels.shift();
    phChart.data.datasets[0].data.shift();
  }
  phChart.update('none');
}

function createStationCard(stationName, latest, caseCount) {
  const card = document.createElement('div');
  card.className = 'glass rounded-lg p-4 flex flex-col space-y-2';
  card.innerHTML = `
    <h3 class="text-lg font-medium">${stationName}</h3>
    <p><span class="font-semibold">pH:</span> ${latest?.pH ?? '-'} </p>
    <p><span class="font-semibold">Turbidity:</span> ${latest?.turbidity ?? '-'} NTU</p>
    <p><span class="font-semibold">Cases:</span> ${caseCount ?? 0}</p>
  `;
  return card;
}

function renderStations(data) {
  stationsDiv.innerHTML = '';
  // Populate station select dropdown for health logs
  stationSelect.innerHTML = '';
  data.stations.forEach(st => {
    const card = createStationCard(st.name, st.latestReading, st.cases);
    stationsDiv.appendChild(card);
    const opt = document.createElement('option');
    opt.value = st.name;
    opt.textContent = st.name;
    stationSelect.appendChild(opt);
  });
}

function computeRisk(data) {
  const totalCases = data.stations.reduce((sum, s) => sum + (s.cases || 0), 0);
  const avgTurbidity = data.stations.reduce((sum, s) => sum + (parseFloat(s.latestReading?.turbidity) || 0), 0) / data.stations.length;

  if (totalCases > 30 || avgTurbidity > 8) {
    return { level: 'critical', text: 'Critical Outbreak Alert! Immediate action required.' };
  }
  if (totalCases > 10 || avgTurbidity > 5) {
    return { level: 'moderate', text: 'Moderate risk detected. Monitor closely.' };
  }
  return { level: 'safe', text: 'All systems normal.' };
}

function showAlert(risk) {
  alertBanner.className = '';
  alertBanner.textContent = risk.text;
  switch (risk.level) {
    case 'critical':
      alertBanner.classList.add('bg-critical', 'text-white');
      break;
    case 'moderate':
      alertBanner.classList.add('bg-moderate', 'text-black');
      break;
    default:
      alertBanner.classList.add('bg-safe', 'text-white');
  }
  alertBanner.classList.remove('hidden');
}

// ---- Event Listeners ----
addLogBtn.addEventListener('click', () => {
  logModal.showModal();
});

logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entry = {
    station: stationSelect.value,
    timestamp: Date.now(),
    cases: parseInt(document.getElementById('casesInput').value, 10),
  };
  const result = await window.api.addHealthLog(entry);
  if (result.success) {
    logModal.close();
    // Refresh dashboard data
    loadDashboard();
  } else {
    alert('Failed to add health log: ' + result.error);
  }
});

exportBtn.addEventListener('click', async () => {
  const resp = await window.api.exportReport('csv');
  if (resp.success) {
    const blob = new Blob([resp.report], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jal_suraksha_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    alert('Export failed: ' + resp.error);
  }
});

window.api.onSensorUpdate((reading) => {
  updateCharts(reading);
  // Update card for the related station (simple refresh)
  loadDashboard();
});

async function loadDashboard() {
  try {
    const resp = await window.api.getDashboardData();
    if (!resp.success) throw new Error(resp.error);
    const data = resp.data;
    renderStations(data);
    const risk = computeRisk(data);
    showAlert(risk);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  loadDashboard();
});
