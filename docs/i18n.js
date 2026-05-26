// 多言語対応の翻訳データ
let currentAppVersion = '';

const translations = {
    ja: {
        nav: {
            setupGuide: 'セットアップガイド',
            bestPractices: 'ベストプラクティス',
            download: 'ダウンロード'
        },
        hero: {
            title: 'GenGo',
            subtitle: 'AI-Powered Text Processing Tool',
            description: 'LM Studio、Ollama、または OpenAI 互換 API を活用した、macOS ネイティブのテキスト処理アプリケーション。翻訳、校正、カスタムプロンプト処理を、ショートカットキー一つで実行できます。',
            downloadBtn: 'ダウンロード',
            githubBtn: 'View on GitHub'
        },
        setupGuide: {
            title: 'セットアップガイド',
            subtitle: '共通手順とローカルLLM環境を切り替えて確認できます',
            commonStep: 'Common',
            finalStep: 'Finish',
            step1: {
                title: 'GenGoをインストール',
                description: 'GitHubのリリースページから、macOS用のDMGまたはZIPをダウンロードしてインストールします。',
                tip: {
                    title: 'ヒント:',
                    text: '初回起動時に確認ダイアログが表示された場合は、macOSの案内に従って開いてください。'
                },
                downloadBtn: 'ダウンロードページへ',
                imageCaption: 'GitHubリリースページからmacOS版をダウンロード'
            },
            step2: {
                label: 'Local LLM',
                title: 'ローカルLLMを準備'
            },
            lmStudio: {
                tab: 'LM Studio',
                label: 'GUI setup',
                title: 'LM Studioを準備',
                install: 'LM Studioをインストールし、アプリを起動します。',
                model: 'Discoverまたは検索からモデルをダウンロードします。',
                server: 'DeveloperまたはLocal Serverでモデルをロードし、サーバーを開始します。',
                noteTitle: 'GenGo設定:',
                noteText: 'GenGoのSettingsパネルでは、LM Studioをボタンひとつで選択できます。',
                downloadBtn: 'LM Studio公式サイト',
                imageCaption: 'LM Studioでモデルを用意してローカルサーバーを起動'
            },
            ollama: {
                tab: 'Ollama',
                label: 'Cloud setup',
                title: 'Ollamaを準備',
                install: 'Ollamaをダウンロードし、Applicationsフォルダへ移動して起動します。',
                accountPrefix: '',
                accountLink: 'https://ollama.com/',
                accountSuffix: ' からアカウントを作成してください。',
                signin: 'OllamaアプリのSettingsから先ほど作成したアカウントでサインしてください。これでcloudモデルを利用できるようになります。',
                noteTitle: 'ヒント:',
                noteText: 'Settings画面ではCloudにチェックが入っているかも確認を忘れずに。',
                downloadBtn: 'Ollama公式ダウンロード',
                imageCaption: 'Ollamaのセットアップ画面'
            },
            step5: {
                title: 'GenGoを設定',
                description: 'GenGoを起動し、メニューバーアイコンから「Settings」を開きます。利用するLLMをボタンひとつで選択します。',
                connection: '接続テストボタンを押し、接続に成功したら保存ボタンを押します。',
                lmStudio: {
                    tab: 'LM Studio',
                    provider: 'LLMの項目でProviderをLM Studioに選択します。',
                    model: 'モデル欄では、LM StudioでLoadされているモデル一覧から使いたいモデルを選択します。',
                    imageCaption: 'GenGoのLM Studio設定画面'
                },
                ollama: {
                    tab: 'Ollama',
                    provider: 'LLMの項目でProviderをOllamaに選択します。',
                    model: 'モデル欄から好きなCloudモデルを選択します。',
                    recommendTitle: 'おすすめ:',
                    recommendPrefix: 'GenGoでは',
                    recommendSuffix: 'をおすすめします。一部モデルは有料プランが必要な場合がありますが、GenGoのようなTokenを消費しない使い方であればFree Planで十分利用できます。',
                    imageCaption: 'GenGoのOllama設定画面'
                },
                imageCaption: 'GenGoの設定画面'
            },
            step6: {
                title: '使ってみよう',
                description: '任意のアプリケーションでテキストを選択し、Ctrl+1を押してください。日本語の場合は英語に、英語の場合は日本語に変換され、Applyボタンまたは⌘+Enterキーで選択したテキストを入れ替えることができます。',
                tip: {
                    title: 'ヒント:',
                    text: 'テキストを選択せずにショートカットキーを押すと、テキスト生成モードとして使えます。'
                },
                success: {
                    title: '完了:',
                    text: 'これでGenGoを使い始める準備が整いました。'
                },
                githubBtn: 'GitHub',
                imageCaption: '選択したテキストに絵文字を自動で入れた様子'
            }
        },
        techStack: {
            title: '技術スタック',
            subtitle: 'macOSネイティブアプリとして構築',
            swift: 'macOS 13+ ネイティブアプリ',
            swiftui: '軽量なメニューバーUI',
            llm: 'LM Studio / Ollama / OpenAI 互換 API',
            sparkle: '署名済みアップデート配信'
        },
        download: {
            title: '始めましょう',
            subtitle: 'GenGo for macOSをダウンロードして、AI-powered text processingを体験してください。',
            macBtn: 'macOS版をダウンロード',
            version: 'Version {version} | macOS 13+ | MIT License | オープンソース'
        },
        footer: {
            description: 'AI-powered text processing tool for everyone. Built as a native macOS app with Swift and SwiftUI.',
            links: 'リンク',
            githubRepo: 'GitHubリポジトリ',
            reportIssues: '問題を報告',
            releases: 'リリース',
            support: 'サポート',
            documentation: 'ドキュメント',
            author: '作者: Tetsuaki Baba',
            copyright: '© 2026 GenGo. Licensed under MIT License.'
        },
        bestPractices: {
            title: 'ベストプラクティス',
            subtitle: 'GenGoを効果的に使うためのヒントとコツ',
            description: '実際の使用経験から得られた、便利なプロンプトとショートカットの活用法をご紹介します。各プロンプトは、コピーボタンをクリックすることで、すぐに設定画面にペーストできます。',
            copyBtn: 'コピー',
            emptyMessage: 'まだベストプラクティスが登録されていません。',
            toast: {
                title: 'コピー成功',
                message: 'プロンプトをクリップボードにコピーしました'
            },
            howToUse: {
                title: 'このページの使い方',
                step1: '使いたいプロンプトの「コピー」ボタンをクリック',
                step2: 'GenGoの設定画面を開く',
                step3: '事前プロンプトの欄にペースト',
                step4: 'ショートカットキーを設定して保存'
            },
            example: {
                title: 'タイトルをここに',
                description: '説明をここに記述します。どのような場面で使うと便利かを簡潔に説明しましょう。',
                prompt: 'ここにプロンプトテキストを記述'
            }
        }
    },
    en: {
        nav: {
            setupGuide: 'Setup Guide',
            bestPractices: 'Best Practices',
            download: 'Download'
        },
        hero: {
            title: 'GenGo',
            subtitle: 'AI-Powered Text Processing Tool',
            description: 'A native macOS text processing app powered by LM Studio, Ollama, or OpenAI-compatible APIs. Run translation, proofreading, and custom prompt workflows with a single shortcut.',
            downloadBtn: 'Download',
            githubBtn: 'View on GitHub'
        },
        setupGuide: {
            title: 'Setup Guide',
            subtitle: 'Switch between the common steps and your local LLM runtime',
            commonStep: 'Common',
            finalStep: 'Finish',
            step1: {
                title: 'Install GenGo',
                description: 'Download the macOS DMG or ZIP from the GitHub releases page and install it.',
                tip: {
                    title: 'Tip:',
                    text: 'If macOS shows a confirmation dialog on first launch, follow the macOS prompt to open the app.'
                },
                downloadBtn: 'Go to Download Page',
                imageCaption: 'Download the macOS release from GitHub'
            },
            step2: {
                label: 'Local LLM',
                title: 'Prepare a local LLM'
            },
            lmStudio: {
                tab: 'LM Studio',
                label: 'GUI setup',
                title: 'Prepare LM Studio',
                install: 'Install LM Studio and launch the app.',
                model: 'Download a model from Discover or search.',
                server: 'Load the model from Developer or Local Server, then start the server.',
                noteTitle: 'GenGo Settings:',
                noteText: 'In the GenGo Settings panel, choose LM Studio with one button.',
                downloadBtn: 'LM Studio Official Site',
                imageCaption: 'Prepare a model and start the local server in LM Studio'
            },
            ollama: {
                tab: 'Ollama',
                label: 'Cloud setup',
                title: 'Prepare Ollama',
                install: 'Download Ollama, move it to Applications, and launch it.',
                accountPrefix: 'Create an account from ',
                accountLink: 'https://ollama.com/',
                accountSuffix: '.',
                signin: 'Sign in from Ollama app Settings with the account you just created. This makes cloud models available.',
                noteTitle: 'Tip:',
                noteText: 'In Settings, also remember to check that Cloud is enabled.',
                downloadBtn: 'Ollama Official Download',
                imageCaption: 'Ollama setup screen'
            },
            step5: {
                title: 'Configure GenGo',
                description: 'Launch GenGo and open "Settings" from the menu bar icon. Choose your LLM with one button.',
                connection: 'Click the connection test button, then click Save after the connection succeeds.',
                lmStudio: {
                    tab: 'LM Studio',
                    provider: 'In the LLM section, choose LM Studio as the Provider.',
                    model: 'In the model field, choose from the models currently loaded in LM Studio.',
                    imageCaption: 'GenGo LM Studio settings panel'
                },
                ollama: {
                    tab: 'Ollama',
                    provider: 'In the LLM section, choose Ollama as the Provider.',
                    model: 'Choose any cloud model from the model field.',
                    recommendTitle: 'Recommended:',
                    recommendPrefix: 'For GenGo, we recommend',
                    recommendSuffix: '. Some models may require a paid plan, but the Free Plan is enough for GenGo-style usage that does not consume tokens.',
                    imageCaption: 'GenGo Ollama settings panel'
                },
                imageCaption: 'GenGo settings panel'
            },
            step6: {
                title: 'Try It Out',
                description: 'Select text in any application and press Ctrl+1. Japanese text is converted to English, English text is converted to Japanese, and you can replace the selected text with the Apply button or Command+Enter.',
                tip: {
                    title: 'Tip:',
                    text: 'Press a shortcut without selecting text to use GenGo as a text generation mode.'
                },
                success: {
                    title: 'Done:',
                    text: 'You are ready to start using GenGo.'
                },
                githubBtn: 'GitHub',
                imageCaption: 'Example of automatically adding emoji to selected text'
            }
        },
        techStack: {
            title: 'Technology Stack',
            subtitle: 'Built as a native macOS app',
            swift: 'Native macOS 13+ app',
            swiftui: 'Lightweight menu bar UI',
            llm: 'LM Studio / Ollama / OpenAI-compatible APIs',
            sparkle: 'Signed update delivery'
        },
        download: {
            title: 'Ready to Get Started?',
            subtitle: 'Download GenGo for macOS and experience AI-powered text processing.',
            macBtn: 'Download for macOS',
            version: 'Version {version} | macOS 13+ | MIT License | Open Source'
        },
        footer: {
            description: 'AI-powered text processing tool for everyone. Built as a native macOS app with Swift and SwiftUI.',
            links: 'Links',
            githubRepo: 'GitHub Repository',
            reportIssues: 'Report Issues',
            releases: 'Releases',
            support: 'Support',
            documentation: 'Documentation',
            author: 'Author: Tetsuaki Baba',
            copyright: '© 2026 GenGo. Licensed under MIT License.'
        },
        bestPractices: {
            title: 'Best Practices',
            subtitle: 'Tips and tricks for effective GenGo usage',
            description: 'Discover useful prompts and shortcut techniques gathered from real-world experience. Click the copy button on any prompt to paste it directly into your settings.',
            copyBtn: 'Copy',
            emptyMessage: 'No best practices have been registered yet.',
            toast: {
                title: 'Copied',
                message: 'Prompt copied to clipboard'
            },
            howToUse: {
                title: 'How to Use This Page',
                step1: 'Click the "Copy" button on the prompt you want to use',
                step2: 'Open GenGo settings panel',
                step3: 'Paste into a preset prompt field',
                step4: 'Assign a shortcut key and save'
            },
            example: {
                title: 'Title goes here',
                description: 'Write a description here. Briefly explain when this prompt is useful.',
                prompt: 'Write your prompt text here'
            }
        }
    }
};

