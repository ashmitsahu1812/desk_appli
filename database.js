// database.js - Enhanced In-memory mock DB for JalSuraksha-NE
const path = require('path');

let mock = {
  stations: {},
  sensorReadings: [],
  healthLogs: [],
  alerts: [],
  nextId: 1,
};

// Seed stations with metadata (coordinates, village, population)
const stationsMeta = [
  { name: 'Majuli', village: 'Kamalabari', district: 'Majuli', population: 1850, lat: 26.95, lng: 94.17 },
  { name: 'Cherrapunji', village: 'Sohra', district: 'East Khasi Hills', population: 1200, lat: 25.27, lng: 91.73 },
  { name: 'East Khasi Hills', village: 'Mawsynram', district: 'East Khasi Hills', population: 980, lat: 25.3, lng: 91.58 },
  { name: 'Dhemaji', village: 'Sissiborgaon', district: 'Dhemaji', population: 2100, lat: 27.48, lng: 94.58 },
  { name: 'Tawang', village: 'Jang', district: 'Tawang', population: 750, lat: 27.58, lng: 91.87 },
  { name: 'Imphal West', village: 'Lamphel', district: 'Imphal West', population: 3200, lat: 24.8, lng: 93.94 },
];

stationsMeta.forEach((s, idx) => {
  mock.stations[s.name] = {
    id: idx + 1,
    ...s,
    status: 'online',
    lastSeen: Date.now(),
  };
  mock.nextId = Math.max(mock.nextId, idx + 2);
});

function getStationId(name) {
  if (!mock.stations[name]) {
    mock.stations[name] = { id: mock.nextId++, name, village: '', district: '', population: 0, lat: 0, lng: 0, status: 'online', lastSeen: Date.now() };
  }
  return mock.stations[name].id;
}

function getStationByName(name) {
  return mock.stations[name] || null;
}

// Water Quality Index (WQI) calculation based on weighted parameters
function calculateWQI(reading) {
  if (!reading) return { score: 0, grade: 'N/A', color: '#666' };
  const weights = { pH: 0.3, turbidity: 0.3, tds: 0.2, residual_chlorine: 0.2 };
  // Normalize each parameter to 0-100 scale
  let pHScore = 100 - Math.abs(reading.pH - 7) * 25; // 7 is ideal
  let turbScore = Math.max(0, 100 - reading.turbidity * 10);
  let tdsScore = Math.max(0, 100 - (reading.tds - 100) * 0.5);
  let clScore = reading.residual_chlorine >= 0.2 && reading.residual_chlorine <= 1.0 ? 100 : 50;

  pHScore = Math.max(0, Math.min(100, pHScore));
  turbScore = Math.max(0, Math.min(100, turbScore));
  tdsScore = Math.max(0, Math.min(100, tdsScore));

  const score = Math.round(pHScore * weights.pH + turbScore * weights.turbidity + tdsScore * weights.tds + clScore * weights.residual_chlorine);

  let grade, color;
  if (score >= 80) { grade = 'Excellent'; color = '#10b981'; }
  else if (score >= 60) { grade = 'Good'; color = '#22d3ee'; }
  else if (score >= 40) { grade = 'Fair'; color = '#f59e0b'; }
  else if (score >= 20) { grade = 'Poor'; color = '#f97316'; }
  else { grade = 'Critical'; color = '#ef4444'; }

  return { score, grade, color };
}

async function getDashboardData() {
  const stations = Object.values(mock.stations).map(st => {
    const readings = mock.sensorReadings.filter(r => r.station_id === st.id);
    const latest = readings.sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    const cases = mock.healthLogs
      .filter(l => l.station_id === st.id)
      .reduce((sum, l) => sum + (l.cases || 0), 0);
    const wqi = calculateWQI(latest);
    // Trend: compare last two readings
    const prev = readings.sort((a, b) => b.timestamp - a.timestamp)[1] || null;
    let trend = 'stable';
    if (latest && prev) {
      const diff = latest.turbidity - prev.turbidity;
      if (diff > 1) trend = 'rising';
      else if (diff < -1) trend = 'falling';
    }
    return {
      ...st,
      latestReading: latest,
      cases,
      wqi,
      trend,
      readingCount: readings.length,
    };
  });

  // Global stats
  const totalReadings = mock.sensorReadings.length;
  const totalAlerts = mock.alerts.length;
  const activeAlerts = mock.alerts.filter(a => !a.resolved).length;
  const totalCases = mock.healthLogs.reduce((s, l) => s + (l.cases || 0), 0);
  const avgWQI = stations.reduce((s, st) => s + st.wqi.score, 0) / (stations.length || 1);

  return {
    stations,
    stats: {
      totalReadings,
      totalAlerts,
      activeAlerts,
      totalCases,
      avgWQI: Math.round(avgWQI),
      stationCount: stations.length,
      onlineStations: stations.filter(s => s.status === 'online').length,
    },
    recentAlerts: mock.alerts.slice(-20).reverse(),
    recentReadings: mock.sensorReadings.slice(-50).reverse(),
  };
}

