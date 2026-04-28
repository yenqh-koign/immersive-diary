const { contextBridge, ipcRenderer } = require('electron');

// 暴露本地存储 API
contextBridge.exposeInMainWorld('store', {
  loadEntries: () => ipcRenderer.invoke('store:load-entries'),
  saveEntries: (entries) => ipcRenderer.invoke('store:save-entries', entries),
  loadTrash: () => ipcRenderer.invoke('store:load-trash'),
  saveTrash: (trash) => ipcRenderer.invoke('store:save-trash', trash),
  loadDraft: (dateKey) => ipcRenderer.invoke('store:load-draft', dateKey),
  saveDraft: (dateKey, data) => ipcRenderer.invoke('store:save-draft', { dateKey, data }),
  removeDraft: (dateKey) => ipcRenderer.invoke('store:remove-draft', dateKey),
  migrate: (entries, trash) => ipcRenderer.invoke('store:migrate', { entries, trash })
});

// 暴露 WebDAV API 给渲染进程
contextBridge.exposeInMainWorld('webdav', {
  testConnection: (url, username, password) =>
    ipcRenderer.invoke('webdav:test-connection', { url, username, password }),

  saveSettings: (url, username, password, autoBackupEnabled, backupInterval, maxBackups) =>
    ipcRenderer.invoke('webdav:save-settings', { url, username, password, autoBackupEnabled, backupInterval, maxBackups }),

  getSettings: () =>
    ipcRenderer.invoke('webdav:get-settings'),

  backup: (data) =>
    ipcRenderer.invoke('webdav:backup', { data }),

  listBackups: () =>
    ipcRenderer.invoke('webdav:list-backups'),

  downloadBackup: (path) =>
    ipcRenderer.invoke('webdav:download-backup', { path }),

  deleteBackup: (path) =>
    ipcRenderer.invoke('webdav:delete-backup', { path }),

  onAutoBackupTrigger: (callback) => {
    ipcRenderer.removeAllListeners('webdav:auto-backup-trigger');
    ipcRenderer.on('webdav:auto-backup-trigger', callback);
    return () => ipcRenderer.removeListener('webdav:auto-backup-trigger', callback);
  }
});
