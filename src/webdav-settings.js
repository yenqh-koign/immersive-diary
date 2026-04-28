// WebDAV 设置模块
document.addEventListener('DOMContentLoaded', () => {
    // 检查 WebDAV API 是否可用
    if (!window.webdav) {
        console.error('WebDAV API not available! Check preload.js');
        if (window.customDialog) {
            window.customDialog.alert('WebDAV 功能未正确加载，请检查应用程序配置', '加载错误');
        }
        return;
    }

    const settingsModal = document.getElementById('webdav-settings-modal');
    const settingsBtn = document.getElementById('webdav-settings-btn');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const saveSettingsBtn = document.getElementById('save-webdav-settings-btn');
    const connectionStatus = document.getElementById('connection-status');

    const urlInput = document.getElementById('webdav-url');
    const usernameInput = document.getElementById('webdav-username');
    const passwordInput = document.getElementById('webdav-password');
    const autoBackupCheckbox = document.getElementById('auto-backup-enabled');
    const backupIntervalSelect = document.getElementById('backup-interval');
    const maxBackupsInput = document.getElementById('max-backups');
    const runtimeInfo = window.appRuntime || {};
    const runtimeNote = document.createElement('p');
    runtimeNote.className = 'runtime-note';
    runtimeNote.textContent = runtimeInfo.isElectron
        ? '桌面版会使用系统安全存储保存 WebDAV 凭据，并支持后台定时备份。'
        : 'PWA 模式会把 WebDAV 凭据保存在当前浏览器本地，自动备份仅在应用保持打开时生效。';

    const firstSettingsSection = settingsModal.querySelector('.settings-section');
    if (firstSettingsSection) {
        firstSettingsSection.insertAdjacentElement('beforebegin', runtimeNote);
    }

    // --- 自定义下拉组件逻辑 ---
    const customSelectWrapper = document.getElementById('backup-interval-wrapper');
    const customSelectTrigger = document.getElementById('backup-interval-trigger');
    const customSelectValueEl = customSelectTrigger.querySelector('.custom-select-value');
    const customSelectOptions = customSelectWrapper.querySelector('.custom-select-options');

    function setCustomSelectValue(value) {
        backupIntervalSelect.value = value;
        const opt = customSelectOptions.querySelector(`[data-value="${value}"]`);
        if (opt) {
            customSelectValueEl.textContent = opt.textContent;
            customSelectOptions.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        }
    }

    customSelectTrigger.addEventListener('click', () => {
        const isOpen = !customSelectOptions.classList.contains('hidden');
        if (isOpen) {
            customSelectOptions.classList.add('hidden');
            customSelectWrapper.classList.remove('open');
        } else {
            customSelectOptions.classList.remove('hidden');
            customSelectWrapper.classList.add('open');
        }
    });

    customSelectOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;
        setCustomSelectValue(option.dataset.value);
        customSelectOptions.classList.add('hidden');
        customSelectWrapper.classList.remove('open');
    });

    document.addEventListener('click', (e) => {
        if (!customSelectWrapper.contains(e.target)) {
            customSelectOptions.classList.add('hidden');
            customSelectWrapper.classList.remove('open');
        }
    });
    // --- 自定义下拉结束 ---

    // --- Theme Logic Start ---
    const themeOptions = document.querySelectorAll('.theme-option');

    function updateThemeSelectorUI(activeTheme) {
        themeOptions.forEach(option => {
            if (option.dataset.value === activeTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.value;
            if (window.UIEnhancements && window.UIEnhancements.setColorTheme) {
                window.UIEnhancements.setColorTheme(theme);
            }
            updateThemeSelectorUI(theme);
        });
    });

    // Initialize selector UI
    const savedTheme = localStorage.getItem('themePreference') || 'sakura';
    updateThemeSelectorUI(savedTheme);
    // --- Theme Logic End ---

    // 打开设置模态框
    settingsBtn.addEventListener('click', async () => {
        settingsModal.classList.remove('hidden');
        await loadSettings();
    });

    // 点击模态框外部关闭
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    // 加载现有设置
    async function loadSettings() {
        try {
            const result = await window.webdav.getSettings();
            if (result.success && result.credentials) {
                urlInput.value = result.credentials.url || '';
                usernameInput.value = result.credentials.username || '';
                passwordInput.value = result.credentials.password || '';
            }
            if (result.success && result.settings) {
                autoBackupCheckbox.checked = result.settings.autoBackupEnabled || false;
                backupIntervalSelect.value = result.settings.backupInterval || 'daily';
                setCustomSelectValue(result.settings.backupInterval || 'daily');
                maxBackupsInput.value = result.settings.maxBackups || 30;
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    // 测试连接
    testConnectionBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!url || !username || !password) {
            connectionStatus.textContent = '❌ 请填写完整的服务器信息';
            connectionStatus.style.color = '#FF6B6B';
            return;
        }

        connectionStatus.textContent = '⏳ 测试连接中...';
        connectionStatus.style.color = '#FFD166';

        try {
            const result = await window.webdav.testConnection(url, username, password);
            if (result.success) {
                connectionStatus.textContent = '✅ 连接成功！';
                connectionStatus.style.color = '#4CAF50';
            } else {
                connectionStatus.textContent = `❌ 连接失败: ${result.error}`;
                connectionStatus.style.color = '#FF6B6B';
            }
        } catch (error) {
            connectionStatus.textContent = `❌ 连接失败: ${error.message}`;
            connectionStatus.style.color = '#FF6B6B';
        }
    });

    // 保存设置
    saveSettingsBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const autoBackupEnabled = autoBackupCheckbox.checked;
        const backupInterval = backupIntervalSelect.value;
        const maxBackups = parseInt(maxBackupsInput.value, 10) || 30;

        if (!url || !username || !password) {
            await window.customDialog.alert('请填写完整的服务器信息', '信息不完整');
            return;
        }

        try {
            const result = await window.webdav.saveSettings(
                url,
                username,
                password,
                autoBackupEnabled,
                backupInterval,
                maxBackups
            );

            if (result.success) {
                await window.customDialog.success('WebDAV 设置已保存', '保存成功');
                settingsModal.classList.add('hidden');
            } else {
                await window.customDialog.alert(`${result.error}`, '保存失败');
            }
        } catch (error) {
            await window.customDialog.alert(`${error.message}`, '保存失败');
        }
    });
});
