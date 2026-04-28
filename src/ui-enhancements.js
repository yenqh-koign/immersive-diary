/**
 * UI/UX ENHANCEMENTS - JavaScript Module
 * Progressive enhancements for accessibility, keyboard navigation, and interactions
 */

// ============================================
// 1. ACCESSIBILITY ENHANCEMENTS
// ============================================

/**
 * Add ARIA labels and roles to improve screen reader support
 */
function enhanceAccessibility() {
    // Calendar navigation
    const prevBtn = document.getElementById('prev-month-btn');
    const nextBtn = document.getElementById('next-month-btn');
    const todayBtn = document.getElementById('today-btn');

    if (prevBtn) prevBtn.setAttribute('aria-label', '上个月');
    if (nextBtn) nextBtn.setAttribute('aria-label', '下个月');
    if (todayBtn) todayBtn.setAttribute('aria-label', '返回今天');

    // Header actions
    const searchBtn = document.getElementById('search-action-btn');
    const onThisDayBtn = document.getElementById('on-this-day-action-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');

    if (searchBtn) searchBtn.setAttribute('aria-label', '搜索日记');
    if (onThisDayBtn) onThisDayBtn.setAttribute('aria-label', '那年今日');
    if (exportBtn) exportBtn.setAttribute('aria-label', '导出日记');
    if (importBtn) importBtn.setAttribute('aria-label', '导入日记');

    // Modals
    const diaryModal = document.getElementById('diary-modal');
    const searchModal = document.getElementById('search-modal');
    const onThisDayModal = document.getElementById('on-this-day-modal');

    if (diaryModal) {
        diaryModal.setAttribute('role', 'dialog');
        diaryModal.setAttribute('aria-modal', 'true');
        diaryModal.setAttribute('aria-labelledby', 'diary-modal-title');
    }

    if (searchModal) {
        searchModal.setAttribute('role', 'dialog');
        searchModal.setAttribute('aria-modal', 'true');
        searchModal.setAttribute('aria-labelledby', 'search-modal-title');
    }

    if (onThisDayModal) {
        onThisDayModal.setAttribute('role', 'dialog');
        onThisDayModal.setAttribute('aria-modal', 'true');
        onThisDayModal.setAttribute('aria-labelledby', 'on-this-day-modal-title');
    }

    // Add IDs to modal titles for aria-labelledby
    const modalTitles = document.querySelectorAll('.modal-title');
    modalTitles.forEach((title, index) => {
        if (!title.id) {
            const modal = title.closest('.modal-overlay');
            if (modal) {
                title.id = `${modal.id}-title`;
            }
        }
    });

    // Enhance date cells
    enhanceDateCellAccessibility();
}

/**
 * Add accessibility attributes to date cells
 */
function enhanceDateCellAccessibility() {
    const dateCells = document.querySelectorAll('.date-cell');

    dateCells.forEach(cell => {
        const dateNumber = cell.querySelector('.date-number');
        if (!dateNumber) return;

        const dateText = dateNumber.textContent;
        const hasEntry = cell.classList.contains('has-entry');
        const isToday = cell.classList.contains('today');
        const isOtherMonth = cell.classList.contains('other-month');

        let label = `${dateText}日`;
        if (isToday) label += ', 今天';
        if (hasEntry) label += ', 有日记';
        if (isOtherMonth) label += ', 其他月份';

        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', label);
        cell.setAttribute('tabindex', '0');

        // Add keyboard support for Enter and Space
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cell.click();
            }
        });
    });
}

// ============================================
// 2. KEYBOARD NAVIGATION
// ============================================

/**
 * Setup global keyboard shortcuts
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K: Open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearchModal();
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }

        // Arrow keys: Navigate calendar (only when a date cell is focused)
        if (document.activeElement && document.activeElement.classList.contains('date-cell')) {
            handleCalendarArrowNavigation(e);
        }

        // Ctrl/Cmd + S: Save diary (when modal is open)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            const diaryModal = document.getElementById('diary-modal');
            if (diaryModal && !diaryModal.classList.contains('hidden')) {
                e.preventDefault();
                const saveBtn = document.getElementById('save-diary-btn');
                if (saveBtn) saveBtn.click();
            }
        }
    });
}

/**
 * Handle arrow key navigation in calendar
 */
