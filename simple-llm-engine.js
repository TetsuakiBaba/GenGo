/**
 * シンプルなLLMエンジン（Electron用）
 * LM Studioとの連携を行う
 */
export class SimpleLLMEngine {
    constructor(options = {}) {
        this.provider = options.provider || 'local';
        this.apiEndpoint = options.apiEndpoint || 'http://127.0.0.1:1234/v1';
        this.apiKey = options.apiKey;
        this.model = options.model || 'local-model';
        this.maxRetries = options.maxRetries || 3;
        this.timeout = options.timeout || 60000; // 30秒 → 60秒に延長（長い文章処理に対応）

        console.log('SimpleLLMEngine初期化:', {
            provider: this.provider,
            endpoint: this.apiEndpoint,
            model: this.model,
            hasApiKey: !!this.apiKey
        });
    }

    /**
     * テキストの仮名漢字変換・校正処理
     */
    async processTextCorrection(inputText) {
        try {
            console.log('LLM処理開始:', inputText);

            const prompt = this.createCorrectionPrompt(inputText);
            const response = await this.callLLM(prompt);

            if (response && response.trim()) {
                const correctedText = this.extractCorrectedText(response);

                console.log('LLM処理完了:', correctedText);

                return {
                    success: true,
                    originalText: inputText,
                    correctedText: correctedText,
                    needsReplacement: correctedText !== inputText
                };
            }

            return {
                success: false,
                error: 'LLMからの応答が空です',
                originalText: inputText,
                correctedText: inputText,
                needsReplacement: false
            };

        } catch (error) {
            console.error('LLM処理エラー:', error);
            return {
                success: false,
                error: error.message,
                originalText: inputText,
                correctedText: inputText,
                needsReplacement: false
            };
        }
    }

    /**
     * ひらがな・ローマ字の漢字変換処理
     */
    async processKanaKanjiConversion(inputText) {
        try {
            console.log('かな漢字変換開始:', inputText);

            const prompt = this.createKanaKanjiPrompt(inputText);
            const response = await this.callLLM(prompt);

            if (response && response.trim()) {
                const convertedText = this.extractCorrectedText(response);

                console.log('かな漢字変換完了:', convertedText);

                return {
                    success: true,
                    originalText: inputText,
                    correctedText: convertedText,
                    needsReplacement: convertedText !== inputText
                };
            }

            return {
                success: false,
                error: 'LLMからの応答が空です',
                originalText: inputText,
                correctedText: inputText,
                needsReplacement: false
            };

        } catch (error) {
            console.error('かな漢字変換エラー:', error);
            return {
                success: false,
                error: error.message,
                originalText: inputText,
                correctedText: inputText,
                needsReplacement: false
            };
        }
    }

    /**
     * 翻訳処理
     */
    async processTranslation(inputText) {
        try {
            console.log('翻訳開始:', inputText);

            const prompt = this.createTranslationPrompt(inputText);
            const response = await this.callLLM(prompt);

            if (response && response.trim()) {
                const translatedText = this.extractCorrectedText(response);

                console.log('翻訳完了:', translatedText);

                return {
                    success: true,
                    originalText: inputText,
                    translatedText: translatedText,
                    needsReplacement: true
                };
            }

            return {
                success: false,
                error: 'LLMからの応答が空です',
                originalText: inputText,
                translatedText: inputText,
                needsReplacement: false
            };

        } catch (error) {
            console.error('翻訳エラー:', error);
            return {
                success: false,
                error: error.message,
                originalText: inputText,
                translatedText: inputText,
                needsReplacement: false
            };
        }
    }

    /**
     * かな漢字変換用プロンプトを生成
     */
    createKanaKanjiPrompt(text) {
        return `以下の日本語テキストのかな漢字変換を行ってください。

入力テキスト: "${text}"

要件:
1. ひらがなとローマ字を適切な漢字に変換
2. 文脈に応じた最適な漢字を選択
3. 自然で読みやすい日本語に変換
4. 固有名詞は一般的な表記を使用
5. 変換が不要な場合は元のテキストをそのまま出力

変換されたテキストのみを出力してください。説明や追加の文章は不要です。`;
    }

