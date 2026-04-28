(function () {
    'use strict';

    const BROWSER_DB_NAME = 'nyaa-immersive-diary';
    const BROWSER_DB_VERSION = 1;
    const BROWSER_DB_STORE = 'kv';

    const LOCAL_FALLBACK_KEYS = {
        entries: 'nyaa.browser.entries',
        trash: 'nyaa.browser.trash'
    };

    const BROWSER_WEBDAV_CREDENTIALS_KEY = 'nyaa.browser.webdav.credentials';
    const BROWSER_WEBDAV_SETTINGS_KEY = 'nyaa.browser.webdav.settings';
    const BROWSER_WEBDAV_AUTO_STATE_KEY = 'nyaa.browser.webdav.auto';

    const DEFAULT_WEBDAV_SETTINGS = {
        autoBackupEnabled: false,
        backupInterval: 'daily',
        maxBackups: 30
    };

    const OBFUSCATION_KEY = 'NyaaDiary@2024!Immersive#Journal';
    const OBFUSCATION_HEADER_V2 = 'NYAA2:';
    const OBFUSCATION_HEADER_V1 = 'NYAA:';
    const DAV_DIRECTORY = '/diary-backups';
    const DAV_PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:allprop />
</d:propfind>`;

    const browserAutoBackupListeners = new Set();
    let browserAutoBackupTimer = null;
    let browserStorageMode = typeof window.indexedDB === 'undefined'
        ? 'browser-local-storage'
        : 'browser-indexeddb';
    let browserAutoBackupInitialized = false;

    function safeJsonParse(rawValue, fallbackValue) {
        if (!rawValue) {
            return fallbackValue;
        }

        try {
            return JSON.parse(rawValue);
        } catch {
            return fallbackValue;
        }
    }

    function readLocalValue(key, fallbackValue) {
        return safeJsonParse(localStorage.getItem(key), fallbackValue);
    }

    function writeLocalValue(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function removeLocalValue(key) {
        localStorage.removeItem(key);
    }

    function getDraftStorageKey(dateKey) {
        return `nyaa.browser.draft.${dateKey}`;
    }

    function openBrowserDatabase() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(BROWSER_DB_NAME, BROWSER_DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(BROWSER_DB_STORE)) {
                    db.createObjectStore(BROWSER_DB_STORE);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
        });
    }

    async function runBrowserStoreRequest(mode, operation) {
        const db = await openBrowserDatabase();

        return new Promise((resolve, reject) => {
            let settled = false;
            const transaction = db.transaction(BROWSER_DB_STORE, mode);
            const store = transaction.objectStore(BROWSER_DB_STORE);
            const request = operation(store);

            transaction.oncomplete = () => {
                db.close();
            };

            const rejectWith = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                db.close();
                reject(error);
            };

            transaction.onerror = () => rejectWith(transaction.error || new Error('IndexedDB transaction failed'));
            transaction.onabort = () => rejectWith(transaction.error || new Error('IndexedDB transaction aborted'));

            if (!request || typeof request !== 'object') {
                settled = true;
                resolve(request);
                return;
            }

            request.onsuccess = () => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(request.result);
            };

            request.onerror = () => rejectWith(request.error || new Error('IndexedDB request failed'));
        });
    }

    async function readBrowserStoreValue(key, fallbackValue) {
        if (browserStorageMode === 'browser-local-storage') {
            return readLocalValue(key, fallbackValue);
        }

        try {
            const result = await runBrowserStoreRequest('readonly', (store) => store.get(key));
            return typeof result === 'undefined' ? fallbackValue : result;
        } catch (error) {
            console.warn('IndexedDB unavailable, falling back to localStorage:', error);
            browserStorageMode = 'browser-local-storage';
            return readLocalValue(key, fallbackValue);
        }
    }

    async function writeBrowserStoreValue(key, value) {
        if (browserStorageMode === 'browser-local-storage') {
            writeLocalValue(key, value);
            return;
        }

        try {
            await runBrowserStoreRequest('readwrite', (store) => store.put(value, key));
        } catch (error) {
            console.warn('IndexedDB write failed, falling back to localStorage:', error);
            browserStorageMode = 'browser-local-storage';
            writeLocalValue(key, value);
        }
    }

    async function deleteBrowserStoreValue(key) {
        if (browserStorageMode === 'browser-local-storage') {
            removeLocalValue(key);
            return;
        }

        try {
            await runBrowserStoreRequest('readwrite', (store) => store.delete(key));
        } catch (error) {
            console.warn('IndexedDB delete failed, falling back to localStorage:', error);
            browserStorageMode = 'browser-local-storage';
            removeLocalValue(key);
        }
    }

    function createBrowserStore() {
        const store = {
            __browserFallback: true,
            get mode() {
                return browserStorageMode;
            },
            async loadEntries() {
                return readBrowserStoreValue(LOCAL_FALLBACK_KEYS.entries, {});
            },
            async saveEntries(entries) {
                await writeBrowserStoreValue(LOCAL_FALLBACK_KEYS.entries, entries || {});
            },
            async loadTrash() {
                return readBrowserStoreValue(LOCAL_FALLBACK_KEYS.trash, []);
            },
            async saveTrash(trash) {
                await writeBrowserStoreValue(LOCAL_FALLBACK_KEYS.trash, Array.isArray(trash) ? trash : []);
            },
            async loadDraft(dateKey) {
                return readBrowserStoreValue(getDraftStorageKey(dateKey), null);
            },
            async saveDraft(dateKey, data) {
                await writeBrowserStoreValue(getDraftStorageKey(dateKey), data || null);
            },
            async removeDraft(dateKey) {
                await deleteBrowserStoreValue(getDraftStorageKey(dateKey));
            },
            async migrate(entries, trash) {
                const currentEntries = await this.loadEntries();
                const currentTrash = await this.loadTrash();

                if (entries && Object.keys(entries).length > 0 && Object.keys(currentEntries).length === 0) {
                    await this.saveEntries(entries);
                }

                if (Array.isArray(trash) && trash.length > 0 && currentTrash.length === 0) {
                    await this.saveTrash(trash);
                }
            }
        };

        return store;
    }

    function encodeBase64Unicode(input) {
        return btoa(unescape(encodeURIComponent(input)));
    }

    function base64ToBinaryString(input) {
        return atob(input);
    }

    function xorUtf8Bytes(bytes, keyBytes) {
        const output = new Uint8Array(bytes.length);

        for (let index = 0; index < bytes.length; index += 1) {
            output[index] = bytes[index] ^ keyBytes[index % keyBytes.length];
        }

        return output;
    }

    function xorLegacyString(input, key) {
        let output = '';
        for (let index = 0; index < input.length; index += 1) {
            output += String.fromCharCode(
                input.charCodeAt(index) ^ key.charCodeAt(index % key.length)
            );
        }
        return output;
    }

    function obfuscatePayload(data) {
        const json = JSON.stringify(data);
        const jsonBytes = new TextEncoder().encode(json);
        const keyBytes = new TextEncoder().encode(OBFUSCATION_KEY);
        const transformed = xorUtf8Bytes(jsonBytes, keyBytes);
        let binary = '';

        transformed.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });

        return OBFUSCATION_HEADER_V2 + btoa(binary);
    }

    function deobfuscatePayload(content) {
        if (content.startsWith(OBFUSCATION_HEADER_V2)) {
            const binary = base64ToBinaryString(content.slice(OBFUSCATION_HEADER_V2.length));
            const payload = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            const keyBytes = new TextEncoder().encode(OBFUSCATION_KEY);
            const decoded = xorUtf8Bytes(payload, keyBytes);
            return JSON.parse(new TextDecoder().decode(decoded));
        }

        if (content.startsWith(OBFUSCATION_HEADER_V1)) {
            const binary = base64ToBinaryString(content.slice(OBFUSCATION_HEADER_V1.length));
            const json = xorLegacyString(binary, OBFUSCATION_KEY);
            return JSON.parse(json);
        }

        return JSON.parse(content);
    }

    async function decompressGzipResponse(response) {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('当前浏览器不支持解压 .json.gz 备份，请先在桌面端恢复或改用 .json 备份');
        }

        const arrayBuffer = await response.arrayBuffer();
        const stream = new Response(arrayBuffer).body
            .pipeThrough(new DecompressionStream('gzip'));

        return new Response(stream).text();
    }

    function loadBrowserCredentials() {
        return safeJsonParse(localStorage.getItem(BROWSER_WEBDAV_CREDENTIALS_KEY), null);
    }

    function saveBrowserCredentials(credentials) {
        writeLocalValue(BROWSER_WEBDAV_CREDENTIALS_KEY, credentials);
    }

    function loadBrowserWebdavSettings() {
        return {
            ...DEFAULT_WEBDAV_SETTINGS,
            ...safeJsonParse(localStorage.getItem(BROWSER_WEBDAV_SETTINGS_KEY), {})
        };
    }

    function saveBrowserWebdavSettings(settings) {
        writeLocalValue(BROWSER_WEBDAV_SETTINGS_KEY, {
            ...DEFAULT_WEBDAV_SETTINGS,
            ...settings
        });
    }

    function loadBrowserAutoBackupState() {
        return safeJsonParse(localStorage.getItem(BROWSER_WEBDAV_AUTO_STATE_KEY), {});
    }

    function saveBrowserAutoBackupState(state) {
        writeLocalValue(BROWSER_WEBDAV_AUTO_STATE_KEY, state || {});
    }

    function isCapacitorNative() {
        return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    }

    function ensureHttpsUrl(url) {
        if (!url) {
            throw new Error('WebDAV 地址不能为空');
        }
        if (isCapacitorNative()) {
            if (!String(url).startsWith('http://') && !String(url).startsWith('https://')) {
                throw new Error('WebDAV 地址必须以 http:// 或 https:// 开头');
            }
            return;
        }
        if (!String(url).startsWith('https://')) {
            throw new Error('PWA 模式仅支持 HTTPS WebDAV 地址');
        }
    }

    function getBrowserWebdavConfig() {
        const credentials = loadBrowserCredentials();
        const settings = loadBrowserWebdavSettings();
        return { credentials, settings };
    }

    function getBrowserWebdavCredentialsOrThrow() {
        const credentials = loadBrowserCredentials();
        if (!credentials || !credentials.url || !credentials.username || !credentials.password) {
            throw new Error('WebDAV 未配置，请先在设置中保存服务器信息');
        }

        ensureHttpsUrl(credentials.url);
        return credentials;
    }

    function buildDavUrl(baseUrl, remotePath) {
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const url = new URL(normalizedBase);

        if (!remotePath || remotePath === '/') {
            return url.toString();
        }

        const trimmedRemotePath = String(remotePath).replace(/^\/+/, '');
        return new URL(trimmedRemotePath, url).toString();
    }

    function buildBasicAuthHeader(username, password) {
        return `Basic ${encodeBase64Unicode(`${username}:${password}`)}`;
    }

    async function davRequest(credentials, method, remotePath, options = {}) {
        const targetUrl = buildDavUrl(credentials.url, remotePath);
        const authHeader = buildBasicAuthHeader(credentials.username, credentials.password);

        const nativeHttp = isCapacitorNative()
            && window.Capacitor && window.Capacitor.Plugins
            ? window.Capacitor.Plugins.NativeHttp
            : null;

        if (nativeHttp) {
            const nativeHeaders = {};
            if (options.headers) {
                if (options.headers instanceof Headers) {
                    options.headers.forEach((val, key) => { nativeHeaders[key] = val; });
                } else if (typeof options.headers === 'object') {
                    Object.keys(options.headers).forEach((key) => { nativeHeaders[key] = options.headers[key]; });
                }
            }
            nativeHeaders['Authorization'] = authHeader;

            const result = await nativeHttp.request({
                url: targetUrl,
                method: method,
                headersJson: JSON.stringify(nativeHeaders),
                body: options.body || null,
                responseType: options.binaryResponse ? 'arraybuffer' : 'text'
            });

            const isBinary = !!options.binaryResponse;
            return {
                status: result.status,
                ok: result.status >= 200 && result.status < 300,
                async text() { return result.data || ''; },
                async arrayBuffer() {
                    if (isBinary) {
                        const bin = atob(result.data || '');
                        const bytes = new Uint8Array(bin.length);
                        for (let i = 0; i < bin.length; i += 1) {
                            bytes[i] = bin.charCodeAt(i);
                        }
                        return bytes.buffer;
                    }
                    return new TextEncoder().encode(result.data || '').buffer;
                }
            };
        }

        const headers = new Headers(options.headers || {});
        headers.set('Authorization', authHeader);

        const response = await fetch(targetUrl, {
            method,
            headers,
            body: options.body,
            cache: 'no-store'
        });

        return response;
    }

    async function readErrorBody(response) {
        try {
            const text = await response.text();
            return text ? ` ${text}` : '';
        } catch {
            return '';
        }
    }

    async function ensureDavDirectory(credentials, remotePath) {
        const response = await davRequest(credentials, 'MKCOL', remotePath);
        if ([200, 201, 204, 301, 405].includes(response.status)) {
            return;
        }

        if (response.status === 409) {
            throw new Error('WebDAV 目录创建失败，请检查服务器路径是否正确');
        }

        const errorBody = await readErrorBody(response);
        throw new Error(`WebDAV 目录准备失败 (${response.status})${errorBody}`);
    }

    async function propfind(credentials, remotePath, depth) {
        const response = await davRequest(credentials, 'PROPFIND', remotePath, {
            headers: {
                Depth: String(depth),
                'Content-Type': 'application/xml; charset=utf-8'
            },
            body: DAV_PROPFIND_BODY
        });

        if (![200, 207].includes(response.status)) {
            const errorBody = await readErrorBody(response);
            throw new Error(`WebDAV 请求失败 (${response.status})${errorBody}`);
        }

        return response.text();
    }

    function getFirstElementByLocalName(root, localName) {
        return root.getElementsByTagNameNS('*', localName)[0] || null;
    }

    function getTextByLocalName(root, localName) {
        const element = getFirstElementByLocalName(root, localName);
        return element ? element.textContent.trim() : '';
    }

    function hrefToRemotePath(baseUrl, href) {
        const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
        const target = new URL(href, base);

        let pathname = decodeURIComponent(target.pathname);
        const basePath = base.pathname.endsWith('/')
            ? base.pathname.slice(0, -1)
            : base.pathname;

        if (basePath && pathname.startsWith(basePath)) {
            pathname = pathname.slice(basePath.length) || '/';
        }

        if (!pathname.startsWith('/')) {
            pathname = `/${pathname}`;
        }

        return pathname;
    }

    function parseDavDirectoryListing(baseUrl, xmlText) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'application/xml');
        const responses = Array.from(xml.getElementsByTagNameNS('*', 'response'));

        return responses
            .map((response) => {
                const href = getTextByLocalName(response, 'href');
                const filename = hrefToRemotePath(baseUrl, href);
                const basename = decodeURIComponent(
                    filename
                        .split('/')
                        .filter(Boolean)
                        .pop() || ''
                );
                const lastmod = getTextByLocalName(response, 'getlastmodified');
                const resourceType = getFirstElementByLocalName(response, 'resourcetype');
                const isDirectory = !!(resourceType && getFirstElementByLocalName(resourceType, 'collection'));

                return {
                    type: isDirectory ? 'directory' : 'file',
                    filename,
                    basename,
                    lastmod
                };
            });
    }

    async function listBrowserBackups(credentials) {
        await ensureDavDirectory(credentials, DAV_DIRECTORY);
        const xmlText = await propfind(credentials, DAV_DIRECTORY, 1);
        return parseDavDirectoryListing(credentials.url, xmlText)
            .filter((item) => item.type === 'file')
            .filter((item) => item.filename.startsWith(`${DAV_DIRECTORY}/`))
            .filter((item) => item.basename.endsWith('.json') || item.basename.endsWith('.json.gz'))
            .sort((left, right) => new Date(right.lastmod || 0) - new Date(left.lastmod || 0));
    }

    async function pruneBrowserBackups(credentials, maxBackups) {
        const backups = await listBrowserBackups(credentials);
        if (backups.length <= maxBackups) {
            return;
        }

        const staleBackups = backups
            .slice()
            .sort((left, right) => new Date(left.lastmod || 0) - new Date(right.lastmod || 0))
            .slice(0, backups.length - maxBackups);

        for (const backup of staleBackups) {
            const response = await davRequest(credentials, 'DELETE', backup.filename);
            if (![200, 204].includes(response.status)) {
                const errorBody = await readErrorBody(response);
                throw new Error(`删除旧备份失败 (${response.status})${errorBody}`);
            }
        }
    }

    function getBackupIntervalMs(interval) {
        switch (interval) {
            case 'weekly':
                return 7 * 24 * 60 * 60 * 1000;
            case 'monthly':
                return 30 * 24 * 60 * 60 * 1000;
            case 'daily':
            default:
                return 24 * 60 * 60 * 1000;
        }
    }

    function notifyBrowserAutoBackupListeners() {
        browserAutoBackupListeners.forEach((listener) => {
            try {
                listener();
            } catch (error) {
                console.error('Auto backup listener failed:', error);
            }
        });
    }

    function maybeTriggerBrowserAutoBackup() {
        const settings = loadBrowserWebdavSettings();
        if (!settings.autoBackupEnabled || browserAutoBackupListeners.size === 0) {
            return;
        }

        const state = loadBrowserAutoBackupState();
        const now = Date.now();
        const intervalMs = getBackupIntervalMs(settings.backupInterval);

        if (!state.lastBackupAt || now - state.lastBackupAt >= intervalMs) {
            saveBrowserAutoBackupState({
                ...state,
                lastBackupAt: now
            });
            notifyBrowserAutoBackupListeners();
        }
    }

    function scheduleBrowserAutoBackup() {
        if (browserAutoBackupTimer) {
            clearInterval(browserAutoBackupTimer);
            browserAutoBackupTimer = null;
        }

        const settings = loadBrowserWebdavSettings();
        if (!settings.autoBackupEnabled) {
            return;
        }

        browserAutoBackupTimer = setInterval(
            maybeTriggerBrowserAutoBackup,
            Math.min(getBackupIntervalMs(settings.backupInterval), 15 * 60 * 1000)
        );
    }

    function initializeBrowserAutoBackup() {
        if (browserAutoBackupInitialized) {
            scheduleBrowserAutoBackup();
            return;
        }

        browserAutoBackupInitialized = true;
        scheduleBrowserAutoBackup();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                maybeTriggerBrowserAutoBackup();
            }
        });

        window.addEventListener('online', maybeTriggerBrowserAutoBackup);
    }

    function createBrowserWebdavAdapter() {
        return {
            __browserFallback: true,
            async testConnection(url, username, password) {
                try {
                    ensureHttpsUrl(url);
                    const xmlText = await propfind({ url, username, password }, '/', 0);
                    return { success: typeof xmlText === 'string' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async saveSettings(url, username, password, autoBackupEnabled, backupInterval, maxBackups) {
                try {
                    ensureHttpsUrl(url);
                    saveBrowserCredentials({ url, username, password });
                    saveBrowserWebdavSettings({
                        autoBackupEnabled: !!autoBackupEnabled,
                        backupInterval: backupInterval || DEFAULT_WEBDAV_SETTINGS.backupInterval,
                        maxBackups: maxBackups || DEFAULT_WEBDAV_SETTINGS.maxBackups
                    });
                    initializeBrowserAutoBackup();
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getSettings() {
                const { credentials, settings } = getBrowserWebdavConfig();
                return {
                    success: true,
                    credentials,
                    settings
                };
            },

            async backup(data) {
                const credentials = getBrowserWebdavCredentialsOrThrow();
                const settings = loadBrowserWebdavSettings();
                await ensureDavDirectory(credentials, DAV_DIRECTORY);

                const filename = `${new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\.\d{3}Z$/, '')}.json`;
                const response = await davRequest(credentials, 'PUT', `${DAV_DIRECTORY}/${filename}`, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    },
                    body: obfuscatePayload(data)
                });

                if (![200, 201, 204].includes(response.status)) {
                    const errorBody = await readErrorBody(response);
                    throw new Error(`上传备份失败 (${response.status})${errorBody}`);
                }

                saveBrowserAutoBackupState({
                    ...loadBrowserAutoBackupState(),
                    lastBackupAt: Date.now()
                });

                await pruneBrowserBackups(credentials, settings.maxBackups || DEFAULT_WEBDAV_SETTINGS.maxBackups);

                return {
                    success: true,
                    path: `${DAV_DIRECTORY}/${filename}`,
                    filename
                };
            },

            async listBackups() {
                const credentials = getBrowserWebdavCredentialsOrThrow();
                const backups = await listBrowserBackups(credentials);
                return {
                    success: true,
                    backups
                };
            },

            async downloadBackup(remotePath) {
                const credentials = getBrowserWebdavCredentialsOrThrow();
                const isGzip = remotePath.endsWith('.json.gz');
                const response = await davRequest(credentials, 'GET', remotePath,
                    isGzip ? { binaryResponse: true } : {}
                );

                if (!response.ok) {
                    const errorBody = await readErrorBody(response);
                    throw new Error(`下载备份失败 (${response.status})${errorBody}`);
                }

                const text = isGzip
                    ? await decompressGzipResponse(response)
                    : await response.text();
                return {
                    success: true,
                    data: deobfuscatePayload(text)
                };
            },

            async deleteBackup(remotePath) {
                const credentials = getBrowserWebdavCredentialsOrThrow();
                const response = await davRequest(credentials, 'DELETE', remotePath);

                if (![200, 204].includes(response.status)) {
                    const errorBody = await readErrorBody(response);
                    throw new Error(`删除备份失败 (${response.status})${errorBody}`);
                }

                return { success: true };
            },

            onAutoBackupTrigger(callback) {
                browserAutoBackupListeners.add(callback);
                initializeBrowserAutoBackup();
                setTimeout(maybeTriggerBrowserAutoBackup, 0);

                return () => {
                    browserAutoBackupListeners.delete(callback);
                };
            },

            initializeAutoBackup: initializeBrowserAutoBackup
        };
    }

    const isElectronRuntime = !!(window.store && !window.store.__browserFallback);

    if (!window.store) {
        window.store = createBrowserStore();
    }

    if (!window.webdav) {
        window.webdav = createBrowserWebdavAdapter();
    }

    window.appRuntime = {
        isElectron: isElectronRuntime,
        isPwaCapable: true,
        storageMode: window.store.__browserFallback ? window.store.mode : 'electron-file',
        supportsWebdav: !!window.webdav,
        credentialStorage: window.webdav.__browserFallback ? 'browser-local' : 'safe-storage',
        autoBackupMode: window.webdav.__browserFallback ? 'while-open' : 'background'
    };

    if (window.webdav.__browserFallback && typeof window.webdav.initializeAutoBackup === 'function') {
        window.webdav.initializeAutoBackup();
    }
})();
