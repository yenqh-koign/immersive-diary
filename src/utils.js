// 日记应用通用工具函数
window.diaryUtils = {
    getFormattedDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    extractPlainTextFromEntry(entry) {
        if (!entry || !entry.content) {
            return '';
        }
        if (entry.content && Array.isArray(entry.content.ops)) {
            return entry.content.ops
                .map(op => {
                    if (typeof op.insert === 'string') return op.insert;
                    if (op.insert && op.insert.image) return '[图片]\n';
                    return '';
                })
                .join('');
        }
        if (typeof entry.content === 'string') {
            return entry.content;
        }
        return '';
    },

    getSortedDiaryDates(entriesMap) {
        return Object.keys(entriesMap)
            .filter(dateKey => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
            .sort();
    },

    parseDateKey(dateKey) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) {
            return null;
        }
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return null;
        }
        return date;
    },

    formatDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },

    isDateWithinInputRange(inputElement, dateKey) {
        if (!inputElement) return true;
        const minDate = inputElement.dataset.minDate || '';
        const maxDate = inputElement.dataset.maxDate || '';
        if (minDate && dateKey < minDate) return false;
        if (maxDate && dateKey > maxDate) return false;
        return true;
    },

    setInputDateRange(inputElement, minDate, maxDate) {
        if (!inputElement) return;
        inputElement.dataset.minDate = minDate || '';
        inputElement.dataset.maxDate = maxDate || '';
    },

    formatDisplayDateTime(isoString) {
        if (!isoString) return '未知时间';
        return new Date(isoString).toLocaleString('zh-CN');
    }
};