// 現在の言語を保存
let currentLanguage = 'ja';

// ブラウザの言語を検出して初期言語を設定
function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('ja')) {
        return 'ja';
    } else {
        return 'en';
    }
}

// 翻訳を適用する関数
function applyTranslations(lang) {
    currentLanguage = lang;
    const t = translations[lang];

    // data-i18n属性を持つすべての要素を取得して翻訳
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = t;

        for (const k of keys) {
            value = value[k];
            if (!value) break;
        }

        if (value) {
            if (typeof value === 'string') {
                value = value.replace(/\{version\}/g, currentAppVersion);
            }

            // 子要素（画像やアイコンなど）がある場合は、それらを保持
            const childElements = Array.from(element.children);

            if (childElements.length > 0) {
                // 子要素がある場合は、テキストノードのみを置き換える
                // まず既存のテキストノードを削除
                Array.from(element.childNodes).forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.remove();
                    }
                });

                // 子要素の位置を確認
                const hasLeadingElement = childElements[0] && element.firstChild === childElements[0];

                if (hasLeadingElement) {
                    // 先頭に子要素がある場合（例: <i>アイコン</i> テキスト）
                    // 子要素の後にテキストを追加
                    const textNode = document.createTextNode(' ' + value);
                    element.appendChild(textNode);
                } else {
                    // テキストが先にある場合は、先頭に追加
                    const textNode = document.createTextNode(value + ' ');
                    element.insertBefore(textNode, element.firstChild);
                }
            } else {
                // 子要素がない場合は通常通りtextContentを使用
                element.textContent = value;
            }
        }
    });

    // HTML言語属性を更新
    document.documentElement.lang = lang;

    // 現在の言語表示を更新
    const currentLangElement = document.getElementById('currentLang');
    if (currentLangElement) {
        currentLangElement.textContent = lang === 'ja' ? '日本語' : 'English';
    }

    // ローカルストレージに保存
    localStorage.setItem('preferredLanguage', lang);
}

// 言語を変更する関数（グローバルスコープで使用可能）
function changeLanguage(lang) {
    applyTranslations(lang);
}

async function loadAppVersion() {
    try {
        const response = await fetch('version.json', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        if (typeof data.version === 'string' && data.version.trim()) {
            currentAppVersion = data.version.trim();
            applyTranslations(currentLanguage);
        }
    } catch (error) {
        console.warn('Failed to load app version:', error);
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // 保存された言語設定を確認、なければブラウザの言語を検出
    const savedLang = localStorage.getItem('preferredLanguage');
    const initialLang = savedLang || detectBrowserLanguage();
    applyTranslations(initialLang);
    loadAppVersion();
});
