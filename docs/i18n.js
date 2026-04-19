// 多言語対応の翻訳データ
const translations = {
    ja: {
        nav: {
            howItWorks: '使い方',
            setupGuide: 'セットアップガイド',
            screenshots: 'スクリーンショット',
            bestPractices: 'ベストプラクティス',
            download: 'ダウンロード'
        },
        hero: {
            title: 'GenGo',
            subtitle: 'AI-Powered Text Processing Tool',
            description: 'LM Studio または OpenAI 互換 API を活用した、macOS ネイティブのテキスト処理アプリケーション。翻訳、校正、カスタムプロンプト処理を、ショートカットキー一つで実行できます。',
            downloadBtn: 'ダウンロード',
            githubBtn: 'View on GitHub'
        },
        howItWorks: {
            title: '使い方',
            subtitle: '4ステップで簡単に始められます',
            step1: {
                title: 'LLM設定',
                description: 'LM Studio にモデルをロードするか、OpenAI 互換 API の接続情報を設定します。'
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
                description: 'GitHubのリリースページから、macOS用のDMGまたはZIPをダウンロードしてインストールします。',
                tip: {
                    title: 'ヒント:',
                    text: '初回起動時に確認ダイアログが表示された場合は、macOSの案内に従って開いてください。'
                },
                downloadBtn: 'ダウンロードページへ',
                imageCaption: 'GitHubリリースページからmacOS版をダウンロード'
            },
            step2: {
                title: 'LM Studioをインストール',
                description: 'ローカルLLMを使用するために、LM Studioをインストールします。LM Studioは無料で使いやすいLLM実行環境です。インストール時には Power UserまたはDeveloperを選択してください。',
                tip: {
                    title: 'ヒント:',
                    text: 'OpenAI 互換 APIを使用する場合は、この手順をスキップできます。'
                },
                downloadBtn: 'LM Studio公式サイト',
                imageCaption: 'LM Studio公式サイト'
            },
            step3: {
                title: 'AIモデルをダウンロード',
                description: 'LM Studioを起動し、検索バーからAIモデルを検索してダウンロードします。',
                recommend: {
                    title: 'おすすめモデル:'
                },
                imageCaption: 'LM StudioでAIモデルを検索・ダウンロード'
            },
            step4: {
                title: 'ローカルサーバーを起動',
                description: 'LM StudioのLocal Serverでダウンロード済みモデルをロードし、「Start Server」ボタンをクリックします。',
                note: {
                    title: '注意:',
                    prefix: 'デフォルトのポート番号は',
                    suffix: 'です。変更した場合は、GenGoの設定でエンドポイントを調整してください。'
                },
                imageCaption: 'LM Studioでローカルサーバーを起動'
            },
            step5: {
                title: 'GenGoを設定',
                description: 'GenGoを起動し、メニューバーアイコンから「Settings」を開きます。プロンプトとショートカットキーを設定します。',
                settings: {
                    title: '基本設定',
                    llmLabel: 'LLMエンドポイント:',
                    presetLabel: '事前プロンプト:',
                    presetText: 'よく使う処理を最大5個登録',
                    shortcutLabel: 'ショートカットキー:',
                    shortcutText: '各プロンプトに割り当て'
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
            title: '技術スタック',
            subtitle: 'macOSネイティブアプリとして構築',
            swift: 'macOS 13+ ネイティブアプリ',
            swiftui: '軽量なメニューバーUI',
            llm: 'LM Studio / OpenAI 互換 API',
            sparkle: '署名済みアップデート配信'
        },
        download: {
            title: '始めましょう',
            subtitle: 'GenGo for macOSをダウンロードして、AI-powered text processingを体験してください。',
            macBtn: 'macOS版をダウンロード',
            version: 'Version 0.10.4 | macOS 13+ | MIT License | オープンソース'
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
            emptyMessage: 'まだベストプラクティスが登録されていません。\n上記のテンプレートを使用して、新しいプロンプトを追加してください。',
            toast: {
                title: 'コピー成功',
                message: 'プロンプトをクリップボードにコピーしました'
            },
            howToUse: {
                title: 'このページの使い方',
                step1: '使いたいプロンプトの「コピー」ボタンをクリック',
                step2: 'GenGoの設定画面を開く',
                step3: '事前プロンプトの欄にペースト',
                step4: 'ショートカットキーを設定して保存',
                addNew: '新しいプロンプトの追加:',
                editNoteNew: 'ファイルにJSONデータを追記するだけで自動的に反映されます。HTMLの編集は不要です。'
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
            howItWorks: 'How It Works',
            setupGuide: 'Setup Guide',
            screenshots: 'Screenshots',
            bestPractices: 'Best Practices',
            download: 'Download'
        },
        hero: {
            title: 'GenGo',
            subtitle: 'AI-Powered Text Processing Tool',
            description: 'A native macOS text processing app powered by LM Studio or OpenAI-compatible APIs. Run translation, proofreading, and custom prompt workflows with a single shortcut.',
            downloadBtn: 'Download',
            githubBtn: 'View on GitHub'
        },
        howItWorks: {
            title: 'How It Works',
            subtitle: 'Get started in 4 easy steps',
            step1: {
                title: 'Set Up LLM',
                description: 'Load a model in LM Studio or configure an OpenAI-compatible API connection.'
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
                title: 'Run Shortcut',
                description: 'Press the configured shortcut key to start AI processing instantly.'
            }
        },
        setupGuide: {
            title: 'Setup Guide',
            subtitle: 'Complete guide to get started with GenGo',
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
                title: 'Install LM Studio',
                description: 'Install LM Studio to use local LLMs. LM Studio is a free, user-friendly LLM runtime. During installation, select Power User or Developer.',
                tip: {
                    title: 'Tip:',
                    text: 'You can skip this step if you use an OpenAI-compatible API.'
                },
                downloadBtn: 'LM Studio Official Site',
                imageCaption: 'LM Studio official website'
            },
            step3: {
                title: 'Download AI Models',
                description: 'Launch LM Studio, search for AI models in the search bar, and download them.',
                recommend: {
                    title: 'Recommended models:'
                },
                imageCaption: 'Search and download AI models in LM Studio'
            },
            step4: {
                title: 'Start Local Server',
                description: 'Load the downloaded model in LM Studio Local Server, then click the "Start Server" button.',
                note: {
                    title: 'Note:',
                    prefix: 'The default port number is ',
                    suffix: '. If you change it, adjust the endpoint in GenGo settings.'
                },
                imageCaption: 'Start local server in LM Studio'
            },
            step5: {
                title: 'Configure GenGo',
                description: 'Launch GenGo, open "Settings" from the menu bar icon, and configure prompts and shortcut keys.',
                settings: {
                    title: 'Basic Settings',
                    llmLabel: 'LLM Endpoint:',
                    presetLabel: 'Preset Prompts:',
                    presetText: 'Register up to 5 frequently used workflows',
                    shortcutLabel: 'Shortcut Keys:',
                    shortcutText: 'Assign to each prompt'
                },
                imageCaption: 'GenGo settings panel'
            },
            step6: {
                title: 'Try It Out!',
                description: 'Select text in any application and press the configured shortcut key. AI processing will start.',
                success: {
                    title: 'Done!',
                    text: 'You are ready to start using GenGo. Enjoy text processing.'
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
                title: 'Translation',
                description: 'Run bidirectional translation between Japanese and English instantly with a preset shortcut.'
            },
            settings: {
                title: 'Settings Panel',
                description: 'Register up to 5 preset prompts and assign custom shortcut keys to each.'
            },
            customPrompt: {
                title: 'On-Demand Prompt',
                description: 'Enter prompts on the spot for flexible processing.'
            },
            result: {
                title: 'Result Preview',
                description: 'Review results before applying them.'
            }
        },
        techStack: {
            title: 'Technology Stack',
            subtitle: 'Built as a native macOS app',
            swift: 'Native macOS 13+ app',
            swiftui: 'Lightweight menu bar UI',
            llm: 'LM Studio / OpenAI-compatible APIs',
            sparkle: 'Signed update delivery'
        },
        download: {
            title: 'Ready to Get Started?',
            subtitle: 'Download GenGo for macOS and experience AI-powered text processing.',
            macBtn: 'Download for macOS',
            version: 'Version 0.10.4 | macOS 13+ | MIT License | Open Source'
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
            emptyMessage: 'No best practices have been registered yet.\nUse the template above to add new prompts.',
            toast: {
                title: 'Copied',
                message: 'Prompt copied to clipboard'
            },
            howToUse: {
                title: 'How to Use This Page',
                step1: 'Click the "Copy" button on the prompt you want to use',
                step2: 'Open GenGo settings panel',
                step3: 'Paste into a preset prompt field',
                step4: 'Assign a shortcut key and save',
                addNew: 'Adding New Prompts:',
                editNoteNew: 'Simply add JSON data to the file and it will be automatically reflected. No HTML editing required.'
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
