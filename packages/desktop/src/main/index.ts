import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { sanitizeFilePath, sanitizeInput, IPCRateLimiter } from './security';

let mainWindow: BrowserWindow | null = null;

/**
 * Set up Content Security Policy headers.
 * Restricts resources that can be loaded to prevent XSS attacks.
 */
const setupCSP = () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'", // Allow inline styles for Tailwind
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "connect-src 'self' ws://localhost:* http://localhost:* ws://127.0.0.1:* http://127.0.0.1:*",
            "font-src 'self' data:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join('; '),
        ],
      },
    });
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load built files
    mainWindow.loadFile(path.join(__dirname, '../../web/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  // Set up security headers
  setupCSP();

  // Set up secure IPC handlers
  setupIPCHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Set up rate limiting for IPC calls
const rateLimiter = new IPCRateLimiter();

// IPC handlers with rate limiting
const setupIPCHandlers = () => {
  ipcMain.handle('get-app-version', () => {
    if (!rateLimiter.check('get-app-version')) {
      throw new Error('Rate limit exceeded');
    }
    return app.getVersion();
  });

  // Secure file path validation IPC handler
  ipcMain.handle('validate-file-path', (_, filePath: unknown) => {
    if (!rateLimiter.check('validate-file-path')) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    try {
      // Validate input type and sanitize
      if (typeof filePath !== 'string') {
        throw new Error('Invalid file path type');
      }

      const sanitized = sanitizeInput(filePath, 500);

      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, '.riffroom', 'stems');

      // Sanitize and validate path
      const safePath = sanitizeFilePath(sanitized, cacheDir);

      return {
        valid: true,
        path: safePath,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid path',
      };
    }
  });
};
