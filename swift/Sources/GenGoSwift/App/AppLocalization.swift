import Foundation

enum AppLanguage: String, CaseIterable, Identifiable {
    case ja
    case en

    var id: String { rawValue }
    var code: String { rawValue }

    init(code: String) {
        self = AppLanguage(rawValue: code) ?? .ja
    }

    var displayName: String {
        switch self {
        case .ja:
            return "日本語"
        case .en:
            return "English"
        }
    }
}

extension AppSettings {
    var appLanguage: AppLanguage {
        AppLanguage(code: language)
    }
}

struct AppStrings {
    let language: AppLanguage

    init(language: AppLanguage) {
        self.language = language
    }

    init(languageCode: String) {
        self.language = AppLanguage(code: languageCode)
    }

    private func text(ja: String, en: String) -> String {
        switch language {
        case .ja:
            return ja
        case .en:
            return en
        }
    }

    var settingsWindowTitle: String {
        text(ja: "GenGo 設定", en: "GenGo Settings")
    }

    var settingsMenuTitle: String {
        text(ja: "設定…", en: "Settings...")
    }

    var checkForUpdatesMenuTitle: String {
        text(ja: "アップデートを確認…", en: "Check for Updates...")
    }

    var aboutMenuTitle: String {
        text(ja: "GenGo について", en: "About GenGo")
    }

    var quitMenuTitle: String {
        text(ja: "終了", en: "Quit GenGo")
    }

    var settingsHeroSubtitle: String {
        text(
            ja: "ショートカット処理と LLM 接続を macOS ネイティブに整える設定画面です。",
            en: "Configure shortcut workflows and LLM connections for the native macOS app."
        )
    }

    var llmSectionSubtitle: String {
        text(
            ja: "LM Studio、Ollama、OpenAI 互換 API のどれでも同じ操作感で使えるように整えます。",
            en: "Use LM Studio, Ollama, or an OpenAI-compatible API with the same workflow."
        )
    }

    var providerLabel: String {
        text(ja: "Provider", en: "Provider")
    }

    var endpointLabel: String {
        text(ja: "Endpoint", en: "Endpoint")
    }

    var modelLabel: String {
        text(ja: "モデル", en: "Model")
    }

    var autoSelectModelLabel: String {
        text(ja: "自動選択", en: "Auto-select")
    }

    var loadingLabel: String {
        text(ja: "読込中...", en: "Loading...")
    }

    var refreshButtonTitle: String {
        text(ja: "更新", en: "Refresh")
    }

    func availableModelCount(_ count: Int) -> String {
        switch language {
        case .ja:
            return "\(count) 件のモデルを利用可能"
        case .en:
            return count == 1 ? "1 model available" : "\(count) models available"
        }
    }

    var manualModelNameLabel: String {
        text(ja: "モデル名を直接指定", en: "Enter model name manually")
    }

    var manualModelNameHelp: String {
        text(
            ja: "一覧にないモデル名も指定できます。ローカルモデルは `ollama pull <model>` の後に更新すると一覧へ表示されます。",
            en: "You can enter a model that is not in the list. Run `ollama pull <model>`, then refresh to list local models."
        )
    }

    var apiKeyHelp: String {
        text(
            ja: "OpenAI 互換 API で認証が必要な場合のみ設定します。",
            en: "Set this only when your OpenAI-compatible API requires authentication."
        )
    }

    var maxTokensStepperLabel: String {
        text(ja: "出力上限を調整", en: "Adjust output limit")
    }

    var shortcutsSectionSubtitle: String {
        text(
            ja: "プリセットとオンデマンドの両方をグローバルショートカットで呼び出せます。",
            en: "Trigger both presets and on-demand prompts with global shortcuts."
        )
    }

    var onDemandShortcutLabel: String {
        text(ja: "オンデマンド実行", en: "On-demand action")
    }

    var shortcutExampleHelp: String {
        text(
            ja: "例: `Ctrl+Shift+1`, `Cmd+1`, `Alt+Space`",
            en: "Examples: `Ctrl+Shift+1`, `Cmd+1`, `Alt+Space`"
        )
    }

