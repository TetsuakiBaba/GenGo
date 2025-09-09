const { contextBridge, ipcRenderer } = require('electron');

/**
 * ポップアップUI用のPreloadスクリプト
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // ウィンドウを閉じる
    closeWindow: () => ipcRenderer.invoke('close-window'),

    // 結果適用
    applyResult: () => ipcRenderer.invoke('apply-result'),

    // オンデマンドプロンプト処理
    processOnDemandPrompt: (userPrompt, selectedText) =>
        ipcRenderer.invoke('process-on-demand-prompt', userPrompt, selectedText),

    // テキスト生成処理
    processTextGeneration: (userPrompt) =>
        ipcRenderer.invoke('process-text-generation', userPrompt),

    // テキスト生成モード信号を受信
    onTextGenerationMode: (callback) => ipcRenderer.on('text-generation-mode', callback),

    // i18n関連
    getI18nData: () => ipcRenderer.invoke('get-i18n-data'),
    getTranslation: (key, options) => ipcRenderer.invoke('get-translation', key, options),
    getCurrentLanguage: () => ipcRenderer.invoke('get-current-language')
});
