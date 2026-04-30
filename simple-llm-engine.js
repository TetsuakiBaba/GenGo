/**
 * シンプルなLLMエンジン（Electron用）
 * LM Studioとの連携を行う
 */
export class SimpleLLMEngine {
    constructor(options = {}) {
        this.provider = options.provider || 'local';
        this.apiEndpoint = options.apiEndpoint || 'http://127.0.0.1:1234';
        this.apiKey = options.apiKey;
        this.model = options.model || '';
        this.maxTokens = options.maxTokens || 4096; // デフォルトは4096トークン
        this.maxRetries = options.maxRetries || 3;
        this.timeout = options.timeout || 60000; // 30秒 → 60秒に延長（長い文章処理に対応）
        this.enable_thinking = false;
        this.localReasoningUnsupportedModels = new Set(options.localReasoningUnsupportedModels || []);
        this.onLocalReasoningUnsupportedModel = options.onLocalReasoningUnsupportedModel || null;

        console.log('SimpleLLMEngine初期化:', {
            provider: this.provider,
            endpoint: this.apiEndpoint,
            model: this.model,
            maxTokens: this.maxTokens,
            hasApiKey: !!this.apiKey,
            enable_thinking: this.enable_thinking,
            localReasoningUnsupportedModels: Array.from(this.localReasoningUnsupportedModels)
        });
    }

    isReasoningUnsupportedApiError(errorData, fallbackMessage = '') {
        const message = String(errorData?.error?.message || fallbackMessage || '').toLowerCase();
        const code = String(errorData?.error?.code || '').toLowerCase();

        if (!message.includes('reasoning')) {
            return false;
        }

        return (
            code.includes('unrecognized') ||
            code.includes('invalid') ||
            message.includes('unrecognized') ||
            message.includes('unknown') ||
            message.includes('invalid')
        );
    }

