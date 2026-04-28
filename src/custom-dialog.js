// 自定义弹窗模块 - 替代原生 alert/confirm
(function() {
    'use strict';

    const modal = document.getElementById('custom-dialog-modal');
    const iconEl = document.getElementById('custom-dialog-icon');
    const titleEl = document.getElementById('custom-dialog-title');
    const messageEl = document.getElementById('custom-dialog-message');
    const actionsEl = document.getElementById('custom-dialog-actions');
    const confirmBtn = document.getElementById('custom-dialog-confirm-btn');
    const cancelBtn = document.getElementById('custom-dialog-cancel-btn');

    let resolvePromise = null;

    // 图标映射
    const icons = {
        info: '💬',
        success: '✓',
        warning: '⚠',
        danger: '🗑'
    };

    /**
     * 显示自定义弹窗
     * @param {Object} options 配置选项
     * @param {string} options.title 标题
     * @param {string} options.message 消息内容
     * @param {string} options.type 类型: info, success, warning, danger
     * @param {boolean} options.showCancel 是否显示取消按钮
     * @param {string} options.confirmText 确认按钮文字
     * @param {string} options.cancelText 取消按钮文字
     * @param {string} options.confirmClass 确认按钮样式类
     * @returns {Promise<boolean>} 用户选择结果
     */
    function showDialog(options = {}) {
        const {
            title = '提示',
            message = '',
            type = 'info',
            showCancel = false,
            confirmText = '确定',
            cancelText = '取消',
            confirmClass = ''
        } = options;

        // 设置图标
        iconEl.className = `custom-dialog-icon ${type}`;
        iconEl.textContent = icons[type] || icons.info;

        // 设置内容
        titleEl.textContent = title;
        messageEl.textContent = message;

        // 设置按钮
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `action-btn ${confirmClass}`;

        if (showCancel) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.textContent = cancelText;
        } else {
            cancelBtn.classList.add('hidden');
        }

        // 显示弹窗
        modal.classList.remove('hidden');

        // 返回 Promise
        return new Promise((resolve) => {
            resolvePromise = resolve;
        });
    }

    // 确认按钮点击
    confirmBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (resolvePromise) {
            resolvePromise(true);
            resolvePromise = null;
        }
    });

    // 取消按钮点击
    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (resolvePromise) {
            resolvePromise(false);
            resolvePromise = null;
        }
    });

    // 点击遮罩关闭（仅对 alert 类型）
    modal.addEventListener('click', (e) => {
        if (e.target === modal && cancelBtn.classList.contains('hidden')) {
            modal.classList.add('hidden');
            if (resolvePromise) {
                resolvePromise(true);
                resolvePromise = null;
            }
        }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            if (resolvePromise) {
                resolvePromise(cancelBtn.classList.contains('hidden') ? true : false);
                resolvePromise = null;
            }
        }
    });

    // 暴露全局 API
    window.customDialog = {
        /**
         * 显示提示弹窗（替代 alert）
         */
        alert: function(message, title = '提示', type = 'info') {
            return showDialog({
                title,
                message,
                type,
                showCancel: false
            });
        },

        /**
         * 显示成功提示
         */
        success: function(message, title = '成功') {
            return showDialog({
                title,
                message,
                type: 'success',
                showCancel: false
            });
        },

        /**
         * 显示确认弹窗（替代 confirm）
         */
        confirm: function(message, title = '确认', type = 'warning') {
            return showDialog({
                title,
                message,
                type,
                showCancel: true
            });
        },

        /**
         * 显示危险操作确认弹窗
         */
        danger: function(message, title = '警告') {
            return showDialog({
                title,
                message,
                type: 'danger',
                showCancel: true,
                confirmText: '删除',
                confirmClass: 'danger'
            });
        }
    };
})();
