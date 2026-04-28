
document.addEventListener('DOMContentLoaded', async () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarContainer = document.querySelector('.calendar-container');
    const diaryModal = document.getElementById('diary-modal');
    const searchModal = document.getElementById('search-modal');
    const onThisDayModal = document.getElementById('on-this-day-modal');

    const searchActionBtn = document.getElementById('search-action-btn');
    const onThisDayActionBtn = document.getElementById('on-this-day-action-btn');
    const exportBtn = document.getElementById('export-btn');
    const exportMenu = document.getElementById('export-menu');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('importFile');
    const exportZipBtn = document.getElementById('export-zip-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');
    const exportDateModal = document.getElementById('export-date-modal');
    const exportDateCalendar = document.getElementById('export-date-calendar');
    const exportDateMonthLabel = document.getElementById('export-date-month-label');
    const exportDateSummary = document.getElementById('export-date-summary');
    const exportDatePreviewDate = document.getElementById('export-date-preview-date');
    const exportDatePreviewContent = document.getElementById('export-date-preview-content');
    const closeExportDateBtn = document.getElementById('close-export-date-btn');
    const exportDatePrevMonthBtn = document.getElementById('export-date-prev-month-btn');
    const exportDateNextMonthBtn = document.getElementById('export-date-next-month-btn');
    const exportDateSelectAllBtn = document.getElementById('export-date-select-all-btn');
    const exportDateSelectAllGlobalBtn = document.getElementById('export-date-select-all-global-btn');
    const exportDateInvertBtn = document.getElementById('export-date-invert-btn');
    const exportDateClearBtn = document.getElementById('export-date-clear-btn');
    const exportDateRangeStartInput = document.getElementById('export-date-range-start');
    const exportDateRangeEndInput = document.getElementById('export-date-range-end');
    const exportDateSelectRangeBtn = document.getElementById('export-date-select-range-btn');
    const exportDateConfirmBtn = document.getElementById('export-date-confirm-btn');
    const exportDateCancelBtn = document.getElementById('export-date-cancel-btn');
    const recycleBinBtn = document.getElementById('recycle-bin-btn');
    const recycleBinModal = document.getElementById('recycle-bin-modal');
    const recycleBinList = document.getElementById('recycle-bin-list');
    const recycleBinSummary = document.getElementById('recycle-bin-summary');
    const closeRecycleBinBtn = document.getElementById('close-recycle-bin-btn');
    const clearRecycleBinBtn = document.getElementById('clear-recycle-bin-btn');
    const simpleDateModal = document.getElementById('simple-date-modal');
    const simpleDateCalendar = document.getElementById('simple-date-calendar');
    const simpleDateControls = document.querySelector('.simple-date-controls');
    const simpleDateWeekdays = document.getElementById('simple-date-weekdays');
    const simpleDateActions = document.getElementById('simple-date-actions');
    const simpleDateMonthLabelBtn = document.getElementById('simple-date-month-label-btn');
    const simpleDateMonthLabel = document.getElementById('simple-date-month-label');
    const simpleDateMonthPicker = document.getElementById('simple-date-month-picker');
    const simpleDateYearLabel = document.getElementById('simple-date-year-label');
    const simpleDateMonthGrid = document.getElementById('simple-date-month-grid');
    const simpleDatePrevYearBtn = document.getElementById('simple-date-prev-year-btn');
    const simpleDateNextYearBtn = document.getElementById('simple-date-next-year-btn');
    const simpleDateMonthCancelBtn = document.getElementById('simple-date-month-cancel-btn');
    const closeSimpleDateBtn = document.getElementById('close-simple-date-btn');
    const simpleDatePrevMonthBtn = document.getElementById('simple-date-prev-month-btn');
    const simpleDateNextMonthBtn = document.getElementById('simple-date-next-month-btn');
    const simpleDateClearBtn = document.getElementById('simple-date-clear-btn');
    const simpleDateTodayBtn = document.getElementById('simple-date-today-btn');
    const simpleDateCancelBtn = document.getElementById('simple-date-cancel-btn');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const todayBtn = document.getElementById('today-btn');
    const saveDiaryBtn = document.getElementById('save-diary-btn');
    const deleteDiaryBtn = document.getElementById('delete-diary-btn');
    let quill; // To hold the Quill instance

    const { getFormattedDate, extractPlainTextFromEntry, getSortedDiaryDates,
            parseDateKey, formatDateKey, isDateWithinInputRange,
            setInputDateRange, formatDisplayDateTime } = window.diaryUtils;

    const DIARY_ENTRIES_KEY = 'diaryEntries';
    const DIARY_TRASH_KEY = 'diaryTrashEntries';
    const DRAFT_AUTO_SAVE_INTERVAL_MS = 10000;

    let currentDate = new Date();

    // 从 localStorage 迁移到文件存储（仅首次运行）
    const legacyEntries = JSON.parse(localStorage.getItem(DIARY_ENTRIES_KEY) || 'null');
    const legacyTrash = JSON.parse(localStorage.getItem(DIARY_TRASH_KEY) || 'null');
    if (legacyEntries || legacyTrash) {
        await window.store.migrate(legacyEntries || {}, legacyTrash || []);
        localStorage.removeItem(DIARY_ENTRIES_KEY);
        localStorage.removeItem(DIARY_TRASH_KEY);
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('diaryDraft:')) localStorage.removeItem(key);
        });
    }

    let diaryEntries = await window.store.loadEntries();
    let trashEntries = await window.store.loadTrash();
    let currentlyEditingDate = null;
    let exportPickerDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let selectedExportDates = new Set();
    let lastPreviewedExportDate = null;
    let draftAutoSaveTimer = null;
    let activeSimpleDateInput = null;
    let simplePickerDate = new Date();
    let simpleMonthPickerYear = new Date().getFullYear();
    let simpleDateWheelAccumulator = 0;
    const CALENDAR_SWIPE_THRESHOLD_PX = 45;
    const CALENDAR_SWIPE_MAX_DURATION_MS = 450;
    const CALENDAR_SWIPE_DIRECTION_RATIO = 1.2;
    const CALENDAR_SWIPE_EDGE_GUARD_PX = 20;
    let calendarSwipeState = null;

    async function reloadDiaryState() {
        diaryEntries = await window.store.loadEntries();
        trashEntries = await window.store.loadTrash();
    }

    async function refreshDiaryUi() {
        await reloadDiaryState();
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        if (window.innerWidth <= 600) {
            renderTimelineView();
        }
        if (!recycleBinModal.classList.contains('hidden')) {
            renderRecycleBinList();
        }
    }

    window.addEventListener('diary:data-changed', async () => {
        await refreshDiaryUi();
    });

    deleteDiaryBtn.disabled = true;

    const diaryModalObserver = new MutationObserver(() => {
        if (diaryModal.classList.contains('hidden') && quill) {
            cleanupDiaryEditor(true);
        }
    });
    diaryModalObserver.observe(diaryModal, { attributes: true, attributeFilter: ['class'] });

    const simpleDateModalObserver = new MutationObserver(() => {
        if (simpleDateModal.classList.contains('hidden')) {
            activeSimpleDateInput = null;
            simpleDateWheelAccumulator = 0;
            setSimpleMonthPickerVisible(false);
        }
    });
    simpleDateModalObserver.observe(simpleDateModal, { attributes: true, attributeFilter: ['class'] });

    // 事件委托：在 calendarGrid 上统一处理 hover 预览（避免内存泄漏）
    // 触摸设备上禁用 hover 预览，避免与点击编辑弹窗冲突
    let currentHoveredCell = null;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) {
        calendarGrid.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('.date-cell.has-entry');
            if (cell && cell !== currentHoveredCell) {
                currentHoveredCell = cell;
                const dateKey = cell.dataset.date;
                const entry = diaryEntries[dateKey];
                if (entry) {
                    showPreviewTooltip(cell, entry);
                }
            }
        });

        calendarGrid.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('.date-cell.has-entry');
            const relatedTarget = e.relatedTarget;
            if (cell && cell === currentHoveredCell && (!relatedTarget || !cell.contains(relatedTarget))) {
                currentHoveredCell = null;
                hidePreviewTooltip();
            }
        });

        calendarGrid.addEventListener('mouseleave', () => {
            currentHoveredCell = null;
            hidePreviewTooltip();
        });
    }

    function closeSimpleDatePicker() {
        simpleDateModal.classList.add('hidden');
        simpleDateMonthPicker.classList.add('hidden');
        simpleDateWeekdays.classList.remove('hidden');
        simpleDateCalendar.classList.remove('hidden');
        simpleDateActions.classList.remove('hidden');
        activeSimpleDateInput = null;
        simpleDateWheelAccumulator = 0;
    }

    function setSimpleMonthPickerVisible(visible) {
        simpleDateWheelAccumulator = 0;

        if (visible) {
            simpleDateMonthPicker.classList.remove('hidden');
            simpleDateControls?.classList.add('hidden');
            simpleDateWeekdays.classList.add('hidden');
            simpleDateCalendar.classList.add('hidden');
            simpleDateActions.classList.add('hidden');
            return;
        }

        simpleDateMonthPicker.classList.add('hidden');
        simpleDateControls?.classList.remove('hidden');
        simpleDateWeekdays.classList.remove('hidden');
        simpleDateCalendar.classList.remove('hidden');
        simpleDateActions.classList.remove('hidden');
    }

    function renderSimpleMonthPicker() {
        if (!simpleDateMonthGrid || !simpleDateYearLabel) {
            return;
        }

        simpleDateYearLabel.textContent = `${simpleMonthPickerYear}年`;
        simpleDateMonthGrid.innerHTML = '';

        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const monthBtn = document.createElement('button');
            monthBtn.type = 'button';
            monthBtn.className = 'simple-date-month-item';
            monthBtn.textContent = `${monthIndex + 1}月`;

            if (simplePickerDate.getFullYear() === simpleMonthPickerYear && simplePickerDate.getMonth() === monthIndex) {
                monthBtn.classList.add('selected');
            }

            monthBtn.addEventListener('click', () => {
                simplePickerDate = new Date(simpleMonthPickerYear, monthIndex, 1);
                setSimpleMonthPickerVisible(false);
                renderSimpleDatePickerCalendar();
            });

            simpleDateMonthGrid.appendChild(monthBtn);
        }
    }

    function openSimpleMonthPicker() {
        simpleMonthPickerYear = simplePickerDate.getFullYear();
        renderSimpleMonthPicker();
        setSimpleMonthPickerVisible(true);
    }

    function shiftSimpleMonthPickerYear(offset) {
        simpleMonthPickerYear += offset;
        renderSimpleMonthPicker();
    }

    function renderSimpleDatePickerCalendar() {
        if (!simpleDateCalendar || !simpleDateMonthLabel) {
            return;
        }

        const year = simplePickerDate.getFullYear();
        const month = simplePickerDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayKey = formatDateKey(new Date());
        const selectedDateKey = activeSimpleDateInput ? activeSimpleDateInput.value : '';

        simpleDateMonthLabel.textContent = `${year}年${month + 1}月`;
        simpleDateCalendar.innerHTML = '';

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'simple-date-cell empty';
            simpleDateCalendar.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = getFormattedDate(year, month, day);
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'simple-date-cell';
            cell.textContent = String(day);

            if (dateKey === selectedDateKey) {
                cell.classList.add('selected');
            }
            if (dateKey === todayKey) {
                cell.classList.add('today');
            }

            if (!isDateWithinInputRange(activeSimpleDateInput, dateKey)) {
                cell.classList.add('disabled');
                cell.disabled = true;
            } else {
                cell.addEventListener('click', () => {
                    if (activeSimpleDateInput) {
                        activeSimpleDateInput.value = dateKey;
                    }
                    closeSimpleDatePicker();
                });
            }

            simpleDateCalendar.appendChild(cell);
        }

        const renderedCells = firstDayOfMonth + daysInMonth;
        const tailCells = (7 - (renderedCells % 7)) % 7;
        for (let i = 0; i < tailCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'simple-date-cell empty';
            simpleDateCalendar.appendChild(emptyCell);
        }
    }

    function shiftSimpleDateMonth(offset) {
        simplePickerDate = new Date(simplePickerDate.getFullYear(), simplePickerDate.getMonth() + offset, 1);
        renderSimpleDatePickerCalendar();
    }

    function openSimpleDatePicker(inputElement) {
        activeSimpleDateInput = inputElement;
        setSimpleMonthPickerVisible(false);

        const parsed = parseDateKey(inputElement.value);
        if (parsed) {
            simplePickerDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        } else {
            simplePickerDate = new Date();
            simplePickerDate = new Date(simplePickerDate.getFullYear(), simplePickerDate.getMonth(), 1);
        }

        renderSimpleDatePickerCalendar();
        simpleDateModal.classList.remove('hidden');
    }

    function bindCustomDateInputs() {
        document.querySelectorAll('.custom-date-input').forEach(input => {
            input.addEventListener('click', () => openSimpleDatePicker(input));
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSimpleDatePicker(input);
                }
            });
        });
    }

    function persistDiaryEntries() {
        window.store.saveEntries(diaryEntries);
    }

    function getAllTrashEntries() {
        return trashEntries;
    }

    function saveAllTrashEntries(entries) {
        trashEntries = entries;
        window.store.saveTrash(entries);
    }

    function addEntryToRecycleBin(dateKey, entryData) {
        const trashEntries = getAllTrashEntries();
        trashEntries.unshift({
            trashId: `${dateKey}-${Date.now()}`,
            date: dateKey,
            deletedAt: new Date().toISOString(),
            entry: entryData
        });
        saveAllTrashEntries(trashEntries);
    }

    function removeEntryDraft(dateKey) {
        if (!dateKey) {
            return;
        }
        window.store.removeDraft(dateKey);
    }

    function saveCurrentDraft() {
        if (!quill || !currentlyEditingDate || diaryModal.classList.contains('hidden')) {
            return;
        }

        // Compare current editor content with saved entry to avoid saving unchanged drafts
        const currentContent = quill.getContents();
        const savedEntry = diaryEntries[currentlyEditingDate];
        const currentImportant = document.getElementById('mark-important-checkbox').checked;

        // If content matches saved entry, don't save a draft
        if (savedEntry) {
            const savedContentStr = JSON.stringify(savedEntry.content);
            const currentContentStr = JSON.stringify(currentContent);
            const sameImportant = !!savedEntry.isImportant === currentImportant;
            if (savedContentStr === currentContentStr && sameImportant) {
                return;
            }
        } else {
            // No saved entry - only save draft if editor has actual content
            const text = quill.getText().trim();
            if (!text) {
                return;
            }
        }

        const draftPayload = {
            date: currentlyEditingDate,
            savedAt: new Date().toISOString(),
            content: currentContent,
            isImportant: currentImportant
        };

        window.store.saveDraft(currentlyEditingDate, draftPayload);
    }

    function startDraftAutoSave() {
        stopDraftAutoSave();
        draftAutoSaveTimer = setInterval(() => {
            saveCurrentDraft();
        }, DRAFT_AUTO_SAVE_INTERVAL_MS);
    }

    function stopDraftAutoSave() {
        if (draftAutoSaveTimer) {
            clearInterval(draftAutoSaveTimer);
            draftAutoSaveTimer = null;
        }
    }

    function applyEntryToEditor(entry) {
        const isImportantCheckbox = document.getElementById('mark-important-checkbox');
        if (!quill) {
            initializeQuill();
        }

        if (entry && entry.content && typeof entry.content === 'object') {
            quill.setContents(entry.content);
        } else if (entry && entry.content) {
            quill.setText(entry.content);
        } else {
            quill.setText('');
        }

        isImportantCheckbox.checked = !!(entry && entry.isImportant);
    }

    async function tryRestoreDraft(dateKey) {
        const draftData = await window.store.loadDraft(dateKey);
        if (!draftData || !draftData.content) {
            return;
        }

        if (window.customDialog) {
            const shouldRestore = await window.customDialog.confirm(
                `检测到 ${dateKey} 的未保存草稿（${new Date(draftData.savedAt).toLocaleString('zh-CN')}）。\n是否恢复草稿？`,
                '草稿恢复'
            );
            if (!shouldRestore) {
                return;
            }
        }

        quill.setContents(draftData.content);
        document.getElementById('mark-important-checkbox').checked = !!draftData.isImportant;
    }

    async function openDiaryEditor(dateKey) {
        currentlyEditingDate = dateKey;
        const hasSavedEntry = !!diaryEntries[dateKey];
        deleteDiaryBtn.disabled = !hasSavedEntry;
        deleteDiaryBtn.title = hasSavedEntry ? '删除到回收站' : '当前日期还没有已保存日记';
        applyEntryToEditor(diaryEntries[dateKey]);
        diaryModal.classList.remove('hidden');
        await tryRestoreDraft(dateKey);
        startDraftAutoSave();
    }

    function cleanupDiaryEditor(saveDraftBeforeClose = true) {
        if (saveDraftBeforeClose) {
            saveCurrentDraft();
        }

        stopDraftAutoSave();

        if (quill) {
            const editorContainer = document.getElementById('editor-container');
            const editor = document.getElementById('editor');
            const toolbar = editorContainer.querySelector('.ql-toolbar');
            if (toolbar) {
                toolbar.remove();
            }
            editor.innerHTML = '';
            quill = null;
        }

        currentlyEditingDate = null;
        deleteDiaryBtn.disabled = true;
        diaryModal.classList.add('hidden');
    }

    async function moveCurrentDiaryToRecycleBin() {
        if (!currentlyEditingDate) {
            return false;
        }

        const entry = diaryEntries[currentlyEditingDate];
        if (!entry) {
            return false;
        }

        if (window.customDialog) {
            const confirmed = await window.customDialog.danger('删除后可在回收站恢复，是否继续？', '删除日记');
            if (!confirmed) {
                return false;
            }
        }

        addEntryToRecycleBin(currentlyEditingDate, entry);
        delete diaryEntries[currentlyEditingDate];
        persistDiaryEntries();
        removeEntryDraft(currentlyEditingDate);

        cleanupDiaryEditor(false);
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        if (window.innerWidth <= 600) {
            renderTimelineView();
        }

        if (window.customDialog) {
            await window.customDialog.success('已移入回收站', '删除成功');
        }

        return true;
    }


    function displayOnThisDay() {
        const container = document.getElementById('on-this-day-content');
        if (!container) return;

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        const currentYear = today.getFullYear();

        const allEntries = diaryEntries;
        const matchingEntries = [];

        for (const dateKey in allEntries) {
            const [year, month, day] = dateKey.split('-').map(Number);
            if (year < currentYear && month === currentMonth && day === currentDay) {
                matchingEntries.push({
                    year,
                    content: allEntries[dateKey]
                });
            }
        }

        container.innerHTML = ''; // Clear previous content

        if (matchingEntries.length > 0) {
            const title = document.createElement('h4');
            title.textContent = '那年今日';
            container.appendChild(title);

            matchingEntries.sort((a, b) => a.year - b.year); // Sort by year

            matchingEntries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('on-this-day-entry');

                const yearSpan = document.createElement('span');
                yearSpan.classList.add('year');
                yearSpan.textContent = `${entry.year}年: `;

                const contentSpan = document.createElement('span');
                contentSpan.classList.add('content');
                const plainText = extractPlainTextFromEntry(entry.content).trim();
                const previewText = plainText || '[图片或空内容]';
                contentSpan.textContent = previewText.substring(0, 100) + (previewText.length > 100 ? '...' : '');

                entryDiv.appendChild(yearSpan);
                entryDiv.appendChild(contentSpan);
                container.appendChild(entryDiv);
            });
        } else {
            const placeholder = document.createElement('p');
            placeholder.classList.add('on-this-day-placeholder');
            placeholder.textContent = '那年今日，尚无回忆。';
            container.appendChild(placeholder);
        }
    }

    function renderCalendar(year, month) {
        calendarGrid.innerHTML = '';
        currentMonthYear.textContent = `${year}年 ${month + 1}月`;

        const today = new Date();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Calculate the starting day of the week (0 for Sunday, 6 for Saturday)
        let startDayOfWeek = firstDayOfMonth.getDay();
        if (startDayOfWeek === 0) startDayOfWeek = 7; // Adjust Sunday to be 7

        // Get number of days from previous month to show
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const prevMonthDaysToShow = startDayOfWeek - 1;

        // --- Render previous month's days ---
        for (let i = 0; i < prevMonthDaysToShow; i++) {
            const day = daysInPrevMonth - prevMonthDaysToShow + i + 1;
            const dateCell = createDateCell(day, year, month - 1, true);
            calendarGrid.appendChild(dateCell);
        }

        // --- Render current month's days ---
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = createDateCell(day, year, month, false);
            calendarGrid.appendChild(dateCell);
        }

        // --- Render next month's days ---
        // Always fill 6 rows (42 cells) to maintain consistent grid height
        const totalCells = prevMonthDaysToShow + daysInMonth;
        const nextMonthDaysToShow = 42 - totalCells;

        for (let i = 1; i <= nextMonthDaysToShow; i++) {
            const dateCell = createDateCell(i, year, month + 1, true);
            calendarGrid.appendChild(dateCell);
        }

        displayOnThisDay();
        syncSearchDateRangeBounds();
    }

    function isMobileLayout() {
        return window.matchMedia('(max-width: 600px)').matches;
    }

    function changeCalendarMonth(offset) {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }

    function shouldIgnoreCalendarSwipeTarget(target) {
        if (!(target instanceof Element)) {
            return true;
        }

        return Boolean(
            target.closest('.modal-overlay, button, a, input, textarea, select, [contenteditable="true"], .custom-select, .dropdown')
        );
    }

    function bindCalendarSwipeNavigation() {
        if (!calendarContainer) {
            return;
        }

        const findTouchByIdentifier = (touchList, identifier) => {
            for (const touch of touchList) {
                if (touch.identifier === identifier) {
                    return touch;
                }
            }
            return null;
        };

        const getTrackedTouch = (event) => {
            if (!calendarSwipeState) {
                return null;
            }
            return (
                findTouchByIdentifier(event.changedTouches, calendarSwipeState.identifier) ||
                findTouchByIdentifier(event.touches, calendarSwipeState.identifier)
            );
        };

        calendarContainer.addEventListener('touchstart', (event) => {
            if (!isMobileLayout() || event.touches.length !== 1) {
                calendarSwipeState = null;
                return;
            }

            if (document.querySelector('.modal-overlay:not(.hidden)')) {
                calendarSwipeState = null;
                return;
            }

            if (shouldIgnoreCalendarSwipeTarget(event.target)) {
                calendarSwipeState = null;
                return;
            }

            const touch = event.touches[0];
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            if (
                touch.clientX <= CALENDAR_SWIPE_EDGE_GUARD_PX ||
                touch.clientX >= viewportWidth - CALENDAR_SWIPE_EDGE_GUARD_PX
            ) {
                calendarSwipeState = null;
                return;
            }

            calendarSwipeState = {
                identifier: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                horizontalLocked: false,
                cancelled: false
            };
        }, { passive: true });

        calendarContainer.addEventListener('touchmove', (event) => {
            if (!calendarSwipeState || calendarSwipeState.cancelled) {
                return;
            }

            const touch = getTrackedTouch(event);
            if (!touch) {
                return;
            }

            const dx = touch.clientX - calendarSwipeState.startX;
            const dy = touch.clientY - calendarSwipeState.startY;

            if (!calendarSwipeState.horizontalLocked) {
                if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
                    calendarSwipeState.cancelled = true;
                    return;
                }

                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * CALENDAR_SWIPE_DIRECTION_RATIO) {
                    calendarSwipeState.horizontalLocked = true;
                }
            }

            if (calendarSwipeState.horizontalLocked && event.cancelable) {
                event.preventDefault();
            }
        }, { passive: false });

        calendarContainer.addEventListener('touchend', (event) => {
            if (!calendarSwipeState) {
                return;
            }

            const touch = getTrackedTouch(event);
            if (!touch) {
                calendarSwipeState = null;
                return;
            }

            const dx = touch.clientX - calendarSwipeState.startX;
            const dy = touch.clientY - calendarSwipeState.startY;
            const duration = Date.now() - calendarSwipeState.startTime;

            const shouldNavigateMonth = !calendarSwipeState.cancelled &&
                duration <= CALENDAR_SWIPE_MAX_DURATION_MS &&
                Math.abs(dx) >= CALENDAR_SWIPE_THRESHOLD_PX &&
                Math.abs(dx) > Math.abs(dy) * CALENDAR_SWIPE_DIRECTION_RATIO;

            calendarSwipeState = null;

            if (!shouldNavigateMonth) {
                return;
            }

            changeCalendarMonth(dx < 0 ? 1 : -1);
        }, { passive: true });

        calendarContainer.addEventListener('touchcancel', () => {
            calendarSwipeState = null;
        }, { passive: true });
    }

    function createDateCell(day, year, month, isOtherMonth) {
        const date = new Date(year, month, day);
        const dateCell = document.createElement('div');
        dateCell.classList.add('date-cell');

        // 存储日期用于事件委托
        const formattedDate = getFormattedDate(year, month, day);
        dateCell.dataset.date = formattedDate;

        if (isOtherMonth) {
            dateCell.classList.add('other-month');
        }

        // Add weekend class
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dateCell.classList.add('weekend');
        }

        // Add today class
        const today = new Date();
        if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
            dateCell.classList.add('today');
        }

        // --- Cell Inner HTML ---
        const dateNumber = document.createElement('div');
        dateNumber.classList.add('date-number');
        dateNumber.textContent = day;
        dateCell.appendChild(dateNumber);

        const entriesSummary = document.createElement('div');
        entriesSummary.classList.add('entries-summary');
        dateCell.appendChild(entriesSummary);

        // --- Handle Entry Data ---
        const entry = diaryEntries[formattedDate];
        if (entry) {
            dateCell.classList.add('has-entry');

            // Add mood class based on entry mood
            if (entry.mood) {
                dateCell.classList.add(`mood-${entry.mood.toLowerCase()}`);
            }

            // Add marker
            const marker = document.createElement('div');
            marker.classList.add('entry-marker');
            if (entry.isImportant) {
                marker.classList.add('important');
            }
            dateCell.appendChild(marker);

            // Add summary text
            const plainText = extractPlainTextFromEntry(entry).trim();
            const summaryText = plainText.split('\n').find(line => line.trim()) || '[图片或空内容]';
            const summaryDiv = document.createElement('div');
            summaryDiv.classList.add('entry-item');
            summaryDiv.textContent = summaryText;
            entriesSummary.appendChild(summaryDiv);
            // hover 预览已通过事件委托在 calendarGrid 上统一处理
        }

        // --- Click Events ---
        dateCell.addEventListener('click', async () => {
            // Handle selection style
            document.querySelectorAll('.date-cell.selected').forEach(c => c.classList.remove('selected'));
            dateCell.classList.add('selected');

            await openDiaryEditor(formattedDate);
        });

        return dateCell;
    }

    // Event listener for the previous month button
    prevMonthBtn.addEventListener('click', () => {
        changeCalendarMonth(-1);
    });

    // Event listener for the next month button
    nextMonthBtn.addEventListener('click', () => {
        changeCalendarMonth(1);
    });

    // Event listener for the "Today" button
    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    bindCalendarSwipeNavigation();

    // Event listener to close the modal
    // Generic close modal functionality
    document.querySelectorAll('.modal-overlay .close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal.id === 'diary-modal') {
                cleanupDiaryEditor(true);
                return;
            }

            modal.classList.add('hidden');
        });
    });

    // Close modal when clicking on the overlay
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal.id === 'diary-modal') {
                    cleanupDiaryEditor(true);
                    return;
                }

                modal.classList.add('hidden');
            }
        });
    });

    // --- Android / PWA Back Button Router ---
    // Dual-channel design:
    //   - Capacitor Android: uses @capacitor/app plugin's 'backButton' event
    //     (the only reliable hardware-back signal when the App plugin is installed;
    //     Capacitor 8+ does NOT call webView.goBack() without this plugin).
    //   - PWA / browser: uses History API + popstate to intercept the back button.
    // In both environments, a MutationObserver tracks every .modal-overlay element
    // so existing open/close code does not need any change.
    (function setupBackButtonRouter() {
        const modalStack = []; // Stack of currently open modal elements
        const capApp =
            (typeof window !== 'undefined' &&
                window.Capacitor &&
                window.Capacitor.Plugins &&
                window.Capacitor.Plugins.App) || null;
        const isNative = !!capApp;

        function pushHistoryState(modalId) {
            // Only manipulate history in browser/PWA mode; in native Capacitor mode,
            // hardware back is handled directly by App.backButton — no history dance.
            if (isNative) return;
            try {
                history.pushState({ __diaryModal: true, modalId: modalId || '' }, '');
            } catch (err) {
                // pushState may fail in rare sandboxed contexts; fail silently
            }
        }

        function closeTopModal() {
            if (modalStack.length === 0) return false;
            const top = modalStack.pop();
            top.__closingFromBack = true;
            try {
                if (top.id === 'diary-modal' && typeof cleanupDiaryEditor === 'function') {
                    cleanupDiaryEditor(true);
                } else {
                    top.classList.add('hidden');
                }
            } finally {
                top.__closingFromBack = false;
            }
            return true;
        }

        function observeModal(modal) {
            if (modal.__backObserved) return;
            modal.__backObserved = true;
            let wasHidden = modal.classList.contains('hidden');
            new MutationObserver(() => {
                const nowHidden = modal.classList.contains('hidden');
                if (nowHidden === wasHidden) return;
                wasHidden = nowHidden;
                if (!nowHidden) {
                    // Opened
                    if (!modalStack.includes(modal)) {
                        modalStack.push(modal);
                        pushHistoryState(modal.id);
                    }
                } else {
                    // Closed
                    const idx = modalStack.lastIndexOf(modal);
                    if (idx === -1) return; // already synced by handler
                    modalStack.splice(idx, 1);
                    // In PWA mode, consume the history entry we pushed earlier
                    // when close was user-initiated (X button / overlay click / ESC).
                    if (!isNative && !modal.__closingFromBack) {
                        try { history.back(); } catch (err) { /* ignore */ }
                    }
                }
            }).observe(modal, { attributes: true, attributeFilter: ['class'] });
        }

        // Observe every existing modal-overlay
        document.querySelectorAll('.modal-overlay').forEach(observeModal);

        // Observe dynamically added modals too
        new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.classList && node.classList.contains('modal-overlay')) {
                        observeModal(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.modal-overlay').forEach(observeModal);
                    }
                });
            });
        }).observe(document.body, { childList: true, subtree: true });

        if (isNative) {
            // Capacitor native: hardware back button goes through @capacitor/app
            capApp.addListener('backButton', () => {
                if (!closeTopModal()) {
                    // No modal open — exit the app (mimics default Android behavior)
                    try { capApp.exitApp(); } catch (err) { /* ignore */ }
                }
            });
        } else {
            // PWA / browser: hardware back / browser back triggers popstate
            window.addEventListener('popstate', () => {
                closeTopModal();
            });
        }
    })();

    // --- Timeline View Implementation ---
    function renderTimelineView() {
        const timelineContainer = document.getElementById('timeline-view');
        if (!timelineContainer) return;

        timelineContainer.innerHTML = '';

        // Filter entries that have content
        const entries = Object.entries(diaryEntries)
            .filter(([_, entry]) => entry.content)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]));

        if (entries.length === 0) {
            timelineContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">暂无日记，点击日历去写一篇吧~</div>';
            return;
        }

        entries.forEach(([date, entry]) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';

            // Extract text preview
            let previewText = '';
            if (entry.content && entry.content.ops) {
                previewText = entry.content.ops
                    .map(op => typeof op.insert === 'string' ? op.insert : '')
                    .join('')
                    .substring(0, 100);
            } else if (typeof entry.content === 'string') {
                previewText = entry.content.substring(0, 100);
            }

            if (!previewText.trim()) previewText = '[图片/空内容]';

            item.innerHTML = `
                <div class="timeline-date">${date}</div>
                <div class="timeline-content">${previewText}</div>
            `;

            item.addEventListener('click', async () => {
                await openDiaryEditor(date);
            });

            timelineContainer.appendChild(item);
        });
    }

    // Listen for resize
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 600) {
            renderTimelineView();
        }
    });

    saveDiaryBtn.addEventListener('click', async () => {
        if (!quill || !currentlyEditingDate) {
            return;
        }

        const content = quill.getContents();
        const plainText = quill.getText();
        const isImportant = document.getElementById('mark-important-checkbox').checked;
        const hasExistingEntry = !!diaryEntries[currentlyEditingDate];
        const hasContent = quill.getLength() > 1;

        if (hasContent) {
            // Extract title from the first line of text
            const firstLine = plainText.split('\n')[0].trim();
            const title = firstLine.substring(0, 50); // Limit title length

            diaryEntries[currentlyEditingDate] = {
                content: content,
                mood: 'happy', // Mood can be a future enhancement
                isImportant: isImportant,
                title: title
            };
        } else {
            if (hasExistingEntry) {
                addEntryToRecycleBin(currentlyEditingDate, diaryEntries[currentlyEditingDate]);
            }
            delete diaryEntries[currentlyEditingDate];
        }
        persistDiaryEntries();
        removeEntryDraft(currentlyEditingDate);
        cleanupDiaryEditor(false);
        
        // Emotional Feedback Animation
        const heart = document.createElement('div');
        heart.classList.add('feedback-heart');
        heart.textContent = '✨';
        document.body.appendChild(heart);
        setTimeout(() => {
            heart.remove();
        }, 600); // Match animation duration

        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        if (window.innerWidth <= 600) {
            renderTimelineView();
        }

        if (window.customDialog && hasExistingEntry && !hasContent) {
            await window.customDialog.success('内容为空，已移入回收站。', '已删除');
        }
    });

    deleteDiaryBtn.addEventListener('click', async () => {
        await moveCurrentDiaryToRecycleBin();
    });

    // Action button listeners
    searchActionBtn.addEventListener('click', () => {
        searchModal.classList.remove('hidden');
    });

    onThisDayActionBtn.addEventListener('click', () => {
        displayOnThisDay(); // Ensure content is fresh
        onThisDayModal.classList.remove('hidden');
    });

    exportBtn.addEventListener('click', (event) => {
        exportMenu.classList.toggle('hidden');
        event.stopPropagation(); // Prevent the window click from hiding it immediately
    });

    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', importFromZip);

    exportZipBtn.addEventListener('click', (event) => {
        event.preventDefault();
        exportToZip();
    });

    exportTxtBtn.addEventListener('click', (event) => {
        event.preventDefault();
        openExportDateModal();
    });

    exportDatePrevMonthBtn.addEventListener('click', () => {
        exportPickerDate = new Date(exportPickerDate.getFullYear(), exportPickerDate.getMonth() - 1, 1);
        renderExportDateCalendar();
    });

    exportDateNextMonthBtn.addEventListener('click', () => {
        exportPickerDate = new Date(exportPickerDate.getFullYear(), exportPickerDate.getMonth() + 1, 1);
        renderExportDateCalendar();
    });

    exportDateSelectAllBtn.addEventListener('click', selectAllCurrentMonthForExport);
    exportDateSelectAllGlobalBtn.addEventListener('click', selectAllDatesForExport);
    exportDateInvertBtn.addEventListener('click', invertExportSelection);
    exportDateClearBtn.addEventListener('click', clearExportSelection);
    exportDateSelectRangeBtn.addEventListener('click', selectExportDateRange);
    closeExportDateBtn.addEventListener('click', closeExportDateModal);
    exportDateCancelBtn.addEventListener('click', closeExportDateModal);
    exportDateConfirmBtn.addEventListener('click', confirmExportSelectedDates);

    recycleBinBtn.addEventListener('click', openRecycleBinModal);
    closeRecycleBinBtn.addEventListener('click', () => {
        recycleBinModal.classList.add('hidden');
    });
    clearRecycleBinBtn.addEventListener('click', clearRecycleBin);

    simpleDateMonthLabelBtn.addEventListener('click', openSimpleMonthPicker);
    simpleDatePrevYearBtn.addEventListener('click', () => shiftSimpleMonthPickerYear(-1));
    simpleDateNextYearBtn.addEventListener('click', () => shiftSimpleMonthPickerYear(1));
    simpleDateMonthCancelBtn.addEventListener('click', () => {
        setSimpleMonthPickerVisible(false);
    });

    simpleDatePrevMonthBtn.addEventListener('click', () => shiftSimpleDateMonth(-1));
    simpleDateNextMonthBtn.addEventListener('click', () => shiftSimpleDateMonth(1));
    closeSimpleDateBtn.addEventListener('click', closeSimpleDatePicker);
    simpleDateCancelBtn.addEventListener('click', closeSimpleDatePicker);
    simpleDateClearBtn.addEventListener('click', () => {
        if (activeSimpleDateInput) {
            activeSimpleDateInput.value = '';
        }
        closeSimpleDatePicker();
    });
    simpleDateTodayBtn.addEventListener('click', () => {
        const today = new Date();
        const todayKey = formatDateKey(today);
        if (activeSimpleDateInput && isDateWithinInputRange(activeSimpleDateInput, todayKey)) {
            activeSimpleDateInput.value = todayKey;
            closeSimpleDatePicker();
            return;
        }
        simplePickerDate = new Date(today.getFullYear(), today.getMonth(), 1);
        renderSimpleDatePickerCalendar();
    });

    simpleDateModal.addEventListener('wheel', (event) => {
        if (simpleDateModal.classList.contains('hidden')) {
            return;
        }

        if (!event.target.closest('.simple-date-content')) {
            return;
        }

        event.preventDefault();
        const normalizedDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        simpleDateWheelAccumulator += normalizedDelta;
        const threshold = 30;
        if (Math.abs(simpleDateWheelAccumulator) >= threshold) {
            const direction = simpleDateWheelAccumulator > 0 ? 1 : -1;
            simpleDateWheelAccumulator = 0;

            if (!simpleDateMonthPicker.classList.contains('hidden')) {
                shiftSimpleMonthPickerYear(direction);
                return;
            }

            shiftSimpleDateMonth(direction);
        }
    }, { passive: false });

    bindCustomDateInputs();

    // Hide dropdown if clicked outside
    window.addEventListener('click', (event) => {
        if (!exportBtn.contains(event.target)) {
            exportMenu.classList.add('hidden');
        }
    });

    // Initial render
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    displayOnThisDay(); // Also call it on initial load
    if (window.innerWidth <= 600) {
        renderTimelineView();
    }

    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const searchImportantOnly = document.getElementById('search-important-only');
    const searchStartDateInput = document.getElementById('search-start-date');
    const searchEndDateInput = document.getElementById('search-end-date');
    const searchResetBtn = document.getElementById('search-reset-btn');

    function syncSearchDateRangeBounds() {
        const startInput = document.getElementById('search-start-date');
        const endInput = document.getElementById('search-end-date');
        if (!startInput || !endInput) {
            return;
        }

        const dates = getSortedDiaryDates(diaryEntries);
        if (dates.length === 0) {
            setInputDateRange(startInput, '', '');
            setInputDateRange(endInput, '', '');
            startInput.value = '';
            endInput.value = '';
            return;
        }

        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        setInputDateRange(startInput, minDate, maxDate);
        setInputDateRange(endInput, minDate, maxDate);

        if (startInput.value && !isDateWithinInputRange(startInput, startInput.value)) {
            startInput.value = '';
        }
        if (endInput.value && !isDateWithinInputRange(endInput, endInput.value)) {
            endInput.value = '';
        }
    }

    function performSearch() {
        const keyword = searchInput.value.trim().toLowerCase();
        const importantOnly = searchImportantOnly.checked;
        const startDate = searchStartDateInput.value;
        const endDate = searchEndDateInput.value;

        searchResultsContainer.innerHTML = '';

        if (startDate && endDate && startDate > endDate) {
            if (window.customDialog) {
                window.customDialog.alert('开始日期不能晚于结束日期', '搜索条件错误');
            }
            return;
        }

        const allEntries = diaryEntries;
        const matchingEntries = [];

        for (const date in allEntries) {
            const entry = allEntries[date];
            const entryTitle = (entry.title || '').toLowerCase();
            const plainText = extractPlainTextFromEntry(entry);

            if (importantOnly && !entry.isImportant) {
                continue;
            }

            if (startDate && date < startDate) {
                continue;
            }

            if (endDate && date > endDate) {
                continue;
            }

            const plainTextLower = plainText.toLowerCase();
            if (keyword && !plainTextLower.includes(keyword) && !entryTitle.includes(keyword)) {
                continue;
            }

            matchingEntries.push({ date, content: plainText, title: entry.title || '无标题', isImportant: !!entry.isImportant });
        }

        matchingEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (matchingEntries.length === 0) {
            searchResultsContainer.innerHTML = '<p>没有找到匹配的日记。</p>';
            return;
        }

        matchingEntries.forEach(entry => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('search-result-item');
            if (entry.isImportant) {
                resultItem.classList.add('important');
            }

            const dateEl = document.createElement('div');
            dateEl.classList.add('date');
            dateEl.textContent = `${entry.date}${entry.isImportant ? ' · ⭐重要' : ''}`;

            const titleEl = document.createElement('div');
            titleEl.classList.add('title');
            titleEl.textContent = `标题：${entry.title}`;

            const excerptEl = document.createElement('div');
            excerptEl.classList.add('excerpt');
            excerptEl.textContent = entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '');

            resultItem.addEventListener('click', async () => {
                const [year, month] = entry.date.split('-').map(Number);
                currentDate = new Date(year, month - 1, 1);
                renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
                searchModal.classList.add('hidden');
                await openDiaryEditor(entry.date);
            });

            resultItem.appendChild(dateEl);
            resultItem.appendChild(titleEl);
            resultItem.appendChild(excerptEl);
            searchResultsContainer.appendChild(resultItem);
        });
    }

    function resetSearchFilters() {
        searchInput.value = '';
        searchImportantOnly.checked = false;
        searchStartDateInput.value = '';
        searchEndDateInput.value = '';
        searchResultsContainer.innerHTML = '';
    }

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    searchResetBtn.addEventListener('click', resetSearchFilters);

    function initializeQuill() {
        const toolbarOptions = [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ];

        quill = new Quill('#editor', {
            modules: { toolbar: toolbarOptions },
            theme: 'snow',
            placeholder: '记录今天的故事...'
        });

        // --- Custom Link Tooltip Implementation (with focus fix) ---
        const customTooltip = document.getElementById('custom-link-tooltip');
        const customLinkInput = document.getElementById('custom-link-input');
        const customLinkSaveBtn = document.getElementById('custom-link-save-btn');
        let savedRange = null;

        quill.on('selection-change', (range, oldRange, source) => {
            if (range) {
                // A user has made a selection. Save it.
                savedRange = range;
            }
        });
        
        const toolbar = quill.getModule('toolbar');
        toolbar.addHandler('link', () => {
            if (customTooltip.classList.contains('hidden')) {
                // Use the saved range instead of the current selection
                if (savedRange) {
                    quill.focus(); // Restore focus to the editor
                    quill.setSelection(savedRange); // Restore the selection
                    const bounds = quill.getBounds(savedRange.index);
                    repositionCustomTooltip(customTooltip, bounds);
                    customTooltip.classList.remove('hidden');
                    customLinkInput.value = quill.getFormat(savedRange).link || 'https://';
                    customLinkInput.focus();
                } else {
                     // Fallback if there's no saved range (e.g., editor never focused)
                    quill.focus();
                }
            } else {
                customTooltip.classList.add('hidden');
            }
        });

        customLinkSaveBtn.addEventListener('click', () => {
            const url = customLinkInput.value;
            if (url && savedRange) {
                quill.focus(); // Ensure editor has focus before formatting
                quill.setSelection(savedRange);
                quill.format('link', url);
                customLinkInput.value = '';
                customTooltip.classList.add('hidden');
            }
        });

        // Hide custom tooltip when clicking outside
        document.addEventListener('click', (e) => {
            const toolbarContainer = quill.getModule('toolbar').container;
            if (!customTooltip.classList.contains('hidden') && !customTooltip.contains(e.target) && !toolbarContainer.contains(e.target)) {
                customTooltip.classList.add('hidden');
            }
        });

        // Handle Ctrl+Click to open links
        quill.root.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey) {
                const link = e.target.closest('a');
                if (link) {
                    e.preventDefault();
                    window.open(link.href, '_blank');
                }
            }
        });

        quill.getModule('toolbar').addHandler('image', selectLocalImage);
    }

    function repositionCustomTooltip(tooltip, referenceBounds) {
        if (!referenceBounds) return;

        const editorContainer = document.querySelector('.ql-container');
        const editorRect = editorContainer.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = editorRect.top + referenceBounds.bottom + window.scrollY + 5;
        let left = editorRect.left + referenceBounds.left + window.scrollX;

        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (left < 10) {
            left = 10;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = editorRect.top + referenceBounds.top + window.scrollY - tooltipRect.height - 5;
        }

        tooltip.style.position = 'absolute';
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    function selectLocalImage() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = () => {
            const file = input.files[0];
            if (file && /^image\//.test(file.type)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', e.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                console.warn('You could only upload images.');
            }
        };
    }

    // --- Preview Tooltip Functions ---
    function showPreviewTooltip(cell, entry) {
        hidePreviewTooltip(); // Remove any existing tooltip first

        const tooltip = document.createElement('div');
        tooltip.id = 'preview-tooltip';
        tooltip.classList.add('preview-tooltip');

        const content = entry.content;
        if (content && content.ops) {
            let textContent = '';
            let imageFound = false;
            
            content.ops.forEach(op => {
                if (typeof op.insert === 'string') {
                    textContent += op.insert;
                } else if (op.insert && op.insert.image && !imageFound) {
                    const img = document.createElement('img');
                    img.src = op.insert.image;
                    tooltip.appendChild(img);
                    imageFound = true; // Show only the first image
                }
            });

            if (textContent) {
                const textElement = document.createElement('p');
                // Show a snippet of text
                textElement.textContent = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
                tooltip.appendChild(textElement);
            }
        }

        document.body.appendChild(tooltip);

        const cellRect = cell.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = cellRect.top + window.scrollY - tooltipRect.height - 10;
        let left = cellRect.left + window.scrollX + (cellRect.width / 2) - (tooltipRect.width / 2);

        // Adjust if out of bounds
        if (top < window.scrollY) {
            top = cellRect.bottom + window.scrollY + 10;
        }
        if (left < 0) {
            left = 10;
        }
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function hidePreviewTooltip() {
        const existingTooltip = document.getElementById('preview-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }

    function openExportDateModal() {
        const allDates = getSortedDiaryDates(diaryEntries);

        if (allDates.length === 0) {
            if (window.customDialog) {
                window.customDialog.alert('没有可导出的日记', '导出失败');
            }
            return;
        }

        selectedExportDates = new Set(allDates);

        const latestDate = allDates[allDates.length - 1];
        if (latestDate) {
            const [year, month] = latestDate.split('-').map(Number);
            exportPickerDate = new Date(year, month - 1, 1);
            lastPreviewedExportDate = latestDate;
        }

        exportDateRangeStartInput.value = '';
        exportDateRangeEndInput.value = '';
        setInputDateRange(exportDateRangeStartInput, allDates[0], allDates[allDates.length - 1]);
        setInputDateRange(exportDateRangeEndInput, allDates[0], allDates[allDates.length - 1]);

        renderExportDateCalendar();
        updateExportPreview(lastPreviewedExportDate);
        exportMenu.classList.add('hidden');
        exportDateModal.classList.remove('hidden');
    }

    function closeExportDateModal() {
        exportDateModal.classList.add('hidden');
    }

    function renderExportDateCalendar() {
        const year = exportPickerDate.getFullYear();
        const month = exportPickerDate.getMonth();
        const monthText = `${year}年${month + 1}月`;
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        exportDateMonthLabel.textContent = monthText;
        exportDateCalendar.innerHTML = '';

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'export-date-cell empty';
            exportDateCalendar.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = getFormattedDate(year, month, day);
            const hasEntry = !!diaryEntries[dateKey];

            const dayCell = document.createElement('button');
            dayCell.type = 'button';
            dayCell.classList.add('export-date-cell');
            dayCell.textContent = String(day);

            if (hasEntry) {
                dayCell.classList.add('has-entry');
                if (selectedExportDates.has(dateKey)) {
                    dayCell.classList.add('selected');
                }

                dayCell.addEventListener('mouseenter', () => {
                    updateExportPreview(dateKey);
                });

                dayCell.addEventListener('click', () => {
                    if (selectedExportDates.has(dateKey)) {
                        selectedExportDates.delete(dateKey);
                    } else {
                        selectedExportDates.add(dateKey);
                    }
                    lastPreviewedExportDate = dateKey;
                    renderExportDateCalendar();
                    updateExportPreview(dateKey);
                });
            } else {
                dayCell.disabled = true;
            }

            exportDateCalendar.appendChild(dayCell);
        }

        const renderedCells = firstDayOfMonth + daysInMonth;
        const tailCells = (7 - (renderedCells % 7)) % 7;
        for (let i = 0; i < tailCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'export-date-cell empty';
            exportDateCalendar.appendChild(emptyCell);
        }

        updateExportSummary();
    }

    function updateExportSummary() {
        const allDates = getSortedDiaryDates(diaryEntries);
        exportDateSummary.textContent = `共 ${allDates.length} 篇日记，已选择 ${selectedExportDates.size} 篇。绿色圆点表示当天有日记。`;
    }

    function updateExportPreview(dateKey) {
        const entry = dateKey ? diaryEntries[dateKey] : null;
        if (!entry) {
            exportDatePreviewDate.textContent = '未选择日期';
            exportDatePreviewContent.textContent = '点击有日记的日期可预览内容。';
            return;
        }

        const plainText = extractPlainTextFromEntry(entry).trim();
        const previewText = plainText || '[图片或空内容]';

        exportDatePreviewDate.textContent = `${dateKey}${selectedExportDates.has(dateKey) ? '（已选中）' : '（未选中）'}`;
        exportDatePreviewContent.textContent = previewText.length > 400
            ? `${previewText.substring(0, 400)}...`
            : previewText;
    }

    function selectAllCurrentMonthForExport() {
        const year = exportPickerDate.getFullYear();
        const monthPrefix = `${year}-${String(exportPickerDate.getMonth() + 1).padStart(2, '0')}-`;
        const allDates = getSortedDiaryDates(diaryEntries);

        allDates.forEach(dateKey => {
            if (dateKey.startsWith(monthPrefix)) {
                selectedExportDates.add(dateKey);
            }
        });

        renderExportDateCalendar();
    }

    function selectAllDatesForExport() {
        const allDates = getSortedDiaryDates(diaryEntries);
        selectedExportDates = new Set(allDates);
        if (allDates.length > 0) {
            lastPreviewedExportDate = allDates[allDates.length - 1];
            updateExportPreview(lastPreviewedExportDate);
        }
        renderExportDateCalendar();
    }

    function invertExportSelection() {
        const allDates = getSortedDiaryDates(diaryEntries);
        const invertedSelection = new Set();

        allDates.forEach(dateKey => {
            if (!selectedExportDates.has(dateKey)) {
                invertedSelection.add(dateKey);
            }
        });

        selectedExportDates = invertedSelection;
        if (selectedExportDates.size === 0) {
            updateExportPreview(null);
        }
        renderExportDateCalendar();
    }

    function clearExportSelection() {
        selectedExportDates.clear();
        renderExportDateCalendar();
        updateExportPreview(null);
    }

    function selectExportDateRange() {
        const startValue = exportDateRangeStartInput.value;
        const endValue = exportDateRangeEndInput.value;
        if (!startValue || !endValue) {
            if (window.customDialog) {
                window.customDialog.alert('请先选择开始和结束日期', '范围选择');
            }
            return;
        }

        if (startValue > endValue) {
            if (window.customDialog) {
                window.customDialog.alert('开始日期不能晚于结束日期', '范围选择');
            }
            return;
        }

        const allDates = getSortedDiaryDates(diaryEntries);
        const rangedDates = allDates.filter(dateKey => dateKey >= startValue && dateKey <= endValue);
        selectedExportDates = new Set(rangedDates);

        if (rangedDates.length > 0) {
            lastPreviewedExportDate = rangedDates[rangedDates.length - 1];
            const [year, month] = lastPreviewedExportDate.split('-').map(Number);
            exportPickerDate = new Date(year, month - 1, 1);
            updateExportPreview(lastPreviewedExportDate);
        } else {
            updateExportPreview(null);
        }

        renderExportDateCalendar();
    }

    function confirmExportSelectedDates() {
        const selectedDates = Array.from(selectedExportDates).sort();

        if (selectedDates.length === 0) {
            if (window.customDialog) {
                window.customDialog.alert('请先选择至少一天再导出', '未选择日期');
            }
            return;
        }

        closeExportDateModal();
        exportToTxt(selectedDates);
    }

    function openRecycleBinModal() {
        exportMenu.classList.add('hidden');
        renderRecycleBinList();
        recycleBinModal.classList.remove('hidden');
    }

    function renderRecycleBinList() {
        const trashEntries = getAllTrashEntries();
        recycleBinList.innerHTML = '';

        if (trashEntries.length === 0) {
            recycleBinSummary.textContent = '回收站为空。';
            recycleBinList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无已删除日记</div>';
            return;
        }

        recycleBinSummary.textContent = `当前共有 ${trashEntries.length} 篇已删除日记。`;

        trashEntries.forEach(item => {
            const card = document.createElement('div');
            card.className = 'recycle-bin-item';

            const meta = document.createElement('div');
            meta.className = 'recycle-bin-meta';
            meta.textContent = `原日期：${item.date} · 删除时间：${formatDisplayDateTime(item.deletedAt)}`;

            const title = document.createElement('div');
            title.className = 'recycle-bin-title';
            title.textContent = item.entry && item.entry.title ? item.entry.title : '无标题';

            const preview = document.createElement('div');
            preview.className = 'recycle-bin-preview';
            const plainText = extractPlainTextFromEntry(item.entry).trim();
            const previewText = plainText || '[图片或空内容]';
            preview.textContent = previewText.length > 220 ? `${previewText.substring(0, 220)}...` : previewText;

            const actions = document.createElement('div');
            actions.className = 'recycle-bin-actions';

            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'action-btn';
            restoreBtn.textContent = '恢复';
            restoreBtn.addEventListener('click', () => restoreFromRecycleBin(item.trashId));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn secondary';
            deleteBtn.textContent = '彻底删除';
            deleteBtn.addEventListener('click', () => deleteFromRecycleBin(item.trashId));

            actions.appendChild(restoreBtn);
            actions.appendChild(deleteBtn);

            card.appendChild(meta);
            card.appendChild(title);
            card.appendChild(preview);
            card.appendChild(actions);
            recycleBinList.appendChild(card);
        });
    }

    async function restoreFromRecycleBin(trashId) {
        const trashEntries = getAllTrashEntries();
        const target = trashEntries.find(item => item.trashId === trashId);
        if (!target) {
            return;
        }

        if (diaryEntries[target.date] && window.customDialog) {
            const overwrite = await window.customDialog.confirm(`日期 ${target.date} 已有日记，是否覆盖？`, '恢复冲突');
            if (!overwrite) {
                return;
            }
        }

        diaryEntries[target.date] = target.entry;
        persistDiaryEntries();
        saveAllTrashEntries(trashEntries.filter(item => item.trashId !== trashId));
        renderRecycleBinList();
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        if (window.innerWidth <= 600) {
            renderTimelineView();
        }
    }

    async function deleteFromRecycleBin(trashId) {
        if (window.customDialog) {
            const confirmed = await window.customDialog.danger('该日记将被永久删除且不可恢复，是否继续？', '彻底删除');
            if (!confirmed) {
                return;
            }
        }

        const trashEntries = getAllTrashEntries();
        saveAllTrashEntries(trashEntries.filter(item => item.trashId !== trashId));
        renderRecycleBinList();
    }

    async function clearRecycleBin() {
        const trashEntries = getAllTrashEntries();
        if (trashEntries.length === 0) {
            if (window.customDialog) {
                window.customDialog.alert('回收站已经是空的', '回收站');
            }
            return;
        }

        if (window.customDialog) {
            const confirmed = await window.customDialog.danger(`将永久删除 ${trashEntries.length} 篇日记，是否继续？`, '清空回收站');
            if (!confirmed) {
                return;
            }
        }

        saveAllTrashEntries([]);
        renderRecycleBinList();
        if (window.customDialog) {
            await window.customDialog.success('回收站已清空', '操作完成');
        }
    }

    // --- Date Picker Modal Logic ---
    const datePickerModal = document.getElementById('date-picker-modal');
    const closeDatePickerBtn = document.getElementById('close-date-picker-btn');
    const datePickerOkBtn = document.getElementById('date-picker-ok-btn');
    const datePickerCancelBtn = document.getElementById('date-picker-cancel-btn');
    const yearList = document.getElementById('year-list');
    const monthGrid = document.getElementById('month-grid');
    const prevYearChunkBtn = document.getElementById('prev-year-chunk-btn');
    const nextYearChunkBtn = document.getElementById('next-year-chunk-btn');

    let pickerYear = currentDate.getFullYear();
    let pickerMonth = currentDate.getMonth();

    currentMonthYear.addEventListener('click', () => {
        pickerYear = currentDate.getFullYear();
        pickerMonth = currentDate.getMonth();
        populateDatePicker(pickerYear, pickerMonth);
        datePickerModal.classList.remove('hidden');
    });

    function closeDatePicker() {
        datePickerModal.classList.add('hidden');
    }

    closeDatePickerBtn.addEventListener('click', closeDatePicker);
    datePickerCancelBtn.addEventListener('click', closeDatePicker);

    datePickerOkBtn.addEventListener('click', () => {
        currentDate = new Date(pickerYear, pickerMonth, 1);
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        closeDatePicker();
    });

    function populateDatePicker(year, month) {
        // Populate years
        yearList.innerHTML = '';
        const startYear = year - 10;
        for (let i = 0; i < 21; i++) {
            const yearItem = document.createElement('div');
            yearItem.classList.add('year-item');
            const currentYearInLoop = startYear + i;
            yearItem.textContent = currentYearInLoop;
            yearItem.dataset.year = currentYearInLoop;
            if (currentYearInLoop === year) {
                yearItem.classList.add('selected');
            }
            yearItem.addEventListener('click', (e) => {
                pickerYear = parseInt(e.target.dataset.year);
                document.querySelectorAll('.year-item.selected').forEach(el => el.classList.remove('selected'));
                e.target.classList.add('selected');
            });
            yearList.appendChild(yearItem);
        }
        // Scroll to selected year (延迟执行确保 DOM 渲染完成)
        const selectedYearEl = yearList.querySelector('.selected');
        if (selectedYearEl) {
            setTimeout(() => {
                selectedYearEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            }, 0);
        }


        // Populate months
        monthGrid.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const monthItem = document.createElement('div');
            monthItem.classList.add('month-item');
            monthItem.textContent = `${i + 1}月`;
            monthItem.dataset.month = i;
            if (i === month) {
                monthItem.classList.add('selected');
            }
            monthItem.addEventListener('click', (e) => {
                pickerMonth = parseInt(e.target.dataset.month);
                document.querySelectorAll('.month-item.selected').forEach(el => el.classList.remove('selected'));
                e.target.classList.add('selected');
            });
            monthGrid.appendChild(monthItem);
        }
    }
    
    prevYearChunkBtn.addEventListener('click', () => {
        pickerYear -= 21; // Jump back 21 years
        populateDatePicker(pickerYear, pickerMonth);
    });

    nextYearChunkBtn.addEventListener('click', () => {
        pickerYear += 21; // Jump forward 21 years
        populateDatePicker(pickerYear, pickerMonth);
    });

    function exportToZip() {
        const allEntries = diaryEntries;
        const exportData = {
            version: "1.0.0",
            entries: []
        };

        for (const dateKey in allEntries) {
            const entry = allEntries[dateKey];
            const plainTextContent = extractPlainTextFromEntry(entry);

            exportData.entries.push({
                id: dateKey, // Use the date string as a unique ID
                title: entry.title || plainTextContent.substring(0, 20),
                content: entry.content, // <-- FIX: Export the full Quill Delta object
                metadata: {
                    createdAt: dateKey + "T00:00:00Z", // Approximate date
                    updatedAt: dateKey + "T00:00:00Z"
                },
                attachments: [], // Placeholder for future
                addons: {
                    mood: entry.mood || null,
                    isImportant: entry.isImportant || false,
                    tags: entry.tags || []
                }
            });
        }

        const zip = new JSZip();
        zip.file("data.json", JSON.stringify(exportData, null, 2));
        zip.folder("media");
        zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, `diary_backup_${new Date().toISOString().split('T')[0]}.zip`);
        });
    }

    function importFromZip(event) {
        const file = event.target.files[0];
        if (!file) return;

        JSZip.loadAsync(file)
            .then(zip => {
                if (!zip.files['data.json']) {
                    throw new Error('无效的备份文件：缺少 data.json');
                }
                return zip.file("data.json").async("string");
            })
            .then(content => {
                const parsedData = JSON.parse(content);
                if (!parsedData.entries || !Array.isArray(parsedData.entries)) {
                     throw new Error('无效的数据格式：缺少 entries 数组');
                }

                let importedCount = 0;
                let skippedCount = 0;
                
                const currentEntries = { ...diaryEntries };

                parsedData.entries.forEach(entry => {
                    const entryId = entry.id;
                    if (currentEntries[entryId]) {
                        console.warn(`冲突：日记 ${entryId} 已存在，将跳过导入。`);
                        skippedCount++;
                    } else {
                        // The imported content is already in Quill Delta format
                        currentEntries[entryId] = {
                            content: entry.content, // <-- FIX: Use the imported object directly
                            title: entry.title,
                            mood: entry.addons ? entry.addons.mood : null,
                            isImportant: entry.addons ? !!entry.addons.isImportant : false,
                            tags: entry.addons && Array.isArray(entry.addons.tags) ? entry.addons.tags : []
                        };
                        importedCount++;
                    }
                });

                window.store.saveEntries(currentEntries);

                // Refresh global variable and calendar view
                diaryEntries = currentEntries;
                renderCalendar(currentDate.getFullYear(), currentDate.getMonth());

                if (window.customDialog) {
                    window.customDialog.success(`成功导入: ${importedCount}篇\n因冲突跳过: ${skippedCount}篇`, '导入完成');
                }
            })
            .catch(error => {
                console.error("导入 .ZIP 文件时出错:", error);
                if (window.customDialog) {
                    window.customDialog.alert(`${error.message}`, '导入失败');
                }
            });
        
        event.target.value = '';
    }

    function exportToTxt(selectedDates = null) {
        const allEntries = diaryEntries;
        const allDiaryDates = getSortedDiaryDates(allEntries);

        if (allDiaryDates.length === 0) {
            if (window.customDialog) {
                window.customDialog.alert('没有可导出的日记', '导出失败');
            }
            return;
        }

        const datesToExport = Array.isArray(selectedDates) && selectedDates.length > 0
            ? selectedDates.filter(dateKey => !!allEntries[dateKey]).sort()
            : allDiaryDates;

        if (datesToExport.length === 0) {
            if (window.customDialog) {
                window.customDialog.alert('所选日期没有可导出的日记', '导出失败');
            }
            return;
        }

        const exportTime = new Date().toLocaleString('zh-CN');
        let fullTextContent = "我的日记备份\n";
        fullTextContent += `导出时间: ${exportTime}\n`;
        fullTextContent += `导出篇数: ${datesToExport.length}\n`;
        fullTextContent += "====================================\n\n";

        datesToExport.forEach(dateKey => {
            const entry = allEntries[dateKey];
            const plainTextContent = extractPlainTextFromEntry(entry).trim();
            const title = entry.title || (plainTextContent.split('\n').find(line => line.trim()) || '无标题');

            fullTextContent += `日期: ${dateKey}\n`;
            fullTextContent += `标题: ${title}\n`;
            fullTextContent += `------------------------------------\n`;
            fullTextContent += `${plainTextContent || '[图片或空内容]'}\n\n`;
            fullTextContent += `====================================\n\n`;
        });

        const blob = new Blob([fullTextContent], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `diary_export_${new Date().toISOString().split('T')[0]}.txt`);

        if (window.customDialog) {
            window.customDialog.success(`成功导出 ${datesToExport.length} 篇日记`, '导出完成');
        }
    }
});
