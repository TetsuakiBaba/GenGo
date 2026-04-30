import Foundation

struct LLMService {
    enum AppleFoundationModelUnavailableReason: String, Sendable {
        case unsupportedOS
        case frameworkUnavailable
        case deviceNotEligible
        case appleIntelligenceNotEnabled
        case modelNotReady
        case unsupportedLocale
    }

    private enum OllamaModelSource {
        case local
        case cloud
    }

    enum LLMError: LocalizedError {
        case invalidEndpoint
        case noLoadedModel
        case appleFoundationModelUnavailable(AppleFoundationModelUnavailableReason)
        case invalidResponse(String)
        case httpError(statusCode: Int, message: String)

        var errorDescription: String? {
            switch self {
            case .invalidEndpoint:
                return "LLM エンドポイントが不正です。"
            case .noLoadedModel:
                return "利用可能なローカルモデルが見つかりません。"
            case .appleFoundationModelUnavailable(let reason):
                switch reason {
                case .unsupportedOS:
                    return "Apple Intelligence は macOS 26 以降で利用できます。"
                case .frameworkUnavailable:
                    return "このビルドでは Apple Foundation Models framework を利用できません。"
                case .deviceNotEligible:
                    return "この Mac は Apple Intelligence に対応していません。"
                case .appleIntelligenceNotEnabled:
                    return "Apple Intelligence が有効になっていません。"
                case .modelNotReady:
                    return "Apple Intelligence のオンデバイスモデルがまだ利用可能になっていません。"
                case .unsupportedLocale:
                    return "現在の言語または地域設定では Apple Intelligence のオンデバイスモデルを利用できません。"
                }
            case .invalidResponse(let message):
                return message
            case .httpError(let statusCode, let message):
                return "LLM API エラー (\(statusCode)): \(message)"
            }
        }
    }

    private let session: URLSession = .shared
    private let ollamaCloudModelsURL = "https://ollama.com/api/tags"

    func fetchModels(endpoint: String, provider: LLMProvider) async throws -> [LocalModelInstance] {
        switch provider {
        case .local:
            return try await fetchLocalModels(endpoint: endpoint)
        case .ollama:
            return try await fetchOllamaModels(endpoint: endpoint)
        case .appleFoundation:
            return []
        case .remote:
            return []
        }
    }

    func fetchLocalModels(endpoint: String) async throws -> [LocalModelInstance] {
        let normalized = AppSettings.normalizeEndpoint(endpoint, provider: .local)
        guard let url = URL(string: "\(normalized)/api/v1/models") else {
            throw LLMError.invalidEndpoint
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)

        let root = try decodeJSON(data)
        let modelObjects = (root["models"] as? [[String: Any]]) ?? (root["data"] as? [[String: Any]]) ?? []
        var instances: [LocalModelInstance] = []
        var seen = Set<String>()

        for model in modelObjects {
            let modelKey = stringValue(in: model, keys: ["key", "id"]) ?? ""
            let displayName = stringValue(in: model, keys: ["display_name", "displayName", "id"]) ?? modelKey
            let loadedInstances = model["loaded_instances"] as? [[String: Any]] ?? []

            if loadedInstances.isEmpty, let identifier = model["id"] as? String, !identifier.isEmpty {
                if seen.insert(identifier).inserted {
                    instances.append(
                        LocalModelInstance(
                            id: identifier,
                            modelKey: modelKey.isEmpty ? identifier : modelKey,
                            displayName: displayName.isEmpty ? identifier : displayName
                        )
                    )
                }
                continue
            }

            for loaded in loadedInstances {
                guard let identifier = loaded["id"] as? String, !identifier.isEmpty else {
                    continue
                }

                if seen.insert(identifier).inserted {
                    instances.append(
                        LocalModelInstance(
                            id: identifier,
                            modelKey: modelKey,
                            displayName: displayName.isEmpty ? identifier : displayName
                        )
                    )
                }
            }
        }

        return instances
    }