function handleCalendarArrowNavigation(e) {
    const cells = Array.from(document.querySelectorAll('.date-cell'));
    const currentIndex = cells.indexOf(document.activeElement);

    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (e.key) {
        case 'ArrowRight':
            newIndex = currentIndex + 1;
            break;
        case 'ArrowLeft':
            newIndex = currentIndex - 1;
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 7;
            break;
        case 'ArrowUp':
            newIndex = currentIndex - 7;
            break;
        default:
            return;
    }

    if (cells[newIndex]) {
        e.preventDefault();
        cells[newIndex].focus();
        cells[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Open search modal and focus input
 */
function openSearchModal() {
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');

    if (searchModal) {
        searchModal.classList.remove('hidden');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
        trapFocus(searchModal);
    }
}

/**
 * Close all open modals
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

/**
 * Trap focus within modal for accessibility
 */
function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };

    modal.addEventListener('keydown', handleTabKey);

    // Store handler for cleanup
    modal._focusTrapHandler = handleTabKey;
}

/**
 * Remove focus trap when modal closes
 */
function removeFocusTrap(modal) {
    if (modal._focusTrapHandler) {
        modal.removeEventListener('keydown', modal._focusTrapHandler);
        delete modal._focusTrapHandler;
    }
}

// ============================================
// 3. SCREEN READER ANNOUNCEMENTS
// ============================================

let liveRegion = null;

/**
 * Create live region for screen reader announcements
 */
function createLiveRegion() {
    if (liveRegion) return;

    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    `;
    document.body.appendChild(liveRegion);
}

/**
 * Announce message to screen readers
 */
function announce(message, priority = 'polite') {
    if (!liveRegion) createLiveRegion();

    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}

/**
 * Announce when diary is saved
 */
function announceSave() {
    announce('日记已保存', 'assertive');
}

/**
 * Announce month change
 */
function announceMonthChange(year, month) {
    announce(`已切换到 ${year}年 ${month + 1}月`);
}

/**
 * Announce search results
 */
function announceSearchResults(count) {
    if (count === 0) {
        announce('未找到匹配的日记');
    } else {
        announce(`找到 ${count} 条匹配的日记`);
    }
}

// ============================================
// 4. ENHANCED INTERACTIONS
// ============================================

/**
 * Add ripple effect to buttons
 */
function addRippleEffect(button, event) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

/**
 * Setup ripple effects on buttons
 */
function setupRippleEffects() {
    // Add ripple animation CSS if not exists
    if (!document.getElementById('ripple-animation-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation-style';
        style.textContent = `
            @keyframes ripple-animation {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to all buttons
    const buttons = document.querySelectorAll('button, .action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            addRippleEffect(button, e);
        });
    });
}

/**
 * Add staggered animation to calendar cells
 */
function staggerCalendarAnimation() {
    const cells = document.querySelectorAll('.date-cell');
    cells.forEach((cell, index) => {
        cell.style.animationDelay = `${index * 0.02}s`;
    });
}

/**
 * Enhanced save feedback with heart animation
 */
function showSaveSuccess() {
    // Create heart element
    const heart = document.createElement('div');
    heart.className = 'feedback-heart';
    heart.textContent = '✨';
    document.body.appendChild(heart);

    // Announce to screen readers
    announceSave();

    // Remove after animation
    setTimeout(() => heart.remove(), 800);
}

/**
 * Show loading skeleton for calendar
 */
function showCalendarSkeleton() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    calendarGrid.innerHTML = '';

    // Create 35 skeleton cells (5 weeks)
    for (let i = 0; i < 35; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'date-cell skeleton-loader';
        skeleton.style.cssText = `
            aspect-ratio: 1 / 1;
            border-radius: 12px;
        `;
        calendarGrid.appendChild(skeleton);
    }
}

/**
 * Smooth scroll to today's date
 */
function scrollToToday() {
    const todayCell = document.querySelector('.date-cell.today');
    if (todayCell) {
        todayCell.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        todayCell.focus();
    }
}

// ============================================
// 5. MODAL ENHANCEMENTS
// ============================================

/**
 * Enhanced modal open with focus management
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('hidden');

    // 添加主内容模糊效果
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.classList.add('blurred');
    }

    // Store previously focused element
    modal._previousFocus = document.activeElement;

    // Focus first focusable element
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
        setTimeout(() => focusableElements[0].focus(), 100);
    }

    // Trap focus
    trapFocus(modal);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

/**
 * Enhanced modal close with focus restoration
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('hidden');

    // 检查是否还有其他打开的弹窗，如果没有则移除模糊效果
    const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    if (openModals.length === 0) {
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.classList.remove('blurred');
        }
    }

    // Remove focus trap
    removeFocusTrap(modal);

    // Restore focus
    if (modal._previousFocus) {
        modal._previousFocus.focus();
        delete modal._previousFocus;
    }

    // Restore body scroll
    document.body.style.overflow = '';
}

// ============================================
// 6. PERFORMANCE OPTIMIZATIONS
// ============================================

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Lazy load images in entries
 */
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ============================================
// 7. THEME MANAGEMENT
// ============================================

