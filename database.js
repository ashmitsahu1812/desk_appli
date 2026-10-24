// database.js - In-memory mock DB for JalSuraksha-NE
const path = require('path');

let mock = {
  stations: {}, // name -> {id, name}
  sensorReadings: [],
  healthLogs: [],
  nextId: 1,
};

// Seed stations
const stationNames = ['Majuli', 'Cherrapunji', 'East Khasi Hills', 'Dhemaji'];
stationNames.forEach((name, idx) => {
  mock.stations[name] = { id: idx + 1, name };
  mock.nextId = Math.max(mock.nextId, idx + 2);
});

function getStationId(name) {
  if (!mock.stations[name]) {
    mock.stations[name] = { id: mock.nextId++, name };
  }
  return mock.stations[name].id;
}

async function getDashboardData() {
  const stations = Object.values(mock.stations).map(st => {
    const latest = mock.sensorReadings
      .filter(r => r.station_id === st.id)
      .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    const cases = mock.healthLogs
      .filter(l => l.station_id === st.id)
      .reduce((sum, l) => sum + (l.cases || 0), 0);
    return { name: st.name, latestReading: latest, cases };
  });
  return { stations };
}

async function insertSensorReading(reading) {
  const station_id = getStationId(reading.station);
  mock.sensorReadings.push({
    id: mock.nextId++,
    station_id,
    timestamp: Number(reading.timestamp),
    pH: parseFloat(reading.pH),
    turbidity: parseFloat(reading.turbidity),
    tds: Number(reading.tds),
    residual_chlorine: parseFloat(reading.residualChlorine),
  });
}

async function addHealthLog(entry) {
  const station_id = getStationId(entry.station);
  mock.healthLogs.push({
    id: mock.nextId++,
    station_id,
    timestamp: Number(entry.timestamp),
    cases: Number(entry.cases),
  });
}

async function generateReport(format) {
  if (format !== 'csv') throw new Error('Unsupported format');
  const csvLines = ['station,timestamp,pH,turbidity,tds,residual_chlorine'];
  mock.sensorReadings.forEach(r => {
    const stationName = Object.values(mock.stations).find(s => s.id === r.station_id).name;
    csvLines.push(`${stationName},${r.timestamp},${r.pH},${r.turbidity},${r.tds},${r.residual_chlorine}`);
  });
  return csvLines.join('\n');
}

module.exports = {
  getDashboardData,
  insertSensorReading,
  addHealthLog,
  generateReport,
};
