const { createClient } = require('webdav');
const https = require('https');
const zlib = require('zlib');
const { promisify } = require('util');
const { obfuscate, deobfuscate } = require('./obfuscator');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const MAX_BACKUPS_DEFAULT = 30;

class WebDAVClient {
  constructor() {
    this.client = null;
    this.config = null;
    this.maxBackups = MAX_BACKUPS_DEFAULT;
  }

  isInitialized() {
    return this.client !== null;
  }

  initialize(url, username, password) {
    if (!url.startsWith('https://')) {
      throw new Error('仅支持 HTTPS 连接');
    }

    this.config = { url, username, password };
    this.client = createClient(url, {
      username,
      password,
      httpsAgent: new https.Agent({
        rejectUnauthorized: true
      })
    });
  }

  async testConnection() {
    try {
      await this.client.getDirectoryContents('/');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async uploadBackup(filename, data) {
    const path = `/diary-backups/${filename}`;
    const obfuscatedData = obfuscate(data);
    const compressed = await gzip(obfuscatedData);
    await this.client.putFileContents(path, compressed, {
      overwrite: true
    });

    // 上传成功后清理旧备份
    await this.pruneOldBackups();

    return path;
  }

  async listBackups() {
    try {
      const contents = await this.client.getDirectoryContents('/diary-backups');
      return contents.filter(item =>
        item.type === 'file' &&
        (item.basename.endsWith('.json.gz') || item.basename.endsWith('.json'))
      );
    } catch (error) {
      if (error.status === 404) {
        await this.client.createDirectory('/diary-backups');
        return [];
      }
      throw error;
    }
  }

  async downloadBackup(path) {
    const content = await this.client.getFileContents(path);

    if (path.endsWith('.json.gz')) {
      const decompressed = await gunzip(Buffer.from(content));
      const contentStr = decompressed.toString('utf8');
      return deobfuscate(contentStr);
    } else {
      if (typeof content === 'string') {
        return deobfuscate(content);
      }
      return deobfuscate(content.toString('utf8'));
    }
  }

  async deleteBackup(path) {
    await this.client.deleteFile(path);
    return { success: true };
  }

  async pruneOldBackups() {
    try {
      const backups = await this.listBackups();
      if (backups.length <= this.maxBackups) return;

      // 按修改时间排序，最旧的在前
      backups.sort((a, b) => new Date(a.lastmod) - new Date(b.lastmod));

      const toDelete = backups.slice(0, backups.length - this.maxBackups);
      for (const backup of toDelete) {
        await this.client.deleteFile(backup.filename);
      }
    } catch (error) {
      console.error('清理旧备份失败:', error.message);
    }
  }
}

module.exports = WebDAVClient;
