import AppKit
import Foundation

@MainActor
final class AppCoordinator: NSObject, ObservableObject {
    private let settingsStore = SettingsStore()
    private let hotKeyCenter = HotKeyCenter()
    private let selectionService = SelectionService()
    private let llmService = LLMService()

    private var statusItemController: StatusItemController?
    private var popupWindowController: PopupWindowController?
    private var settingsWindowController: SettingsWindowController?

    let popupViewModel = PopupViewModel()

    private var currentSelectionContext: SelectionContext?
    private var isProcessing = false

    var settings: AppSettings {
        settingsStore.settings
    }

    func start() {
        settingsStore.load()
        popupWindowController = PopupWindowController(coordinator: self, viewModel: popupViewModel)
        statusItemController = StatusItemController(coordinator: self)
        registerShortcuts()
    }

    func stop() {
        hotKeyCenter.unregisterAll()
    }

    func openSettingsWindow() {
        if settingsWindowController == nil {
            settingsWindowController = SettingsWindowController(coordinator: self)
        }

        settingsWindowController?.reload(with: settings)
        NSApp.activate(ignoringOtherApps: true)
        settingsWindowController?.showWindow(nil)
        settingsWindowController?.window?.makeKeyAndOrderFront(nil)
    }

    func dismissPopup() {
        popupViewModel.reset()
        popupWindowController?.dismiss()
    }

    func showAbout() {
        let alert = NSAlert()
        alert.messageText = "GenGo"
        alert.informativeText = "LM Studio や OpenAI 互換 API と連携し、選択テキストをその場で処理できる macOS ネイティブ版です。"
        alert.runModal()
    }

    func fetchLocalModels(endpoint: String) async throws -> [LocalModelInstance] {
        try await llmService.fetchLocalModels(endpoint: endpoint)
    }

    func testConnection(using draft: AppSettings) async throws {
        var settings = draft
        settings.normalize()
        try await llmService.testConnection(settings: settings)
    }

    func saveSettings(_ newSettings: AppSettings) throws {
        try settingsStore.save(newSettings)
        registerShortcuts()
        settingsWindowController?.reload(with: settingsStore.settings)
    }

    func applyCurrentResult() {
        Task {
            await applyCurrentResultAsync()
        }
    }

    func submitOnDemandPrompt() {
        let prompt = popupViewModel.promptText.trimmingCharacters(in: .whitespacesAndNewlines)
        let selectedText = popupViewModel.sourceText

        guard !prompt.isEmpty else {
            popupViewModel.setNotice("処理指示を入力してください。", kind: .error)
            return
        }

        Task {
            await processSelectedText(
                selectedText: selectedText,
                prompt: prompt,
                mode: .onDemand,
                allowAutoApply: false,
                title: "オンデマンド処理中"
            )
        }
    }

    func submitTextGeneration() {
        let prompt = popupViewModel.promptText.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !prompt.isEmpty else {
            popupViewModel.setNotice("生成指示を入力してください。", kind: .error)
            return
        }

        Task {
            await processSelectedText(
                selectedText: "",
                prompt: prompt,
                mode: .textGeneration,
                allowAutoApply: false,
                title: "テキスト生成中"
            )
        }
    }

    private func registerShortcuts() {
        hotKeyCenter.unregisterAll()

        for (index, preset) in settings.presetPrompts.enumerated() where preset.enabled {
            _ = hotKeyCenter.register(shortcut: preset.shortcutKey) { [weak self] in
                Task { @MainActor in
                    self?.handlePresetTrigger(index: index)
                }
            }
        }

        _ = hotKeyCenter.register(shortcut: settings.onDemandShortcutKey) { [weak self] in
            Task { @MainActor in
                self?.handleOnDemandTrigger()
            }
        }
    }

    private func handlePresetTrigger(index: Int) {
        if popupViewModel.presentationMode == .result {
            applyCurrentResult()
            return
        }

        guard settings.presetPrompts.indices.contains(index) else {
            return
        }

        Task {
            do {
                let capture = try await selectionService.captureSelectedText()
                currentSelectionContext = capture.context

                if let selectedText = capture.selectedText {
                    let preset = settings.presetPrompts[index]
                    await processSelectedText(
                        selectedText: selectedText,
                        prompt: preset.prompt,
                        mode: .preset(index: index),
                        allowAutoApply: settings.autoApplyAndClose,
                        title: "プリセット処理中"
                    )
                } else {
                    popupViewModel.prepareTextGenerationInput()
                    showPopup(for: .textGenerationInput)
                }
            } catch {
                presentError(error.localizedDescription)
            }
        }
    }

