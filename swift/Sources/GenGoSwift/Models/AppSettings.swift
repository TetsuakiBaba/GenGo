import Foundation

enum LLMProvider: String, Codable, CaseIterable, Identifiable {
    case local
    case ollama
    case remote

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .local:
            return "LM Studio"
        case .ollama:
            return "Ollama"
        case .remote:
            return "OpenAI Compatible"
        }
    }

    var defaultEndpoint: String {
        switch self {
        case .local:
            return "http://127.0.0.1:1234"
        case .ollama:
            return "http://127.0.0.1:11434"
        case .remote:
            return "https://api.openai.com/v1"
        }
    }

    var usesModelCatalog: Bool {
        switch self {
        case .local, .ollama:
            return true
        case .remote:
            return false
        }
    }

    var systemImage: String {
        switch self {
        case .local:
            return "macwindow"
        case .ollama:
            return "terminal"
        case .remote:
            return "cloud"
        }
    }
}

struct PresetPrompt: Codable, Identifiable, Hashable {
    var id: UUID
    var shortcutKey: String
    var prompt: String
    var enabled: Bool

    init(
        id: UUID = UUID(),
        shortcutKey: String,
        prompt: String,
        enabled: Bool = true
    ) {
        self.id = id
        self.shortcutKey = shortcutKey
        self.prompt = prompt
        self.enabled = enabled
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        shortcutKey = try container.decodeIfPresent(String.self, forKey: .shortcutKey) ?? "Cmd+1"
        prompt = try container.decodeIfPresent(String.self, forKey: .prompt) ?? ""
        enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? true
    }
}

struct AppSettings: Codable {
    var autoApplyAndClose: Bool
    var language: String
    var llmProvider: LLMProvider
    var llmEndpoint: String
    var apiKey: String
    var modelName: String
    var localModelInstanceId: String
    var localReasoningUnsupportedModels: [String]
    var maxTokens: Int
    var onDemandShortcutKey: String
    var presetPrompts: [PresetPrompt]

    init(
        autoApplyAndClose: Bool = false,
        language: String = "ja",
        llmProvider: LLMProvider = .local,
        llmEndpoint: String = "http://127.0.0.1:1234",
        apiKey: String = "",
        modelName: String = "gpt-4o-mini",
        localModelInstanceId: String = "",
        localReasoningUnsupportedModels: [String] = [],
        maxTokens: Int = 4096,
        onDemandShortcutKey: String = "Ctrl+Shift+1",
        presetPrompts: [PresetPrompt] = AppSettings.defaultPresetPrompts
    ) {
        self.autoApplyAndClose = autoApplyAndClose
        self.language = language
        self.llmProvider = llmProvider
        self.llmEndpoint = llmEndpoint
        self.apiKey = apiKey
        self.modelName = modelName
        self.localModelInstanceId = localModelInstanceId
        self.localReasoningUnsupportedModels = localReasoningUnsupportedModels
        self.maxTokens = maxTokens
        self.onDemandShortcutKey = onDemandShortcutKey
        self.presetPrompts = presetPrompts
    }

    static let defaultPresetPrompts: [PresetPrompt] = [
        PresetPrompt(
            shortcutKey: "Ctrl+1",
            prompt: "Please translate between Japanese and English. Automatically determine the language of the input text and translate it into the other language."
        )
    ]

    static let `default` = AppSettings()

    mutating func normalize() {
        if AppLanguage(rawValue: language) == nil {
            language = AppLanguage.ja.rawValue
        }

        llmEndpoint = Self.normalizeEndpoint(llmEndpoint, provider: llmProvider)
        maxTokens = min(max(maxTokens, 128), 32768)
        presetPrompts = Array(presetPrompts.prefix(5))

        if presetPrompts.isEmpty {
            presetPrompts = Self.defaultPresetPrompts
        }

        if onDemandShortcutKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            onDemandShortcutKey = "Ctrl+Shift+1"
        }

        if llmProvider == .remote, modelName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            modelName = "gpt-4o-mini"
        }
    }

    static func normalizeEndpoint(_ endpoint: String, provider: LLMProvider) -> String {
        let trimmed = endpoint.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty else {
            return provider.defaultEndpoint
        }

        var base = trimmed
        if base.hasSuffix("/") {
            base.removeLast()
        }

        switch provider {
        case .local:
            if base.hasSuffix("/api/v1") {
                return String(base.dropLast(7))
            }
            if base.hasSuffix("/v1") {
                return String(base.dropLast(3))
            }
            return base
        case .ollama:
            if base.hasSuffix("/api") {
                return String(base.dropLast(4))
            }
            if base.hasSuffix("/v1") {
                return String(base.dropLast(3))
            }
            return base
        case .remote:
            return base
        }
    }
}