    func fetchOllamaModels(endpoint: String) async throws -> [LocalModelInstance] {
        let normalized = AppSettings.normalizeEndpoint(endpoint, provider: .ollama)
        guard
            let localURL = URL(string: "\(normalized)/api/tags"),
            let cloudURL = URL(string: ollamaCloudModelsURL)
        else {
            throw LLMError.invalidEndpoint
        }

        async let localModelsTask = fetchOllamaModels(url: localURL, source: .local)
        async let cloudModelsTask = fetchOllamaModels(url: cloudURL, source: .cloud)

        let localModels = try await localModelsTask
        let cloudModels = (try? await cloudModelsTask) ?? []

        return mergedModels(localModels + cloudModels)
    }

    private func fetchOllamaModels(url: URL, source: OllamaModelSource) async throws -> [LocalModelInstance] {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)

        let root = try decodeJSON(data)
        let modelObjects = root["models"] as? [[String: Any]] ?? []
        var models: [LocalModelInstance] = []
        var seen = Set<String>()

        for model in modelObjects {
            let catalogIdentifier = stringValue(in: model, keys: ["name", "model", "id"]) ?? ""
            let identifier = ollamaModelIdentifier(catalogIdentifier, source: source)
            guard !identifier.isEmpty, seen.insert(identifier).inserted else {
                continue
            }

            let details = model["details"] as? [String: Any] ?? [:]
            let displayName = ollamaModelDisplayName(identifier: identifier, details: details, source: source)

            models.append(
                LocalModelInstance(
                    id: identifier,
                    modelKey: identifier,
                    displayName: displayName
                )
            )
        }

