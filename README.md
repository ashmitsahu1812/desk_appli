# 💧 JalSuraksha-NE

**Smart Community Health Monitoring and Early Warning System for Rural Northeast India**

[![Electron](https://img.shields.io/badge/Electron-30.0-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)]()

---

## 📋 Overview

JalSuraksha-NE is a cross-platform desktop application designed to monitor water quality and community health indicators in rural communities of Northeast India. It provides real-time sensor data visualization, health logging, alert management, and downloadable reports — all running locally without external API dependencies.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Real-Time Dashboard** | Live charts for pH, turbidity, temperature, and dissolved oxygen powered by Chart.js |
| 🔔 **Smart Alerts** | Automatic threshold-based alerts with severity levels (Info / Warning / Critical) |
| 🏥 **Health Log** | Record and track community health incidents with symptoms and affected counts |
| 📈 **Report Generation** | Generate and download community health reports as JSON |
| 🗄️ **Local Data Storage** | In-memory database with mock sensor simulation — no external DB setup needed |
| 🖥️ **Cross-Platform** | Runs on macOS, Windows, and Linux via Electron |

## 🏗️ Architecture

```
jalsuraksha-ne/
├── main.js          # Electron main process + IPC handlers + sensor simulation
├── preload.js       # Context bridge for secure renderer ↔ main IPC
├── renderer.js      # Dashboard UI logic + Chart.js real-time updates
├── index.html       # Application shell with Tailwind CSS styling
├── database.js      # In-memory mock database (replaces SQLite for portability)
├── package.json     # Project metadata and dependencies
└── README.md        # You are here
```

### Data Flow

```
Sensor Simulation (main.js)
        ↓
   IPC Channel
        ↓
  Renderer Process (renderer.js)
        ↓
  Chart.js Dashboard + Alert Panel
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/ashmitsahu1812/desk_appli.git
cd desk_appli

# Install dependencies
npm install

# Launch the application
npm start
```

### Development

```bash
# Run in development mode
npm run dev
```

## 📊 Sensor Parameters

| Parameter | Unit | Safe Range | Critical Threshold |
|-----------|------|------------|-------------------|
| pH Level | pH | 6.5 – 8.5 | < 6.0 or > 9.0 |
| Turbidity | NTU | 0 – 5 | > 10 |
| Temperature | °C | 10 – 30 | > 35 |
| Dissolved Oxygen | mg/L | 6 – 8 | < 4 |

## 🛡️ Security

- All IPC communication uses Electron's `contextBridge` with explicit API whitelisting
- `nodeIntegration` is disabled; `contextIsolation` is enabled
- No external network calls — fully offline capable

## 👤 Author

**Ashmit Sahu**

## 📄 License

This project is licensed under the MIT License.
