// ベストプラクティスデータ
// このファイルに新しいプロンプトを追加するだけで、自動的にページに反映されます
const bestPracticesData = [
    // サンプルデータ（コメントアウト）
    {
        icon: 'bi-translate',  // Bootstrap Iconのクラス名
        title: {
            ja: '言語翻訳',
            en: 'Language Translation'
        },
        description: {
            ja: '2つの言語を自動で認識して相互に翻訳します。',
            en: 'Automatically recognizes two languages and translates between them.'
        },
        prompt: 'Please translate between Japanese and English. Automatically detect the language of the input text and translate it into the other language.',
    },
    {
        icon: 'bi-pencil-square',
        title: {
            ja: '文章校正',
            en: 'Text Proofreading'
        },
        description: {
            ja: '誤字脱字や文法の間違いをチェックし、より読みやすい文章に改善します。',
            en: 'Check for typos and grammar mistakes, improving readability.'
        },
        prompt: 'Proofread and improve the text. Fix any grammar, spelling, or punctuation errors.'
    }
];

/*
==========================================
使い方ガイド
==========================================

新しいベストプラクティスを追加する手順:

1. 上記の bestPracticesData 配列に新しいオブジェクトを追加
2. 以下の形式で記述:

{
    icon: 'bi-icon-name',  // Bootstrap Iconのクラス名
    title: {
        ja: '日本語タイトル',
        en: 'English Title'
    },
    description: {
        ja: '日本語の説明文',
        en: 'English description'
    },
    prompt: 'プロンプトテキスト（{text}がユーザーが選択したテキストに置き換わります）'
}

3. ファイルを保存すると、自動的にページに反映されます

==========================================
利用可能なBootstrap Icons（推奨）
==========================================

- bi-translate (翻訳)
- bi-pencil-square (校正)
- bi-file-text (要約)
- bi-chat-dots (会話)
- bi-code-slash (コード)
- bi-lightbulb (アイデア)
- bi-gear (設定)
- bi-star (おすすめ)
- bi-journal-text (文書作成)
- bi-arrow-repeat (変換)
- bi-check2-circle (チェック)
- bi-emoji-smile (トーン変更)

その他のアイコンは https://icons.getbootstrap.com/ で検索できます

==========================================
サンプル
==========================================

以下は実際に使える例です。コメントを外して使用してください:

{
    icon: 'bi-translate',
    title: {
        ja: '日英翻訳',
        en: 'Japanese to English Translation'
    },
    description: {
        ja: '日本語を自然な英語に翻訳。ビジネスメールや論文に最適。',
        en: 'Translate Japanese into natural English. Perfect for business emails and papers.'
    },
    prompt: 'Translate the following Japanese text into English. Use natural and professional language:\n\n{text}'
},
{
    icon: 'bi-emoji-smile',
    title: {
        ja: 'カジュアルな文体に変換',
        en: 'Convert to Casual Tone'
    },
    description: {
        ja: 'フォーマルな文章をフレンドリーでカジュアルな表現に書き換えます。',
        en: 'Rewrite formal text into friendly and casual expressions.'
    },
    prompt: 'Rewrite the following text in a casual, friendly tone while keeping the main message:\n\n{text}'
},
{
    icon: 'bi-file-text',
    title: {
        ja: '要約',
        en: 'Summarize'
    },
    description: {
        ja: '長い文章を簡潔に要約します。重要なポイントを抽出。',
        en: 'Summarize long texts concisely, extracting key points.'
    },
    prompt: 'Summarize the following text in 3-5 bullet points, focusing on the main ideas:\n\n{text}'
},
{
    icon: 'bi-check2-circle',
    title: {
        ja: '敬語チェック',
        en: 'Polite Form Check'
    },
    description: {
        ja: '日本語の敬語表現をチェックし、より丁寧な表現に改善します。',
        en: 'Check Japanese polite expressions and improve formality.'
    },
    prompt: '以下の文章の敬語表現をチェックし、より適切で丁寧な表現に修正してください：\n\n{text}'
}

*/