    var presetsTitle: String {
        text(ja: "プリセット", en: "Presets")
    }

    var presetsHelp: String {
        text(
            ja: "最大 5 件まで。保存時に重複とショートカット形式を検証します。",
            en: "Up to 5 presets. Duplicates and shortcut formats are checked when saving."
        )
    }

    var addPresetButtonTitle: String {
        text(ja: "プリセットを追加", en: "Add Preset")
    }

    var behaviorSectionSubtitle: String {
        text(
            ja: "Apple らしい最小限の操作で流れるように使えるよう、挙動まわりをまとめています。",
            en: "Tune the behavior so common actions stay quick and unobtrusive."
        )
    }

    var autoApplyAndCloseLabel: String {
        text(ja: "プリセット実行後に自動で適用して閉じる", en: "Apply and close automatically after presets")
    }

    var uiLanguageLabel: String {
        text(ja: "UI Language", en: "UI Language")
    }

    var uiLanguageHelp: String {
        text(
            ja: "設定画面はすぐに切り替わります。保存後にメニューと次回以降の操作へ反映されます。",
            en: "The settings screen updates immediately. Save to apply this to menus and future actions."
        )
    }

    var footerHelp: String {
        text(
            ja: "変更は保存後にショートカット登録へ反映されます。",
            en: "Changes are applied to shortcut registration after saving."
        )
    }

    var resetButtonTitle: String {
        text(ja: "デフォルトに戻す", en: "Reset to Defaults")
    }

    var testConnectionButtonTitle: String {
        text(ja: "接続テスト", en: "Test Connection")
    }

    var saveButtonTitle: String {
        text(ja: "保存", en: "Save")
    }

    var enabledLabel: String {
        text(ja: "有効", en: "Enabled")
    }

    var deleteButtonTitle: String {
        text(ja: "削除", en: "Delete")
    }

    var shortcutLabel: String {
        text(ja: "ショートカット", en: "Shortcut")
    }

    var promptLabel: String {
        text(ja: "プロンプト", en: "Prompt")
    }

    func endpointHelpText(for provider: LLMProvider) -> String {
        switch provider {
        case .local:
            return text(
                ja: "LM Studio のベース URL を指定します。API パスは自動で補完されます。",
                en: "Set the LM Studio base URL. API paths are completed automatically."
            )
        case .ollama:
            return text(
                ja: "Ollama のベース URL を指定します。`/api/chat` と `/api/tags` は自動で補完されます。",
                en: "Set the Ollama base URL. `/api/chat` and `/api/tags` are completed automatically."
            )
        case .remote:
            return text(
                ja: "OpenAI 互換 API のベース URL を指定します。`/chat/completions` は自動で補完されます。",
                en: "Set the OpenAI-compatible API base URL. `/chat/completions` is completed automatically."
            )
        }
    }

    func modelPickerTitle(for provider: LLMProvider) -> String {
        switch provider {
        case .local:
            return text(ja: "LM Studio モデル", en: "LM Studio Model")
        case .ollama:
            return text(ja: "Ollama モデル", en: "Ollama Model")
        case .remote:
            return text(ja: "モデル", en: "Model")
        }
    }

    var onDemandPromptTitle: String {
        text(ja: "オンデマンドプロンプト", en: "On-demand Prompt")
    }

    var textGenerationTitle: String {
        text(ja: "テキスト生成", en: "Text Generation")
    }

    var presetProcessingTitle: String {
        text(ja: "プリセット処理中", en: "Processing Preset")
    }

    var onDemandProcessingTitle: String {
        text(ja: "オンデマンド処理中", en: "Processing On-demand Prompt")
    }

    var textGenerationProcessingTitle: String {
        text(ja: "テキスト生成中", en: "Generating Text")
    }

    var processingResultTitle: String {
        text(ja: "処理結果", en: "Result")
    }

    func selectedCharacterCount(_ count: Int) -> String {
        switch language {
        case .ja:
            return "対象文字数 \(count)"
        case .en:
            return count == 1 ? "1 character selected" : "\(count) characters selected"
        }
    }

