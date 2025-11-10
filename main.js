import { app, BrowserWindow, ipcMain, globalShortcut, clipboard, Menu, Tray, nativeImage, screen, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import nativeTheme from 'electron';
import { exec, execSync } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { SimpleLLMEngine } from './simple-llm-engine.js';
import { initI18n, t, changeLanguage, getCurrentLanguage, getPackageVersion, getI18nData } from './i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auto-updater (production環境でのみ実行)
if (app.isPackaged) {
    try {
        // run this as early in the main process as possible
        const { default: electronSquirrelStartup } = await import('electron-squirrel-startup');
        if (electronSquirrelStartup) {
            app.quit();
        }

        const { updateElectronApp } = await import('update-electron-app');
        updateElectronApp();
    } catch (error) {
        console.log('Auto-updater packages not found. This is normal in development.', error.message);
    }
}

/**
 * gengo Electron メインプロセス（完全版・ポップアップUI付き）
 * ユーザー選択テキストに対してポップアップで処理選択を提供
 */
class GengoElectronMain {
    constructor() {
        this.popupWindow = null;
        this.settingsWindow = null;
        this.tray = null;
        this.llmEngine = null;
        this.currentSelectedText = '';
        this.currentProcessingData = null;
        this.isApplying = false;
        this.isShowingResult = false;
        this.settings = {
            autoApplyAndClose: false,
            language: 'en',
            llmProvider: 'local',
            llmEndpoint: 'http://127.0.0.1:1234/v1',
            apiKey: '',
            modelName: 'gpt-5-nano',
            maxTokens: 4096,
            onDemandShortcutKey: 'Ctrl+Shift+1',
            presetPrompts: [
                {
                    shortcutKey: 'Ctrl+1',
                    prompt: '日本語と英語を相互翻訳してください。入力されたテキストの言語を自動判定して、もう一方の言語に翻訳してください。',
                    enabled: true
                }
            ]
        };
        this.settingsPath = join(app.getPath('userData'), 'settings.json');
    }

    async init() {
        nativeTheme.themeSource = 'system';
        console.log('gengo Electron: ポップアップUI版で起動中...');

        // 設定を読み込み
        await this.loadSettings();

        // i18n初期化
        await initI18n(this.settings.language);

        // LLM設定を出力
        console.log('LLM設定詳細:', this.getLLMConfig());

        // LLMエンジン初期化
        this.llmEngine = new SimpleLLMEngine(this.getLLMConfig());

        // システムトレイを作成
        this.createTray();

        // グローバルショートカットを登録
        this.registerGlobalShortcuts();

        // IPC イベントハンドラーを設定
        this.setupIPCHandlers();

        console.log('gengo Electron: 初期化完了');
    }

    /**
     * プラットフォーム判定ヘルパー
     */
    isMac() {
        return process.platform === 'darwin';
    }

    isWindows() {
        return process.platform === 'win32';
    }

    isLinux() {
        return process.platform === 'linux';
    }

    /**
     * プラットフォームに応じたコマンドキー名を取得
     */
    getCmdKey() {
        return this.isMac() ? 'cmd' : 'ctrl';
    }

    /**
     * プラットフォームに応じたコマンドキー表示名を取得
     */
    getCmdKeyDisplay() {
        return this.isMac() ? '⌘' : 'Ctrl';
    }

    /**
     * システムトレイを作成または更新
     */
    createTray() {
        try {
            // 既存のトレイがある場合は破棄
            if (this.tray) {
                this.tray.destroy();
                this.tray = null;
                console.log('既存のシステムトレイを破棄しました');
            }

            // テキストベースの簡単なアイコンを作成
            this.tray = new Tray(path.join(__dirname, './icons/IconTemplate.png'))
            this.tray.setToolTip(t('tray.tooltip'));

            const contextMenu = Menu.buildFromTemplate([
                {
                    label: t('tray.about'),
                    click: () => this.showAbout()
                },
                { type: 'separator' },
                {
                    label: t('tray.settings'),
                    click: () => this.showSettings()
                },
                { type: 'separator' },
                {
                    label: t('tray.quit'),
                    click: () => app.quit()
                }
            ]);

            this.tray.setContextMenu(contextMenu);
            console.log('システムトレイを作成しました');
        } catch (error) {
            console.error('システムトレイ作成エラー:', error);
        }
    }

    /**
     * LLM設定を取得
     */
    getLLMConfig() {
        if (this.settings.llmProvider === 'remote') {
            return {
                provider: 'remote',
                apiEndpoint: this.settings.llmEndpoint,
                apiKey: this.settings.apiKey,
                model: this.settings.modelName || 'gpt-3.5-turbo',
                maxTokens: this.settings.maxTokens || 4096
            };
        } else {
            return {
                provider: 'local',
                apiEndpoint: this.settings.llmEndpoint,
                model: 'local-model',
                maxTokens: this.settings.maxTokens || 4096
            };
        }
    }

    /**
     * ショートカットキーの有効性を検証
     */
    validateShortcutKey(shortcut) {
        try {
            // 基本的なショートカットキーの形式をチェック
            const validModifiers = ['Cmd', 'Ctrl', 'Alt', 'Shift', 'CmdOrCtrl'];
            const parts = shortcut.split('+');

            if (parts.length < 2) {
                return false;
            }

            const modifiers = parts.slice(0, -1);
            const key = parts[parts.length - 1];

            // モディファイアキーの検証
            for (const modifier of modifiers) {
                if (!validModifiers.includes(modifier)) {
                    return false;
                }
            }

            // キーの検証（基本的な文字、数字、ファンクションキー）
            const validKeyPattern = /^([a-zA-Z0-9]|F[1-9]|F1[0-2]|Space|Tab|Enter|Escape|Delete|Backspace|Up|Down|Left|Right|Home|End|PageUp|PageDown|Insert|;|,|\.|\/|\\|\[|\]|'|`|-|=)$/;
            if (!validKeyPattern.test(key)) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('ショートカットキー検証エラー:', error);
            return false;
        }
    }

    /**
     * グローバルショートカットを登録
     */
    registerGlobalShortcuts() {
        try {
            // 既存のショートカットをすべて解除
            globalShortcut.unregisterAll();
            console.log('既存のショートカットをすべて解除しました');

            // 事前プロンプトのショートカットを登録
            if (this.settings.presetPrompts && Array.isArray(this.settings.presetPrompts)) {
                this.settings.presetPrompts.forEach((preset, index) => {
                    if (preset.enabled && preset.shortcutKey) {
                        const registered = globalShortcut.register(preset.shortcutKey, () => {
                            this.handlePresetPromptTrigger(index);
                        });

                        if (registered) {
                            console.log(`事前プロンプト ${index + 1} のショートカット ${preset.shortcutKey} を登録しました`);
                        } else {
                            console.error(`事前プロンプト ${index + 1} のショートカット登録に失敗しました: ${preset.shortcutKey}`);
                        }
                    }
                });
            }

            // オンデマンドプロンプトモード用のショートカット（設定から取得）
            const onDemandShortcut = this.settings.onDemandShortcutKey;
            const onDemandRegistered = globalShortcut.register(onDemandShortcut, () => {
                this.handleOnDemandPromptTrigger();
            });

            if (onDemandRegistered) {
                console.log(`オンデマンドプロンプトショートカット ${onDemandShortcut} を登録しました`);
            } else {
                console.error('オンデマンドプロンプトショートカット登録に失敗しました');
            }
        } catch (error) {
            console.error('グローバルショートカット登録エラー:', error);
        }
    }

    /**
     * 事前プロンプトトリガー処理（プロンプトインデックス指定）
     */
    async handlePresetPromptTrigger(presetIndex) {
        try {
            // プロンプト設定を取得
            const preset = this.settings.presetPrompts[presetIndex];
            if (!preset || !preset.enabled) {
                console.log(`事前プロンプト ${presetIndex + 1} が無効または存在しません`);
                return;
            }

            console.log(`事前プロンプト ${presetIndex + 1} トリガー実行:`, preset.prompt);

            // 結果表示中の場合は Apply を実行
            if (this.isShowingResult && this.currentProcessingData) {
                console.log('結果表示中のため、Apply処理を実行します');
                await this.handleApplyResult();
                return;
            }

            // 既に処理中の場合は無視
            if (this.isProcessing) {
                console.log(t('processing.messages.processing'));
                return;
            }

            this.isProcessing = true;
            console.log('テキスト選択トリガー実行');

            // 現在のアプリケーション情報を取得・記憶
            await this.captureSelectionContext();

            // 現在のクリップボードを保存
            const originalClipboard = clipboard.readText();
            const clipboardPreview = originalClipboard.length > 50
                ? originalClipboard.substring(0, 50) + '...'
                : originalClipboard;
            console.log('元のクリップボード保存:', clipboardPreview);

            // アクティブアプリケーションを確認（macOSのみ）
            const cmdKey = this.getCmdKey();
            if (this.isMac()) {
                try {
                    const activeApp = execSync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"').toString().trim();
                    console.log('アクティブアプリケーション (macOS):', activeApp);
                } catch (error) {
                    console.error('アクティブアプリケーション取得エラー:', error.message);
                }
            } else {
                console.log('プラットフォーム:', process.platform);
            }

            // クリップボードを一時的にクリアして選択テキストの検出を確実にする
            clipboard.writeText('__GENGO_TEMP_MARKER__');

            // Cmd+C (Mac) または Ctrl+C (Windows)でテキストをコピー
            console.log(`${this.getCmdKeyDisplay()}+C実行中...`);
            await this.simulateKeyPress('c', [cmdKey]);
            console.log(`${this.getCmdKeyDisplay()}+C実行完了`);

            // 少し待ってからクリップボードを確認（短縮：500ms → 200ms）
            setTimeout(() => {
                const selectedText = clipboard.readText();
                const selectedTextLength = selectedText ? selectedText.length : 0;
                console.log('コピー後のクリップボード:', selectedText.substring(0, 100) + '...');
                console.log('コピーされたテキストの長さ:', selectedTextLength);
                console.log('テンポラリマーカーと同じか:', selectedText === '__GENGO_TEMP_MARKER__');
                console.log('テキストが空か:', !selectedText || !selectedText.trim());

                // テンポラリマーカーでなく、実際のテキストがコピーされた場合は有効
                if (selectedText && selectedText.trim() && selectedText !== '__GENGO_TEMP_MARKER__') {
                    console.log('選択されたテキスト長:', selectedTextLength, '文字');
                    console.log('選択コンテキスト:', this.selectionContext);
                    this.currentSelectedText = selectedText;

                    // プロンプトを使用してウィンドウ表示（非同期なのでブロックしない）
                    this.showActionPopupWithPrompt(selectedText, preset.prompt);

                    // クリップボードを復元
                    setTimeout(() => {
                        clipboard.writeText(originalClipboard);
                        this.isProcessing = false; // フラグをリセット
                    }, 100);
                } else {
                    console.log('テキスト選択なし - テキスト生成モードに移行');
                    console.log('- selectedText長:', selectedTextLength);
                    console.log('- selectedText先頭100文字:', selectedText.substring(0, 100));
                    console.log('- __GENGO_TEMP_MARKER__と同じか:', selectedText === '__GENGO_TEMP_MARKER__');
                    console.log('- テキストが空か:', !selectedText || !selectedText.trim());

                    // テキスト生成モードでポップアップを表示
                    this.showTextGenerationPopup();

                    // クリップボードを復元
                    clipboard.writeText(originalClipboard);
                    this.isProcessing = false; // フラグをリセット
                }
            }, 200); // 500ms → 200msに短縮

        } catch (error) {
            console.error('テキスト選択処理エラー:', error);
            this.isProcessing = false; // エラー時もフラグをリセット
        }
    }

    /**
     * テキスト選択トリガー処理（旧メソッド名、互換性のため残す）
     * デフォルトで最初の事前プロンプトを使用
     */
    async handleTextSelectionTrigger() {
        return this.handlePresetPromptTrigger(0);
    }

    /**
     * オンデマンドプロンプトトリガー処理（Ctrl+Shift+1）
     */
    async handleOnDemandPromptTrigger() {
        try {
            // 結果表示中の場合は Apply を実行
            if (this.isShowingResult && this.currentProcessingData) {
                console.log('結果表示中のため、Apply処理を実行します');
                await this.handleApplyResult();
                return;
            }

            // 既に処理中の場合は無視
            if (this.isProcessing) {
                console.log(t('processing.messages.processing'));
                return;
            }

            this.isProcessing = true;
            console.log('オンデマンドプロンプトトリガー実行');

            // 現在のアプリケーション情報を取得・記憶
            await this.captureSelectionContext();

            // 現在のクリップボードを保存
            const originalClipboard = clipboard.readText();
            const clipboardPreview = originalClipboard.length > 50
                ? originalClipboard.substring(0, 50) + '...'
                : originalClipboard;
            console.log('元のクリップボード保存:', clipboardPreview);

            // アクティブアプリケーションを確認（macOSのみ）
            const cmdKey = this.getCmdKey();
            if (this.isMac()) {
                try {
                    const activeApp = execSync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"').toString().trim();
                    console.log('アクティブアプリケーション (macOS):', activeApp);
                } catch (error) {
                    console.error('アクティブアプリケーション取得エラー:', error.message);
                }
            } else {
                console.log('プラットフォーム:', process.platform);
            }

            // クリップボードを一時的にクリアして選択テキストの検出を確実にする
            clipboard.writeText('__GENGO_TEMP_MARKER__');

            // Cmd+C (Mac) または Ctrl+C (Windows)でテキストをコピー
            console.log(`${this.getCmdKeyDisplay()}+C実行中...`);
            await this.simulateKeyPress('c', [cmdKey]);
            console.log(`${this.getCmdKeyDisplay()}+C実行完了`);

            // 少し待ってからクリップボードを確認（長いテキストの場合は時間がかかる可能性がある）
            setTimeout(() => {
                const selectedText = clipboard.readText();
                const selectedTextLength = selectedText ? selectedText.length : 0;
                console.log('コピー後のクリップボード:', selectedText.substring(0, 100) + '...');
                console.log('コピーされたテキストの長さ:', selectedTextLength);
                console.log('テンポラリマーカーと同じか:', selectedText === '__GENGO_TEMP_MARKER__');
                console.log('テキストが空か:', !selectedText || !selectedText.trim());

                // テンポラリマーカーでなく、実際のテキストがコピーされた場合は有効
                if (selectedText && selectedText.trim() && selectedText !== '__GENGO_TEMP_MARKER__') {
                    console.log('選択されたテキスト長:', selectedTextLength, '文字');
                    console.log('選択コンテキスト:', this.selectionContext);
                    this.currentSelectedText = selectedText;

                    // オンデマンドプロンプト入力画面を表示
                    this.showOnDemandPromptInput(selectedText);

                    // クリップボードを復元
                    setTimeout(() => {
                        clipboard.writeText(originalClipboard);
                        this.isProcessing = false; // フラグをリセット
                    }, 500);
                } else {
                    console.log('テキスト選択に失敗:');
                    console.log('- selectedText長:', selectedTextLength);
                    console.log('- selectedText先頭100文字:', selectedText.substring(0, 100));
                    console.log('- __GENGO_TEMP_MARKER__と同じか:', selectedText === '__GENGO_TEMP_MARKER__');
                    console.log('- テキストが空か:', !selectedText || !selectedText.trim());
                    console.log(t('processing.messages.invalid_selection'));

                    // クリップボードを復元
                    clipboard.writeText(originalClipboard);
                    this.isProcessing = false; // フラグをリセット
                }
            }, 500);

        } catch (error) {
            console.error('オンデマンドプロンプト処理エラー:', error);
            this.isProcessing = false; // エラー時もフラグをリセット
        }
    }

    /**
     * 選択時のコンテキスト情報を記憶（改良版・クロスプラットフォーム対応）
     */
    async captureSelectionContext() {
        return new Promise((resolve) => {
            if (this.isMac()) {
                // macOS: AppleScriptを使用
                const contextScript = `
                    tell application "System Events"
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        
                        -- アプリケーションの詳細情報を取得
                        try
                            set appBundle to bundle identifier of frontApp
                            set appDisplayName to displayed name of frontApp
                            return appName & "|" & appBundle & "|" & appDisplayName
                        on error
                            return appName & "|unknown|unknown"
                        end try
                    end tell
                `;

                exec(`osascript -e '${contextScript}'`, (error, stdout, stderr) => {
                    if (!error && stdout) {
                        const parts = stdout.trim().split('|');
                        this.selectionContext = {
                            appName: parts[0],
                            bundleId: parts[1],
                            displayName: parts[2],
                            processName: parts[0],
                            timestamp: Date.now()
                        };
                        console.log('コンテキスト記憶:', this.selectionContext);
                    } else {
                        console.error('コンテキスト取得エラー:', error);
                        this.selectionContext = this._getFallbackContext();
                    }
                    resolve();
                });
            } else if (this.isWindows()) {
                // Windows: PowerShellを使用
                const psScript = `Add-Type @"
                    using System;
                    using System.Runtime.InteropServices;
                    public class WindowInfo {
                        [DllImport("user32.dll")]
                        public static extern IntPtr GetForegroundWindow();
                        [DllImport("user32.dll")]
                        public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
                    }
"@
$hwnd = [WindowInfo]::GetForegroundWindow()
$processId = 0
[WindowInfo]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
if ($process) {
    Write-Output "$($process.ProcessName)|$($process.Id)|$($process.MainWindowTitle)"
} else {
    Write-Output "Unknown|0|Unknown"
}`;

                exec(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
                    if (!error && stdout) {
                        const parts = stdout.trim().split('|');
                        this.selectionContext = {
                            appName: parts[0],
                            bundleId: parts[1],
                            displayName: parts[2],
                            processName: parts[0],
                            timestamp: Date.now()
                        };
                        console.log('コンテキスト記憶:', this.selectionContext);
                    } else {
                        console.error('コンテキスト取得エラー:', error);
                        this.selectionContext = this._getFallbackContext();
                    }
                    resolve();
                });
            } else {
                // Linux: フォールバック
                this.selectionContext = this._getFallbackContext();
                resolve();
            }
        });
    }

    /**
     * フォールバックコンテキスト
     */
    _getFallbackContext() {
        return {
            appName: 'Unknown',
            bundleId: 'unknown',
            displayName: 'Unknown',
            processName: 'Unknown',
            timestamp: Date.now()
        };
    }

    /**
     * キープレスをシミュレート（クロスプラットフォーム対応）
     */
    async simulateKeyPress(key, modifiers = []) {
        return new Promise((resolve, reject) => {
            if (this.isMac()) {
                // macOS: AppleScript
                let keystrokeCommand = '';

                if (modifiers.length > 0) {
                    const modifierMap = {
                        'cmd': 'command',
                        'ctrl': 'control',
                        'shift': 'shift',
                        'alt': 'option',
                        'option': 'option'
                    };

                    const appleModifiers = modifiers.map(mod => modifierMap[mod] || mod).join(' down, ') + ' down';
                    keystrokeCommand = `keystroke "${key}" using {${appleModifiers}}`;
                } else {
                    keystrokeCommand = `keystroke "${key}"`;
                }

                const script = `
                    tell application "System Events"
                        ${keystrokeCommand}
                    end tell
                `;

                exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
                    if (error) {
                        console.error('AppleScript実行エラー:', error.message);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else if (this.isWindows()) {
                // Windows: PowerShellでSendKeysを使用
                const modifierMap = {
                    'cmd': '^',    // Ctrl
                    'ctrl': '^',   // Ctrl
                    'shift': '+',  // Shift
                    'alt': '%'     // Alt
                };

                let keyString = key;
                if (modifiers.length > 0) {
                    const modPrefix = modifiers.map(mod => modifierMap[mod] || '').join('');
                    keyString = modPrefix + key;
                }

                const psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${keyString}")`;

                exec(`powershell -Command "${psScript}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error('PowerShell実行エラー:', error.message);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                // Linux: xdotoolを使用（要インストール）
                const modifierMap = {
                    'cmd': 'ctrl',
                    'ctrl': 'ctrl',
                    'shift': 'shift',
                    'alt': 'alt'
                };

                const mods = modifiers.map(mod => modifierMap[mod] || mod);
                const modString = mods.length > 0 ? mods.join('+') + '+' : '';
                const command = `xdotool key ${modString}${key}`;

                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error('xdotool実行エラー:', error.message);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    /**
     * HTMLベースのポップアップウィンドウを作成
     */
    createPopupWindow(forceNormalSize = false) {
        // 既存のウィンドウが存在し、まだ破棄されていない場合は破棄
        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
            console.log('既存のポップアップウィンドウを破棄します');
            this.popupWindow.destroy();
            this.popupWindow = null;
        }

        console.log('新しいポップアップウィンドウを作成します');

        // 自動適用モードかどうかでウィンドウサイズを決定
        // ただし、forceNormalSizeがtrueの場合は常に通常サイズ（オンデマンドプロンプト用）
        const isAutoMode = this.settings.autoApplyAndClose && !forceNormalSize;
        const windowConfig = isAutoMode
            ? {
                width: 100,
                height: 100,
                minWidth: 100,
                minHeight: 100,
                maxWidth: 150,
                maxHeight: 150,
                resizable: false,
                scrollable: false,
            }
            : {
                width: 600,
                height: 300,
                minWidth: 400,
                minHeight: 200,
                maxWidth: 1000,
                maxHeight: 800,
                resizable: true,
            };

        console.log('ウィンドウサイズ設定:', isAutoMode ? '自動適用モード(100x100)' : '通常モード(600x300)');

        this.popupWindow = new BrowserWindow({
            ...windowConfig,
            alwaysOnTop: true,
            frame: false, // フレームレス
            transparent: false,
            movable: true,
            acceptFirstMouse: true,
            // titleBarStyle: 'hidden',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: join(__dirname, 'popup-preload.js')
            }
        });

        // スクロール可能なポップアップにするための CSS を挿入
        // ポイント:
        // - body をスクロール可能にする (overflow: auto)
        // - -webkit-app-region: drag をページ全体に適用するとスクロールや選択が阻害されるため
        //   ドラッグ領域は .drag-region (例えばヘッダ) のみとする
        // - 実際の UI 側ではヘッダ要素に .drag-region クラスを付けることを推奨
        this.popupWindow.webContents.on('dom-ready', () => {
            this.popupWindow.webContents.insertCSS(`
            /* 全体をスクロール可能に */
            html, body {
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: auto;
                -webkit-user-select: text;
                -webkit-touch-callout: default;
                -webkit-font-smoothing: antialiased;
                background-color: transparent;
            }

            /* ドラッグ可能領域は明示的な要素のみ */
            .drag-region,card-title{
                -webkit-app-region: drag;
            }

            /* 入力類やボタン等はドラッグ不可にして選択可能にする */
            button, a, input, textarea, select, svg, [data-no-drag] {
                -webkit-app-region: no-drag;
                -webkit-user-select: text;
            }

           
            ::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.2);
                border-radius: 6px;
            }
            `).catch(err => {
                console.error('ドラッグ/スクロール用CSS挿入エラー:', err);
            });
        });

        // macOS のウィンドウボタン（トラフィックライト）を非表示にする
        if (process.platform === 'darwin' && typeof this.popupWindow.setWindowButtonVisibility === 'function') {
            this.popupWindow.setWindowButtonVisibility(false);
        }

        this.popupWindow.loadFile('popup-ui.html');

        // ウィンドウが閉じられた時の処理
        this.popupWindow.on('closed', () => {
            console.log('ポップアップウィンドウが閉じられました');
            this.popupWindow = null;
            this.isShowingResult = false; // 結果表示フラグをリセット
            this.currentProcessingData = null; // 処理データもリセット

            // macOSでDockアイコンを再び非表示にする
            if (process.platform === 'darwin') {
                app.dock.hide();
            }
        });

        return this.popupWindow;
    }

    /**
     * ポップアップウィンドウを表示
     */
    showPopupWindow(mode = 'normal', cursorPosition = null) {
        // 既存のウィンドウがあれば閉じる
        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
            this.popupWindow.destroy();
            this.popupWindow = null;
        }

        // 新しいウィンドウを作成
        this.popupWindow = this.createPopupWindow(mode === 'onDemand');

        // 自動適用モード時のウィンドウサイズ調整
        if (mode === 'autoApply' && this.settings.autoApplyAndClose) {
            this.popupWindow.setSize(100, 100);
        } else {
            this.popupWindow.setSize(600, 300);
        }

        // カーソル位置を設定
        if (cursorPosition) {
            this.popupWindow.setPosition(cursorPosition.x, cursorPosition.y);
        } else {
            // デフォルト位置：画面中央
            const bounds = screen.getPrimaryDisplay().bounds;
            this.popupWindow.setPosition(
                Math.floor(bounds.x + (bounds.width - 600) / 2),
                Math.floor(bounds.y + (bounds.height - 300) / 2)
            );
        }

        // Dockに表示
        if (process.platform === 'darwin') {
            app.dock.show().catch(() => { });
        }

        // ウィンドウを表示
        this.popupWindow.show();
        this.popupWindow.focus();
    }

    /**
     * カーソル位置を取得
     */
    async getCursorPosition() {
        try {
            // 全ディスプレイ情報をログ出力
            const displays = screen.getAllDisplays();
            console.log('利用可能なディスプレイ:');
            displays.forEach((display, index) => {
                const bounds = display.bounds;
                const workArea = display.workArea;
                console.log(`  ディスプレイ ${index + 1} (${display.id}): 
                    bounds=(${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height}),
                    workArea=(${workArea.x}, ${workArea.y}, ${workArea.width}, ${workArea.height}),
                    primary=${display === screen.getPrimaryDisplay()}`);
            });

            // ElectronのAPIを使ってカーソル位置を取得
            const cursorPoint = screen.getCursorScreenPoint();
            console.log(`カーソル位置取得成功: マウス(${cursorPoint.x}, ${cursorPoint.y})`);
            return { x: cursorPoint.x, y: cursorPoint.y };
        } catch (error) {
            console.error('カーソル位置取得エラー:', error);
            // フォールバック：現在のディスプレイの中央を使用
            const display = screen.getPrimaryDisplay();
            const { width, height } = display.workAreaSize;
            const x = width / 2;
            const y = height / 2;
            console.log(`フォールバック位置を使用: (${x}, ${y})`);
            return { x, y };
        }
    }

    /**
     * テキスト生成モード用のポップアップを表示
     */
    async showTextGenerationPopup() {
        console.log('テキスト生成モードでポップアップを表示');

        // macOSでポップアップ表示時にDockアイコンを一時的に表示
        if (process.platform === 'darwin') {
            // app.dock.show();
        }

        // カーソル位置を取得
        const cursorPos = await this.getCursorPosition();

        // カーソル位置に最も近いディスプレイを取得
        const display = screen.getDisplayNearestPoint({ x: cursorPos.x, y: cursorPos.y });
        const { x: displayX, y: displayY, width: screenWidth, height: screenHeight } = display.workArea;

        console.log(`ディスプレイ情報: bounds=(${displayX}, ${displayY}, ${screenWidth}, ${screenHeight})`);
        console.log(`カーソル位置: (${cursorPos.x}, ${cursorPos.y})`);

        // ウィンドウサイズ
        const windowWidth = 400;
        const windowHeight = 300;

        // ウィンドウ位置を計算（カーソル近くに配置）
        let windowX = cursorPos.x + 20;
        let windowY = cursorPos.y + 20;

        // 画面境界チェック
        if (windowX + windowWidth > displayX + screenWidth) {
            windowX = cursorPos.x - windowWidth - 20;
        }
        if (windowY + windowHeight > displayY + screenHeight) {
            windowY = cursorPos.y - windowHeight - 20;
        }

        // 最小位置制限
        windowX = Math.max(displayX, windowX);
        windowY = Math.max(displayY, windowY);

        // ウィンドウを新規作成して表示（テキスト生成モード）
        this.showPopupWindow('textGeneration', { x: windowX, y: windowY });

        // テキスト生成モード用にウィンドウサイズを設定
        this.popupWindow.setSize(windowWidth, windowHeight);
        this.popupWindow.setResizable(false);

        // 新しい処理開始のため、結果表示フラグをリセット
        this.isShowingResult = false;

        // DOMの準備ができてからテキスト生成モードを表示
        this.popupWindow.webContents.once('dom-ready', () => {
            console.log('テキスト生成モード設定中');

            // テキスト生成モードであることを設定
            this.popupWindow.webContents.executeJavaScript(`
                window.isTextGenerationMode = true;
                window.isOnDemandMode = false;
            `);

            // テキスト生成モードを表示
            if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                this.popupWindow.webContents.executeJavaScript(`
                    if (typeof window.showTextGenerationMode === 'function') {
                        window.showTextGenerationMode();
                    } else {
                        console.error('showTextGenerationMode function not found');
                    }
                `);
            }
        });
    }

    /**
     * HTMLベースのポップアップを表示（プロンプト指定版）
     */
    async showActionPopupWithPrompt(selectedText, customPrompt) {
        // macOSでポップアップ表示時にDockアイコンを一時的に表示
        if (process.platform === 'darwin') {
            // app.dock.show();
        }

        // カーソル位置取得とウィンドウ表示を並列化
        // まずデフォルト位置でウィンドウを即座に表示
        const defaultBounds = screen.getPrimaryDisplay().bounds;
        const defaultX = Math.floor(defaultBounds.x + (defaultBounds.width - 700) / 2);
        const defaultY = Math.floor(defaultBounds.y + (defaultBounds.height - 350) / 2);

        // ウィンドウを新規作成して表示（通常のアクションモード）
        this.showPopupWindow('action', { x: defaultX, y: defaultY });

        // 新しい処理開始のため、結果表示フラグをリセット
        this.isShowingResult = false;

        // DOMの準備ができてから処理を実行
        this.popupWindow.webContents.once('dom-ready', () => {
            // 通常の翻訳モードであることを設定
            this.popupWindow.webContents.executeJavaScript(`
                window.isOnDemandMode = false;
            `);

            // 自動適用モードでも処理中画面を表示
            if (this.settings.autoApplyAndClose) {
                // ウィンドウサイズを一時的に拡大
                console.log('自動適用モード: 処理中画面表示のためウィンドウサイズを拡大');
                this.popupWindow.setSize(300, 300);
                this.popupWindow.setResizable(false);
            }

            // 処理中画面を表示
            this.popupWindow.webContents.executeJavaScript(`
                showProcessingScreen('translation');
            `);

            // LLM処理を非同期で実行（UIをブロックしない）- カスタムプロンプトを使用
            this.processTextWithCustomPrompt(selectedText, customPrompt)
                .catch(error => {
                    console.error('処理エラー:', error);
                    // エラー時の処理
                    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                        this.popupWindow.webContents.executeJavaScript(`
                            showError(${JSON.stringify(error.message || 'Processing failed')});
                        `);
                    }
                });
        });

        // カーソル位置を取得して最適な位置に移動（バックグラウンドで実行）
        this.getCursorPosition().then(cursorPos => {
            if (!this.popupWindow || this.popupWindow.isDestroyed()) return;

            // カーソル位置に最も近いディスプレイを取得
            const display = screen.getDisplayNearestPoint({ x: cursorPos.x, y: cursorPos.y });
            const { x: displayX, y: displayY, width: screenWidth, height: screenHeight } = display.workArea;

            console.log(`ディスプレイ情報: bounds=(${displayX}, ${displayY}, ${screenWidth}, ${screenHeight})`);
            console.log(`カーソル位置: (${cursorPos.x}, ${cursorPos.y})`);

            // ウィンドウサイズを考慮して位置を調整（2段組レイアウト対応）
            const windowWidth = 700;
            const windowHeight = 350;

            // カーソル位置を基準にしつつ、ディスプレイの作業領域内に収める
            let x = cursorPos.x;
            let y = cursorPos.y;

            // 画面右端からはみ出す場合は左に移動
            if (x + windowWidth > displayX + screenWidth) {
                x = displayX + screenWidth - windowWidth - 20;
            }

            // 画面下端からはみ出す場合は上に移動
            if (y + windowHeight > displayY + screenHeight) {
                y = displayY + screenHeight - windowHeight - 20;
            }

            // 画面左端・上端からはみ出さないよう調整
            x = Math.max(displayX + 20, x);
            y = Math.max(displayY + 20, y);

            console.log(`調整後ポップアップ位置: (${x}, ${y}), カーソル位置: (${cursorPos.x}, ${cursorPos.y})`);
            console.log(`ディスプレイ作業領域: (${displayX}, ${displayY}) - (${displayX + screenWidth}, ${displayY + screenHeight})`);

            // 最適な位置に移動
            this.popupWindow.setPosition(x, y);
        }).catch(error => {
            console.error('カーソル位置取得エラー:', error);
            // エラーが発生してもウィンドウは既に表示されているので問題なし
        });
    }

    /**
     * HTMLベースのポップアップを表示（デフォルトプロンプト使用）
     */
    async showActionPopup(selectedText) {
        // デフォルトで最初の事前プロンプトを使用
        const defaultPrompt = this.settings.presetPrompts && this.settings.presetPrompts[0]
            ? this.settings.presetPrompts[0].prompt
            : '日本語と英語を相互翻訳してください。入力されたテキストの言語を自動判定して、もう一方の言語に翻訳してください。';

        return this.showActionPopupWithPrompt(selectedText, defaultPrompt);
    }

    /**
     * オンデマンドプロンプト入力画面を表示
     */
    async showOnDemandPromptInput(selectedText) {
        // macOSでポップアップ表示時にDockアイコンを一時的に表示
        if (process.platform === 'darwin') {
            // app.dock.show();
        }

        // カーソル位置を取得してポップアップ位置を調整
        const { x, y } = await this.getCursorPosition();

        // ウィンドウサイズと画面境界を考慮した位置調整
        const displays = screen.getAllDisplays();
        const cursorDisplay = displays.find(display => {
            const { x: dx, y: dy, width, height } = display.bounds;
            return x >= dx && x < dx + width && y >= dy && y < dy + height;
        }) || screen.getPrimaryDisplay();

        console.log('ディスプレイ情報:', cursorDisplay.bounds);
        console.log('カーソル位置:', { x, y });

        const windowWidth = 600;
        const windowHeight = 400;

        let adjustedX = x;
        let adjustedY = y - windowHeight / 2;

        // 画面境界内に収める
        const workArea = cursorDisplay.workArea;
        adjustedX = Math.max(workArea.x, Math.min(adjustedX, workArea.x + workArea.width - windowWidth));
        adjustedY = Math.max(workArea.y, Math.min(adjustedY, workArea.y + workArea.height - windowHeight));

        console.log('調整後ポップアップ位置:', { x: adjustedX, y: adjustedY }, 'カーソル位置:', { x, y });
        console.log('ディスプレイ作業領域:', `(${workArea.x}, ${workArea.y}) - (${workArea.x + workArea.width}, ${workArea.y + workArea.height})`);

        // ウィンドウを新規作成して表示（オンデマンドモード）
        this.showPopupWindow('onDemand', { x: adjustedX, y: adjustedY });

        // 新しい処理開始のため、結果表示フラグをリセット
        this.isShowingResult = false;

        // オンデマンドプロンプト入力モードで画面を初期化
        console.log('オンデマンドプロンプト入力画面を表示:', selectedText);

        // DOMの準備ができてからオンデマンドプロンプト画面を表示
        this.popupWindow.webContents.once('dom-ready', () => {
            if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                this.popupWindow.webContents.executeJavaScript(`
                    window.isOnDemandMode = true;
                    window.showOnDemandPromptInput(${JSON.stringify(selectedText)});
                `);
            }
        });
    }

    /**
     * IPCイベントハンドラーを設定
     */
    setupIPCHandlers() {
        // 既存のハンドラーを削除（重複エラーを防ぐため）
        const handlers = [
            'close-window',
            'apply-result',
            'process-on-demand-prompt',
            'get-settings',
            'save-settings',
            'close-settings-window',
            'get-default-settings',
            'reset-settings',
            'get-i18n-data',
            'get-translation',
            'change-language',
            'get-current-language',
            'validate-shortcut-key',
            'get-default-prompt',
            'process-text-generation',
            'restart-app',
            'test-llm-connection'
        ];

        handlers.forEach(handler => {
            try {
                ipcMain.removeHandler(handler);
            } catch (error) {
                // ハンドラーが存在しない場合は無視
            }
        });

        // ウィンドウを閉じる（非表示にする）
        ipcMain.handle('close-window', () => {
            if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                this.popupWindow.close(); // close イベント -> hide() トリガー
            }
            this.isShowingResult = false; // 結果表示フラグをリセット
            this.currentProcessingData = null; // 処理データもリセット
        });

        // 結果適用
        ipcMain.handle('apply-result', async () => {
            return await this.handleApplyResult();
        });

        // オンデマンドプロンプト処理
        ipcMain.handle('process-on-demand-prompt', async (event, userPrompt, selectedText) => {
            console.log('オンデマンドプロンプト処理開始:', { selectedText, userPrompt });
            return await this.processTextWithOnDemandPrompt(selectedText, userPrompt);
        });

        // 設定関連のIPCハンドラー
        ipcMain.handle('get-settings', () => {
            return this.settings;
        });

        ipcMain.handle('save-settings', async (event, newSettings) => {
            const oldLanguage = this.settings.language;
            const oldLLMConfig = JSON.stringify(this.getLLMConfig());
            const oldShortcutKey = this.settings.shortcutKey;

            await this.saveSettings(newSettings);

            // UI言語が変更された場合、i18nの言語も変更
            if (newSettings.language && newSettings.language !== oldLanguage) {
                await changeLanguage(newSettings.language);
                // トレイメニューを再作成
                this.createTray();
            }

            // LLM設定が変更された場合、LLMエンジンを再初期化
            const newLLMConfig = JSON.stringify(this.getLLMConfig());
            if (newLLMConfig !== oldLLMConfig) {
                this.llmEngine = new SimpleLLMEngine(this.getLLMConfig());
                console.log('LLM設定を更新しました:', this.getLLMConfig());
            }

            // ショートカットキーが変更された場合、ショートカットを再登録
            if (newSettings.shortcutKey && newSettings.shortcutKey !== oldShortcutKey) {
                // 既存のショートカットを解除
                globalShortcut.unregisterAll();
                // 新しいショートカットを登録
                this.registerGlobalShortcuts();
                console.log('ショートカットキーを更新しました:', this.settings.shortcutKey);
            }

            return true;
        });

        ipcMain.handle('close-settings-window', () => {
            if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
                this.settingsWindow.close();
            }
        });

        // デフォルト設定を取得
        ipcMain.handle('get-default-settings', () => {
            return {
                translationLanguages: {
                    language1: 'ja',
                    language2: 'en'
                },
                autoApplyAndClose: false,
                language: 'en',
                llmProvider: 'local',
                llmEndpoint: 'http://127.0.0.1:1234/v1',
                apiKey: '',
                modelName: 'gpt-4o-mini',
                maxTokens: 4096,
                shortcutKey: 'Ctrl+Space',
                processingMode: 'translation',
                customPrompt: 'Please process the following text and provide an improved version:'
            };
        });

        // 設定をリセット
        ipcMain.handle('reset-settings', async () => {
            const defaultSettings = {
                autoApplyAndClose: false,
                language: 'en',
                llmProvider: 'local',
                llmEndpoint: 'http://127.0.0.1:1234/v1',
                apiKey: '',
                modelName: 'gpt-4o-mini',
                maxTokens: 4096,
                shortcutKey: 'Ctrl+1',
                onDemandShortcutKey: 'Ctrl+2',
                customPrompt: '日本語と英語を相互翻訳してください。入力されたテキストの言語を自動判定して、もう一方の言語に翻訳してください。'
            };

            const oldLanguage = this.settings.language;
            const oldLLMEndpoint = this.settings.llmEndpoint;
            const oldShortcutKey = this.settings.shortcutKey;

            // 設定をデフォルト値に更新
            this.settings = { ...defaultSettings };
            await this.saveSettings();

            // UI言語がリセットされた場合、i18nの言語も変更
            if (defaultSettings.language !== oldLanguage) {
                await changeLanguage(defaultSettings.language);
                // トレイメニューを再作成
                this.createTray();
            }

            // LLMエンドポイントがリセットされた場合、LLMエンジンを再初期化
            if (defaultSettings.llmEndpoint !== oldLLMEndpoint) {
                this.llmEngine = new SimpleLLMEngine({
                    apiEndpoint: this.settings.llmEndpoint,
                    model: 'local-model'
                });
                console.log('LLMエンドポイントをリセットしました:', this.settings.llmEndpoint);
            }

            // ショートカットキーがリセットされた場合、ショートカットを再登録
            if (defaultSettings.shortcutKey !== oldShortcutKey) {
                // 既存のショートカットを解除
                globalShortcut.unregisterAll();
                // 新しいショートカットを登録
                this.registerGlobalShortcuts();
                console.log('ショートカットキーをリセットしました:', this.settings.shortcutKey);
            }

            console.log('設定をリセットしました:', this.settings);
            return this.settings;
        });

        // i18n関連のIPCハンドラー
        ipcMain.handle('get-i18n-data', () => {
            return getI18nData();
        });

        ipcMain.handle('get-translation', (event, key, options = {}) => {
            return t(key, options);
        });

        ipcMain.handle('change-language', async (event, language) => {
            const success = await changeLanguage(language);
            if (success) {
                this.settings.language = language;
                await this.saveSettings();
                // トレイメニューを再作成
                this.createTray();
            }
            return success;
        });

        ipcMain.handle('get-current-language', () => {
            return getCurrentLanguage();
        });

        // ショートカットキー検証のIPCハンドラー
        ipcMain.handle('validate-shortcut-key', (event, shortcut) => {
            return this.validateShortcutKey(shortcut);
        });

        // デフォルトプロンプト取得のIPCハンドラー
        ipcMain.handle('get-default-prompt', () => {
            return '日本語と英語を相互翻訳してください。入力されたテキストの言語を自動判定して、もう一方の言語に翻訳してください。';
        });

        // テキスト生成処理のIPCハンドラー
        ipcMain.handle('process-text-generation', async (event, userPrompt) => {
            console.log('IPCハンドラー: テキスト生成処理開始:', userPrompt);
            const result = await this.processTextGeneration(userPrompt);

            if (result.success && this.popupWindow && !this.popupWindow.isDestroyed()) {
                console.log('テキスト生成成功、結果を表示:', result.generatedText);
                // 生成されたテキストを結果表示
                this.popupWindow.webContents.executeJavaScript(`
                    console.log('IPCからshowTextGenerationResult呼び出し:', ${JSON.stringify(result.generatedText)});
                    window.showTextGenerationResult(${JSON.stringify(result.generatedText)});
                `);
            } else if (!result.success && this.popupWindow && !this.popupWindow.isDestroyed()) {
                console.log('テキスト生成失敗:', result.error);
                // エラーメッセージを表示
                this.popupWindow.webContents.executeJavaScript(`
                    document.getElementById('processing').style.display = 'none';
                    alert('テキスト生成に失敗しました: ${result.error}');
                    window.showTextGenerationMode();
                `);
            }

            return result;
        });

        // アプリケーション再起動のIPCハンドラー
        ipcMain.handle('restart-app', () => {
            app.relaunch();
            app.exit();
        });

        // LLM接続テストのIPCハンドラー
        ipcMain.handle('test-llm-connection', async (event, config) => {
            try {
                console.log('LLM接続テスト開始:', config);

                // 一時的なLLMエンジンを作成してテスト
                const testConfig = {
                    provider: config.provider,
                    apiEndpoint: config.endpoint,
                    apiKey: config.apiKey,
                    model: config.modelName || 'local-model',
                    maxTokens: config.maxTokens || 4096
                };

                const testEngine = new SimpleLLMEngine(testConfig);

                // 簡単なテストプロンプトを実行
                const result = await testEngine.processCustomPrompt('Hello', 'Say "Connection successful" in response.');

                if (result.success) {
                    console.log('LLM接続テスト成功');
                    return { success: true };
                } else {
                    console.log('LLM接続テスト失敗:', result.error);
                    return { success: false, error: result.error };
                }
            } catch (error) {
                console.error('LLM接続テストエラー:', error);
                return { success: false, error: error.message };
            }
        });

        // レンダラープロセスからのログ出力用IPCハンドラー（同期処理）
        ipcMain.on('main-log', (event, ...args) => {
            console.log('[Renderer]', ...args);
        });

        ipcMain.on('main-warn', (event, ...args) => {
            console.warn('[Renderer]', ...args);
        });

        ipcMain.on('main-error', (event, ...args) => {
            console.error('[Renderer]', ...args);
        });

        console.log('IPC設定完了');
    }

    /**
     * テキスト生成処理
     */
    async processTextGeneration(userPrompt) {
        try {
            console.log('テキスト生成処理開始:', { userPrompt });

            let streamingText = '';

            // ストリーミングコールバック関数
            const onChunk = (chunk, fullText) => {
                streamingText = fullText;
                // リアルタイムで結果を更新
                if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                    const cleanedText = this.llmEngine.cleanLLMResponse(streamingText);
                    this.popupWindow.webContents.executeJavaScript(`
                        if (typeof window.updateStreamingResult === 'function') {
                            window.updateStreamingResult(${JSON.stringify(cleanedText)});
                        }
                    `).catch(err => {
                        console.error('ストリーミング更新エラー:', err);
                    });
                }
            };

            // ユーザープロンプトをそのまま使ってLLMで処理（ストリーミング）
            const result = await this.llmEngine.processCustomPromptStreaming('', userPrompt, onChunk);

            if (result.success) {
                const generatedText = result.processedText;

                // 結果をポップアップウィンドウに表示用のデータとして保存
                this.currentProcessingData = {
                    original: '', // テキスト生成モードでは元テキストはなし
                    result: generatedText,
                    action: 'text-generation',
                    mode: 'text-generation',
                    userPrompt: userPrompt
                };

                return {
                    success: true,
                    generatedText: generatedText
                };
            } else {
                console.error('テキスト生成失敗:', result.error);
                return {
                    success: false,
                    error: result.error || 'テキスト生成に失敗しました'
                };
            }
        } catch (error) {
            console.error('テキスト生成処理エラー:', error);
            return {
                success: false,
                error: error.message || 'テキスト生成処理中にエラーが発生しました'
            };
        }
    }

    /**
     * オンデマンドプロンプトでテキストを処理
     */
    async processTextWithOnDemandPrompt(selectedText, userPrompt) {
        try {
            console.log('オンデマンドプロンプト処理開始:', { selectedText, userPrompt });

            let streamingText = '';

            // ストリーミングコールバック関数
            const onChunk = (chunk, fullText) => {
                streamingText = fullText;
                // リアルタイムで結果を更新
                if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                    const cleanedText = this.llmEngine.cleanLLMResponse(streamingText);
                    this.popupWindow.webContents.executeJavaScript(`
                        if (typeof window.updateStreamingResult === 'function') {
                            window.updateStreamingResult(${JSON.stringify(cleanedText)});
                        }
                    `).catch(err => {
                        console.error('ストリーミング更新エラー:', err);
                    });
                }
            };

            // カスタムプロンプトとしてユーザーの指示を使用（ストリーミング）
            // inputText: 選択されたテキスト（処理対象）, customPrompt: ユーザープロンプト（処理指示）
            const result = await this.llmEngine.processCustomPromptStreaming(selectedText, userPrompt, onChunk);

            if (result.success) {
                const processedText = result.processedText;

                if (processedText && processedText !== selectedText) {
                    // 結果をポップアップウィンドウに表示
                    this.currentProcessingData = {
                        original: selectedText,
                        result: processedText,
                        action: 'on-demand-prompt',
                        mode: 'on-demand',
                        userPrompt: userPrompt
                    };

                    // オンデマンドプロンプトモードでは自動適用を行わず、常に結果を表示
                    // 自動適用は翻訳モード（通常処理）でのみ有効
                    if (this.popupWindow) {
                        this.popupWindow.webContents.executeJavaScript(`
                            window.showProcessingResult(${JSON.stringify(selectedText)}, ${JSON.stringify(processedText)});
                        `);

                        // 結果表示中フラグを設定
                        this.isShowingResult = true;
                    }

                    return {
                        success: true,
                        originalText: selectedText,
                        processedText: processedText
                    };
                } else {
                    console.log('変更なし:', selectedText);
                    // オンデマンドプロンプトモードでは自動適用せず、変更なしメッセージを表示
                    if (this.popupWindow) {
                        const noChangeMessage = await t('processing.messages.no_change');
                        this.popupWindow.webContents.executeJavaScript(`
                            window.showProcessingMessage('${noChangeMessage}', 'info');
                        `);
                    }

                    return {
                        success: true,
                        originalText: selectedText,
                        processedText: selectedText,
                        noChange: true
                    };
                }
            } else {
                console.error('オンデマンドプロンプト処理エラー:', result.error);

                // オンデマンドプロンプトモードでは自動適用せず、エラーメッセージを表示
                if (this.popupWindow) {
                    const errorMessage = await t('processing.messages.error', { error: result.error });
                    this.popupWindow.webContents.executeJavaScript(`
                        window.showProcessingMessage('${errorMessage}', 'error');
                    `);
                }

                return {
                    success: false,
                    error: result.error,
                    originalText: selectedText,
                    processedText: selectedText
                };
            }
        } catch (error) {
            console.error('オンデマンドプロンプト処理実行エラー:', error);

            // オンデマンドプロンプトモードでは自動適用せず、エラーメッセージを表示
            if (this.popupWindow) {
                const errorMessage = await t('processing.messages.error', { error: error.message });
                this.popupWindow.webContents.executeJavaScript(`
                    window.showProcessingMessage('${errorMessage}', 'error');
                `);
            }

            return {
                success: false,
                error: error.message,
                originalText: selectedText,
                processedText: selectedText
            };
        }
    }

    /**
     * 結果適用処理
     */
    async handleApplyResult() {
        // 既にApply処理中の場合は無視
        if (this.isApplying) {
            console.log('Apply処理中のため、リクエストを無視します');
            return;
        }

        if (this.currentProcessingData && this.currentProcessingData.result) {
            this.isApplying = true;

            try {
                console.log('Apply処理開始 - 結果:', this.currentProcessingData.result);
                console.log('Apply処理開始 - 元テキスト:', this.currentProcessingData.original);
                console.log('Apply処理開始 - モード:', this.currentProcessingData.mode);

                if (this.currentProcessingData.mode === 'text-generation') {
                    // テキスト生成モードの場合は挿入処理
                    await this.insertGeneratedText(this.currentProcessingData.result);
                    console.log('テキスト挿入完了');
                } else {
                    // 通常モードの場合は置換処理
                    await this.applyTextReplacement(this.currentProcessingData.result);
                    console.log('テキスト置換完了');
                }

                // 少し待ってからウィンドウを閉じる
                setTimeout(() => {
                    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                        this.popupWindow.close();
                    }
                    this.isApplying = false; // フラグをリセット
                    this.isShowingResult = false; // 結果表示フラグもリセット
                }, 200); // 少し長めに変更

            } catch (error) {
                console.error('テキスト置換エラー:', error);
                // エラーの場合でも少し待ってからウィンドウを閉じる
                setTimeout(() => {
                    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                        this.popupWindow.close();
                    }
                    this.isApplying = false; // フラグをリセット
                    this.isShowingResult = false; // 結果表示フラグもリセット
                }, 200);
            }
        }
    }

    /**
     * テキストを指定されたカスタムプロンプトで処理
     */
    async processTextWithCustomPrompt(text, customPrompt) {
        try {
            console.log('カスタムプロンプト処理開始:', { text, customPrompt });

            let streamingText = '';

            // ストリーミングコールバック関数
            const onChunk = (chunk, fullText) => {
                streamingText = fullText;
                // リアルタイムで結果を更新
                if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                    const cleanedText = this.llmEngine.extractCorrectedText(streamingText);
                    this.popupWindow.webContents.executeJavaScript(`
                        if (typeof window.updateStreamingResult === 'function') {
                            window.updateStreamingResult(${JSON.stringify(cleanedText)});
                        }
                    `).catch(err => {
                        console.error('ストリーミング更新エラー:', err);
                    });
                }
            };

            // カスタムプロンプトで処理（ストリーミング）
            const result = await this.llmEngine.processCustomPromptStreaming(text, customPrompt, onChunk);

            if (result.success) {
                const processedText = result.correctedText || result.translatedText || result.processedText;

                if (processedText && processedText !== text) {
                    // 結果をポップアップウィンドウに表示
                    this.currentProcessingData = {
                        original: text,
                        result: processedText,
                        action: 'custom-prompt'
                    };

                    // 自動適用・閉じる設定が有効な場合は直接適用
                    if (this.settings.autoApplyAndClose) {
                        // 結果を直接適用（表示しない）
                        console.log('自動適用モード: 結果を直接適用します');
                        await this.handleApplyResult();
                    } else {
                        // 通常モード：結果を表示
                        if (this.popupWindow) {
                            this.popupWindow.webContents.executeJavaScript(`
                                window.showProcessingResult(${JSON.stringify(text)}, ${JSON.stringify(processedText)});
                            `);

                            // 結果表示中フラグを設定
                            this.isShowingResult = true;
                        }
                    }
                } else {
                    console.log('変更なし:', text);
                    // 自動適用モードの場合はウィンドウを閉じる
                    if (this.settings.autoApplyAndClose) {
                        console.log('自動適用モード: 変更なしのためウィンドウを閉じます');
                        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                            this.popupWindow.close();
                        }
                        this.isProcessing = false;
                        this.isShowingResult = false;
                    } else {
                        // 通常モード：変更なしのメッセージを表示
                        if (this.popupWindow) {
                            this.popupWindow.webContents.executeJavaScript(`
                                window.showProcessingMessage('${t('processing.messages.no_change')}', 'info');
                            `);
                        }
                    }
                }
            } else {
                console.error('カスタムプロンプト処理エラー:', result.error);
                // 自動適用モードの場合はウィンドウを閉じる
                if (this.settings.autoApplyAndClose) {
                    console.log('自動適用モード: エラーのためウィンドウを閉じます');
                    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                        this.popupWindow.close();
                    }
                    this.isProcessing = false;
                    this.isShowingResult = false;
                } else {
                    // 通常モード：エラーメッセージを表示
                    if (this.popupWindow) {
                        this.popupWindow.webContents.executeJavaScript(`
                            window.showProcessingMessage('${t('processing.messages.error', { error: result.error })}', 'error');
                        `);
                    }
                }
            }
        } catch (error) {
            console.error('カスタムプロンプト処理実行エラー:', error);
            // 自動適用モードの場合はウィンドウを閉じる
            if (this.settings.autoApplyAndClose) {
                console.log('自動適用モード: 処理エラーのためウィンドウを閉じます');
                if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                    this.popupWindow.close();
                }
                this.isProcessing = false;
                this.isShowingResult = false;
            } else {
                // 通常モード：エラーメッセージを表示
                if (this.popupWindow) {
                    this.popupWindow.webContents.executeJavaScript(`
                        window.showProcessingMessage('${t('processing.messages.error', { error: error.message })}', 'error');
                    `);
                }
            }
        }
    }

    /**
     * テキストを指定された処理で実行
     */
    async processTextWithAction(text, action) {
        try {
            console.log('LLM処理開始:', { text, action });

            let result;
            let streamingText = '';

            // ストリーミングコールバック関数
            const onChunk = (chunk, fullText) => {
                streamingText = fullText;
                // リアルタイムで結果を更新
                if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                    const cleanedText = this.llmEngine.extractCorrectedText(streamingText);
                    this.popupWindow.webContents.executeJavaScript(`
                        if (typeof window.updateStreamingResult === 'function') {
                            window.updateStreamingResult(${JSON.stringify(cleanedText)});
                        }
                    `).catch(err => {
                        console.error('ストリーミング更新エラー:', err);
                    });
                }
            };

            // Ctrl+1で実行 - プロンプト処理（ストリーミング）
            const customPrompt = this.settings.presetPrompts && this.settings.presetPrompts[0]
                ? this.settings.presetPrompts[0].prompt
                : '日本語と英語を相互翻訳してください。入力されたテキストの言語を自動判定して、もう一方の言語に翻訳してください。';

            result = await this.llmEngine.processCustomPromptStreaming(text, customPrompt, onChunk);

            if (result.success) {
                const processedText = result.correctedText || result.translatedText || result.processedText;

                if (processedText && processedText !== text) {
                    // 結果をポップアップウィンドウに表示
                    this.currentProcessingData = {
                        original: text,
                        result: processedText,
                        action: action
                    };

                    // 自動適用・閉じる設定が有効な場合は直接適用
                    if (this.settings.autoApplyAndClose) {
                        // 結果を直接適用（表示しない）
                        console.log('自動適用モード: 結果を直接適用します');
                        await this.handleApplyResult();
                    } else {
                        // 通常モード：結果を表示
                        if (this.popupWindow) {
                            this.popupWindow.webContents.executeJavaScript(`
                                window.showProcessingResult(${JSON.stringify(text)}, ${JSON.stringify(processedText)});
                            `);

                            // 結果表示中フラグを設定
                            this.isShowingResult = true;
                        }
                    }
                } else {
                    console.log('変更なし:', text);
                    // 自動適用モードの場合はウィンドウを閉じる
                    if (this.settings.autoApplyAndClose) {
                        console.log('自動適用モード: 変更なしのためウィンドウを閉じます');
                        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                            this.popupWindow.close();
                        }
                        this.isProcessing = false;
                        this.isShowingResult = false;
                    } else {
                        // 通常モード：変更なしのメッセージを表示
                        if (this.popupWindow) {
                            this.popupWindow.webContents.executeJavaScript(`
                                window.showProcessingMessage('${t('processing.messages.no_change')}', 'info');
                            `);
                        }
                    }
                }
            } else {
                console.error('LLM処理エラー:', result.error);
                // 自動適用モードの場合はウィンドウを閉じる
                if (this.settings.autoApplyAndClose) {
                    console.log('自動適用モード: エラーのためウィンドウを閉じます');
                    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                        this.popupWindow.close();
                    }
                    this.isProcessing = false;
                    this.isShowingResult = false;
                } else {
                    // 通常モード：エラーメッセージを表示
                    if (this.popupWindow) {
                        this.popupWindow.webContents.executeJavaScript(`
                            window.showProcessingMessage('${t('processing.messages.error', { error: result.error })}', 'error');
                        `);
                    }
                }
            }
        } catch (error) {
            console.error('処理実行エラー:', error);
            // 自動適用モードの場合はウィンドウを閉じる
            if (this.settings.autoApplyAndClose) {
                console.log('自動適用モード: 処理エラーのためウィンドウを閉じます');
                if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                    this.popupWindow.close();
                }
                this.isProcessing = false;
                this.isShowingResult = false;
            } else {
                // 通常モード：エラーメッセージを表示
                if (this.popupWindow) {
                    this.popupWindow.webContents.executeJavaScript(`
                        window.showProcessingMessage('${t('processing.messages.error', { error: error.message })}', 'error');
                    `);
                }
            }
        }
    }

    /**
     * 生成されたテキストを現在のカーソル位置に挿入（クロスプラットフォーム対応）
     */
    async insertGeneratedText(generatedText) {
        return new Promise((resolve, reject) => {
            try {
                console.log('テキスト挿入実行:', generatedText);

                // 現在のクリップボードを保存
                const originalClipboard = clipboard.readText();
                console.log('元クリップボード内容:', originalClipboard.substring(0, 50) + '...');

                // 生成されたテキストをクリップボードに設定
                clipboard.writeText(generatedText);

                // クリップボードが正しく設定されたことを確認
                const verifyClipboard = clipboard.readText();
                console.log('設定後クリップボード:', verifyClipboard.substring(0, 50) + '...');

                if (verifyClipboard !== generatedText) {
                    console.error('クリップボード設定失敗:', verifyClipboard, '≠', generatedText);
                    reject(new Error('クリップボード設定失敗'));
                    return;
                }

                // 元のアプリケーションにフォーカスを戻してからテキストを挿入
                if (this.isMac()) {
                    // macOS: AppleScriptでフォーカス
                    const targetApp = this.selectionContext?.appName || 'System Events';
                    console.log('対象アプリに戻る:', targetApp);

                    const focusScript = `tell application "${targetApp}" to activate`;
                    exec(`osascript -e '${focusScript}'`, (error, stdout, stderr) => {
                        if (error) {
                            console.error('アプリケーションフォーカスエラー:', error);
                            // エラーでも続行
                        }

                        // 少し待ってからCmd+V (Mac) または Ctrl+V (Windows)を実行
                        setTimeout(() => {
                            const cmdKey = this.getCmdKey();
                            this.simulateKeyPress('v', [cmdKey]).then(() => {
                                console.log(`${this.getCmdKeyDisplay()}+V実行完了`);

                                // 少し待ってからクリップボードを復元
                                setTimeout(() => {
                                    clipboard.writeText(originalClipboard);
                                    console.log('クリップボード復元完了');
                                    resolve();
                                }, 200);
                            }).catch(reject);
                        }, 300); // フォーカス切り替え後の待機時間を延長
                    });
                } else {
                    // Windows/Linux: 直接Ctrl+Vを実行（フォーカスは自動的に戻る想定）
                    setTimeout(() => {
                        const cmdKey = this.getCmdKey();
                        this.simulateKeyPress('v', [cmdKey]).then(() => {
                            console.log(`${this.getCmdKeyDisplay()}+V実行完了`);

                            // 少し待ってからクリップボードを復元
                            setTimeout(() => {
                                clipboard.writeText(originalClipboard);
                                console.log('クリップボード復元完了');
                                resolve();
                            }, 200);
                        }).catch(reject);
                    }, 300);
                }

            } catch (error) {
                console.error('テキスト挿入エラー:', error);
                reject(error);
            }
        });
    }

    /**
     * テキストを置換適用（改良版・アプリケーション名正規化対応）
     * 注意: 現在の実装はmacOS専用です。Windows/Linuxでは動作しません。
     */
    async applyTextReplacement(newText) {
        return new Promise((resolve, reject) => {
            try {
                console.log('テキスト置換実行:', newText);
                console.log('対象アプリ:', this.selectionContext.appName);
                console.log('プラットフォーム:', process.platform);

                // macOS以外では未サポート
                if (!this.isMac()) {
                    console.warn('テキスト置換機能は現在macOSでのみサポートされています');
                    console.warn('代替としてクリップボードにコピーします');
                    clipboard.writeText(newText);
                    resolve();
                    return;
                }

                // 現在のクリップボードを保存
                const originalClipboard = clipboard.readText();
                console.log('元クリップボード内容:', originalClipboard.substring(0, 50) + '...');

                // 新しいテキストをクリップボードに設定
                clipboard.writeText(newText);

                // クリップボードが正しく設定されたことを確認
                const verifyClipboard = clipboard.readText();
                console.log('設定後クリップボード:', verifyClipboard.substring(0, 50) + '...');

                if (verifyClipboard !== newText) {
                    console.error('クリップボード設定失敗:', verifyClipboard, '≠', newText);
                    reject(new Error('クリップボード設定失敗'));
                    return;
                }

                // アプリケーション名を正規化
                const normalizedAppName = this.normalizeAppName(this.selectionContext.appName);
                console.log('正規化後のアプリ名:', normalizedAppName);

                // 最初に特定のアプリケーションを対象にした置換を試行
                this.tryAppSpecificReplacement(normalizedAppName, originalClipboard, resolve, reject);

            } catch (error) {
                console.error('テキスト置換エラー:', error);
                reject(error);
            }
        });
    }

    /**
     * アプリケーション名を正規化（bundle ID対応）
     */
    normalizeAppName(appName) {
        const appNameMappings = {
            'MSTeams': 'Microsoft Teams',
            'Microsoft Teams': 'Microsoft Teams',
            'Teams': 'Microsoft Teams',
            'Slack': 'Slack',
            'Google Chrome': 'Google Chrome',
            'Chrome': 'Google Chrome',
            'Safari': 'Safari',
            'Firefox': 'Firefox',
            'Visual Studio Code': 'Visual Studio Code',
            'Code': 'Visual Studio Code',
            'Xcode': 'Xcode',
            'TextEdit': 'TextEdit',
            'Notes': 'Notes',
            'Mail': 'Mail',
            'Terminal': 'Terminal'
        };

        // Bundle IDベースの正規化も試行
        const bundleIdMappings = {
            'com.microsoft.teams2': 'Microsoft Teams',
            'com.microsoft.teams': 'Microsoft Teams',
            'com.tinyspeck.slackmacgap': 'Slack',
            'com.google.Chrome': 'Google Chrome',
            'com.apple.Safari': 'Safari',
            'org.mozilla.firefox': 'Firefox',
            'com.microsoft.VSCode': 'Visual Studio Code',
            'com.apple.dt.Xcode': 'Xcode',
            'com.apple.TextEdit': 'TextEdit',
            'com.apple.Notes': 'Notes',
            'com.apple.mail': 'Mail',
            'com.apple.Terminal': 'Terminal'
        };

        // まずアプリケーション名で正規化を試行
        let normalized = appNameMappings[appName];

        // Bundle IDが利用可能な場合、それも参照
        if (!normalized && this.selectionContext && this.selectionContext.bundleId) {
            normalized = bundleIdMappings[this.selectionContext.bundleId];
        }

        return normalized || appName;
    }

    /**
     * アプリケーション固有の置換を試行（macOS専用）
     */
    tryAppSpecificReplacement(appName, originalClipboard, resolve, reject) {
        // 複数の方法でアプリケーション置換を試行
        const attempts = [
            () => this.tryAppNameReplacement(appName, resolve, reject, originalClipboard),
            () => this.tryBundleIdReplacement(resolve, reject, originalClipboard),
            () => this.tryDisplayNameReplacement(resolve, reject, originalClipboard)
        ];

        let currentAttempt = 0;

        const executeNextAttempt = () => {
            if (currentAttempt >= attempts.length) {
                console.warn('全てのアプリケーション固有の置換が失敗');
                console.warn('フォールバック処理を実行します');
                this.tryGenericReplacement(originalClipboard, resolve, reject);
                return;
            }

            attempts[currentAttempt]();
            currentAttempt++;
        };

        // 最初の試行から開始
        executeNextAttempt();

        // 各試行メソッドで失敗した場合に次の試行を実行するためのコールバック
        this._executeNextAttempt = executeNextAttempt;
    }

    /**
     * アプリケーション名による置換を試行（macOS専用 - AppleScript使用）
     */
    tryAppNameReplacement(appName, resolve, reject, originalClipboard) {
        const replaceScript = `
            tell application "${appName}"
                activate
            end tell
            
            delay 0.05
            
            tell application "System Events"
                keystroke "v" using command down
                return "success"
            end tell
        `;

        exec(`osascript -e '${replaceScript}'`, (error, stdout, stderr) => {
            if (error) {
                console.warn(`アプリケーション名による置換が失敗: ${error.message}`);
                this._executeNextAttempt();
            } else {
                console.log('アプリケーション名による置換成功:', stdout.trim());
                this.restoreClipboard(originalClipboard);
                resolve();
            }
        });
    }

    /**
     * Bundle IDによる置換を試行（macOS専用 - AppleScript使用）
     */
    tryBundleIdReplacement(resolve, reject, originalClipboard) {
        if (!this.selectionContext.bundleId || this.selectionContext.bundleId === 'unknown') {
            console.warn('Bundle IDが利用できません');
            this._executeNextAttempt();
            return;
        }

        const replaceScript = `
            tell application id "${this.selectionContext.bundleId}"
                activate
            end tell
            
            delay 0.05
            
            tell application "System Events"
                keystroke "v" using command down
                return "success"
            end tell
        `;

        exec(`osascript -e '${replaceScript}'`, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Bundle IDによる置換が失敗: ${error.message}`);
                this._executeNextAttempt();
            } else {
                console.log('Bundle IDによる置換成功:', stdout.trim());
                this.restoreClipboard(originalClipboard);
                resolve();
            }
        });
    }

    /**
     * 表示名による置換を試行（macOS専用 - AppleScript使用）
     */
    tryDisplayNameReplacement(resolve, reject, originalClipboard) {
        if (!this.selectionContext.displayName || this.selectionContext.displayName === 'unknown') {
            console.warn('表示名が利用できません');
            this._executeNextAttempt();
            return;
        }

        const replaceScript = `
            tell application "${this.selectionContext.displayName}"
                activate
            end tell
            
            delay 0.05
            
            tell application "System Events"
                keystroke "v" using command down
                return "success"
            end tell
        `;

        exec(`osascript -e '${replaceScript}'`, (error, stdout, stderr) => {
            if (error) {
                console.warn(`表示名による置換が失敗: ${error.message}`);
                this._executeNextAttempt();
            } else {
                console.log('表示名による置換成功:', stdout.trim());
                this.restoreClipboard(originalClipboard);
                resolve();
            }
        });
    }

    /**
     * 汎用的な置換方法（フォールバック）
     */
    tryGenericReplacement(originalClipboard, resolve, reject) {
        const genericScript = `
            tell application "System Events"
                -- フロントにあるアプリケーションに対して直接ペースト
                keystroke "v" using command down
                return "success"
            end tell
        `;

        exec(`osascript -e '${genericScript}'`, (error, stdout, stderr) => {
            if (error) {
                console.error('汎用置換も失敗:', error.message);
                console.error('stderr:', stderr);
                this.restoreClipboard(originalClipboard);
                reject(error);
            } else {
                console.log('汎用置換成功:', stdout.trim());
                this.restoreClipboard(originalClipboard);
                resolve();
            }
        });
    }

    /**
     * クリップボードを復元
     */
    restoreClipboard(originalClipboard) {
        setTimeout(() => {
            clipboard.writeText(originalClipboard);
            console.log('クリップボード復元完了:', originalClipboard.substring(0, 50) + '...');
        }, 300); // より長い待機時間に変更
    }

    /**
     * 設定に基づいてスマート翻訳を実行
     */
    async processSmartTranslation(text) {
        try {
            const { language1, language2 } = this.settings.translationLanguages;

            // 言語コードを言語名に変換
            const languageNames = {
                'ja': '日本語',
                'en': '英語',
                'zh': '中国語',
                'ko': '韓国語',
                'fr': 'フランス語',
                'de': 'ドイツ語',
                'es': 'スペイン語',
                'it': 'イタリア語',
                'pt': 'ポルトガル語',
                'ru': 'ロシア語'
            };

            const lang1Name = languageNames[language1] || language1;
            const lang2Name = languageNames[language2] || language2;

            // LLMエンジンに相互翻訳を依頼
            return await this.llmEngine.processSmartTranslation(text, lang1Name, lang2Name);

        } catch (error) {
            console.error('スマート翻訳エラー:', error);
            throw error;
        }
    }

    /**
     * 設定を読み込み
     */
    async loadSettings() {
        try {
            if (existsSync(this.settingsPath)) {
                const data = await readFile(this.settingsPath, 'utf8');
                const loadedSettings = JSON.parse(data);

                // 古い設定形式から新しい設定形式への変換
                if (loadedSettings.autoClose !== undefined || loadedSettings.autoApply !== undefined) {
                    // 古い設定が両方trueの場合、新しい統合設定をtrueにする
                    loadedSettings.autoApplyAndClose = (loadedSettings.autoClose && loadedSettings.autoApply) || false;
                    // 古い設定を削除
                    delete loadedSettings.autoClose;
                    delete loadedSettings.autoApply;
                }

                // customPromptからpresetPromptsへの移行処理
                if (loadedSettings.customPrompt && !loadedSettings.presetPrompts) {
                    console.log('customPromptをpresetPromptsに移行します');
                    loadedSettings.presetPrompts = [
                        {
                            shortcutKey: 'Ctrl+1',
                            prompt: loadedSettings.customPrompt,
                            enabled: true
                        }
                    ];
                    // 古いcustomPromptは削除
                    delete loadedSettings.customPrompt;
                }

                // 旧shortcutKeyの削除
                if (loadedSettings.shortcutKey) {
                    delete loadedSettings.shortcutKey;
                }

                // 新しい設定項目がない場合はデフォルト値を設定
                if (!loadedSettings.llmEndpoint) {
                    loadedSettings.llmEndpoint = 'http://127.0.0.1:1234/v1';
                }
                if (!loadedSettings.onDemandShortcutKey) {
                    loadedSettings.onDemandShortcutKey = 'Ctrl+Shift+1';
                }
                if (!loadedSettings.presetPrompts || loadedSettings.presetPrompts.length === 0) {
                    loadedSettings.presetPrompts = [
                        {
                            shortcutKey: 'Ctrl+1',
                            prompt: '日本語と英語を相互翻訳してください。入力されたテキストの言語を自動判定して、もう一方の言語に翻訳してください。',
                            enabled: true
                        }
                    ];
                }

                this.settings = { ...this.settings, ...loadedSettings };
                console.log('設定を読み込みました:', this.settings);
            }
        } catch (error) {
            console.error('設定読み込みエラー:', error);
        }
    }

    /**
     * 設定を保存
     */
    async saveSettings(newSettings = null) {
        try {
            if (newSettings) {
                this.settings = { ...this.settings, ...newSettings };
            }

            // ディレクトリが存在しない場合は作成
            const userDataPath = app.getPath('userData');
            if (!existsSync(userDataPath)) {
                await mkdir(userDataPath, { recursive: true });
            }

            await writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
            console.log('設定を保存しました:', this.settings);

            // ショートカットを再登録
            this.registerGlobalShortcuts();
        } catch (error) {
            console.error('設定保存エラー:', error);
            throw error;
        }
    }

    /**
     * 設定ウィンドウを表示
     */
    showSettings() {
        if (this.settingsWindow) {
            this.settingsWindow.focus();
            return;
        }

        // macOSで設定ウィンドウ表示時にDockアイコンを一時的に表示
        if (process.platform === 'darwin') {
            // app.dock.show();
        }

        this.settingsWindow = new BrowserWindow({
            width: 600,
            height: 800,
            resizable: false,
            alwaysOnTop: true,
            frame: false,
            transparent: false,
            movable: true,
            acceptFirstMouse: true,
            titleBarStyle: 'hidden',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: join(__dirname, 'settings-preload.js')
            }
        });

        // macOS のウィンドウボタン（トラフィックライト）を非表示にする
        if (process.platform === 'darwin' && typeof this.settingsWindow.setWindowButtonVisibility === 'function') {
            this.settingsWindow.setWindowButtonVisibility(false);
        }

        this.settingsWindow.loadFile('settings.html');

        this.settingsWindow.on('closed', () => {
            this.settingsWindow = null;

            // macOSで設定ウィンドウ閉じた時にDockアイコンを再び非表示にする
            if (process.platform === 'darwin') {
                app.dock.hide();
            }
        });

        console.log('設定ウィンドウを表示しました');
    }

    /**
     * About ダイアログを表示
     */
    async showAbout() {
        try {
            const version = await getPackageVersion();
            const versionInfo = getCurrentLanguage() === 'ja' ?
                `バージョン: ${version}` :
                `Version: ${version}`;

            dialog.showMessageBox({
                type: 'info',
                title: t('about.title'),
                message: `${t('about.message')} v${version}`,
                detail: `${t('about.detail')}\n\n${versionInfo}`
            });
        } catch (error) {
            console.error('Aboutダイアログ表示エラー:', error);
            // エラーの場合はバージョン無しで表示
            dialog.showMessageBox({
                type: 'info',
                title: t('about.title'),
                message: t('about.message'),
                detail: t('about.detail')
            });
        }
    }

    /**
     * アプリケーション終了時の処理
     */
    cleanup() {
        // グローバルショートカットを解除
        globalShortcut.unregisterAll();

        // システムトレイを破棄
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }

        // ポップアップウィンドウを閉じる
        if (this.popupWindow) {
            this.popupWindow.destroy();
            this.popupWindow = null;
        }

        console.log('gengo Electron: 終了処理完了');
    }
}

// アプリケーションのライフサイクル管理
let mainApp = null;

app.whenReady().then(() => {
    // macOSでDockアイコンを非表示にする
    if (process.platform === 'darwin') {
        app.dock.hide();
    }

    mainApp = new GengoElectronMain();
    mainApp.init();
});

app.on('window-all-closed', () => {
    // macOSでは、ドックから終了しない限りアプリを実行し続ける
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // macOSでは、ドックアイコンがクリックされた際の処理
    if (!mainApp) {
        mainApp = new GengoElectronMain();
        mainApp.init();
    }
});

app.on('before-quit', () => {
    if (mainApp) {
        mainApp.cleanup();
    }
});

export default GengoElectronMain;
