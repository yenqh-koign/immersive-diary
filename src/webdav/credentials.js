const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_FILE = path.join(app.getPath('userData'), 'webdav-credentials.enc');

function saveCredentials(url, username, password) {
  const credentials = JSON.stringify({ url, username, password });
  const encrypted = safeStorage.encryptString(credentials);
  fs.writeFileSync(CREDENTIALS_FILE, encrypted);
}

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  try {
    const encrypted = fs.readFileSync(CREDENTIALS_FILE);
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return null;
  }
}

function deleteCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

module.exports = {
  saveCredentials,
  loadCredentials,
  deleteCredentials
};
