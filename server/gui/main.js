import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix Wayland / Vulkan / GPU acceleration conflicts on Linux
app.commandLine.appendSwitch('disable-vulkan');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
  app.commandLine.appendSwitch('ozone-platform', 'x11');
}

let mainWindow = null;
let serverProcess = null;
let isServerRunning = false;
let serverPort = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'LAN-Share Server Admin Desktop Panel',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#0b0f19'
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServerProcess(port = 3000) {
  if (serverProcess) return;

  const serverScript = path.join(__dirname, '../index.js');
  serverPort = port;

  serverProcess = fork(serverScript, [], {
    env: { ...process.env, PORT: port },
    silent: true
  });

  isServerRunning = true;

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (mainWindow) {
      mainWindow.webContents.send('server-log', { type: 'stdout', text });
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const text = data.toString();
    if (mainWindow) {
      mainWindow.webContents.send('server-log', { type: 'stderr', text });
    }
  });

  serverProcess.on('exit', (code) => {
    isServerRunning = false;
    serverProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send('server-status', { running: false, code });
    }
  });

  if (mainWindow) {
    mainWindow.webContents.send('server-status', { running: true, port });
  }
}

function stopServerProcess() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    isServerRunning = false;
    if (mainWindow) {
      mainWindow.webContents.send('server-status', { running: false });
    }
  }
}

app.whenReady().then(() => {
  createWindow();

  // Auto start server on app ready
  startServerProcess(serverPort);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopServerProcess();
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.on('get-server-status', (event) => {
  event.reply('server-status', { running: isServerRunning, port: serverPort });
});

ipcMain.on('start-server', (event, port) => {
  startServerProcess(port || 3000);
});

ipcMain.on('stop-server', () => {
  stopServerProcess();
});

ipcMain.on('open-storage-folder', () => {
  const storageDir = path.join(__dirname, '../storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  shell.openPath(storageDir);
});
