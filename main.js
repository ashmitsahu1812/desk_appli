// main.js - Electron Main Process
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

// Local data service
let db;
try {
  db = require('./database');
} catch (e) {
  console.error('Failed to load database module, falling back to in‑memory mock data.', e);
  db = { getDashboardData: async () => ({ sensors: [], healthLogs: [] }) };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
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

ipcMain.handle('add-health-log', async (event, entry) => {
  try {
    await db.addHealthLog(entry);
    return { success: true };
  } catch (err) {
    console.error('Add health log error:', err);
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

// ---------- Mock Sensor Feed ----------
function startMockSensorFeed() {
  const stations = ['Majuli', 'Cherrapunji', 'East Khasi Hills', 'Dhemaji'];
  setInterval(() => {
    const station = stations[Math.floor(Math.random() * stations.length)];
    const sensorData = {
      station,
      timestamp: Date.now(),
      pH: (Math.random() * 2 + 6).toFixed(2), // 6‑8
      turbidity: (Math.random() * 10 + 1).toFixed(2), // 1‑11 NTU
      tds: (Math.random() * 200 + 50).toFixed(0), // 50‑250 ppm
      residualChlorine: (Math.random() * 2).toFixed(2),
    };
    try {
      db.insertSensorReading(sensorData);
      // Emit to renderer for live update
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('sensor-update', sensorData);
      });
      // Simple risk check – raise notification if turbidity > 8 NTU
      if (parseFloat(sensorData.turbidity) > 8) {
        new Notification({
          title: 'Water Quality Alert',
          body: `${station}: High turbidity (${sensorData.turbidity} NTU)`,
        }).show();
      }
    } catch (e) {
      console.error('Failed to store sensor data:', e);
    }
  }, 8000); // every 8 seconds
}
