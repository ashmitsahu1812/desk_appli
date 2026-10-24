// preload.js - Secure Bridge between Renderer and Main
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
  addHealthLog: (entry) => ipcRenderer.invoke('add-health-log', entry),
  exportReport: (format) => ipcRenderer.invoke('export-report', format),
  onSensorUpdate: (callback) => ipcRenderer.on('sensor-update', (event, data) => callback(data)),
});
