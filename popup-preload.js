const { contextBridge, ipcRenderer } = require('electron');

/**
 * ポップアップUI用のPreloadスクリプト
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // ウィンドウを閉じる
    closeWindow: () => ipcRenderer.invoke('close-window'),

    // 結果適用
    applyResult: () => ipcRenderer.invoke('apply-result'),

    // i18n関連
    getTranslation: (key, options) => ipcRenderer.invoke('get-translation', key, options),
    getCurrentLanguage: () => ipcRenderer.invoke('get-current-language')
});
