import Foundation

#if REQUIRE_APPLE_FOUNDATION_MODELS && !canImport(FoundationModels)
#error("GenGo release builds require the Apple Foundation Models framework. Build with Xcode 26 / macOS 26 SDK, or set REQUIRE_APPLE_FOUNDATION_MODELS=0 for a build without Apple Intelligence.")
#endif

#if canImport(FoundationModels)
import FoundationModels
#endif

struct AppleFoundationModelClient {
    static func generate(prompt: String, maxTokens: Int) async throws -> String {
        #if canImport(FoundationModels)
        guard #available(macOS 26.0, *) else {
            throw LLMService.LLMError.appleFoundationModelUnavailable(.unsupportedOS)
        }

        return try await AppleFoundationModelClient26.generate(prompt: prompt, maxTokens: maxTokens)
        #else
        throw LLMService.LLMError.appleFoundationModelUnavailable(.frameworkUnavailable)
        #endif
    }
}

#if canImport(FoundationModels)
@available(macOS 26.0, *)
private enum AppleFoundationModelClient26 {
    static func generate(prompt: String, maxTokens: Int) async throws -> String {
        let model = SystemLanguageModel(
            useCase: .general,
            guardrails: .permissiveContentTransformations
        )
        try validateAvailability(of: model)

        let session = LanguageModelSession(
            model: model,
            instructions: """
            You are GenGo's local text-processing engine.
            Follow the user's instructions exactly.
            Return only the requested result without markdown, titles, or explanatory prefaces.
            """
        )
        let options = GenerationOptions(
            temperature: 0.2,
            maximumResponseTokens: min(max(maxTokens, 128), 4096)
        )

        let response: LanguageModelSession.Response<String>
        do {
            response = try await session.respond(to: prompt, options: options)
        } catch let error as LanguageModelSession.GenerationError {
            throw mappedGenerationError(error)
        }
        let responseText = response.content.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !responseText.isEmpty else {
            throw LLMService.LLMError.invalidResponse("LLM からの応答が空です。")
        }

        return responseText
    }

    private static func validateAvailability(of model: SystemLanguageModel) throws {
        switch model.availability {
        case .available:
            break
        case .unavailable(let reason):
            throw LLMService.LLMError.appleFoundationModelUnavailable(unavailableReason(from: reason))
        }

        guard model.supportsLocale() else {
            throw LLMService.LLMError.appleFoundationModelUnavailable(.unsupportedLocale)
        }
    }

    private static func unavailableReason(
        from reason: SystemLanguageModel.Availability.UnavailableReason
    ) -> LLMService.AppleFoundationModelUnavailableReason {
        switch reason {
        case .deviceNotEligible:
            return .deviceNotEligible
        case .appleIntelligenceNotEnabled:
            return .appleIntelligenceNotEnabled
        case .modelNotReady:
            return .modelNotReady
        @unknown default:
            return .modelNotReady
        }
    }

    private static func mappedGenerationError(_ error: LanguageModelSession.GenerationError) -> Error {
        switch error {
        case .assetsUnavailable:
            return LLMService.LLMError.appleFoundationModelUnavailable(.modelNotReady)
        case .unsupportedLanguageOrLocale:
            return LLMService.LLMError.appleFoundationModelUnavailable(.unsupportedLocale)
        case .exceededContextWindowSize:
            return LLMService.LLMError.invalidResponse("入力が長すぎるため、Apple Intelligence で処理できませんでした。選択範囲またはプロンプトを短くしてください。")
        case .rateLimited:
            return LLMService.LLMError.invalidResponse("Apple Intelligence が一時的に混み合っています。少し待ってから再試行してください。")
        case .concurrentRequests:
            return LLMService.LLMError.invalidResponse("Apple Intelligence は同時リクエストを処理中です。現在の処理が終わってから再試行してください。")
        case .guardrailViolation, .refusal:
            return LLMService.LLMError.invalidResponse("Apple Intelligence がこの内容の処理を拒否しました。入力内容やプロンプトを変更してください。")
        case .unsupportedGuide:
            return LLMService.LLMError.invalidResponse("Apple Intelligence がこの出力指定に対応していません。プロンプトを変更してください。")
        case .decodingFailure:
            return LLMService.LLMError.invalidResponse("Apple Intelligence の応答を読み取れませんでした。もう一度お試しください。")
        @unknown default:
            return LLMService.LLMError.invalidResponse("Apple Intelligence で処理できませんでした。")
        }
    }
}
#endif