async function getHistoricalData(stationName, hours = 1) {
  const stId = mock.stations[stationName]?.id;
  if (!stId) return [];
  const cutoff = Date.now() - hours * 3600000;
  return mock.sensorReadings
    .filter(r => r.station_id === stId && r.timestamp >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function insertSensorReading(reading) {
  const station_id = getStationId(reading.station);
  const entry = {
    id: mock.nextId++,
    station_id,
    timestamp: Number(reading.timestamp),
    pH: parseFloat(reading.pH),
    turbidity: parseFloat(reading.turbidity),
    tds: Number(reading.tds),
    temperature: parseFloat(reading.temperature || (20 + Math.random() * 15).toFixed(1)),
    dissolved_oxygen: parseFloat(reading.dissolvedOxygen || (5 + Math.random() * 4).toFixed(1)),
    residual_chlorine: parseFloat(reading.residualChlorine),
  };
  mock.sensorReadings.push(entry);
  // Keep max 500 readings per station
  const stationReadings = mock.sensorReadings.filter(r => r.station_id === station_id);
  if (stationReadings.length > 500) {
    const oldest = stationReadings[0];
    mock.sensorReadings = mock.sensorReadings.filter(r => r.id !== oldest.id);
  }
  // Update station last seen
  if (mock.stations[reading.station]) {
    mock.stations[reading.station].lastSeen = Date.now();
    mock.stations[reading.station].status = 'online';
  }

  // Auto-generate alerts
  if (entry.turbidity > 8) {
    addAlert(reading.station, 'critical', `High turbidity: ${entry.turbidity} NTU`, entry.timestamp);
  } else if (entry.turbidity > 5) {
    addAlert(reading.station, 'warning', `Elevated turbidity: ${entry.turbidity} NTU`, entry.timestamp);
  }
  if (entry.pH < 6.0 || entry.pH > 8.5) {
    addAlert(reading.station, 'warning', `pH out of range: ${entry.pH}`, entry.timestamp);
  }
  if (entry.dissolved_oxygen < 4) {
    addAlert(reading.station, 'critical', `Low dissolved oxygen: ${entry.dissolved_oxygen} mg/L`, entry.timestamp);
  }

  return entry;
}

function addAlert(station, severity, message, timestamp) {
  mock.alerts.push({
    id: mock.nextId++,
    station,
    severity,
    message,
    timestamp: timestamp || Date.now(),
    resolved: false,
  });
  // Keep max 100 alerts
  if (mock.alerts.length > 100) mock.alerts.shift();
}

async function resolveAlert(alertId) {
  const alert = mock.alerts.find(a => a.id === alertId);
  if (alert) alert.resolved = true;
}

async function addHealthLog(entry) {
  const station_id = getStationId(entry.station);
  mock.healthLogs.push({
    id: mock.nextId++,
    station_id,
    station: entry.station,
    timestamp: Number(entry.timestamp),
    cases: Number(entry.cases),
    symptoms: entry.symptoms || 'Acute Gastroenteritis',
    severity: entry.severity || 'moderate',
    notes: entry.notes || '',
  });
  if (Number(entry.cases) > 5) {
    addAlert(entry.station, 'critical', `Health alert: ${entry.cases} cases of ${entry.symptoms || 'AGE'}`, entry.timestamp);
  }
}

async function getHealthLogs() {
  return mock.healthLogs.map(l => {
    const station = Object.values(mock.stations).find(s => s.id === l.station_id);
    return { ...l, stationName: station?.name || 'Unknown' };
  }).reverse();
}

async function generateReport(format) {
  if (format === 'json') {
    return JSON.stringify({
      generated: new Date().toISOString(),
      stations: Object.values(mock.stations),
      readings: mock.sensorReadings.slice(-100),
      healthLogs: mock.healthLogs,
      alerts: mock.alerts,
    }, null, 2);
  }
  // CSV
  const csvLines = ['station,timestamp,pH,turbidity,tds,temperature,dissolved_oxygen,residual_chlorine'];
  mock.sensorReadings.forEach(r => {
    const stationName = Object.values(mock.stations).find(s => s.id === r.station_id)?.name || '';
    csvLines.push(`${stationName},${new Date(r.timestamp).toISOString()},${r.pH},${r.turbidity},${r.tds},${r.temperature},${r.dissolved_oxygen},${r.residual_chlorine}`);
  });
  return csvLines.join('\n');
}

module.exports = {
  getDashboardData,
  getHistoricalData,
  insertSensorReading,
  addHealthLog,
  getHealthLogs,
  generateReport,
  resolveAlert,
};
