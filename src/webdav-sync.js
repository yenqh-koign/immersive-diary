document.addEventListener('DOMContentLoaded', () => {
    const syncModal = document.getElementById('webdav-sync-modal');
    const syncBtn = document.getElementById('webdav-sync-btn');
    const manualBackupBtn = document.getElementById('manual-backup-btn');
    const lastBackupTime = document.getElementById('last-backup-time');
    const backupList = document.getElementById('backup-list');
    const restoreSection = document.getElementById('restore-section');
    const restoreInfo = document.getElementById('restore-info-container');
    const restoreAllBtn = document.getElementById('restore-all-btn');
    const restoreOverrideBtn = document.getElementById('restore-override-btn');
    const clearLocalEntriesBtn = document.getElementById('clear-local-entries-btn');
    const backupProgress = document.getElementById('backup-progress');
    const restoreProgress = document.getElementById('restore-progress');

    let selectedBackup = null;
    let selectedBackupPath = null;

    function serializeEntries(entriesMap) {
        return Object.entries(entriesMap || {}).map(([date, entry]) => ({
            date,
            ...entry
        }));
    }

    function toEntriesMap(entriesArray) {
        const entriesMap = {};
        if (!Array.isArray(entriesArray)) {
            return entriesMap;
        }

        entriesArray.forEach((entry) => {
            if (!entry || !entry.date) {
                return;
            }

            entriesMap[entry.date] = {
                content: entry.content,
                mood: entry.mood,
                isImportant: entry.isImportant,
                title: entry.title
            };
        });

        return entriesMap;
    }

    async function buildBackupPayload() {
        const diaryEntries = await window.store.loadEntries();
        const trashEntries = await window.store.loadTrash();

        return {
            version: '1.1',
            exportDate: new Date().toISOString(),
            entries: serializeEntries(diaryEntries),
            trash: trashEntries
        };
    }

    function showProgress(container, text, percent = null) {
        container.classList.remove('hidden');
        const fill = container.querySelector('.progress-fill');
        const textEl = container.querySelector('.progress-text');
        textEl.textContent = text;

        if (percent === null) {
            fill.classList.add('indeterminate');
            fill.style.width = '30%';
            return;
        }

        fill.classList.remove('indeterminate');
        fill.style.width = `${percent}%`;
    }

    function hideProgress(container) {
        container.classList.add('hidden');
        const fill = container.querySelector('.progress-fill');
        fill.classList.remove('indeterminate');
        fill.style.width = '0%';
    }

    async function openSyncModal() {
        syncModal.classList.remove('hidden');
        restoreSection.classList.add('hidden');
        selectedBackup = null;
        selectedBackupPath = null;
        await loadBackupList();
    }

    syncBtn.addEventListener('click', openSyncModal);

    syncModal.addEventListener('click', (event) => {
        if (event.target === syncModal) {
            syncModal.classList.add('hidden');
        }
    });

    manualBackupBtn.addEventListener('click', async () => {
        try {
            manualBackupBtn.disabled = true;
            manualBackupBtn.textContent = '备份中...';

            showProgress(backupProgress, '准备数据...');

            const diaryEntries = await window.store.loadEntries();
            const entryCount = Object.keys(diaryEntries).length;
            const payload = await buildBackupPayload();

            showProgress(backupProgress, `正在上传 ${entryCount} 篇日记...`);

            const result = await window.webdav.backup(payload);

            hideProgress(backupProgress);

            if (!result.success) {
                await window.customDialog.alert(`${result.error}`, '备份失败');
                return;
            }

            lastBackupTime.textContent = `上次备份: ${new Date().toLocaleString('zh-CN')}`;
            await window.customDialog.success(`文件: ${result.filename}`, '备份成功');
            await loadBackupList();
        } catch (error) {
            hideProgress(backupProgress);
            await window.customDialog.alert(`${error.message}`, '备份失败');
        } finally {
            manualBackupBtn.disabled = false;
            manualBackupBtn.textContent = '立即备份';
        }
    });

    async function loadBackupList() {
        try {
            backupList.innerHTML = '<p>加载中...</p>';
            const result = await window.webdav.listBackups();

            if (!result.success) {
                backupList.innerHTML = `<p>加载失败: ${result.error}</p>`;
                return;
            }

            if (!Array.isArray(result.backups) || result.backups.length === 0) {
                backupList.innerHTML = '<p>暂无备份</p>';
                return;
            }

            backupList.innerHTML = '';

            result.backups.forEach((backup) => {
                const item = document.createElement('div');
                item.className = 'backup-item';
                item.innerHTML = `
                    <div class="backup-name">${backup.basename}</div>
                    <div class="backup-date">${new Date(backup.lastmod).toLocaleString('zh-CN')}</div>
                    <div class="backup-actions">
                        <button class="view-backup-btn" data-path="${backup.filename}">查看</button>
                        <button class="delete-backup-btn" data-path="${backup.filename}" data-name="${backup.basename}">删除</button>
                    </div>
                `;
                backupList.appendChild(item);
            });

            backupList.querySelectorAll('.view-backup-btn').forEach((button) => {
                button.addEventListener('click', async (event) => {
                    await viewBackup(event.currentTarget.dataset.path);
                });
            });

            backupList.querySelectorAll('.delete-backup-btn').forEach((button) => {
                button.addEventListener('click', async (event) => {
                    const { path, name } = event.currentTarget.dataset;
                    await deleteBackup(path, name);
                });
            });
        } catch (error) {
            backupList.innerHTML = `<p>加载失败: ${error.message}</p>`;
        }
    }

    async function deleteBackup(path, name) {
        const confirmed = await window.customDialog.danger(
            `确定要删除备份“${name}”吗？此操作不可恢复。`,
            '删除备份'
        );

        if (!confirmed) {
            return;
        }

        try {
            const result = await window.webdav.deleteBackup(path);
            if (!result.success) {
                await window.customDialog.alert(`${result.error}`, '删除失败');
                return;
            }

            await window.customDialog.success('备份已从云端删除', '删除成功');
            await loadBackupList();

            if (selectedBackupPath === path) {
                restoreSection.classList.add('hidden');
                selectedBackup = null;
                selectedBackupPath = null;
            }
        } catch (error) {
            await window.customDialog.alert(`${error.message}`, '删除失败');
        }
    }

    async function viewBackup(path) {
        try {
            restoreInfo.innerHTML = '<p>加载中...</p>';
            restoreSection.classList.remove('hidden');
            restoreAllBtn.classList.add('hidden');
            restoreOverrideBtn.classList.add('hidden');

            const result = await window.webdav.downloadBackup(path);
            if (!result.success || !result.data) {
                restoreInfo.innerHTML = `<p>加载失败: ${result.error}</p>`;
                return;
            }

            selectedBackup = result.data;
            selectedBackupPath = path;

            const entryCount = Array.isArray(result.data.entries) ? result.data.entries.length : 0;
            const trashCount = Array.isArray(result.data.trash) ? result.data.trash.length : 0;

            restoreInfo.innerHTML = `
                <div class="restore-summary">
                    <p><strong>备份文件:</strong> ${path.split('/').pop()}</p>
                    <p><strong>日记数量:</strong> ${entryCount}</p>
                    <p><strong>回收站项目:</strong> ${trashCount}</p>
                    <p><strong>导出时间:</strong> ${new Date(result.data.exportDate).toLocaleString('zh-CN')}</p>
                </div>
            `;

            if (entryCount > 0) {
                restoreAllBtn.classList.remove('hidden');
            }

            restoreOverrideBtn.classList.remove('hidden');
        } catch (error) {
            restoreInfo.innerHTML = `<p>加载失败: ${error.message}</p>`;
        }
    }

    restoreAllBtn.addEventListener('click', async () => {
        if (!selectedBackup || !Array.isArray(selectedBackup.entries) || selectedBackup.entries.length === 0) {
            await window.customDialog.alert('备份内容为空或格式无效', '无法恢复');
            return;
        }

        const entryCount = selectedBackup.entries.length;
        const confirmed = await window.customDialog.confirm(
            `确定要恢复 ${entryCount} 篇日记吗？同日期内容会被覆盖。`,
            '恢复备份'
        );

        if (!confirmed) {
            return;
        }

        try {
            restoreAllBtn.disabled = true;
            restoreAllBtn.textContent = '恢复中...';
            showProgress(restoreProgress, '正在恢复日记...');

            const diaryEntries = await window.store.loadEntries();
            let restoredCount = 0;

            selectedBackup.entries.forEach((entry, index) => {
                if (entry && entry.date) {
                    diaryEntries[entry.date] = {
                        content: entry.content,
                        mood: entry.mood,
                        isImportant: entry.isImportant,
                        title: entry.title
                    };
                    restoredCount += 1;
                }

                const percent = Math.round(((index + 1) / entryCount) * 100);
                showProgress(restoreProgress, `恢复中 ${index + 1}/${entryCount}`, percent);
            });

            await window.store.saveEntries(diaryEntries);
            if (Array.isArray(selectedBackup.trash)) {
                await window.store.saveTrash(selectedBackup.trash);
            }

            hideProgress(restoreProgress);
            await window.customDialog.success(`成功恢复 ${restoredCount} 篇日记`, '恢复完成');

            window.dispatchEvent(new CustomEvent('diary:data-changed', {
                detail: { source: 'webdav-restore' }
            }));

            syncModal.classList.add('hidden');
        } catch (error) {
            hideProgress(restoreProgress);
            await window.customDialog.alert(`${error.message}`, '恢复失败');
        } finally {
            restoreAllBtn.disabled = false;
            restoreAllBtn.textContent = '恢复全部';
        }
    });

    restoreOverrideBtn.addEventListener('click', async () => {
        if (!selectedBackup || !Array.isArray(selectedBackup.entries)) {
            await window.customDialog.alert('备份内容格式无效', '无法复原');
            return;
        }

        const entryCount = selectedBackup.entries.length;
        const confirmMessage = entryCount === 0
            ? '该备份不包含日记内容，继续将清空本地全部日记与回收站。'
            : `将复原到该备份状态（${entryCount} 篇日记），并覆盖本地全部日记与回收站。`;

        const confirmed = await window.customDialog.danger(confirmMessage, '复原确认');
        if (!confirmed) {
            return;
        }

        try {
            restoreOverrideBtn.disabled = true;
            restoreOverrideBtn.textContent = '复原中...';
            showProgress(restoreProgress, '正在复原备份...');

            const restoredEntriesMap = toEntriesMap(selectedBackup.entries);
            await window.store.saveEntries(restoredEntriesMap);
            await window.store.saveTrash(Array.isArray(selectedBackup.trash) ? selectedBackup.trash : []);

            showProgress(restoreProgress, '正在刷新界面...', 100);
            hideProgress(restoreProgress);

            await window.customDialog.success(
                entryCount === 0 ? '已复原为空白状态' : `已复原 ${entryCount} 篇日记`,
                '复原完成'
            );

            window.dispatchEvent(new CustomEvent('diary:data-changed', {
                detail: { source: 'webdav-restore-override' }
            }));

            syncModal.classList.add('hidden');
        } catch (error) {
            hideProgress(restoreProgress);
            await window.customDialog.alert(`${error.message}`, '复原失败');
        } finally {
            restoreOverrideBtn.disabled = false;
            restoreOverrideBtn.textContent = '复原到该备份';
        }
    });

    clearLocalEntriesBtn.addEventListener('click', async () => {
        const confirmed = await window.customDialog.danger(
            '将清空本地全部日记和回收站。此操作不会删除云端备份，是否继续？',
            '清空本地日记'
        );

        if (!confirmed) {
            return;
        }

        try {
            clearLocalEntriesBtn.disabled = true;
            clearLocalEntriesBtn.textContent = '清空中...';

            await window.store.saveEntries({});
            await window.store.saveTrash([]);

            await window.customDialog.success('本地日记已清空', '操作完成');

            window.dispatchEvent(new CustomEvent('diary:data-changed', {
                detail: { source: 'local-clear' }
            }));

            syncModal.classList.add('hidden');
        } catch (error) {
            await window.customDialog.alert(`${error.message}`, '清空失败');
        } finally {
            clearLocalEntriesBtn.disabled = false;
            clearLocalEntriesBtn.textContent = '清空本地日记';
        }
    });

    if (window.webdav && window.webdav.onAutoBackupTrigger) {
        window.webdav.onAutoBackupTrigger(async () => {
            try {
                const payload = await buildBackupPayload();
                const result = await window.webdav.backup(payload);
                if (result.success) {
                    console.log('Auto backup completed:', result.filename);
                }
            } catch (error) {
                console.error('Auto backup failed:', error);
            }
        });
    }
});
