import Foundation

@MainActor
final class SettingsViewModel: ObservableObject {
    enum ValidationError: LocalizedError {
        case noPresetPrompts
        case tooManyPresetPrompts
        case emptyPresetShortcut(index: Int)
        case invalidPresetShortcut(index: Int, value: String)
        case duplicateShortcut(String)
        case emptyOnDemandShortcut
        case invalidOnDemandShortcut(String)
        case missingModel

        var errorDescription: String? {
            AppStrings(language: .ja).validationErrorMessage(self)
        }
    }

    @Published var draft: AppSettings
    @Published var localModels: [LocalModelInstance] = []
    @Published var notice: InlineNotice?
    @Published var isLoadingModels = false

    private unowned let coordinator: AppCoordinator
    private let maxPresetCount = 5
    private var lastProvider: LLMProvider
    private var endpointByProvider: [LLMProvider: String]

    private var strings: AppStrings {
        AppStrings(languageCode: draft.language)
    }

    init(settings: AppSettings, coordinator: AppCoordinator) {
        self.draft = settings
        self.coordinator = coordinator
        self.lastProvider = settings.llmProvider
        self.endpointByProvider = Self.defaultEndpointsByProvider(overriding: settings)
    }

    func reload(from settings: AppSettings) {
        draft = settings
        lastProvider = settings.llmProvider
        endpointByProvider[settings.llmProvider] = settings.llmEndpoint
        notice = nil
    }

    func handleAppear() {
        if draft.llmProvider.usesModelCatalog {
            Task {
                await refreshLocalModels()
            }
        }
    }

    func addPresetPrompt() {
        guard draft.presetPrompts.count < maxPresetCount else {
            notice = InlineNotice(text: strings.maxPresetsNotice, kind: .info)
            return
        }

        draft.presetPrompts.append(
            PresetPrompt(
                shortcutKey: nextPresetShortcut(),
                prompt: ""
            )
        )
    }

    func removePresetPrompt(id: UUID) {
        draft.presetPrompts.removeAll { $0.id == id }
    }

    func refreshLocalModels() async {
        isLoadingModels = true
        defer { isLoadingModels = false }

        do {
            let provider = draft.llmProvider
            let models = try await coordinator.fetchModels(endpoint: draft.llmEndpoint, provider: provider)
            guard provider == draft.llmProvider else {
                return
            }

            localModels = models

            if draft.localModelInstanceId.isEmpty {
                draft.localModelInstanceId = models.first?.id ?? ""
            }

            notice = InlineNotice(text: strings.fetchedModelsNotice(provider: provider), kind: .success)
        } catch {
            localModels = []
            notice = InlineNotice(text: strings.errorMessage(error), kind: .error)
        }
    }

    func testConnection() async {
        do {
            let candidate = try validatedDraft(requireSelectedLocalModel: false)
            try await coordinator.testConnection(using: candidate)
            notice = InlineNotice(text: strings.connectionTestSucceededNotice, kind: .success)
        } catch {
            notice = InlineNotice(text: strings.errorMessage(error), kind: .error)
        }
    }

    func save() {
        do {
            let candidate = try validatedDraft()
            try coordinator.saveSettings(candidate)
            draft = candidate
            notice = InlineNotice(text: strings.settingsSavedNotice, kind: .success)
        } catch {
            notice = InlineNotice(text: strings.errorMessage(error), kind: .error)
        }
    }

    func reset() {
        draft = .default
        localModels = []
        lastProvider = draft.llmProvider
        endpointByProvider = Self.defaultEndpointsByProvider(overriding: draft)
        notice = InlineNotice(text: strings.resetToDefaultsNotice, kind: .info)
    }

    func handleProviderChange() {
        notice = nil
        let selectedProvider = draft.llmProvider

        if selectedProvider != lastProvider {
            endpointByProvider[lastProvider] = draft.llmEndpoint
            draft.llmEndpoint = endpointByProvider[selectedProvider] ?? selectedProvider.defaultEndpoint
            draft.localModelInstanceId = ""
            localModels = []
            lastProvider = selectedProvider
        }

        if selectedProvider.usesModelCatalog {
            Task {
                await refreshLocalModels()
            }
        } else {
            localModels = []
        }
    }

    var canAddPreset: Bool {
        draft.presetPrompts.count < maxPresetCount
    }

    private func nextPresetShortcut() -> String {
        let usedNumbers = Set(
            draft.presetPrompts.compactMap { preset -> Int? in
                let raw = preset.shortcutKey.replacingOccurrences(of: " ", with: "")
                if raw.lowercased().hasPrefix("ctrl+"), let value = Int(raw.dropFirst(5)) {
                    return value
                }
                return nil
            }
        )

        let nextNumber = (1...maxPresetCount).first { !usedNumbers.contains($0) } ?? (draft.presetPrompts.count + 1)
        return "Ctrl+\(nextNumber)"
    }

    private static func defaultEndpointsByProvider(overriding settings: AppSettings) -> [LLMProvider: String] {
        var endpoints = Dictionary(uniqueKeysWithValues: LLMProvider.allCases.map { ($0, $0.defaultEndpoint) })
        endpoints[settings.llmProvider] = settings.llmEndpoint
        return endpoints
    }

    private func validatedDraft(requireSelectedLocalModel: Bool = true) throws -> AppSettings {
        var candidate = draft
        candidate.normalize()

        guard !candidate.presetPrompts.isEmpty else {
            throw ValidationError.noPresetPrompts
        }

        guard candidate.presetPrompts.count <= maxPresetCount else {
            throw ValidationError.tooManyPresetPrompts
        }

        var usedShortcuts = Set<String>()

        for (index, preset) in candidate.presetPrompts.enumerated() {
            let shortcut = preset.shortcutKey.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !shortcut.isEmpty else {
                throw ValidationError.emptyPresetShortcut(index: index)
            }

            guard KeyboardShortcut.isValid(shortcut) else {
                throw ValidationError.invalidPresetShortcut(index: index, value: shortcut)
            }

            let normalizedShortcut = shortcut.lowercased()
            guard usedShortcuts.insert(normalizedShortcut).inserted else {
                throw ValidationError.duplicateShortcut(shortcut)
            }
        }

        let onDemandShortcut = candidate.onDemandShortcutKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !onDemandShortcut.isEmpty else {
            throw ValidationError.emptyOnDemandShortcut
        }

        guard KeyboardShortcut.isValid(onDemandShortcut) else {
            throw ValidationError.invalidOnDemandShortcut(onDemandShortcut)
        }

        guard usedShortcuts.insert(onDemandShortcut.lowercased()).inserted else {
            throw ValidationError.duplicateShortcut(onDemandShortcut)
        }

        if candidate.llmProvider.usesModelCatalog {
            if candidate.localModelInstanceId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                candidate.localModelInstanceId = localModels.first?.id ?? ""
            }

            if requireSelectedLocalModel && candidate.localModelInstanceId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                throw ValidationError.missingModel
            }
        }

        candidate.onDemandShortcutKey = onDemandShortcut
        return candidate
    }
}
