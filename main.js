import { app, BrowserWindow, ipcMain, globalShortcut, clipboard, Menu, Tray, nativeImage, screen, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import nativeTheme from 'electron';
import { exec, execSync } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { SimpleLLMEngine } from './simple-llm-engine.js';
import { initI18n, t, changeLanguage, getCurrentLanguage, getPackageVersion } from './i18n.js';

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
        this.isApplying = false; // Apply処理中フラグを追加
        this.isShowingResult = false; // 結果表示中フラグを追加
        this.settings = {
            translationLanguages: {
                language1: 'ja',
                language2: 'en'
            },
            autoApplyAndClose: false,
            language: 'en', // UI言語設定
            llmEndpoint: 'http://127.0.0.1:1234/v1', // LLMエンドポイント設定
            shortcutKey: 'Ctrl+Space', // ショートカットキー設定
            processingMode: 'translation', // 'translation' または 'custom'
            customPrompt: 'Please process the following text and provide an improved version:' // カスタムプロンプト
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

        // LLMエンジン初期化
        this.llmEngine = new SimpleLLMEngine({
            apiEndpoint: this.settings.llmEndpoint,
            model: 'local-model'
        });

        // システムトレイを作成
        this.createTray();

        // グローバルショートカットを登録
        this.registerGlobalShortcuts();

        // IPC イベントハンドラーを設定
        this.setupIPCHandlers();

        console.log('gengo Electron: 初期化完了');
    }

    /**
     * システムトレイを作成
     */
    createTray() {
        try {
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
            // 設定からショートカットキーを取得
            const shortcut = this.settings.shortcutKey;
            const registered = globalShortcut.register(shortcut, () => {
                this.handleTextSelectionTrigger();
            });

            if (registered) {
                console.log(`グローバルショートカット ${shortcut} を登録しました`);
            } else {
                console.error('グローバルショートカット登録に失敗しました');
            }
        } catch (error) {
            console.error('グローバルショートカット登録エラー:', error);
        }
    }

    /**
     * テキスト選択トリガー処理（改良版）
     */
    async handleTextSelectionTrigger() {
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
            console.log('テキスト選択トリガー実行');

            // 現在のアプリケーション情報を取得・記憶
            await this.captureSelectionContext();

            // 現在のクリップボードを保存
            const originalClipboard = clipboard.readText();
            console.log('元のクリップボード内容:', originalClipboard.substring(0, 50) + '...');

            // アクティブアプリケーションを確認
            const activeApp = execSync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"').toString().trim();
            console.log('アクティブアプリケーション:', activeApp);

            // クリップボードを一時的にクリアして選択テキストの検出を確実にする
            clipboard.writeText('__GENGO_TEMP_MARKER__');

            // Cmd+Cでテキストをコピー
            console.log('Cmd+C実行中...');
            await this.simulateKeyPress('c', ['cmd']);
            console.log('Cmd+C実行完了');

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
                    this.showActionPopup(selectedText);

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
            }, 500); // 200ms → 500msに増加

        } catch (error) {
            console.error('テキスト選択処理エラー:', error);
            this.isProcessing = false; // エラー時もフラグをリセット
        }
    }

    /**
     * 選択時のコンテキスト情報を記憶（改良版）
     */
    async captureSelectionContext() {
        return new Promise((resolve) => {
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
                    // フォールバック
                    this.selectionContext = {
                        appName: 'Unknown',
                        bundleId: 'unknown',
                        displayName: 'Unknown',
                        processName: 'Unknown',
                        timestamp: Date.now()
                    };
                }
                resolve();
            });
        });
    }

    /**
     * AppleScriptを使ったキープレス
     */
    async simulateKeyPress(key, modifiers = []) {
        return new Promise((resolve, reject) => {
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
        });
    }

    /**
     * HTMLベースのポップアップウィンドウを作成
     */
    createPopupWindow() {
        // 既存のウィンドウが存在し、まだ破棄されていない場合は破棄
        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
            console.log('既存のポップアップウィンドウを破棄します');
            this.popupWindow.destroy();
            this.popupWindow = null;
        }

        console.log('新しいポップアップウィンドウを作成します');

        // 自動適用モードかどうかでウィンドウサイズを決定
        const isAutoMode = this.settings.autoApplyAndClose;
        const windowConfig = isAutoMode
            ? {
                width: 100,
                height: 100,
                minWidth: 100,
                minHeight: 100,
                maxWidth: 100,
                maxHeight: 100,
                resizable: false,
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

            /* スクロールバーの最低限の見た目調整（任意） */
            ::-webkit-scrollbar {
                width: 10px;
                height: 10px;
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

        // デバッグ用（本番では削除）
        // this.popupWindow.webContents.openDevTools();

        return this.popupWindow;
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
     * HTMLベースのポップアップを表示
     */
    async showActionPopup(selectedText) {
        // macOSでポップアップ表示時にDockアイコンを一時的に表示
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        
        // 既存のポップアップが開いている場合は閉じる
        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
            this.popupWindow.close();
            this.popupWindow = null;
            // 少し待ってから新しいウィンドウを作成
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.createPopupWindow();

        // カーソル位置を取得
        const cursorPos = await this.getCursorPosition();

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

        this.popupWindow.setPosition(x, y);

        this.popupWindow.show();
        this.popupWindow.focus();

        // 新しい処理開始のため、結果表示フラグをリセット
        this.isShowingResult = false;

        // ポップアップ表示後、すぐに翻訳処理を開始
        console.log('翻訳処理を自動開始:', selectedText);
        await this.processTextWithAction(selectedText, 'translation');
    }

    /**
     * IPCイベントハンドラーを設定
     */
    setupIPCHandlers() {
        // ウィンドウを閉じる
        ipcMain.handle('close-window', () => {
            if (this.popupWindow) {
                this.popupWindow.close();
            }
            this.isShowingResult = false; // 結果表示フラグをリセット
            this.currentProcessingData = null; // 処理データもリセット
        });

        // 結果適用
        ipcMain.handle('apply-result', async () => {
            return await this.handleApplyResult();
        });

        // 設定関連のIPCハンドラー
        ipcMain.handle('get-settings', () => {
            return this.settings;
        });

        ipcMain.handle('save-settings', async (event, newSettings) => {
            const oldLanguage = this.settings.language;
            const oldLLMEndpoint = this.settings.llmEndpoint;
            const oldShortcutKey = this.settings.shortcutKey;

            await this.saveSettings(newSettings);

            // UI言語が変更された場合、i18nの言語も変更
            if (newSettings.language && newSettings.language !== oldLanguage) {
                await changeLanguage(newSettings.language);
                // トレイメニューを再作成
                this.createTray();
            }

            // LLMエンドポイントが変更された場合、LLMエンジンを再初期化
            if (newSettings.llmEndpoint && newSettings.llmEndpoint !== oldLLMEndpoint) {
                this.llmEngine = new SimpleLLMEngine({
                    apiEndpoint: this.settings.llmEndpoint,
                    model: 'local-model'
                });
                console.log('LLMエンドポイントを更新しました:', this.settings.llmEndpoint);
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
                llmEndpoint: 'http://127.0.0.1:1234/v1',
                shortcutKey: 'Ctrl+Space',
                processingMode: 'translation',
                customPrompt: 'Please process the following text and provide an improved version:'
            };
        });

        // 設定をリセット
        ipcMain.handle('reset-settings', async () => {
            const defaultSettings = {
                translationLanguages: {
                    language1: 'ja',
                    language2: 'en'
                },
                autoApplyAndClose: false,
                language: 'en',
                llmEndpoint: 'http://127.0.0.1:1234/v1',
                shortcutKey: 'Ctrl+Space',
                processingMode: 'translation',
                customPrompt: 'Please process the following text and provide an improved version:'
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

        console.log('IPC設定完了');
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
                console.log('Apply処理開始 - 元テキスト:', this.currentProcessingData.originalText);

                await this.applyTextReplacement(this.currentProcessingData.result);
                console.log('テキスト置換完了');

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
     * テキストを指定された処理で実行
     */
    async processTextWithAction(text, action) {
        try {
            console.log('LLM処理開始:', { text, action, mode: this.settings.processingMode });

            let result;

            // 処理モードに基づいて分岐
            if (this.settings.processingMode === 'custom') {
                // カスタムプロンプトモード
                result = await this.llmEngine.processCustomPrompt(text, this.settings.customPrompt);
            } else {
                // 従来の翻訳モード
                switch (action) {
                    case 'kana-kanji':
                        result = await this.llmEngine.processKanaKanjiConversion(text);
                        break;
                    case 'correction':
                        result = await this.llmEngine.processTextCorrection(text);
                        break;
                    case 'translation':
                        // 設定に基づいて相互翻訳を実行
                        result = await this.processSmartTranslation(text);
                        break;
                    default:
                        throw new Error('未対応の処理タイプ: ' + action);
                }
            }

            if (result.success) {
                const processedText = result.correctedText || result.translatedText || result.processedText;

                if (processedText && processedText !== text) {
                    // 結果をポップアップウィンドウに表示
                    this.currentProcessingData = {
                        original: text,
                        result: processedText,
                        action: action,
                        mode: this.settings.processingMode
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
     * テキストを置換適用（改良版・アプリケーション名正規化対応）
     */
    async applyTextReplacement(newText) {
        return new Promise((resolve, reject) => {
            try {
                console.log('テキスト置換実行:', newText);
                console.log('対象アプリ:', this.selectionContext.appName);

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
     * アプリケーション固有の置換を試行
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
     * アプリケーション名による置換を試行
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
     * Bundle IDによる置換を試行
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
     * 表示名による置換を試行
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

                // 新しい設定項目がない場合はデフォルト値を設定
                if (!loadedSettings.llmEndpoint) {
                    loadedSettings.llmEndpoint = 'http://127.0.0.1:1234/v1';
                }
                if (!loadedSettings.shortcutKey) {
                    loadedSettings.shortcutKey = 'Ctrl+Space';
                }
                if (!loadedSettings.processingMode) {
                    loadedSettings.processingMode = 'translation';
                }
                if (!loadedSettings.customPrompt) {
                    loadedSettings.customPrompt = 'Please process the following text and provide an improved version:';
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
            app.dock.show();
        }

        this.settingsWindow = new BrowserWindow({
            width: 600,
            height: 500,
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
