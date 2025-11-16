// 多言語対応の翻訳データ
const translations = {
    ja: {
        nav: {
            features: '機能',
            howItWorks: '使い方',
            setupGuide: 'セットアップガイド',
            screenshots: 'スクリーンショット',
            download: 'ダウンロード'
        },
        hero: {
            title: 'GenGo',
            subtitle: 'AI-Powered Text Processing Tool',
            description: 'ローカルまたはリモートLLMを活用した、スマートなテキスト処理アプリケーション。翻訳、校正、カスタムプロンプト処理を、ショートカットキー一つで実行できます。',
            downloadBtn: 'ダウンロード',
            githubBtn: 'View on GitHub'
        },
        features: {
            title: '主な機能',
            subtitle: 'GenGoが提供する強力な機能',
            dualLlm: {
                title: 'デュアルLLM対応',
                description: 'ローカルLLM（LM Studio, Ollama）とリモートLLM（OpenAI, Anthropic）の両方に対応。用途に応じて柔軟に切り替え可能。'
            },
            presetPrompts: {
                title: '複数の事前プロンプト',
                description: '最大5個の事前プロンプトを登録可能。翻訳、校正、要約など、よく使う処理をショートカットキーで即座に実行。'
            },
            shortcuts: {
                title: 'カスタマイズ可能なショートカット',
                description: '各事前プロンプトとオンデマンドプロンプトに、自由にショートカットキーを割り当て可能。'
            },
            ondemand: {
                title: 'オンデマンドプロンプト',
                description: 'ショートカット実行時にその場でプロンプトを入力。柔軟な処理が必要な場合に最適。'
            },
            translation: {
                title: 'スマート翻訳',
                description: '入力されたテキストの言語を自動判定し、設定した言語間で相互翻訳。自然で読みやすい翻訳を実現。'
            },
            multilingual: {
                title: '多言語UI',
                description: '日本語・英語に対応したユーザーインターフェース。10以上の言語間での翻訳をサポート。'
            },
            privacy: {
                title: 'プライバシー優先',
                description: 'ローカルLLMを使用すれば、すべての処理をオフラインで完結。データは外部に送信されません。'
            },
            streaming: {
                title: 'リアルタイムストリーミング',
                description: 'LLMの応答をリアルタイムで表示。処理の進行状況を視覚的に確認できます。'
            },
            autoApply: {
                title: '自動適用機能',
                description: '処理完了後、結果を自動的に適用してウィンドウを閉じる設定が可能。シームレスなワークフローを実現。'
            }
        },
        howItWorks: {
            title: '使い方',
            subtitle: '4ステップで簡単に始められます',
            step1: {
                title: 'LLM設定',
                description: 'ローカルLLM（LM Studio, Ollama等）を起動するか、リモートLLMのAPIキーを設定します。'
            },
            step2: {
                title: 'プロンプト設定',
                description: '最大5個の事前プロンプトを登録し、それぞれにショートカットキーを割り当てます。'
            },
            step3: {
                title: 'テキスト選択',
                description: '処理したいテキストを任意のアプリケーションで選択します。'
            },
            step4: {
                title: 'ショートカット実行',
                description: '設定したショートカットキーを押すだけで、即座にAI処理が開始されます。'
            }
        },
        setupGuide: {
            title: 'セットアップガイド',
            subtitle: 'GenGoを始めるための完全ガイド',
            step1: {
                title: 'GenGoをインストール',
                description: 'GitHubのリリースページから、お使いのOSに対応したインストーラーをダウンロードしてインストールします。',
                tip: {
                    title: 'ヒント:',
                    text: 'macOSの場合はDMGファイル、Windowsの場合はインストーラー(.exe)をダウンロードしてください。'
                },
                downloadBtn: 'ダウンロードページへ',
                imageCaption: 'GitHubリリースページからインストーラーをダウンロード'
            },
            step2: {
                title: 'LM Studioをインストール',
                description: 'ローカルLLMを使用するために、LM Studioをインストールします。LM Studioは無料で使いやすいLLM実行環境です。インストール時には Power UserまたはDeveloperを選択してください。',
                tip: {
                    title: 'ヒント:',
                    text: 'リモートLLM（OpenAI、Anthropicなど）を使用する場合は、この手順をスキップできます。'
                },
                downloadBtn: 'LM Studio公式サイト',
                imageCaption: 'LM Studio公式サイト'
            },
            step3: {
                title: 'AIモデルをダウンロード',
                description: 'LM Studioを起動し、検索バーからAIモデルを検索してダウンロードします。',
                recommend: {
                    title: 'おすすめモデル',
                    gptoss: '多言語に最適化された小型高性能モデル'
                },
                imageCaption: 'LM StudioでAIモデルを検索・ダウンロード'
            },
            step4: {
                title: 'ローカルサーバーを起動',
                description: 'LM Studioのトレイメニューから先ほどダウンロードモデルをLoadし、その後「Start Server」ボタンをクリックします。',
                note: {
                    title: '注意:',
                    text: 'デフォルトのポート番号は 1234 です。変更した場合は、GenGoの設定でエンドポイントを調整してください。'
                },
                imageCaption: 'LM Studioでローカルサーバーを起動'
            },
            step5: {
                title: 'GenGoを設定',
                description: 'GenGoを起動し、トレイアイコンから「Settings」を開きます。プロンプトとショートカットキーを設定します。',
                settings: {
                    title: '基本設定',
                    llm: 'LLMエンドポイント: http://127.0.0.1:1234/v1',
                    preset: '事前プロンプト: よく使う処理を最大5個登録',
                    shortcut: 'ショートカットキー: 各プロンプトに割り当て'
                },
                imageCaption: 'GenGoの設定画面'
            },
            step6: {
                title: '使ってみよう！',
                description: '任意のアプリケーションでテキストを選択し、設定したショートカットキーを押してください。AI処理が開始されます！',
                success: {
                    title: '完了！',
                    text: 'これでGenGoを使い始める準備が整いました。テキスト処理をお楽しみください。'
                },
                screenshotsBtn: 'スクリーンショットを見る',
                githubBtn: 'GitHub',
                imageCaption: 'GenGoでテキスト処理を実行'
            }
        },
        screenshots: {
            title: 'スクリーンショット',
            subtitle: 'GenGoの使用例',
            translation: {
                title: '翻訳機能',
                description: '日本語と英語の相互翻訳を瞬時に実行。事前プロンプトに登録することで、よく使う処理をショートカットキー一つで実行できます。'
            },
            settings: {
                title: '設定画面',
                description: '最大5個の事前プロンプトを登録し、それぞれに自由なショートカットキーを設定可能'
            },
            customPrompt: {
                title: 'オンデマンドプロンプト',
                description: 'その場でプロンプトを入力して柔軟に処理を実行'
            },
            result: {
                title: '結果プレビュー',
                description: '処理結果を確認してから適用'
            }
        },
        techStack: {
            title: 'Tech Stack',
            subtitle: 'Built with Modern Technologies',
            electron: 'Cross-platform desktop app (macOS & Windows)',
            llm: 'Local & Remote AI Models',
            javascript: 'Modern ES6+ Modules',
            bootstrap: 'Responsive Design'
        },
        download: {
            title: '始めましょう',
            subtitle: 'GenGoをダウンロードして、AI-powered text processingを体験してください。',
            macBtn: 'macOS版をダウンロード',
            winBtn: 'Windows版をダウンロード',
            version: 'MIT License | オープンソース'
        },
        footer: {
            description: 'AI-powered text processing tool for everyone. Built with ❤️ using Electron and modern web technologies.',
            links: 'リンク',
            githubRepo: 'GitHubリポジトリ',
            reportIssues: '問題を報告',
            releases: 'リリース',
            support: 'サポート',
            documentation: 'ドキュメント',
            author: '作者: Tetsuaki Baba',
            copyright: '© 2025 GenGo. Licensed under MIT License.'
        }
    },
    en: {
        nav: {
            features: 'Features',
            howItWorks: 'How It Works',
            setupGuide: 'Setup Guide',
            screenshots: 'Screenshots',
            download: 'Download'
        },
        hero: {
            title: 'GenGo',
            subtitle: 'AI-Powered Text Processing Tool',
            description: 'Smart text processing application utilizing local or remote LLMs. Execute translation, proofreading, and custom prompt processing with a single shortcut key.',
            downloadBtn: 'Download',
            githubBtn: 'View on GitHub'
        },
        features: {
            title: 'Key Features',
            subtitle: 'Powerful features provided by GenGo',
            dualLlm: {
                title: 'Dual LLM Support',
                description: 'Supports both local LLMs (LM Studio, Ollama) and remote LLMs (OpenAI, Anthropic). Switch flexibly according to your needs.'
            },
            presetPrompts: {
                title: 'Multiple Preset Prompts',
                description: 'Register up to 5 preset prompts. Instantly execute frequently used processes like translation, proofreading, and summarization with shortcut keys.'
            },
            shortcuts: {
                title: 'Customizable Shortcuts',
                description: 'Freely assign shortcut keys to each preset prompt and on-demand prompt.'
            },
            ondemand: {
                title: 'On-Demand Prompt',
                description: 'Enter prompts on-the-fly when executing shortcuts. Ideal for cases requiring flexible processing.'
            },
            translation: {
                title: 'Smart Translation',
                description: 'Automatically detects the language of input text and translates between configured languages. Achieves natural and readable translations.'
            },
            multilingual: {
                title: 'Multilingual UI',
                description: 'User interface supporting Japanese and English. Supports translation between 10+ languages.'
            },
            privacy: {
                title: 'Privacy First',
                description: 'When using local LLMs, all processing is completed offline. Data is never sent externally.'
            },
            streaming: {
                title: 'Real-time Streaming',
                description: 'Display LLM responses in real-time. Visually confirm the progress of processing.'
            },
            autoApply: {
                title: 'Auto-Apply Feature',
                description: 'Option to automatically apply results and close the window after processing completes. Achieve seamless workflow.'
            }
        },
        howItWorks: {
            title: 'How It Works',
            subtitle: 'Get started in 4 easy steps',
            step1: {
                title: 'Setup LLM',
                description: 'Launch a local LLM (such as LM Studio, Ollama) or configure your remote LLM API key.'
            },
            step2: {
                title: 'Configure Prompts',
                description: 'Register up to 5 preset prompts and assign shortcut keys to each.'
            },
            step3: {
                title: 'Select Text',
                description: 'Select the text you want to process in any application.'
            },
            step4: {
                title: 'Execute Shortcut',
                description: 'Simply press the configured shortcut key to instantly start AI processing.'
            }
        },
        setupGuide: {
            title: 'Setup Guide',
            subtitle: 'Complete guide to get started with GenGo',
            step1: {
                title: 'Install GenGo',
                description: 'Download and install the installer for your OS from the GitHub releases page.',
                tip: {
                    title: 'Tip:',
                    text: 'Download the DMG file for macOS or the installer (.exe) for Windows.'
                },
                downloadBtn: 'Go to Download Page',
                imageCaption: 'Download installer from GitHub releases page'
            },
            step2: {
                title: 'Install LM Studio',
                description: 'Install LM Studio to use local LLMs. LM Studio is a free and user-friendly LLM execution environment. During installation, select Power User or Developer.',
                tip: {
                    title: 'Tip:',
                    text: 'If you use remote LLMs (OpenAI, Anthropic, etc.), you can skip this step.'
                },
                downloadBtn: 'LM Studio Official Site',
                imageCaption: 'LM Studio official website'
            },
            step3: {
                title: 'Download AI Model',
                description: 'Launch LM Studio, search for an AI model in the search bar, and download it.',
                recommend: {
                    title: 'Recommended Model',
                    gptoss: 'gpt-oss-20b - Compact high-performance model optimized for multiple languages'
                },
                imageCaption: 'Search and download AI models in LM Studio'
            },
            step4: {
                title: 'Start Local Server',
                description: 'Open LM Studio tray menu, load the previously downloaded model, and then click the "Start Server" button.',
                note: {
                    title: 'Note:',
                    text: 'The default port number is 1234. If you change it, adjust the endpoint in GenGo settings.'
                },
                imageCaption: 'Start local server in LM Studio'
            },
            step5: {
                title: 'Configure GenGo',
                description: 'Launch GenGo, open "Settings" from the tray icon, and configure prompts and shortcut keys.',
                settings: {
                    title: 'Basic Settings',
                    llm: 'LLM Endpoint: http://127.0.0.1:1234/v1',
                    preset: 'Preset Prompts: Register up to 5 frequently used processes',
                    shortcut: 'Shortcut Keys: Assign to each prompt'
                },
                imageCaption: 'GenGo settings panel'
            },
            step6: {
                title: 'Try It Out!',
                description: 'Select text in any application and press the configured shortcut key. AI processing will start!',
                success: {
                    title: 'Done!',
                    text: 'You are now ready to start using GenGo. Enjoy text processing!'
                },
                screenshotsBtn: 'View Screenshots',
                githubBtn: 'GitHub',
                imageCaption: 'Execute text processing with GenGo'
            }
        },
        screenshots: {
            title: 'Screenshots',
            subtitle: 'GenGo in action',
            translation: {
                title: 'Translation Feature',
                description: 'Execute bidirectional translation between Japanese and English instantly. Register frequently used processes as preset prompts and execute with a single shortcut key.'
            },
            settings: {
                title: 'Settings Panel',
                description: 'Register up to 5 preset prompts and assign custom shortcut keys to each'
            },
            customPrompt: {
                title: 'On-Demand Prompt',
                description: 'Enter prompts on-the-fly for flexible processing'
            },
            result: {
                title: 'Result Preview',
                description: 'Review results before applying'
            }
        },
        techStack: {
            title: 'Technology Stack',
            subtitle: 'Built with modern technologies',
            electron: 'Cross-platform desktop app',
            llm: 'Local & Remote AI models',
            javascript: 'ES6+ with modules',
            bootstrap: 'Responsive design'
        },
        download: {
            title: 'Ready to Get Started?',
            subtitle: 'Download GenGo and experience AI-powered text processing.',
            macBtn: 'Download for macOS',
            winBtn: 'Download for Windows',
            version: 'MIT License | Open Source'
        },
        footer: {
            description: 'AI-powered text processing tool for everyone. Built with ❤️ using Electron and modern web technologies.',
            links: 'Links',
            githubRepo: 'GitHub Repository',
            reportIssues: 'Report Issues',
            releases: 'Releases',
            support: 'Support',
            documentation: 'Documentation',
            author: 'Author: Tetsuaki Baba',
            copyright: '© 2025 GenGo. Licensed under MIT License.'
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

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // 保存された言語設定を確認、なければブラウザの言語を検出
    const savedLang = localStorage.getItem('preferredLanguage');
    const initialLang = savedLang || detectBrowserLanguage();
    applyTranslations(initialLang);
});
