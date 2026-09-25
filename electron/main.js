import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    title: 'Laguna Clara',
    width: 1344,
    height: 672,
    minWidth: 896,
    minHeight: 448,
    useContentSize: true,
    resizable: true,
    autoHideMenuBar: true,
    backgroundColor: '#04121f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(join(__dirname, '..', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