    async rememberLocalReasoningUnsupportedModel(modelId) {
        if (!modelId) {
            return;
        }

        if (this.localReasoningUnsupportedModels.has(modelId)) {
            return;
        }

        this.localReasoningUnsupportedModels.add(modelId);

        if (typeof this.onLocalReasoningUnsupportedModel === 'function') {
            try {
                await this.onLocalReasoningUnsupportedModel(modelId);
            } catch (error) {
                console.error('reasoning非対応モデルの保存に失敗:', error);
            }
        }
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

    normalizeLocalEndpoint(endpoint) {
        let base = (endpoint || '').trim();

        if (!base) {
            return 'http://127.0.0.1:1234';
        }

        if (base.endsWith('/')) {
            base = base.slice(0, -1);
        }

        if (base.endsWith('/api/v1')) {
            return base.slice(0, -7);
        }

        if (base.endsWith('/v1')) {
            return base.slice(0, -3);
        }

        return base;
    }

    buildApiUrl(path) {
        if (this.provider === 'local') {
            return `${this.normalizeLocalEndpoint(this.apiEndpoint)}/api/v1${path}`;
        }

        let apiUrl = this.apiEndpoint;
        if (apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl = `${apiUrl}/chat/completions`;
        }

        return apiUrl;
    }

    async fetchLocalModels() {
        const response = await fetch(this.buildApiUrl('/models'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LM Studio models API error: ${response.status} ${errorText}`);
        }

        const payload = await response.json();
        const models = Array.isArray(payload?.models)
            ? payload.models
            : (Array.isArray(payload?.data) ? payload.data : []);

        const loadedInstances = [];
        models.forEach((model) => {
            const instances = Array.isArray(model?.loaded_instances) ? model.loaded_instances : [];
            instances.forEach((instance) => {
                if (instance?.id) {
                    loadedInstances.push(instance.id);
                }
            });
        });

        return { models, loadedInstances };
    }

    async resolveLocalModelId() {
        if (this.provider !== 'local') {
            return this.model;
        }

        if (this.model && this.model.trim()) {
            return this.model.trim();
        }

        const modelData = await this.fetchLocalModels();
        if (modelData.loadedInstances.length === 0) {
            throw new Error('LM Studioでロード済みモデルが見つかりません。設定画面でモデルをロードして選択してください。');
        }

        this.model = modelData.loadedInstances[0];
        return this.model;
    }

    extractLocalChatOutput(data) {
        const outputs = Array.isArray(data?.output)
            ? data.output
            : (Array.isArray(data?.response?.output)
                ? data.response.output
                : (Array.isArray(data?.result?.output) ? data.result.output : []));
        if (outputs.length === 0) {
            return '';
        }

        const chunks = outputs
            .filter(item => item?.type === 'message' && item?.content)
            .map((item) => {
                if (typeof item.content === 'string') {
                    return item.content;
                }

                if (Array.isArray(item.content)) {
                    return item.content.map(part => part?.text || '').join('');
                }

                if (item.content && typeof item.content === 'object') {
                    if (typeof item.content.text === 'string') {
                        return item.content.text;
                    }
                    if (Array.isArray(item.content.parts)) {
                        return item.content.parts.map(part => part?.text || '').join('');
                    }
                }

                return '';
            })
            .filter(Boolean);

        return chunks.join('\n').trim();
    }

    extractResponseTextFromJson(data) {
        if (this.provider === 'local') {
            const directOutputText = typeof data?.output_text === 'string'
                ? data.output_text
                : (typeof data?.response?.output_text === 'string' ? data.response.output_text : '');

            const localText = directOutputText || this.extractLocalChatOutput(data);
            return localText || '';
        }

        if (data?.choices && data.choices.length > 0) {
            const message = data.choices[0].message;
            const content = message?.content || '';
            const reasoning = message?.reasoning_content || '';
            return reasoning ? `<think>\n${reasoning}\n</think>\n${content}` : content;
        }

        return '';
    }

    async callLLMFallbackNonStream(prompt, modelToUse, headers, apiUrl, onChunk = null, options = {}) {
        const omitLocalReasoning = options.omitLocalReasoning === true;
        const shouldIncludeLocalReasoning = this.provider === 'local'
            && !omitLocalReasoning
            && !this.localReasoningUnsupportedModels.has(modelToUse);

        const fallbackBody = this.provider === 'local'
            ? {
                model: modelToUse,
                input: prompt,
                stream: false,
                ...(shouldIncludeLocalReasoning ? { reasoning: "off" } : {}),
            }
            : {
                model: modelToUse,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: false
            };

        if (this.provider === 'remote') {
            const useMaxCompletionTokens = modelToUse && (
                modelToUse.startsWith('gpt-') ||
                modelToUse.includes('o1') ||
                modelToUse.includes('o3') ||
                modelToUse.includes('o4')
            );

            if (useMaxCompletionTokens) {
                fallbackBody.max_completion_tokens = this.maxTokens;
            } else {
                fallbackBody.max_tokens = this.maxTokens;
            }
        }

        const fallbackResponse = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(fallbackBody)
        });

        if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            let fallbackErrorData = null;
            try {
                fallbackErrorData = JSON.parse(fallbackErrorText);
            } catch {
            }

            const fallbackErrorMessage = fallbackErrorData?.error?.message || fallbackErrorText;

            if (
                this.provider === 'local'
                && shouldIncludeLocalReasoning
                && this.isReasoningUnsupportedApiError(fallbackErrorData, fallbackErrorMessage)
            ) {
                console.warn(`モデル ${modelToUse} は reasoning 非対応。フォールバック再試行時は reasoning を省略します。`);
                await this.rememberLocalReasoningUnsupportedModel(modelToUse);
                return this.callLLMFallbackNonStream(prompt, modelToUse, headers, apiUrl, onChunk, { omitLocalReasoning: true });
            }

            throw new Error(`LLM API フォールバック失敗: HTTP ${fallbackResponse.status} ${fallbackErrorMessage}`);
        }

        const fallbackData = await fallbackResponse.json();
        const fallbackText = this.extractResponseTextFromJson(fallbackData);
        if (!fallbackText || !fallbackText.trim()) {
            throw new Error('LLM APIフォールバック応答が空です');
        }

        if (onChunk) {
            onChunk(fallbackText, fallbackText);
        }

        return fallbackText;
    }

    extractStreamPayloadText(data) {
        const delta = data?.choices?.[0]?.delta;
        const choiceMessage = data?.choices?.[0]?.message;

        const openAIContentChunk = typeof delta?.content === 'string' ? delta.content : '';
        const openAIReasoningChunk = typeof delta?.reasoning_content === 'string' ? delta.reasoning_content : '';
        const openAIMessageContent = typeof choiceMessage?.content === 'string' ? choiceMessage.content : '';
        const openAIMessageReasoning = typeof choiceMessage?.reasoning_content === 'string' ? choiceMessage.reasoning_content : '';

        const eventType = String(data?.type || data?.event || '');

        const localDelta = typeof data?.delta === 'string'
            ? data.delta
            : (typeof data?.output_text === 'string'
                ? data.output_text
                : (typeof data?.response?.output_text === 'string' ? data.response.output_text : ''));

        const localMessageDelta = eventType === 'message.delta' && typeof data?.content === 'string'
            ? data.content
            : '';

        const typedDelta = eventType.includes('output_text.delta')
            ? (data?.delta || data?.text || data?.content || '')
            : '';

        const localFullText = this.extractLocalChatOutput(data);

        return {
            contentChunk: openAIContentChunk || localMessageDelta || typedDelta || localDelta || '',
            reasoningChunk: openAIReasoningChunk || '',
            absoluteContent: openAIMessageContent || localFullText || '',
            absoluteReasoning: openAIMessageReasoning || ''
        };
    }

    parseStreamPayloads(streamText) {
        const payloads = [];
        const lines = streamText.split(/\r?\n/);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) {
                continue;
            }

            const payloadText = trimmed.startsWith('data:')
                ? trimmed.slice(5).trim()
                : trimmed;

            if (!payloadText || payloadText === '[DONE]') {
                continue;
            }

            try {
                payloads.push(JSON.parse(payloadText));
            } catch (parseError) {
                console.warn('ストリーミングチャンクの解析をスキップしました:', payloadText.slice(0, 120));
            }
        }

        return payloads;
    }

    findIncompleteStreamRemainder(streamText) {
        const lastNewlineIndex = streamText.lastIndexOf('\n');
        if (lastNewlineIndex === -1) {
            return streamText;
        }

        const remainder = streamText.slice(lastNewlineIndex + 1);
        return remainder.trim() ? remainder : '';
    }

    /**
     * LLM APIを呼び出し（常時ストリーミング）
     */
    async callLLM(prompt, onChunk = null, options = {}) {
        console.log('callLLM() - ストリーミング実行 - プロンプト:', prompt);

        const maxTokens = this.maxTokens;
        const promptLength = prompt.length;
        const modelToUse = options.modelOverride || (this.provider === 'local' ? await this.resolveLocalModelId() : this.model);
        const omitLocalReasoning = options.omitLocalReasoning === true;
        const shouldIncludeLocalReasoning = this.provider === 'local'
            && !omitLocalReasoning
            && !this.localReasoningUnsupportedModels.has(modelToUse);

        const requestBody = this.provider === 'local'
            ? {
                model: modelToUse,
                input: prompt,
                stream: true,
                ...(shouldIncludeLocalReasoning ? { reasoning: "off" } : {}),
            }
            : {
                model: modelToUse,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: true
            };

        const useMaxCompletionTokens = this.provider === 'remote' && modelToUse && (
            modelToUse.startsWith('gpt-') ||
            modelToUse.includes('o1') ||
            modelToUse.includes('o3') ||
            modelToUse.includes('o4')
        );

        if (this.provider === 'local') {
            console.log('ローカルプロバイダーのためトークン制限キーは送信しません');
        } else if (useMaxCompletionTokens) {
            requestBody.max_completion_tokens = maxTokens;
        } else {
            requestBody.max_tokens = maxTokens;
        }

        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.provider === 'remote' && this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const apiUrl = this.provider === 'local'
            ? this.buildApiUrl('/chat')
            : this.buildApiUrl('/chat/completions');

        console.log(`LLM API呼び出し詳細:`, {
            provider: this.provider,
            url: apiUrl,
            model: modelToUse,
            hasApiKey: !!this.apiKey,
            promptLength,
            maxTokens,
            stream: true
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            if (!response.ok) {
                clearTimeout(timeoutId);
                let errorMessage = `HTTP ${response.status} ${response.statusText}`;
                let errorData = null;
                try {
                    const errorText = await response.text();
                    try {
                        errorData = JSON.parse(errorText);
                        if (errorData?.error?.message) {
                            errorMessage = errorData.error.message;
                        } else if (errorText && errorText.length < 300) {
                            errorMessage = errorText;
                        }
                    } catch {
                        if (errorText && errorText.length < 300) {
                            errorMessage = errorText;
                        }
                    }
                } catch (textError) {
                    console.error('エラーレスポンスの読み取りに失敗:', textError);
                }

                if (
                    this.provider === 'local'
                    && shouldIncludeLocalReasoning
                    && this.isReasoningUnsupportedApiError(errorData, errorMessage)
                ) {
                    console.warn(`モデル ${modelToUse} は reasoning 非対応。以後 reasoning なしで送信します。`);
                    await this.rememberLocalReasoningUnsupportedModel(modelToUse);
                    return this.callLLM(prompt, onChunk, { omitLocalReasoning: true, modelOverride: modelToUse });
                }

                throw new Error(`LLM API エラー: ${errorMessage}`);
            }

            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            const isEventStream = contentType.includes('text/event-stream') && !!response.body;

            if (!isEventStream) {
                const data = await response.json();
                clearTimeout(timeoutId);

                const responseText = this.extractResponseTextFromJson(data);
                if (responseText && responseText.trim()) {
                    if (onChunk) {
                        onChunk(responseText, responseText);
                    }
                    return responseText;
                }

                throw new Error('LLM APIからの応答形式が不正です');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullText = '';
            let fullReasoning = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const remainder = this.findIncompleteStreamRemainder(buffer);
                    const parseableText = remainder ? buffer.slice(0, -remainder.length) : buffer;
                    buffer = remainder;

                    for (const data of this.parseStreamPayloads(parseableText)) {
                        const parsed = this.extractStreamPayloadText(data);

                        if (parsed.reasoningChunk) {
                            fullReasoning += parsed.reasoningChunk;
                        }

                        if (parsed.contentChunk) {
                            fullText += parsed.contentChunk;
                        } else if (parsed.absoluteContent && !fullText) {
                            fullText = parsed.absoluteContent;
                        }

                        if (parsed.absoluteReasoning && !fullReasoning) {
                            fullReasoning = parsed.absoluteReasoning;
                        }

                        if (onChunk && (parsed.reasoningChunk || parsed.contentChunk || parsed.absoluteContent)) {
                            const combinedText = fullReasoning
                                ? `<think>\n${fullReasoning}\n</think>\n${fullText}`
                                : fullText;
                            onChunk(parsed.contentChunk || parsed.absoluteContent || '', combinedText);
                        }
                    }
                }

                const trailing = buffer.trim();
                for (const data of this.parseStreamPayloads(trailing)) {
                    const parsed = this.extractStreamPayloadText(data);
                    if (parsed.reasoningChunk) {
                        fullReasoning += parsed.reasoningChunk;
                    }
                    if (parsed.contentChunk) {
                        fullText += parsed.contentChunk;
                    } else if (parsed.absoluteContent && !fullText) {
                        fullText = parsed.absoluteContent;
                    }
                }
            } finally {
                clearTimeout(timeoutId);
                reader.releaseLock();
            }

            const finalResult = fullReasoning ? `<think>\n${fullReasoning}\n</think>\n${fullText}` : fullText;
            if (finalResult && finalResult.trim()) {
                return finalResult;
            }

            console.warn('ストリーミング応答が空のため、非ストリーミングで再試行します');
            return await this.callLLMFallbackNonStream(prompt, modelToUse, headers, apiUrl, onChunk, {
                omitLocalReasoning: !shouldIncludeLocalReasoning
            });

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
    extractCorrectedText(response, keepThinking = false) {
        // 新しい統一クリーニング機能を使用
        return this.cleanLLMResponse(response, keepThinking);
    }

    /**
     * LLM応答から翻訳されたテキストを抽出
     */
    extractTranslatedText(response, keepThinking = false) {
        // 新しい統一クリーニング機能を使用
        return this.cleanLLMResponse(response, keepThinking);
    }

    /**
     * API接続テスト
     */
    async testConnection() {
        try {
            const url = this.provider === 'local'
                ? this.buildApiUrl('/models')
                : `${this.apiEndpoint}/models`;

            const response = await fetch(url, {
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
    cleanLLMResponse(response, keepThinking = false) {
        let cleaned = response.trim();

        if (keepThinking) {
            // 思考プロセスを可視化（除去せず、わかりやすいラベルに変換）
            // タグが既にある場合（DeepSeek R1など）
            cleaned = cleaned.replace(/<think>\s*/g, '【思考中...】\n');
            cleaned = cleaned.replace(/\s*<\/think>/g, '\n【思考完了】\n');
        } else {
            // <think>タグとその内容を完全に除去
            cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
            // 閉じられていない<think>タグも除去（ストリーミング中の表示用ガード）
            cleaned = cleaned.replace(/<think>[\s\S]*/g, '');
        }

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

    /**
     * ストリーミングモードでLLMを呼び出し
     * @param {string} prompt - プロンプト
     * @param {function} onChunk - チャンクを受信したときのコールバック関数
     * @returns {Promise<string>} - 完全なレスポンステキスト
     */
    async callLLMStreaming(prompt, onChunk) {
        return this.callLLM(prompt, onChunk);
    }

    /**
     * カスタムプロンプト処理（ストリーミング対応）
     */
    async processCustomPromptStreaming(inputText, customPrompt, onChunk) {
        try {
            console.log('カスタムプロンプト処理開始（ストリーミング）:', { inputText, customPrompt });

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

            const response = await this.callLLMStreaming(fullPrompt, onChunk);

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
                processedText: inputText
            };

        } catch (error) {
            console.error('カスタムプロンプト処理エラー:', error);
            return {
                success: false,
                error: error.message || '処理中にエラーが発生しました',
                originalText: inputText,
                processedText: inputText
            };
        }
    }
}
