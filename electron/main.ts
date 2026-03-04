import { app, BrowserWindow, Menu, ipcMain, dialog, Event, IpcMainInvokeEvent, MenuItemConstructorOptions, WebContents, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// PRIVACY-FIRST: Setup portable paths BEFORE app ready
const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';
// In dev mode, use project root.
// In packaged macOS builds, use the directory containing HolySheet.app.
// In other packaged builds, use the directory containing the executable.
const executablePath = app.getPath('exe');
const executableDir = path.dirname(executablePath);
const appBundlePath = isMac ? path.dirname(path.dirname(path.dirname(executablePath))) : executableDir;
const appParentDir = isMac ? path.dirname(appBundlePath) : executableDir;
const appPath = isDev ? path.join(__dirname, '..') : appParentDir;
const portableDir = path.join(appPath, '.holysheet');
const sentinelFile = path.join(appPath, 'HOLYSHEET_PORTABLE.txt');
const legacySentinelFile = path.join(executableDir, 'HOLYSHEET_PORTABLE.txt');

// Create portable directory structure if it doesn't exist
function ensurePortableDirectories() {
  const dirs = [
    portableDir,
    path.join(portableDir, 'userData'),
    path.join(portableDir, 'cache'),
    path.join(portableDir, 'temp'),
    path.join(portableDir, 'session'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Check encrypted folder guard
function checkEncryptedFolderGuard(): boolean {
  // In dev mode, auto-create sentinel
  if (isDev) {
    if (!fs.existsSync(sentinelFile)) {
      fs.writeFileSync(sentinelFile, 'HolySheet portable mode enabled\n');
    }
    return true;
  }

  // In production, require sentinel file
  return fs.existsSync(sentinelFile) || fs.existsSync(legacySentinelFile);
}

// Redirect all Electron paths to portable directory
function setupPortablePaths() {
  app.setPath('userData', path.join(portableDir, 'userData'));
  app.setPath('cache', path.join(portableDir, 'cache'));
  app.setPath('temp', path.join(portableDir, 'temp'));
  app.setPath('sessionData', path.join(portableDir, 'session'));
}

// Clear recent documents (best effort privacy)
function clearRecentDocuments() {
  try {
    app.clearRecentDocuments();
  } catch (error) {
    // Silently fail - best effort only
  }
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'HolySheet',
    backgroundColor: '#f6f3ea',
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 14, y: 14 },
        }
      : {}),
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Clear recent docs on window close
  mainWindow.on('closed', () => {
    clearRecentDocuments();
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:saveAs'),
        },
        { type: 'separator' },
        {
          label: 'Panic Close',
          accelerator: 'CmdOrCtrl+Shift+Q',
          click: () => {
            // Immediate quit without saving
            if (mainWindow) {
              mainWindow.destroy();
            }
            app.quit();
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow?.webContents.send('menu:redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
function setupIpcHandlers() {
  // Open CSV file
  ipcMain.handle('open-csv', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');

    clearRecentDocuments();

    return {
      path: filePath,
      content: content,
      name: path.basename(filePath),
    };
  });

  // Save CSV file
  ipcMain.handle('save-csv', async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      clearRecentDocuments();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Save CSV file as (new location)
  ipcMain.handle('save-csv-as', async (_event: IpcMainInvokeEvent, content: string) => {
    if (!mainWindow) return null;

    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: 'untitled.csv',
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      clearRecentDocuments();
      return {
        success: true,
        path: result.filePath,
        name: path.basename(result.filePath),
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Confirm unsaved changes
  ipcMain.handle('confirm-unsaved-changes', async () => {
    if (!mainWindow) return 'cancel';

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save them?',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
    });

    switch (result.response) {
      case 0:
        return 'save';
      case 1:
        return 'dontSave';
      default:
        return 'cancel';
    }
  });

  // Panic close
  ipcMain.handle('panic-close', () => {
    if (mainWindow) {
      mainWindow.destroy();
    }
    app.quit();
  });

  // Get portable mode info
  ipcMain.handle('get-portable-info', () => {
    return {
      isPortable: true,
      portablePath: portableDir,
      isDev: isDev,
    };
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Open external URL in default browser
  ipcMain.handle('open-external-url', async (_event: IpcMainInvokeEvent, rawUrl: string) => {
    const input = String(rawUrl || '').trim();
    if (!input) return { success: false, error: 'Empty URL' };

    const url = /^https?:\/\//i.test(input)
      ? input
      : (/^www\./i.test(input) ? `https://${input}` : '');

    if (!url || !/^https?:\/\//i.test(url)) {
      return { success: false, error: 'Invalid URL' };
    }

    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Encrypted folder guard check
  if (!checkEncryptedFolderGuard()) {
    dialog.showErrorBox(
      'HolySheet - Portable Mode Required',
      'HolySheet must be run from within your encrypted folder.\n\n' +
        'Please move this application into your encrypted/mounted folder and create a file named:\n' +
        'HOLYSHEET_PORTABLE.txt\n\n' +
        'in the same directory as the application.'
    );
    app.quit();
    return;
  }

  // Setup portable directories and paths
  ensurePortableDirectories();
  setupPortablePaths();
  clearRecentDocuments();

  // Setup IPC
  setupIpcHandlers();

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  clearRecentDocuments();
  app.quit();
});

// Disable all network-related features
app.on('web-contents-created', (_event: Event, contents: WebContents) => {
  // Block all navigation
  contents.on('will-navigate', (event: Event) => {
    event.preventDefault();
  });

  // Block new windows
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
