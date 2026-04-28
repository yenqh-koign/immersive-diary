const fs = require('fs');
const path = require('path');

class DiaryStore {
  constructor(userDataPath) {
    this.dataDir = path.join(userDataPath, 'diary-data');
    this.entriesFile = path.join(this.dataDir, 'entries.json');
    this.trashFile = path.join(this.dataDir, 'trash.json');
    this.draftsDir = path.join(this.dataDir, 'drafts');
    this._ensureDirs();
  }

  _ensureDirs() {
    for (const dir of [this.dataDir, this.draftsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  _readJSON(filePath, fallback) {
    try {
      if (!fs.existsSync(filePath)) return fallback;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  _writeJSON(filePath, data) {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data), 'utf8');
    fs.renameSync(tmp, filePath);
  }

  loadEntries() {
    return this._readJSON(this.entriesFile, {});
  }

  saveEntries(entries) {
    this._writeJSON(this.entriesFile, entries);
  }

  loadTrash() {
    return this._readJSON(this.trashFile, []);
  }

  saveTrash(trash) {
    this._writeJSON(this.trashFile, trash);
  }

  _draftPath(dateKey) {
    return path.join(this.draftsDir, `${dateKey}.json`);
  }

  loadDraft(dateKey) {
    return this._readJSON(this._draftPath(dateKey), null);
  }

  saveDraft(dateKey, data) {
    this._writeJSON(this._draftPath(dateKey), data);
  }

  removeDraft(dateKey) {
    const p = this._draftPath(dateKey);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  migrateFromLocalStorage(entries, trash) {
    if (entries && Object.keys(entries).length > 0) {
      if (Object.keys(this.loadEntries()).length === 0) {
        this.saveEntries(entries);
      }
    }
    if (trash && trash.length > 0) {
      if (this.loadTrash().length === 0) {
        this.saveTrash(trash);
      }
    }
  }
}

module.exports = DiaryStore;