    /**
     * 翻訳用プロンプトを生成
     */
    createTranslationPrompt(text) {
        // 言語を自動検出して翻訳方向を決定
        const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

        if (isJapanese) {
            return `以下の日本語テキストを自然な英語に翻訳してください。

日本語テキスト: "${text}"

要件:
1. 自然で流暢な英語に翻訳
2. 文脈を考慮した適切な表現を使用
3. 専門用語は適切な英語表記に変換
4. 日本語の敬語は適切な英語の丁寧語に対応

英語翻訳のみを出力してください。説明や追加の文章は不要です。`;
        } else {
            return `以下の英語テキストを自然な日本語に翻訳してください。

英語テキスト: "${text}"

要件:
1. 自然で読みやすい日本語に翻訳
2. 文脈を考慮した適切な表現を使用
3. 専門用語は適切な日本語に変換
4. 敬語が必要な場合は適切に使用

日本語翻訳のみを出力してください。説明や追加の文章は不要です。`;
        }
    }

    /**
     * 校正用プロンプトを生成
     */
    createCorrectionPrompt(text) {
        return `以下の日本語テキストの仮名漢字変換と文章校正を行ってください。

入力テキスト: "${text}"

要件:
1. ひらがなで入力された部分を適切な漢字に変換
2. 文法的な誤りがあれば修正
3. 自然で読みやすい日本語に校正
4. 元の意味を保持する
5. 修正が不要な場合は元のテキストをそのまま出力

修正されたテキストのみを出力してください。説明や追加の文章は不要です。`;
    }

    /**
     * LLM APIを呼び出し
     */
    async callLLM(prompt) {
        // プロンプトの長さに基づいて適切なmax_tokensを計算
        const promptLength = prompt.length;
        let maxTokens;

        if (promptLength > 3000) {
            maxTokens = 8192; // 非常に長いテキスト
        } else if (promptLength > 1500) {
            maxTokens = 6144; // 長いテキスト
        } else if (promptLength > 500) {
            maxTokens = 4096; // 中程度のテキスト
        } else {
            maxTokens = 2048; // 短いテキスト
        }

        console.log(`プロンプト長: ${promptLength}文字, max_tokens: ${maxTokens}`);

        // リクエストボディを構築
        const requestBody = {
            model: this.model,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            stream: false
        };

        // モデルに応じて適切なトークン制限パラメータを使用
        // OpenAI API (gpt-*), Anthropic (claude-*) などリモートプロバイダーは max_completion_tokens を優先
        // ローカルモデルは max_tokens を使用
        console.log(`モデル判定 - provider: "${this.provider}", model: "${this.model}", type: ${typeof this.model}`);

        const useMaxCompletionTokens = this.provider === 'remote' && this.model && (
            this.model.startsWith('gpt-') ||
            this.model.includes('gpt-4o') ||
            this.model.includes('gpt-4-turbo') ||
            this.model.includes('o1') ||
            this.model.includes('o3')
        );

        console.log(`useMaxCompletionTokens: ${useMaxCompletionTokens}`);

        if (useMaxCompletionTokens) {
            requestBody.max_completion_tokens = maxTokens;
            console.log(`max_completion_tokens を使用: ${maxTokens}`);
        } else {
            requestBody.max_tokens = maxTokens;
            console.log(`max_tokens を使用: ${maxTokens}`);
        }

        // ヘッダーを構築（プロバイダーに応じて認証を設定）
        const headers = {
            'Content-Type': 'application/json',
        };

        // リモートプロバイダーの場合はAPIキーを追加
        if (this.provider === 'remote' && this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            console.log('リモートプロバイダー認証ヘッダーを設定');
        } else if (this.provider === 'local') {
            console.log('ローカルプロバイダー（認証なし）');
        }

        // エンドポイントURLを構築（既に/chat/completionsが含まれている場合は追加しない）
        let apiUrl = this.apiEndpoint;

        // 末尾のスラッシュを削除
        if (apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }

        // /chat/completionsが含まれていない場合のみ追加
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl = `${apiUrl}/chat/completions`;
        }

