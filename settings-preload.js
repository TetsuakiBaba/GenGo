const { contextBridge, ipcRenderer } = require('electron');

// 設定画面用のAPI
contextBridge.exposeInMainWorld('electronAPI', {
    // 設定を取得
    getSettings: () => ipcRenderer.invoke('get-settings'),

    // 設定を保存
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // 設定ウィンドウを閉じる
    closeSettingsWindow: () => ipcRenderer.invoke('close-settings-window'),

    // i18n関連
    getTranslation: (key, options) => ipcRenderer.invoke('get-translation', key, options),
    changeLanguage: (language) => ipcRenderer.invoke('change-language', language),
    getCurrentLanguage: () => ipcRenderer.invoke('get-current-language'),

    // ショートカットキー検証
    validateShortcutKey: (shortcut) => ipcRenderer.invoke('validate-shortcut-key', shortcut),

    // デフォルトプロンプト取得
    getDefaultPrompt: () => ipcRenderer.invoke('get-default-prompt'),

    // デフォルト設定を取得
    getDefaultSettings: () => ipcRenderer.invoke('get-default-settings'),

    // 設定をリセット
    resetSettings: () => ipcRenderer.invoke('reset-settings'),

    // アプリケーション再起動
    restartApp: () => ipcRenderer.invoke('restart-app'),

    // LLM接続テスト
    testLLMConnection: (config) => ipcRenderer.invoke('test-llm-connection', config)
});