/**
 * Check if a theme is a dark mode variant
 */
function isDarkTheme(themeName) {
    return themeName === 'dark' || themeName.startsWith('dark-');
}

/**
 * Apply a specific theme
 */
function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);

    // Update toggle button state
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        const isDark = isDarkTheme(themeName);
        // Sun icon for dark mode (to switch to light), Moon icon for light mode (to switch to dark)
        if (isDark) {
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        } else {
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        }
        btn.setAttribute('title', isDark ? '切换亮色主题' : '切换深色主题');
    }
}

/**
 * Set a specific color theme (Sakura, Mint, etc.)
 * Preserves current light/dark mode state
 */
function setColorTheme(themeName) {
    localStorage.setItem('themePreference', themeName);

    // Check if currently in dark mode
    const isDarkMode = localStorage.getItem('darkMode') === 'dark';

    if (isDarkMode) {
        // Apply dark variant of the new color theme
        const darkTheme = themeName === 'sakura' ? 'dark' : `dark-${themeName}`;
        applyTheme(darkTheme);
    } else {
        applyTheme(themeName);
    }
}

/**
 * Toggle between Light (Selected Color Theme) and Dark mode
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const savedColorTheme = localStorage.getItem('themePreference') || 'sakura';

    if (isDarkTheme(currentTheme)) {
        // Switch to light mode -> restore selected color theme
        applyTheme(savedColorTheme);
        localStorage.setItem('darkMode', 'light');
    } else {
        // Switch to dark mode with the current color theme
        const darkTheme = savedColorTheme === 'sakura' ? 'dark' : `dark-${savedColorTheme}`;
        applyTheme(darkTheme);
        localStorage.setItem('darkMode', 'dark');
    }
}

/**
 * Initialize Theme based on saved preference
 */
function initTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'dark';
    const savedColorTheme = localStorage.getItem('themePreference') || 'sakura';

    // Check system preference if no manual override exists
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = localStorage.getItem('darkMode') ? isDarkMode : systemDark;

    if (shouldBeDark) {
        // Apply dark variant of the selected color theme
        const darkTheme = savedColorTheme === 'sakura' ? 'dark' : `dark-${savedColorTheme}`;
        applyTheme(darkTheme);
    } else {
        applyTheme(savedColorTheme);
    }

    // Update button initial state
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.addEventListener('click', toggleTheme);
    }
}

// ============================================
// 8. INITIALIZATION
// ============================================

/**
 * Initialize all enhancements
 */
function initializeEnhancements() {
    // Accessibility
    enhanceAccessibility();
    createLiveRegion();

    // Keyboard navigation
    setupKeyboardNavigation();

    // Interactions
    setupRippleEffects();

    // Performance
    setupLazyLoading();

    // Theme
    initTheme();

    // 弹窗模糊效果监听器 - GPU优化方案
    setupModalBlurObserver();

    console.log('✨ UI/UX enhancements initialized');
}

/**
 * 监听所有弹窗的打开/关闭状态，自动控制主内容区域的模糊效果
 * 使用 ModalBlur 模块提供的多种方案
 */
function setupModalBlurObserver() {
    // 获取所有弹窗
    const modals = document.querySelectorAll('.modal-overlay');

    // 检查是否有弹窗打开
    async function updateBlurState() {
        const hasOpenModal = Array.from(modals).some(modal => !modal.classList.contains('hidden'));

        if (window.ModalBlur) {
            if (hasOpenModal) {
                await window.ModalBlur.applyEffect();
            } else {
                window.ModalBlur.removeEffect();
            }
        }
    }

    // 使用 MutationObserver 监听每个弹窗的 class 变化
    const observer = new MutationObserver(updateBlurState);

    modals.forEach(modal => {
        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class']
        });
    });

    // 初始检查
    updateBlurState();
}

// ============================================
// 9. EXPORT FOR USE IN APP.JS
// ============================================

// Make functions available globally
window.UIEnhancements = {
    // Accessibility
    enhanceAccessibility,
    enhanceDateCellAccessibility,
    announce,
    announceSave,
    announceMonthChange,
    announceSearchResults,

    // Navigation
    setupKeyboardNavigation,
    openSearchModal,
    closeAllModals,
    scrollToToday,

    // Interactions
    showSaveSuccess,
    showCalendarSkeleton,
    staggerCalendarAnimation,

    // Modals
    openModal,
    closeModal,
    trapFocus,
    removeFocusTrap,

    // Utilities
    debounce,
    throttle,

    // Theme
    toggleTheme,
    initTheme,
    setColorTheme, // Exported for settings
    isDarkTheme,   // Exported for checking dark mode

    // Initialize
    init: initializeEnhancements
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancements);
} else {
    initializeEnhancements();
}
