// 多言語対応の翻訳データ
const translations = {
    ja: {
        nav: {
            features: '機能',
            howItWorks: '使い方',
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
                description: 'ローカルLLM（LM Studio）とリモートLLM（OpenAI, Anthropic）の両方に対応。用途に応じて柔軟に切り替え可能。OpenAI互換APIであればその他のサービスも利用可能。'
            },
            translation: {
                title: 'スマート翻訳',
                description: '入力されたテキストの言語を自動判定し、設定した言語間で相互翻訳。自然で読みやすい翻訳を実現。'
            },
            shortcuts: {
                title: 'ショートカットキー',
                description: 'カスタマイズ可能なグローバルショートカットキーで、テキストを選択して即座にLLM処理を実行。'
            },
            customPrompts: {
                title: 'カスタムプロンプト',
                description: '独自のプロンプトを設定して、テキストの校正、要約、スタイル変換など、あらゆる処理に対応。'
            },
            multilingual: {
                title: '多言語UI',
                description: '日本語・英語に対応したユーザーインターフェース。'
            },
            privacy: {
                title: 'プライバシー優先',
                description: 'ローカルLLMを使用すれば、すべての処理をオフラインで完結。データは外部に送信されません。'
            }
        },
        howItWorks: {
            title: '使い方',
            subtitle: '3ステップで簡単に始められます',
            step1: {
                title: 'LLM設定',
                description: 'ローカルLLM（LM Studio等）を起動するか、OpenAI APIキーを設定します。'
            },
            step2: {
                title: 'テキスト選択',
                description: '処理したいテキストを任意のアプリケーションで選択します。'
            },
            step3: {
                title: 'ショートカット実行',
                description: 'Ctrl+1（またはカスタム設定）を押すだけで、即座にAI処理が開始されます。'
            }
        },
        screenshots: {
            title: 'スクリーンショット',
            subtitle: 'GenGoの使用例',
            translation: {
                title: '翻訳機能',
                description: '日本語と英語の相互翻訳を瞬時に実行。設定からPreset Promptを利用することで、フランス語やドイツ語などの他の翻訳言語もサポート可能です。翻訳以外にも普段頻繁に利用するプロンプトをPreset Promptとして登録しておくことで、ワンクリックで様々な処理を実行できます。'
            },
            settings: {
                title: '設定画面',
                description: '直感的なUIで簡単に設定をカスタマイズ'
            },
            customPrompt: {
                title: 'カスタムプロンプト',
                description: 'オンデマンドで任意のプロンプトを実行'
            },
            result: {
                title: '結果プレビュー',
                description: '処理結果を確認してから適用'
            }
        },
        techStack: {
            title: '技術スタック',
            subtitle: '最新の技術で構築',
            electron: 'クロスプラットフォーム デスクトップアプリ',
            llm: 'ローカル & リモート AI モデル',
            javascript: 'モジュール対応 ES6+',
            bootstrap: 'レスポンシブデザイン'
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
                description: 'Supports both local LLMs (LM Studio) and remote LLMs (OpenAI, Anthropic). Switch flexibly according to your needs. Other services can be used if they support OpenAI-compatible API.'
            },
            translation: {
                title: 'Smart Translation',
                description: 'Automatically detects the language of input text and translates between configured languages. Achieves natural and readable translations.'
            },
            shortcuts: {
                title: 'Shortcut Keys',
                description: 'Execute LLM processing instantly by selecting text with customizable global shortcut keys.'
            },
            customPrompts: {
                title: 'Custom Prompts',
                description: 'Set your own prompts to handle any processing such as proofreading, summarization, and style conversion.'
            },
            multilingual: {
                title: 'Multilingual UI',
                description: 'User interface supporting Japanese and English.'
            },
            privacy: {
                title: 'Privacy First',
                description: 'When using local LLMs, all processing is completed offline. Data is never sent externally.'
            }
        },
        howItWorks: {
            title: 'How It Works',
            subtitle: 'Get started in 3 easy steps',
            step1: {
                title: 'Setup LLM',
                description: 'Launch a local LLM (such as LM Studio) or configure your OpenAI API key.'
            },
            step2: {
                title: 'Select Text',
                description: 'Select the text you want to process in any application.'
            },
            step3: {
                title: 'Execute Shortcut',
                description: 'Simply press Ctrl+1 (or custom setting) to instantly start AI processing.'
            }
        },
        screenshots: {
            title: 'Screenshots',
            subtitle: 'GenGo in action',
            translation: {
                title: 'Translation Feature',
                description: 'Execute bidirectional translation between Japanese and English instantly and easily. By using Preset Prompts from the settings, you can also support other translation languages such as French and German. In addition to translation, you can register frequently used prompts as Preset Prompts to execute various processes with a single click.'
            },
            settings: {
                title: 'Settings Panel',
                description: 'Easily customize settings with an intuitive UI'
            },
            customPrompt: {
                title: 'Custom Prompt',
                description: 'Execute any prompt on demand'
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
