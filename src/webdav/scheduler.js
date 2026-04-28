const cron = require('node-cron');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'webdav-settings.json');

class BackupScheduler {
  constructor(backupCallback) {
    this.backupCallback = backupCallback;
    this.task = null;
    this.settings = this.loadSettings();
  }

  loadSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    return {
      autoBackupEnabled: false,
      backupInterval: 'daily',
      maxBackups: 30
    };
  }

  saveSettings(settings) {
    this.settings = settings;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    this.updateSchedule();
  }

  updateSchedule() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    if (!this.settings.autoBackupEnabled) {
      return;
    }

    let cronExpression;
    switch (this.settings.backupInterval) {
      case 'daily':
        cronExpression = '0 2 * * *'; // 每天凌晨2点
        break;
      case 'weekly':
        cronExpression = '0 2 * * 0'; // 每周日凌晨2点
        break;
      case 'monthly':
        cronExpression = '0 2 1 * *'; // 每月1号凌晨2点
        break;
      default:
        cronExpression = '0 2 * * *';
    }

    this.task = cron.schedule(cronExpression, async () => {
      console.log('Running scheduled backup...');
      try {
        await this.backupCallback();
        console.log('Scheduled backup completed');
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    });
  }

  start() {
    this.updateSchedule();
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}

module.exports = BackupScheduler;