    var standbyText: String {
        text(ja: "待機中です", en: "Standing by")
    }

    var processingInstructionTitle: String {
        text(ja: "処理指示", en: "Instructions")
    }

    var runProcessingButtonTitle: String {
        text(ja: "処理実行", en: "Run")
    }

    var generationInstructionTitle: String {
        text(ja: "生成指示", en: "Generation Instructions")
    }

    var generateTextButtonTitle: String {
        text(ja: "テキスト生成", en: "Generate Text")
    }

    var generatingTextStatus: String {
        text(ja: "テキストを生成しています...", en: "Generating text...")
    }

    func contactingModelStatus(provider: LLMProvider) -> String {
        let providerName = providerStatusName(provider)
        return text(ja: "\(providerName) に問い合わせています...", en: "Contacting \(providerName)...")
    }

    private func providerStatusName(_ provider: LLMProvider) -> String {
        switch (language, provider) {
        case (.ja, .remote):
            return "OpenAI 互換 API"
        default:
            return provider.displayName
        }
    }

    var streamingStatusHelp: String {
        text(
            ja: "ストリーミング応答を受け取り次第、ここにリアルタイム表示します。",
            en: "Streaming responses appear here as soon as they arrive."
        )
    }

    var waitingForResponseTitle: String {
        text(ja: "応答待ち", en: "Waiting for Response")
    }

    var streamingResultTitle: String {
        text(ja: "ストリーミング結果", en: "Streaming Result")
    }

    var waitingForResponseText: String {
        text(ja: "応答を待っています。", en: "Waiting for a response.")
    }

    var firstTokenHelp: String {
        text(
            ja: "モデルの初回トークン生成中は数秒かかることがあります。",
            en: "The first token can take a few seconds."
        )
    }

    var generationResultTitle: String {
        text(ja: "生成結果", en: "Generated Text")
    }

    var insertAtCursorButtonTitle: String {
        text(ja: "カーソル位置に挿入", en: "Insert at Cursor")
    }

    var applyButtonTitle: String {
        text(ja: "適用", en: "Apply")
    }

    var closeButtonTitle: String {
        text(ja: "閉じる", en: "Close")
    }

    func modeTitle(_ mode: ProcessingMode) -> String {
        switch mode {
        case .preset:
            return text(ja: "プリセット", en: "Preset")
        case .onDemand:
            return text(ja: "オンデマンド", en: "On-demand")
        case .textGeneration:
            return text(ja: "生成", en: "Generate")
        }
    }

    var maxPresetsNotice: String {
        text(ja: "プリセットは最大 5 件まで追加できます。", en: "You can add up to 5 presets.")
    }

    func fetchedModelsNotice(provider: LLMProvider) -> String {
        text(
            ja: "\(provider.displayName) から利用可能なモデルを取得しました。",
            en: "Fetched available models from \(provider.displayName)."
        )
    }

    var connectionTestSucceededNotice: String {
        text(ja: "接続テストに成功しました。", en: "Connection test succeeded.")
    }

    var settingsSavedNotice: String {
        text(ja: "設定を保存しました。", en: "Settings saved.")
    }

    var resetToDefaultsNotice: String {
        text(ja: "デフォルト設定に戻しました。", en: "Restored default settings.")
    }

    var softwareUpdatesUnavailable: String {
        text(
            ja: "このビルドでは自動アップデートが設定されていません。",
            en: "Automatic updates are not configured for this build."
        )
    }

    var aboutText: String {
        text(
            ja: "LM Studio、Ollama、OpenAI 互換 API と連携し、選択テキストをその場で処理できる macOS ネイティブ版です。",
            en: "A native macOS app that processes selected text in place with LM Studio, Ollama, or an OpenAI-compatible API."
        )
    }

    var onDemandPromptRequired: String {
        text(ja: "処理指示を入力してください。", en: "Enter processing instructions.")
    }

    var generationPromptRequired: String {
        text(ja: "生成指示を入力してください。", en: "Enter generation instructions.")
    }

