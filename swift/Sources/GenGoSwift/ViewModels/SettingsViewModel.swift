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
            switch self {
            case .noPresetPrompts:
                return "最低 1 つのプリセットを設定してください。"
            case .tooManyPresetPrompts:
                return "プリセットは最大 5 件までです。"
            case .emptyPresetShortcut(let index):
                return "プリセット \(index + 1) のショートカットを入力してください。"
            case .invalidPresetShortcut(let index, let value):
                return "プリセット \(index + 1) のショートカット形式が不正です: \(value)"
            case .duplicateShortcut(let value):
                return "ショートカットが重複しています: \(value)"
            case .emptyOnDemandShortcut:
                return "オンデマンド実行のショートカットを入力してください。"
            case .invalidOnDemandShortcut(let value):
                return "オンデマンド実行のショートカット形式が不正です: \(value)"
            case .missingModel:
                return "利用するモデルを 1 つ選択してください。"
            }
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
            notice = InlineNotice(text: "プリセットは最大 5 件まで追加できます。", kind: .info)
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

            notice = InlineNotice(text: "\(provider.displayName) から利用可能なモデルを取得しました。", kind: .success)
        } catch {
            localModels = []
            notice = InlineNotice(text: error.localizedDescription, kind: .error)
        }
    }

    func testConnection() async {
        do {
            let candidate = try validatedDraft(requireSelectedLocalModel: false)
            try await coordinator.testConnection(using: candidate)
            notice = InlineNotice(text: "接続テストに成功しました。", kind: .success)
        } catch {
            notice = InlineNotice(text: error.localizedDescription, kind: .error)
        }
    }

    func save() {
        do {
            let candidate = try validatedDraft()
            try coordinator.saveSettings(candidate)
            draft = candidate
            notice = InlineNotice(text: "設定を保存しました。", kind: .success)
        } catch {
            notice = InlineNotice(text: error.localizedDescription, kind: .error)
        }
    }

    func reset() {
        draft = .default
        localModels = []
        lastProvider = draft.llmProvider
        endpointByProvider = Self.defaultEndpointsByProvider(overriding: draft)
        notice = InlineNotice(text: "デフォルト設定に戻しました。", kind: .info)
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
