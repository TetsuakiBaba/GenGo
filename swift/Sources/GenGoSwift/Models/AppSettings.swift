import Foundation

enum LLMProvider: String, Codable, CaseIterable, Identifiable {
    case local
    case ollama
    case appleFoundation
    case remote

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .local:
            return "LM Studio"
        case .ollama:
            return "Ollama"
        case .appleFoundation:
            return "Apple Intelligence"
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
        case .appleFoundation:
            return ""
        case .remote:
            return "https://api.openai.com/v1"
        }
    }

    var usesModelCatalog: Bool {
        switch self {
        case .local, .ollama:
            return true
        case .appleFoundation, .remote:
            return false
        }
    }

    var usesEndpoint: Bool {
        switch self {
        case .local, .ollama, .remote:
            return true
        case .appleFoundation:
            return false
        }
    }

    var usesRemoteCredentials: Bool {
        switch self {
        case .remote:
            return true
        case .local, .ollama, .appleFoundation:
            return false
        }
    }

    var systemImage: String {
        switch self {
        case .local:
            return "macwindow"
        case .ollama:
            return "terminal"
        case .appleFoundation:
            return "apple.logo"
        case .remote:
            return "cloud"
        }
    }
}

enum SelectionActionMode: String, Codable, CaseIterable, Identifiable {
    case bubble
    case immediateMenu
    case optionMenu

    var id: String { rawValue }
}

struct PresetPrompt: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var shortcutKey: String
    var prompt: String
    var enabled: Bool

    init(
        id: UUID = UUID(),
        name: String = "",
        shortcutKey: String,
        prompt: String,
        enabled: Bool = true
    ) {
        self.id = id
        self.name = name
        self.shortcutKey = shortcutKey
        self.prompt = prompt
        self.enabled = enabled
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        shortcutKey = try container.decodeIfPresent(String.self, forKey: .shortcutKey) ?? "Cmd+1"
        prompt = try container.decodeIfPresent(String.self, forKey: .prompt) ?? ""
        enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? true
    }
}

struct AppSettings: Codable, Equatable {
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
    var selectionActionsEnabled: Bool
    var selectionActionMode: SelectionActionMode
    var selectionActionExcludedBundleIdentifiers: String

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
        onDemandShortcutKey: String = "Ctrl+0",
        presetPrompts: [PresetPrompt] = AppSettings.defaultPresetPrompts,
        selectionActionsEnabled: Bool = true,
        selectionActionMode: SelectionActionMode = .bubble,
        selectionActionExcludedBundleIdentifiers: String = ""
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
        self.selectionActionsEnabled = selectionActionsEnabled
        self.selectionActionMode = selectionActionMode
        self.selectionActionExcludedBundleIdentifiers = selectionActionExcludedBundleIdentifiers
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        autoApplyAndClose = try container.decodeIfPresent(Bool.self, forKey: .autoApplyAndClose) ?? false
        language = try container.decodeIfPresent(String.self, forKey: .language) ?? "ja"
        llmProvider = try container.decodeIfPresent(LLMProvider.self, forKey: .llmProvider) ?? .local
        llmEndpoint = try container.decodeIfPresent(String.self, forKey: .llmEndpoint) ?? llmProvider.defaultEndpoint
        apiKey = try container.decodeIfPresent(String.self, forKey: .apiKey) ?? ""
        modelName = try container.decodeIfPresent(String.self, forKey: .modelName) ?? "gpt-4o-mini"
        localModelInstanceId = try container.decodeIfPresent(String.self, forKey: .localModelInstanceId) ?? ""
        localReasoningUnsupportedModels = try container.decodeIfPresent(
            [String].self,
            forKey: .localReasoningUnsupportedModels
        ) ?? []
        maxTokens = try container.decodeIfPresent(Int.self, forKey: .maxTokens) ?? 4096
        onDemandShortcutKey = try container.decodeIfPresent(String.self, forKey: .onDemandShortcutKey) ?? "Ctrl+0"
        presetPrompts = try container.decodeIfPresent([PresetPrompt].self, forKey: .presetPrompts)
            ?? Self.defaultPresetPrompts
        selectionActionsEnabled = try container.decodeIfPresent(Bool.self, forKey: .selectionActionsEnabled) ?? true
        selectionActionMode = try container.decodeIfPresent(
            SelectionActionMode.self,
            forKey: .selectionActionMode
        ) ?? .bubble
        selectionActionExcludedBundleIdentifiers = try container.decodeIfPresent(
            String.self,
            forKey: .selectionActionExcludedBundleIdentifiers
        ) ?? ""
    }

    private static let fallbackDefaultPresetPrompts: [PresetPrompt] = [
        PresetPrompt(
            name: "日英翻訳",
            shortcutKey: "Ctrl+1",
            prompt: "Please translate between Japanese and English. Automatically determine the language of the input text and translate it into the other language."
        )
    ]

    static var defaultPresetPrompts: [PresetPrompt] {
        let loadedPresets = DefaultPresetLoader.load()
        let presets: [PresetPrompt]
        if let loadedPresets, !loadedPresets.isEmpty {
            presets = loadedPresets
        } else {
            presets = fallbackDefaultPresetPrompts
        }
        return Array(presets.prefix(5)).map { preset in
            var normalizedPreset = preset
            normalizedPreset.name = preset.name.trimmingCharacters(in: .whitespacesAndNewlines)
            return normalizedPreset
        }
    }

    static var `default`: AppSettings {
        AppSettings()
    }

    mutating func normalize() {
        if AppLanguage(rawValue: language) == nil {
            language = AppLanguage.ja.rawValue
        }

        llmEndpoint = Self.normalizeEndpoint(llmEndpoint, provider: llmProvider)
        maxTokens = min(max(maxTokens, 128), 32768)
        presetPrompts = Array(presetPrompts.prefix(5)).map { preset in
            var normalizedPreset = preset
            normalizedPreset.name = preset.name.trimmingCharacters(in: .whitespacesAndNewlines)
            return normalizedPreset
        }

        if presetPrompts.isEmpty {
            presetPrompts = Self.defaultPresetPrompts
        }

        if onDemandShortcutKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            onDemandShortcutKey = "Ctrl+0"
        }

        selectionActionExcludedBundleIdentifiers = Self.normalizedBundleIdentifierList(
            selectionActionExcludedBundleIdentifiers
        )

        if llmProvider == .remote, modelName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            modelName = "gpt-4o-mini"
        }

        if llmProvider == .appleFoundation {
            llmEndpoint = ""
            localModelInstanceId = ""
        }
    }

    var excludedSelectionActionBundleIdentifiers: Set<String> {
        Set(
            selectionActionExcludedBundleIdentifiers
                .components(separatedBy: CharacterSet(charactersIn: ",\n"))
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
                .filter { !$0.isEmpty }
        )
    }

    private static func normalizedBundleIdentifierList(_ rawValue: String) -> String {
        var seen = Set<String>()
        let identifiers = rawValue
            .components(separatedBy: CharacterSet(charactersIn: ",\n"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && seen.insert($0.lowercased()).inserted }
        return identifiers.joined(separator: ", ")
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
        case .appleFoundation:
            return ""
        case .remote:
            return base
        }
    }
}
