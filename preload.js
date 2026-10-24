// preload.js - Secure Bridge between Renderer and Main
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
  getHistoricalData: (station, hours) => ipcRenderer.invoke('get-historical-data', station, hours),
  getHealthLogs: () => ipcRenderer.invoke('get-health-logs'),
  addHealthLog: (entry) => ipcRenderer.invoke('add-health-log', entry),
  resolveAlert: (id) => ipcRenderer.invoke('resolve-alert', id),
  exportReport: (format) => ipcRenderer.invoke('export-report', format),
  onSensorUpdate: (callback) => ipcRenderer.on('sensor-update', (event, data) => callback(data)),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
});