    var selectedTextRequired: String {
        text(
            ja: "テキストを選択してからオンデマンド処理を実行してください。",
            en: "Select text before running an on-demand prompt."
        )
    }

    var unchangedResultNotice: String {
        text(
            ja: "変換結果が元テキストと同じだったため、変更はありません。",
            en: "The result matched the original text, so nothing changed."
        )
    }

    func validationErrorMessage(_ error: SettingsViewModel.ValidationError) -> String {
        switch error {
        case .noPresetPrompts:
            return text(ja: "最低 1 つのプリセットを設定してください。", en: "Configure at least one preset.")
        case .tooManyPresetPrompts:
            return text(ja: "プリセットは最大 5 件までです。", en: "Presets are limited to 5.")
        case .emptyPresetShortcut(let index):
            return text(
                ja: "プリセット \(index + 1) のショートカットを入力してください。",
                en: "Enter a shortcut for preset \(index + 1)."
            )
        case .invalidPresetShortcut(let index, let value):
            return text(
                ja: "プリセット \(index + 1) のショートカット形式が不正です: \(value)",
                en: "Preset \(index + 1) has an invalid shortcut: \(value)"
            )
        case .duplicateShortcut(let value):
            return text(ja: "ショートカットが重複しています: \(value)", en: "Duplicate shortcut: \(value)")
        case .emptyOnDemandShortcut:
            return text(
                ja: "オンデマンド実行のショートカットを入力してください。",
                en: "Enter the on-demand shortcut."
            )
        case .invalidOnDemandShortcut(let value):
            return text(
                ja: "オンデマンド実行のショートカット形式が不正です: \(value)",
                en: "Invalid on-demand shortcut: \(value)"
            )
        case .missingModel:
            return text(ja: "利用するモデルを 1 つ選択してください。", en: "Select a model to use.")
        }
    }

    func errorMessage(_ error: Error) -> String {
        if let validationError = error as? SettingsViewModel.ValidationError {
            return validationErrorMessage(validationError)
        }

        if let llmError = error as? LLMService.LLMError {
            return llmErrorMessage(llmError)
        }

        if let selectionError = error as? SelectionService.SelectionError {
            return selectionErrorMessage(selectionError)
        }

        return localizedKnownMessage(error.localizedDescription)
    }

    private func llmErrorMessage(_ error: LLMService.LLMError) -> String {
        switch error {
        case .invalidEndpoint:
            return text(ja: "LLM エンドポイントが不正です。", en: "The LLM endpoint is invalid.")
        case .noLoadedModel:
            return text(ja: "利用可能なローカルモデルが見つかりません。", en: "No available local model was found.")
        case .invalidResponse(let message):
            return localizedKnownMessage(message)
        case .httpError(let statusCode, let message):
            return text(
                ja: "LLM API エラー (\(statusCode)): \(message)",
                en: "LLM API error (\(statusCode)): \(localizedKnownMessage(message))"
            )
        }
    }

    private func selectionErrorMessage(_ error: SelectionService.SelectionError) -> String {
        switch error {
        case .accessibilityPermissionDenied:
            return text(
                ja: "アクセシビリティ権限が必要です。システム設定 > プライバシーとセキュリティ > アクセシビリティ で GenGo を許可してください。",
                en: "Accessibility permission is required. Allow GenGo in System Settings > Privacy & Security > Accessibility."
            )
        case .eventCreationFailed:
            return text(ja: "キーボードイベントを作成できませんでした。", en: "Could not create a keyboard event.")
        }
    }

    private func localizedKnownMessage(_ message: String) -> String {
        guard language == .en else {
            return message
        }

        switch message {
        case "接続テストの応答が空でした。":
            return "The connection test returned an empty response."
        case "LLM からの応答が空です。":
            return "The LLM returned an empty response."
        case "LLM の応答形式が不正です。":
            return "The LLM response format is invalid."
        case "ストリーミング応答が空でした。":
            return "The streaming response was empty."
        case "HTTP レスポンスを取得できませんでした。":
            return "Could not read the HTTP response."
        case "JSON の解析に失敗しました。":
            return "Failed to parse JSON."
        default:
            return message
        }
    }
}
