// main.js - Electron Main Process for JalSuraksha-NE
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

// Local data service
let db;
try {
  db = require('./database');
} catch (e) {
  console.error('Failed to load database module, falling back to mock.', e);
  db = {
    getDashboardData: async () => ({ stations: [], stats: {}, recentAlerts: [], recentReadings: [] }),
    getHistoricalData: async () => [],
    getHealthLogs: async () => [],
    addHealthLog: async () => {},
    resolveAlert: async () => {},
    generateReport: async () => '',
    insertSensorReading: async () => {},
  };
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: 'JalSuraksha-NE',
    backgroundColor: '#0b1120',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: true,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
      app.dock.focus();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Log] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error(`[Renderer Error] Failed to load index.html: ${desc} (code: ${code})`);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  startMockSensorFeed();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC Handlers ----------
ipcMain.handle('get-dashboard-data', async () => {
  try {
    const data = await db.getDashboardData();
    return { success: true, data };
  } catch (err) {
    console.error('Dashboard data fetch error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-historical-data', async (event, station, hours) => {
  try {
    const data = await db.getHistoricalData(station, hours);
    return { success: true, data };
  } catch (err) {
    console.error('Historical data fetch error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-health-logs', async () => {
  try {
    const logs = await db.getHealthLogs();
    return { success: true, logs };
  } catch (err) {
    console.error('Health logs fetch error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('add-health-log', async (event, entry) => {
  try {
    await db.addHealthLog(entry);
    return { success: true };
  } catch (err) {
    console.error('Add health log error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('resolve-alert', async (event, id) => {
  try {
    await db.resolveAlert(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-report', async (event, format) => {
  try {
    const report = await db.generateReport(format);
    return { success: true, report };
  } catch (err) {
    console.error('Export report error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-app-info', async () => {
  return {
    version: '1.2.0',
    name: 'JalSuraksha-NE',
    region: 'Northeast India (Assam, Meghalaya, Arunachal Pradesh, Manipur)',
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
  };
});

// ---------- Mock Sensor Feed & Simulation ----------
const stations = ['Majuli', 'Cherrapunji', 'East Khasi Hills', 'Dhemaji', 'Tawang', 'Imphal West'];

function generateReading(station, spike = false) {
  return {
    station,
    timestamp: Date.now(),
    pH: spike ? (Math.random() < 0.5 ? (5.2 + Math.random() * 0.5).toFixed(2) : (8.9 + Math.random() * 0.6).toFixed(2)) : (6.7 + Math.random() * 1.2).toFixed(2),
    turbidity: spike ? (9.5 + Math.random() * 6).toFixed(2) : (1.2 + Math.random() * 3.5).toFixed(2),
    tds: spike ? (300 + Math.random() * 180).toFixed(0) : (80 + Math.random() * 110).toFixed(0),
    temperature: (18 + Math.random() * 9).toFixed(1),
    dissolvedOxygen: spike ? (3.2 + Math.random() * 0.7).toFixed(1) : (6.5 + Math.random() * 1.8).toFixed(1),
    residualChlorine: (0.2 + Math.random() * 0.7).toFixed(2),
  };
}

// Seed initial history for all stations so graphs immediately look vibrant
function seedInitialData() {
  const now = Date.now();
  stations.forEach(st => {
    for (let i = 12; i >= 0; i--) {
      const reading = generateReading(st);
      reading.timestamp = now - i * 60000;
      db.insertSensorReading(reading);
    }
  });
}
seedInitialData();

let feedInterval = null;
function startMockSensorFeed() {
  if (feedInterval) clearInterval(feedInterval);

  feedInterval = setInterval(async () => {
    const station = stations[Math.floor(Math.random() * stations.length)];
    // Random chance of anomaly
    const isSpike = Math.random() < 0.15;
    const sensorData = generateReading(station, isSpike);

    try {
      await db.insertSensorReading(sensorData);
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('sensor-update', sensorData);
        }
      });

      if (parseFloat(sensorData.turbidity) > 8 && Notification.isSupported()) {
        new Notification({
          title: '🚨 JalSuraksha-NE Alert',
          body: `${station}: Turbidity spike detected (${sensorData.turbidity} NTU)`,
        }).show();
      }
    } catch (e) {
      console.error('Failed to store sensor data:', e);
    }
  }, 4500); // update every 4.5s
}