        return models
    }

    private func ollamaModelIdentifier(_ catalogIdentifier: String, source: OllamaModelSource) -> String {
        switch source {
        case .local:
            return catalogIdentifier
        case .cloud:
            if catalogIdentifier.hasSuffix(":cloud") || catalogIdentifier.hasSuffix("-cloud") {
                return catalogIdentifier
            }

            if catalogIdentifier.contains(":") {
                return "\(catalogIdentifier)-cloud"
            }

            return "\(catalogIdentifier):cloud"
        }
    }

    func testConnection(settings: AppSettings) async throws {
        var normalized = settings
        normalized.normalize()

        let response = try await callLLM(
            prompt: "Say \"Connection successful\" in response.",
            settings: normalized,
            onUpdate: { _ in },
            onLocalReasoningUnsupportedModel: nil
        )

        guard !response.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw LLMError.invalidResponse("接続テストの応答が空でした。")
        }
    }

    func processCustomPromptStreaming(
        inputText: String,
        customPrompt: String,
        settings: AppSettings,
        onUpdate: @escaping @MainActor (String) -> Void,
        onLocalReasoningUnsupportedModel: (@Sendable (String) async -> Void)? = nil
    ) async throws -> String {
        let prompt = """
        \(customPrompt)

        入力テキスト: "\(inputText)"

        重要な指示:
        - 処理結果のみを出力してください
        - マークダウン記法は使用しないでください
        - タイトルや見出しを付けないでください
        - 説明文や前置きは不要です
        - 元のテキストと同じ形式で出力してください
        - 結果だけを簡潔に回答してください

        処理結果:
        """

        let rawResponse = try await callLLM(
            prompt: prompt,
            settings: settings,
            onUpdate: onUpdate,
            onLocalReasoningUnsupportedModel: onLocalReasoningUnsupportedModel
        )

        let cleaned = ResponseCleaner.clean(rawResponse)
        guard !cleaned.isEmpty else {
            throw LLMError.invalidResponse("LLM からの応答が空です。")
        }

        return cleaned
    }

    private func callLLM(
        prompt: String,
        settings: AppSettings,
        onUpdate: @escaping @MainActor (String) -> Void,
        modelIdentifierOverride: String? = nil,
        omitLocalReasoning: Bool = false,
        onLocalReasoningUnsupportedModel: (@Sendable (String) async -> Void)? = nil
    ) async throws -> String {
        if settings.llmProvider == .appleFoundation {
            let responseText = try await AppleFoundationModelClient.generate(
                prompt: prompt,
                maxTokens: settings.maxTokens
            )
            await onUpdate(ResponseCleaner.clean(responseText, keepThinking: true))
            return responseText
        }

        let modelIdentifier = try await resolveModelIdentifier(settings: settings, override: modelIdentifierOverride)
        let shouldIncludeLocalReasoning = settings.llmProvider == .local
            && !omitLocalReasoning
            && !settings.localReasoningUnsupportedModels.contains(modelIdentifier)

        let request = try makeStreamingRequest(
            prompt: prompt,
            settings: settings,
            modelIdentifier: modelIdentifier,
            includeLocalReasoning: shouldIncludeLocalReasoning
        )
        let (bytes, response) = try await session.bytes(for: request)
        let httpResponse = try httpResponse(from: response)
        let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""

        if !(200...299).contains(httpResponse.statusCode) {
            let data = try await consume(bytes: bytes)
            let message = String(data: data, encoding: .utf8) ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)

            if settings.llmProvider == .local, shouldIncludeLocalReasoning, isReasoningUnsupportedAPIError(message) {
                await onLocalReasoningUnsupportedModel?(modelIdentifier)
                return try await callLLM(
                    prompt: prompt,
                    settings: settings,
                    onUpdate: onUpdate,
                    modelIdentifierOverride: modelIdentifier,
                    omitLocalReasoning: true,
                    onLocalReasoningUnsupportedModel: onLocalReasoningUnsupportedModel
                )
            }

            throw LLMError.httpError(statusCode: httpResponse.statusCode, message: message)
        }

        if settings.llmProvider == .ollama {
            return try await parseOllamaStream(bytes: bytes, onUpdate: onUpdate)
        }

        if contentType.contains("text/event-stream") {
            return try await parseEventStream(bytes: bytes, provider: settings.llmProvider, onUpdate: onUpdate)
        }

        let data = try await consume(bytes: bytes)
        let responseText: String

        if let json = try? decodeJSON(data) {
            responseText = extractResponseText(from: json, provider: settings.llmProvider)
        } else {
            responseText = extractFallbackResponseText(from: data, provider: settings.llmProvider)
        }

        guard !responseText.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines).isEmpty else {
            throw LLMError.invalidResponse("LLM の応答形式が不正です。")
        }

        await onUpdate(ResponseCleaner.clean(responseText, keepThinking: true))
        return responseText
    }

    private func parseEventStream(
        bytes: URLSession.AsyncBytes,
        provider: LLMProvider,
        onUpdate: @escaping @MainActor (String) -> Void
    ) async throws -> String {
        var dataLines: [String] = []
        var fullText = ""
        var fullReasoning = ""

        func processPayload(_ payload: String) async {
            let trimmed = payload.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, trimmed != "[DONE]" else {
                return
            }

            guard let data = trimmed.data(using: .utf8) else {
                return
            }

            guard
                let jsonObject = try? JSONSerialization.jsonObject(with: data),
                let json = jsonObject as? [String: Any]
            else {
                return
            }

            let chunk = extractStreamChunk(from: json, provider: provider)
            if !chunk.reasoningChunk.isEmpty {
                fullReasoning += chunk.reasoningChunk
            } else if !chunk.absoluteReasoning.isEmpty, fullReasoning.isEmpty {
                fullReasoning = chunk.absoluteReasoning
            }

            if !chunk.contentChunk.isEmpty {
                fullText += chunk.contentChunk
            } else if !chunk.absoluteContent.isEmpty, fullText.isEmpty {
                fullText = chunk.absoluteContent
            }

            let combined = combinedResponseText(reasoning: fullReasoning, content: fullText)
            if !combined.isEmpty {
                await onUpdate(ResponseCleaner.clean(combined, keepThinking: true))
            }
        }

        for try await line in bytes.lines {
            if line.hasPrefix("data:") {
                let lineBody = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                if lineBody == "[DONE]" || lineBody.trimmingCharacters(in: .whitespaces).hasPrefix("{") {
                    if !dataLines.isEmpty {
                        let payload = dataLines.joined(separator: "\n")
                        dataLines.removeAll(keepingCapacity: true)
                        await processPayload(payload)
                    }
                    await processPayload(lineBody)
                } else {
                    dataLines.append(lineBody)
                }
                continue
            }

            if !dataLines.isEmpty {
                let payload = dataLines.joined(separator: "\n")
                dataLines.removeAll(keepingCapacity: true)
                await processPayload(payload)
                continue
            }

            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasPrefix("{") || trimmed == "[DONE]" {
                await processPayload(trimmed)
            }
        }

        if !dataLines.isEmpty {
            await processPayload(dataLines.joined(separator: "\n"))
        }

        let result = combinedResponseText(reasoning: fullReasoning, content: fullText)
        guard !result.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw LLMError.invalidResponse("ストリーミング応答が空でした。")
        }

        return result
    }

    private func parseOllamaStream(
        bytes: URLSession.AsyncBytes,
        onUpdate: @escaping @MainActor (String) -> Void
    ) async throws -> String {
        var fullText = ""
        var fullReasoning = ""

        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else {
                continue
            }

            guard
                let data = trimmed.data(using: .utf8),
                let jsonObject = try? JSONSerialization.jsonObject(with: data),
                let json = jsonObject as? [String: Any]
            else {
                fullText += trimmed
                await onUpdate(ResponseCleaner.clean(combinedResponseText(reasoning: fullReasoning, content: fullText), keepThinking: true))
                continue
            }

            let message = json["message"] as? [String: Any]
            let contentChunk = message?["content"] as? String ?? json["response"] as? String ?? ""
            let reasoningChunk = message?["thinking"] as? String ?? json["thinking"] as? String ?? ""

            if !reasoningChunk.isEmpty {
                fullReasoning += reasoningChunk
            }

            if !contentChunk.isEmpty {
                fullText += contentChunk
            }

            let combined = combinedResponseText(reasoning: fullReasoning, content: fullText)
            if !combined.isEmpty {
                await onUpdate(ResponseCleaner.clean(combined, keepThinking: true))
            }
        }

        let result = combinedResponseText(reasoning: fullReasoning, content: fullText)
        guard !result.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw LLMError.invalidResponse("ストリーミング応答が空でした。")
        }

        return result
    }

    private func makeStreamingRequest(
        prompt: String,
        settings: AppSettings,
        modelIdentifier: String,
        includeLocalReasoning: Bool
    ) throws -> URLRequest {
        let urlString: String
        var body: [String: Any]

        switch settings.llmProvider {
        case .local:
            let base = AppSettings.normalizeEndpoint(settings.llmEndpoint, provider: .local)
            urlString = "\(base)/api/v1/chat"
            body = [
                "model": modelIdentifier,
                "input": prompt,
                "stream": true
            ]

            if includeLocalReasoning {
                body["reasoning"] = "off"
            }
        case .ollama:
            let base = AppSettings.normalizeEndpoint(settings.llmEndpoint, provider: .ollama)
            urlString = "\(base)/api/chat"
            body = [
                "model": modelIdentifier,
                "messages": [
                    [
                        "role": "user",
                        "content": prompt
                    ]
                ],
                "stream": true,
                "think": false,
                "options": [
                    "num_predict": settings.maxTokens
                ]
            ]
        case .appleFoundation:
            throw LLMError.invalidResponse("Apple Intelligence は HTTP エンドポイントを使用しません。")
        case .remote:
            urlString = normalizedRemoteChatURL(endpoint: settings.llmEndpoint)
            body = [
                "model": modelIdentifier,
                "messages": [
                    [
                        "role": "user",
                        "content": prompt
                    ]
                ],
                "stream": true
            ]

            if usesMaxCompletionTokens(modelIdentifier: modelIdentifier) {
                body["max_completion_tokens"] = settings.maxTokens
            } else {
                body["max_tokens"] = settings.maxTokens
            }
        }

        guard let url = URL(string: urlString) else {
            throw LLMError.invalidEndpoint
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if settings.llmProvider == .remote, !settings.apiKey.isEmpty {
            request.setValue("Bearer \(settings.apiKey)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return request
    }

    private func resolveModelIdentifier(settings: AppSettings, override: String? = nil) async throws -> String {
        if let override, !override.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return override
        }

        switch settings.llmProvider {
        case .local:
            if !settings.localModelInstanceId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return settings.localModelInstanceId
            }

            let models = try await fetchLocalModels(endpoint: settings.llmEndpoint)
            guard let first = models.first else {
                throw LLMError.noLoadedModel
            }
            return first.id
        case .ollama:
            if !settings.localModelInstanceId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return settings.localModelInstanceId
            }

            let models = try await fetchOllamaModels(endpoint: settings.llmEndpoint)
            guard let first = models.first else {
                throw LLMError.noLoadedModel
            }
            return first.id
        case .appleFoundation:
            return "apple-foundation-model"
        case .remote:
            let trimmed = settings.modelName.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? "gpt-4o-mini" : trimmed
        }
    }

    private func usesMaxCompletionTokens(modelIdentifier: String) -> Bool {
        modelIdentifier.hasPrefix("gpt-")
            || modelIdentifier.contains("o1")
            || modelIdentifier.contains("o3")
            || modelIdentifier.contains("o4")
    }

    private func normalizedRemoteChatURL(endpoint: String) -> String {
        let trimmed = AppSettings.normalizeEndpoint(endpoint, provider: .remote)
        if trimmed.hasSuffix("/chat/completions") {
            return trimmed
        }
        if trimmed.hasSuffix("/v1") {
            return "\(trimmed)/chat/completions"
        }
        return "\(trimmed)/chat/completions"
    }

    private func normalizedRemoteModelsURL(endpoint: String) -> String {
        let trimmed = AppSettings.normalizeEndpoint(endpoint, provider: .remote)
        if trimmed.hasSuffix("/v1") {
            return "\(trimmed)/models"
        }
        return "\(trimmed)/models"
    }

    private func isReasoningUnsupportedAPIError(_ message: String) -> Bool {
        let normalized = message.lowercased()
        guard normalized.contains("reasoning") else {
            return false
        }

        return normalized.contains("unrecognized")
            || normalized.contains("unknown")
            || normalized.contains("invalid")
    }

    private func validate(response: URLResponse, data: Data) throws {
        let httpResponse = try httpResponse(from: response)
        guard (200...299).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)
            throw LLMError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
    }

    private func httpResponse(from response: URLResponse) throws -> HTTPURLResponse {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LLMError.invalidResponse("HTTP レスポンスを取得できませんでした。")
        }
        return httpResponse
    }

    private func decodeJSON(_ data: Data) throws -> [String: Any] {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw LLMError.invalidResponse("JSON の解析に失敗しました。")
        }
        return json
    }

    private func stringValue(in dictionary: [String: Any], keys: [String]) -> String? {
        for key in keys {
            if let value = dictionary[key] as? String {
                return value
            }
        }
        return nil
    }

    private func mergedModels(_ models: [LocalModelInstance]) -> [LocalModelInstance] {
        var merged: [LocalModelInstance] = []
        var seen = Set<String>()

        for model in models {
            if seen.insert(model.id).inserted {
                merged.append(model)
            }
        }

        return merged
    }

    private func ollamaModelDisplayName(
        identifier: String,
        details: [String: Any],
        source: OllamaModelSource
    ) -> String {
        let parameterSize = stringValue(in: details, keys: ["parameter_size"]) ?? ""
        let quantization = stringValue(in: details, keys: ["quantization_level"]) ?? ""
        let detailParts = [parameterSize, quantization].filter { !$0.isEmpty }
        let baseName = detailParts.isEmpty ? identifier : "\(identifier) \(detailParts.joined(separator: " "))"

        switch source {
        case .local:
            return baseName
        case .cloud:
            return "\(baseName) [Cloud]"
        }
    }

    private func extractResponseText(from json: [String: Any], provider: LLMProvider) -> String {
        switch provider {
        case .local:
            if let text = json["output_text"] as? String {
                return text
            }
            if let response = json["response"] as? [String: Any], let text = response["output_text"] as? String {
                return text
            }
            return extractLocalChatOutput(from: json)
        case .ollama:
            let message = json["message"] as? [String: Any]
            let content = message?["content"] as? String ?? json["response"] as? String ?? ""
            let reasoning = message?["thinking"] as? String ?? json["thinking"] as? String ?? ""

            return combinedResponseText(reasoning: reasoning, content: content)
        case .appleFoundation:
            return ""
        case .remote:
            guard
                let choices = json["choices"] as? [[String: Any]],
                let firstChoice = choices.first
            else {
                return ""
            }

            let message = firstChoice["message"] as? [String: Any]
            let content = message?["content"] as? String ?? ""
            let reasoning = message?["reasoning_content"] as? String ?? ""

            return combinedResponseText(reasoning: reasoning, content: content)
        }
    }

    private func extractLocalChatOutput(from json: [String: Any]) -> String {
        let outputItems = (json["output"] as? [[String: Any]])
            ?? ((json["response"] as? [String: Any])?["output"] as? [[String: Any]])
            ?? ((json["result"] as? [String: Any])?["output"] as? [[String: Any]])
            ?? []

        let chunks = outputItems.compactMap { item -> String? in
            guard (item["type"] as? String) == "message" else {
                return nil
            }

            if let content = item["content"] as? String {
                return content
            }

            if let arrayContent = item["content"] as? [[String: Any]] {
                return arrayContent.compactMap { $0["text"] as? String }.joined()
            }

            if let dictContent = item["content"] as? [String: Any] {
                if let text = dictContent["text"] as? String {
                    return text
                }
                if let parts = dictContent["parts"] as? [[String: Any]] {
                    return parts.compactMap { $0["text"] as? String }.joined()
                }
            }

            return nil
        }

        return chunks.joined(separator: "\n")
    }

    private func extractFallbackResponseText(from data: Data, provider: LLMProvider) -> String {
        guard let text = String(data: data, encoding: .utf8) else {
            return ""
        }

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return ""
        }

        if trimmed.contains("data:") {
            let streamText = extractResponseTextFromBufferedEventStream(trimmed, provider: provider)
            if !streamText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return streamText
            }
        }

        if trimmed.contains("\"chat.completion.chunk\"") || trimmed.split(whereSeparator: \.isNewline).contains(where: { String($0).trimmingCharacters(in: .whitespaces).hasPrefix("{") }) {
            let streamText = extractResponseTextFromBufferedStreamLines(trimmed, provider: provider)
            if !streamText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return streamText
            }
        }

        return trimmed
    }

    private func extractResponseTextFromBufferedStreamLines(_ text: String, provider: LLMProvider) -> String {
        var fullText = ""
        var fullReasoning = ""

        for rawLine in text.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty, line != "[DONE]" else {
                continue
            }

            let payloadText = line.hasPrefix("data:")
                ? String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                : line

            guard
                !payloadText.isEmpty,
                payloadText != "[DONE]",
                let payloadData = payloadText.data(using: .utf8),
                let jsonObject = try? JSONSerialization.jsonObject(with: payloadData),
                let json = jsonObject as? [String: Any]
            else {
                continue
            }

            let chunk = extractStreamChunk(from: json, provider: provider)
            if !chunk.reasoningChunk.isEmpty {
                fullReasoning += chunk.reasoningChunk
            } else if !chunk.absoluteReasoning.isEmpty, fullReasoning.isEmpty {
                fullReasoning = chunk.absoluteReasoning
            }

            if !chunk.contentChunk.isEmpty {
                fullText += chunk.contentChunk
            } else if !chunk.absoluteContent.isEmpty, fullText.isEmpty {
                fullText = chunk.absoluteContent
            }
        }

        return combinedResponseText(reasoning: fullReasoning, content: fullText)
    }

    private func extractResponseTextFromBufferedEventStream(_ text: String, provider: LLMProvider) -> String {
        let normalized = text.replacingOccurrences(of: "\r\n", with: "\n")
        let events = normalized.components(separatedBy: "\n\n")
        var fullText = ""
        var fullReasoning = ""

        for eventText in events {
            let dataLines = eventText
                .components(separatedBy: "\n")
                .filter { $0.hasPrefix("data:") }
                .map { String($0.dropFirst(5)).trimmingCharacters(in: .whitespaces) }

            if dataLines.isEmpty {
                continue
            }

            let payloadText = dataLines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if payloadText.isEmpty || payloadText == "[DONE]" {
                continue
            }

            guard
                let payloadData = payloadText.data(using: .utf8),
                let jsonObject = try? JSONSerialization.jsonObject(with: payloadData),
                let json = jsonObject as? [String: Any]
            else {
                fullText += payloadText
                continue
            }

            let chunk = extractStreamChunk(from: json, provider: provider)
            if !chunk.reasoningChunk.isEmpty {
                fullReasoning += chunk.reasoningChunk
            } else if !chunk.absoluteReasoning.isEmpty, fullReasoning.isEmpty {
                fullReasoning = chunk.absoluteReasoning
            }

            if !chunk.contentChunk.isEmpty {
                fullText += chunk.contentChunk
            } else if !chunk.absoluteContent.isEmpty, fullText.isEmpty {
                fullText = chunk.absoluteContent
            }
        }

        return combinedResponseText(reasoning: fullReasoning, content: fullText)
    }

    private func extractStreamChunk(from json: [String: Any], provider: LLMProvider) -> StreamChunk {
        switch provider {
        case .remote:
            let choice = (json["choices"] as? [[String: Any]])?.first
            let delta = choice?["delta"] as? [String: Any]
            let message = choice?["message"] as? [String: Any]

            return StreamChunk(
                contentChunk: delta?["content"] as? String ?? "",
                reasoningChunk: delta?["reasoning_content"] as? String ?? "",
                absoluteContent: message?["content"] as? String ?? "",
                absoluteReasoning: message?["reasoning_content"] as? String ?? ""
            )
        case .ollama:
            let message = json["message"] as? [String: Any]

            return StreamChunk(
                contentChunk: message?["content"] as? String ?? json["response"] as? String ?? "",
                reasoningChunk: message?["thinking"] as? String ?? json["thinking"] as? String ?? "",
                absoluteContent: "",
                absoluteReasoning: ""
            )
        case .appleFoundation:
            return StreamChunk(
                contentChunk: "",
                reasoningChunk: "",
                absoluteContent: "",
                absoluteReasoning: ""
            )
        case .local:
            let eventType = (json["type"] as? String) ?? (json["event"] as? String) ?? ""
            let localDelta = (json["delta"] as? String)
                ?? (json["output_text"] as? String)
                ?? ((json["response"] as? [String: Any])?["output_text"] as? String)
                ?? ""

            let typedDelta: String
            if eventType.contains("output_text.delta") {
                typedDelta = (json["delta"] as? String) ?? (json["text"] as? String) ?? (json["content"] as? String) ?? ""
            } else {
                typedDelta = ""
            }

            let messageDelta: String
            if eventType == "message.delta" {
                messageDelta = json["content"] as? String ?? ""
            } else {
                messageDelta = ""
            }

            return StreamChunk(
                contentChunk: messageDelta.isEmpty ? (typedDelta.isEmpty ? localDelta : typedDelta) : messageDelta,
                reasoningChunk: "",
                absoluteContent: extractLocalChatOutput(from: json),
                absoluteReasoning: ""
            )
        }
    }

    private func combinedResponseText(reasoning: String, content: String) -> String {
        let trimmedReasoning = reasoning.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedContent = content.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmedReasoning.isEmpty {
            return trimmedContent
        }

        if trimmedContent.isEmpty {
            return "<think>\n\(trimmedReasoning)\n</think>"
        }

        return "<think>\n\(trimmedReasoning)\n</think>\n\(trimmedContent)"
    }

    private func consume(bytes: URLSession.AsyncBytes) async throws -> Data {
        var buffer = Data()
        for try await byte in bytes {
            buffer.append(byte)
        }
        return buffer
    }
}

private struct StreamChunk {
    let contentChunk: String
    let reasoningChunk: String
    let absoluteContent: String
    let absoluteReasoning: String
}
