// デフォルト設定
export const defaultSettings = {
    autoApplyAndClose: false,
    language: 'en',
    llmProvider: 'local',
    llmEndpoint: 'http://127.0.0.1:1234/v1',
    apiKey: '',
    modelName: 'gpt-4o-mini',
    maxTokens: 4096,
    onDemandShortcutKey: 'Ctrl+Shift+1',
    presetPrompts: [
        {
            shortcutKey: 'Ctrl+1',
            prompt: 'Please translate between Japanese and English. Automatically determine the language of the input text and translate it into the other language.',
            enabled: true
        }
    ]
};