        console.log(`LLM API呼び出し詳細:`, {
            provider: this.provider,
            url: apiUrl,
            model: this.model,
            hasApiKey: !!this.apiKey,
            promptLength: promptLength,
            maxTokens: maxTokens
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status} ${response.statusText}`;
                try {
                    const errorText = await response.text();
                    console.error(`LLM API エラー詳細: ${response.status} ${response.statusText}`, errorText);

                    // JSONエラーレスポンスをパース
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error && errorData.error.message) {
                            errorMessage = errorData.error.message;
                        }
                    } catch (parseError) {
                        // JSON解析失敗の場合はテキストをそのまま使用
                        if (errorText && errorText.length < 200) {
                            errorMessage = errorText;
                        }
                    }
                } catch (textError) {
                    console.error('エラーレスポンスの読み取りに失敗:', textError);
                }

                throw new Error(`LLM API エラー: ${errorMessage}`);
            }

            const data = await response.json();

            if (data.choices && data.choices.length > 0) {
                const responseText = data.choices[0].message.content;
                console.log(`レスポンス長: ${responseText.length}文字`);
                return responseText;
            }

            throw new Error('LLM APIからの応答形式が不正です');

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('LLM API呼び出しがタイムアウトしました');
            }

            console.error('LLM API呼び出しエラー:', error);
            throw error;
        }
    }

    /**
     * LLM応答から校正されたテキストを抽出
     */
    extractCorrectedText(response) {
        // 新しい統一クリーニング機能を使用
        return this.cleanLLMResponse(response);
    }

    /**
     * LLM応答から翻訳されたテキストを抽出
     */
    extractTranslatedText(response) {
        // 新しい統一クリーニング機能を使用
        return this.cleanLLMResponse(response);
    }

    /**
     * API接続テスト
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.apiEndpoint}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            return response.ok;
        } catch (error) {
            console.error('API接続テストエラー:', error);
            return false;
        }
    }

    /**
     * 設定更新
     */
    updateSettings(settings) {
        if (settings.apiEndpoint) {
            this.apiEndpoint = settings.apiEndpoint;
        }
        if (settings.model) {
            this.model = settings.model;
        }
        if (settings.timeout) {
            this.timeout = settings.timeout;
        }
    }

    /**
     * スマート翻訳処理（相互翻訳）
     */
    async processSmartTranslation(inputText, language1, language2) {
        try {
            console.log('スマート翻訳処理開始:', { inputText, language1, language2 });

            const prompt = this.createSmartTranslationPrompt(inputText, language1, language2);
            const response = await this.callLLM(prompt);

            if (response && response.trim()) {
                const translatedText = this.extractTranslatedText(response);

                console.log('スマート翻訳完了:', translatedText);

                return {
                    success: true,
                    originalText: inputText,
                    translatedText: translatedText,
                    needsReplacement: translatedText !== inputText
                };
            }

            return {
                success: false,
                error: 'LLMからの応答が空です',
                originalText: inputText,
                translatedText: inputText,
                needsReplacement: false
            };

        } catch (error) {
            console.error('スマート翻訳エラー:', error);
            return {
                success: false,
                error: error.message,
                originalText: inputText,
                translatedText: inputText,
                needsReplacement: false
            };
        }
    }

    /**
     * スマート翻訳用のプロンプト作成
     */
    createSmartTranslationPrompt(inputText, language1, language2) {
        return `あなたは優秀な翻訳者です。入力されたテキストの言語を判定し、適切に翻訳してください。

翻訳ルール:
- 設定言語: ${language1} ⇔ ${language2}
- 入力テキストが${language1}の場合は${language2}に翻訳
- 入力テキストが${language2}の場合は${language1}に翻訳
- 自然で読みやすい翻訳を心がける
- 元のテキストの意味とトーンを保持する
- 翻訳結果のみを出力し、説明や追加情報は不要

入力テキスト: "${inputText}"

翻訳結果:`;
    }

    /**
     * カスタムプロンプトによるテキスト処理
     */
    async processCustomPrompt(inputText, customPrompt) {
        try {
            console.log('カスタムプロンプト処理開始:', { inputText, customPrompt });

            const fullPrompt = `${customPrompt}

入力テキスト: "${inputText}"

重要な指示:
- 処理結果のみを出力してください
- マークダウン記法は使用しないでください
- タイトルや見出しを付けないでください
- 説明文や前置きは不要です
- 元のテキストと同じ形式で出力してください
- 結果だけを簡潔に回答してください

処理結果:`;

            const response = await this.callLLM(fullPrompt);

            if (response && response.trim()) {
                let processedText = response.trim();

                // よくあるLLMの冗長な回答パターンを除去
                processedText = this.cleanLLMResponse(processedText);

                console.log('カスタムプロンプト処理完了:', processedText);

                return {
                    success: true,
                    originalText: inputText,
                    processedText: processedText,
                    needsReplacement: processedText !== inputText
                };
            }

            return {
                success: false,
                error: 'LLMからの応答が空です',
                originalText: inputText,
                processedText: inputText,
                needsReplacement: false
            };

        } catch (error) {
            console.error('カスタムプロンプト処理エラー:', error);
            return {
                success: false,
                error: error.message,
                originalText: inputText,
                processedText: inputText,
                needsReplacement: false
            };
        }
    }

    /**
     * LLMの回答から不要な装飾や説明を除去
     */
    cleanLLMResponse(response) {
        let cleaned = response.trim();

        // マークダウンの見出し記号を除去
        cleaned = cleaned.replace(/^#+\s*/gm, '');

        // マークダウンのコードブロックを除去
        cleaned = cleaned.replace(/```[^`]*```/g, '');
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

        // マークダウンの太字・斜体を除去
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
        cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
        cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

        // よくある前置きパターンを除去（日本語）
        const jpPrefixPatterns = [
            /^(以下が|これが|結果:|処理結果:|回答:|翻訳結果:|修正結果:|校正結果:|変換結果:|翻訳:|修正版:|校正版:)[\s\n]*/i,
            /^(以下のように|次のように|このように)[\s\n]*/i,
            /^(修正されたテキスト:|校正されたテキスト:|翻訳されたテキスト:)[\s\n]*/i,
        ];

        // よくある前置きパターンを除去（英語）
        const enPrefixPatterns = [
            /^(Here is|This is|Result:|Translation:|Correction:|Revised:|Modified:|The result is:)[\s\n]*/i,
            /^(Translated text:|Corrected text:|Modified text:|Revised text:)[\s\n]*/i,
            /^(The translation is:|The correction is:)[\s\n]*/i,
        ];

        // 全パターンを適用
        const allPatterns = [...jpPrefixPatterns, ...enPrefixPatterns];
        for (const pattern of allPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        // 引用符で囲まれている場合は除去（日本語・英語両対応）
        cleaned = cleaned.replace(/^["「『](.*)["」』]$/s, '$1');
        cleaned = cleaned.replace(/^[''](.*)['']$/s, '$1');

        // 矢印記号を除去
        cleaned = cleaned.replace(/^(→|⇒|➤|▶)\s*/gm, '');

        // よくある後置きパターンを除去
        const suffixPatterns = [
            /[\s\n]*(以上です|です。以上|になります|となります)[\s\n]*$/i,
            /[\s\n]*(That's all|That's it|Hope this helps)[\s\n]*$/i,
        ];

        for (const pattern of suffixPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        // 余分な改行や空白を正規化
        cleaned = cleaned.replace(/^\s+|\s+$/g, '').replace(/\n\s*\n/g, '\n');

        // 空の行を除去
        cleaned = cleaned.split('\n').filter(line => line.trim()).join('\n');

        return cleaned;
    }
}