    private func handleOnDemandTrigger() {
        if popupViewModel.presentationMode == .result {
            applyCurrentResult()
            return
        }

        Task {
            do {
                let capture = try await selectionService.captureSelectedText()
                currentSelectionContext = capture.context

                guard let selectedText = capture.selectedText else {
                    presentError("テキストを選択してからオンデマンド処理を実行してください。")
                    return
                }

                popupViewModel.prepareOnDemandInput(selectedText: selectedText)
                showPopup(for: .onDemandInput)
            } catch {
                presentError(error.localizedDescription)
            }
        }
    }

    private func processSelectedText(
        selectedText: String,
        prompt: String,
        mode: ProcessingMode,
        allowAutoApply: Bool,
        title: String
    ) async {
        guard !isProcessing else {
            return
        }

        isProcessing = true
        popupViewModel.showProcessing(title: title, sourceText: selectedText, promptText: prompt, mode: mode)
        showPopup(for: .processing)

        defer { isProcessing = false }

        do {
            let result = try await llmService.processCustomPromptStreaming(
                inputText: selectedText,
                customPrompt: prompt,
                settings: settings
            ) { [weak self] preview in
                self?.popupViewModel.setStreamingPreview(preview)
            } onLocalReasoningUnsupportedModel: { [weak self] modelId in
                await self?.rememberLocalReasoningUnsupportedModel(modelId)
            }

            if result == selectedText && mode != .textGeneration {
                popupViewModel.setNotice("変換結果が元テキストと同じだったため、変更はありません。", kind: .info)
                popupViewModel.showResult(originalText: selectedText, resultText: result, mode: mode)
                showPopup(for: .result)
                return
            }

            popupViewModel.showResult(originalText: selectedText, resultText: result, mode: mode)
            showPopup(for: .result)

            if allowAutoApply {
                await applyCurrentResultAsync()
            }
        } catch {
            popupViewModel.setNotice(error.localizedDescription, kind: .error)
            showPopup(for: .processing)
        }
    }

    private func applyCurrentResultAsync() async {
        guard let mode = popupViewModel.processingMode else {
            return
        }

        let resultText = popupViewModel.resultText
        dismissPopup()

        do {
            switch mode {
            case .textGeneration:
                try await selectionService.insertGeneratedText(resultText, context: currentSelectionContext)
            case .preset, .onDemand:
                try await selectionService.applyReplacement(resultText, context: currentSelectionContext)
            }
        } catch {
            presentError(error.localizedDescription)
        }
    }

    private func rememberLocalReasoningUnsupportedModel(_ modelId: String) async {
        guard !modelId.isEmpty else {
            return
        }

        var updated = settings
        if updated.localReasoningUnsupportedModels.contains(modelId) {
            return
        }

        updated.localReasoningUnsupportedModels.append(modelId)

        do {
            try settingsStore.save(updated)
            settingsWindowController?.reload(with: settingsStore.settings)
        } catch {
            print("reasoning非対応モデルの保存に失敗しました: \(error.localizedDescription)")
        }
    }

    private func showPopup(for mode: PopupPresentationMode) {
        let size: NSSize
        let sharedWorkflowSize = NSSize(width: 840, height: 520)

        switch mode {
        case .hidden:
            popupWindowController?.dismiss()
            return
        case .onDemandInput:
            size = NSSize(width: 700, height: 360)
        case .textGenerationInput:
            size = NSSize(width: 700, height: 420)
        case .processing:
            size = sharedWorkflowSize
        case .result:
            size = sharedWorkflowSize
        }

        popupWindowController?.present(size: size)
    }

    private func presentError(_ message: String) {
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = "GenGo"
        alert.informativeText = message
        NSApp.activate(ignoringOtherApps: true)
        alert.runModal()
    }
}
