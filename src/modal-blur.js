/**
 * 弹窗背景效果模块 - 半透明遮罩方案（GPU友好）
 */

/**
 * 应用弹窗打开效果
 */
function applyModalOpenEffect() {
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.classList.add('dimmed');
    }
}

/**
 * 移除弹窗打开效果
 */
function removeModalOpenEffect() {
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.classList.remove('dimmed');
    }
}

// 导出到全局
window.ModalBlur = {
    applyEffect: applyModalOpenEffect,
    removeEffect: removeModalOpenEffect
};
