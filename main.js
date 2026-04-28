const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const appDataPath = app.getPath('appData');
const appName = app.getName();
const legacyUserDataPath = path.join(appDataPath, appName);

if (app.getPath('userData') !== legacyUserDataPath) {
  app.setPath('userData', legacyUserDataPath);
}

const DiaryStore = require('./src/store');
const WebDAVClient = require('./src/webdav/client');
const BackupScheduler = require('./src/webdav/scheduler');
const { saveCredentials, loadCredentials, deleteCredentials } = require('./src/webdav/credentials');

const diaryStore = new DiaryStore(app.getPath('userData'));

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 950,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // 拦截所有外部链接，在系统默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  initializeWebDAVFromSavedCredentials();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// WebDAV 客户端和调度器实例
let webdavClient = new WebDAVClient();
let backupScheduler = null;

// 应用启动时自动加载已保存的凭证
function initializeWebDAVFromSavedCredentials() {
  try {
    const credentials = loadCredentials();
    if (credentials && credentials.url && credentials.username && credentials.password) {
      webdavClient.initialize(credentials.url, credentials.username, credentials.password);
      // 恢复 maxBackups 设置
      const tempScheduler = new BackupScheduler(() => {});
      webdavClient.maxBackups = tempScheduler.settings.maxBackups || 30;
      tempScheduler.stop();
      console.log('WebDAV client initialized from saved credentials');
    }
  } catch (error) {
    console.log('No saved WebDAV credentials or initialization failed:', error.message);
  }
}

// IPC 处理器：测试连接
ipcMain.handle('webdav:test-connection', async (event, { url, username, password }) => {
  try {
    webdavClient.initialize(url, username, password);
    const result = await webdavClient.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理器：保存设置
ipcMain.handle('webdav:save-settings', async (event, { url, username, password, autoBackupEnabled, backupInterval, maxBackups }) => {
  try {
    // 保存凭证
    saveCredentials(url, username, password);

    // 初始化 WebDAV 客户端
    webdavClient.initialize(url, username, password);
    webdavClient.maxBackups = maxBackups || 30;

    // 初始化或更新调度器
    if (!backupScheduler) {
      backupScheduler = new BackupScheduler(async () => {
        // 定时备份回调
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('webdav:auto-backup-trigger');
        }
      });
    }

    backupScheduler.saveSettings({ autoBackupEnabled, backupInterval, maxBackups: maxBackups || 30 });
    backupScheduler.start();

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理器：获取设置
ipcMain.handle('webdav:get-settings', async () => {
  try {
    const credentials = loadCredentials();
    const settings = backupScheduler ? backupScheduler.settings : { autoBackupEnabled: false, backupInterval: 'daily', maxBackups: 30 };
    return {
      success: true,
      credentials,
      settings
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理器：执行备份
ipcMain.handle('webdav:backup', async (event, { data }) => {
  try {
    if (!webdavClient.isInitialized()) {
      return { success: false, error: 'WebDAV 未配置，请先在设置中配置 WebDAV 服务器' };
    }
    // 使用完整时间戳作为文件名，避免同一天多次备份覆盖
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')      // 替换 T 为下划线
      .replace(/:/g, '-')     // 替换冒号为短横线（Windows 文件名不支持冒号）
      .replace(/\.\d{3}Z$/, ''); // 移除毫秒和 Z
    const filename = `${timestamp}.json.gz`;
    const path = await webdavClient.uploadBackup(filename, data);
    return { success: true, path, filename };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理器：列出备份
ipcMain.handle('webdav:list-backups', async () => {
  try {
    if (!webdavClient.isInitialized()) {
      return { success: false, error: 'WebDAV 未配置，请先在设置中配置 WebDAV 服务器' };
    }
    const backups = await webdavClient.listBackups();
    return { success: true, backups };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 校验备份路径，防止路径遍历
function validateBackupPath(p) {
  const normalized = require('path').posix.normalize(p);
  if (!normalized.startsWith('/diary-backups/') || normalized.includes('..')) {
    throw new Error('非法备份路径');
  }
  return normalized;
}

// IPC 处理器：下载备份
ipcMain.handle('webdav:download-backup', async (event, { path: p }) => {
  try {
    const safePath = validateBackupPath(p);
    const data = await webdavClient.downloadBackup(safePath);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理器：删除备份
ipcMain.handle('webdav:delete-backup', async (event, { path: p }) => {
  try {
    const safePath = validateBackupPath(p);
    await webdavClient.deleteBackup(safePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== 本地存储 IPC =====
ipcMain.handle('store:load-entries', () => diaryStore.loadEntries());
ipcMain.handle('store:save-entries', (event, entries) => diaryStore.saveEntries(entries));
ipcMain.handle('store:load-trash', () => diaryStore.loadTrash());
ipcMain.handle('store:save-trash', (event, trash) => diaryStore.saveTrash(trash));
ipcMain.handle('store:load-draft', (event, dateKey) => diaryStore.loadDraft(dateKey));
ipcMain.handle('store:save-draft', (event, { dateKey, data }) => diaryStore.saveDraft(dateKey, data));
ipcMain.handle('store:remove-draft', (event, dateKey) => diaryStore.removeDraft(dateKey));
ipcMain.handle('store:migrate', (event, { entries, trash }) => diaryStore.migrateFromLocalStorage(entries, trash));
