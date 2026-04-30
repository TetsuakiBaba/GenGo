import AppKit
import Foundation
import Sparkle

@MainActor
final class AppCoordinator: NSObject, ObservableObject {
    private let settingsStore = SettingsStore()
    private let hotKeyCenter = HotKeyCenter()
    private let selectionService = SelectionService()
    private let llmService = LLMService()

    private var statusItemController: StatusItemController?
    private var popupWindowController: PopupWindowController?
    private var settingsWindowController: SettingsWindowController?
    private var updaterController: SPUStandardUpdaterController?

    let popupViewModel = PopupViewModel()
    @Published private(set) var activeLanguage: AppLanguage = .ja

    private var currentSelectionContext: SelectionContext?
    private var isProcessing = false

    var settings: AppSettings {
        settingsStore.settings
    }

    var supportsSoftwareUpdates: Bool {
        updaterController != nil
    }

    var strings: AppStrings {
        AppStrings(language: activeLanguage)
    }

    var canCheckForUpdates: Bool {
        updaterController?.updater.canCheckForUpdates ?? false
    }

    func start() {
        settingsStore.load()
        activeLanguage = settings.appLanguage
        configureSoftwareUpdater()
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

    func checkForUpdates(_ sender: Any?) {
        guard let updaterController else {
            presentError(strings.softwareUpdatesUnavailable)
            return
        }

        updaterController.checkForUpdates(sender)
    }

    func dismissPopup() {
        popupViewModel.reset()
        popupWindowController?.dismiss()
    }

    func resizePopupForCurrentContent() {
        let mode = popupViewModel.presentationMode
        switch mode {
        case .processing, .result:
            popupWindowController?.resize(size: popupSize(for: mode), mode: mode)
        case .hidden, .onDemandInput, .textGenerationInput:
            break
        }
    }

    func showAbout() {
        let alert = NSAlert()
        alert.messageText = "GenGo"
        alert.informativeText = strings.aboutText(version: Self.appVersion)
        alert.icon = Self.aboutIcon()
        alert.layout()
        Self.applyOpaqueWhiteBackground(to: alert.window)
        alert.runModal()
    }

    private static var appVersion: String? {
        let shortVersion = trimmedInfoDictionaryString(for: "CFBundleShortVersionString")
        let buildVersion = trimmedInfoDictionaryString(for: "CFBundleVersion")

        switch (shortVersion, buildVersion) {
        case let (short?, build?) where short != build:
            return "\(short) (\(build))"
        case let (short?, _):
            return short
        case let (_, build?):
            return build
        default:
            return nil
        }
    }

    private static func trimmedInfoDictionaryString(for key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
            return nil
        }

        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private static func applyOpaqueWhiteBackground(to window: NSWindow) {
        window.appearance = NSAppearance(named: .aqua)
        window.alphaValue = 1.0
        window.isOpaque = true
        window.backgroundColor = .white
        window.titlebarAppearsTransparent = false

        if let contentView = window.contentView {
            contentView.wantsLayer = true
            contentView.layer?.backgroundColor = NSColor.white.cgColor
            applyOpaqueWhiteBackground(to: contentView)
        }
    }

    private static func applyOpaqueWhiteBackground(to view: NSView) {
        if let visualEffectView = view as? NSVisualEffectView {
            visualEffectView.blendingMode = .withinWindow
            visualEffectView.material = .contentBackground
            visualEffectView.state = .inactive
        }

        view.subviews.forEach { applyOpaqueWhiteBackground(to: $0) }
    }

    private static func aboutIcon() -> NSImage? {
        let currentDirectoryURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let iconURLs = [
            Bundle.main.url(forResource: "GenGo", withExtension: "icns"),
            Bundle.main.resourceURL?.appendingPathComponent("GenGo.icns"),
            currentDirectoryURL
                .appendingPathComponent("../icons/icon.icns")
                .standardizedFileURL,
            currentDirectoryURL
                .appendingPathComponent("icons/icon.icns")
                .standardizedFileURL
        ].compactMap { $0 }

        guard let sourceIcon = iconURLs.lazy.compactMap({ NSImage(contentsOf: $0) }).first ?? NSApp.applicationIconImage.copy() as? NSImage else {
            return nil
        }

        let iconSize = NSSize(width: 64, height: 64)
        let icon = NSImage(size: iconSize, flipped: false) { destinationRect in
            NSColor.white.setFill()
            destinationRect.fill()

            let iconPadding: CGFloat = 8
            sourceIcon.draw(
                in: destinationRect.insetBy(dx: iconPadding, dy: iconPadding),
                from: .zero,
                operation: .sourceOver,
                fraction: 1.0
            )
            return true
        }
        icon.isTemplate = false
        icon.accessibilityDescription = "GenGo"
        return icon
    }

    func fetchModels(endpoint: String, provider: LLMProvider) async throws -> [LocalModelInstance] {
        try await llmService.fetchModels(endpoint: endpoint, provider: provider)
    }

    func testConnection(using draft: AppSettings) async throws {
        var settings = draft
        settings.normalize()
        try await llmService.testConnection(settings: settings)
    }

    func saveSettings(_ newSettings: AppSettings) throws {
        try settingsStore.save(newSettings)
        activeLanguage = settingsStore.settings.appLanguage
        registerShortcuts()
        statusItemController?.reloadMenu()
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
            popupViewModel.setNotice(strings.onDemandPromptRequired, kind: .error)
            return
        }

        Task {
            await processSelectedText(
                selectedText: selectedText,
                prompt: prompt,
                mode: .onDemand,
                allowAutoApply: false
            )
        }
    }

    func submitTextGeneration() {
        let prompt = popupViewModel.promptText.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !prompt.isEmpty else {
            popupViewModel.setNotice(strings.generationPromptRequired, kind: .error)
            return
        }

        Task {
            await processSelectedText(
                selectedText: "",
                prompt: prompt,
                mode: .textGeneration,
                allowAutoApply: false
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

    private func configureSoftwareUpdater() {
        guard Self.hasSparkleConfiguration else {
            return
        }

        updaterController = SPUStandardUpdaterController(
            startingUpdater: true,
            updaterDelegate: nil,
            userDriverDelegate: nil
        )
    }

    private static var hasSparkleConfiguration: Bool {
        guard
            let feedURL = Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String,
            !feedURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            let publicKey = Bundle.main.object(forInfoDictionaryKey: "SUPublicEDKey") as? String,
            !publicKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            return false
        }

        return true
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
                        allowAutoApply: settings.autoApplyAndClose
                    )
                } else {
                    popupViewModel.prepareTextGenerationInput()
                    showPopup(for: .textGenerationInput)
                }
            } catch {
                presentError(strings.errorMessage(error))
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
                    presentError(strings.selectedTextRequired)
                    return
                }

                popupViewModel.prepareOnDemandInput(selectedText: selectedText)
                showPopup(for: .onDemandInput)
            } catch {
                presentError(strings.errorMessage(error))
            }
        }
    }

    private func processSelectedText(
        selectedText: String,
        prompt: String,
        mode: ProcessingMode,
        allowAutoApply: Bool
    ) async {
        guard !isProcessing else {
            return
        }

        isProcessing = true
        let currentSettings = settings
        popupViewModel.showProcessing(
            sourceText: selectedText,
            promptText: prompt,
            mode: mode,
            provider: currentSettings.llmProvider
        )
        showPopup(for: .processing)

        defer { isProcessing = false }

        do {
            let result = try await llmService.processCustomPromptStreaming(
                inputText: selectedText,
                customPrompt: prompt,
                settings: currentSettings
            ) { [weak self] preview in
                self?.popupViewModel.setStreamingPreview(preview)
            } onLocalReasoningUnsupportedModel: { [weak self] modelId in
                await self?.rememberLocalReasoningUnsupportedModel(modelId)
            }

            if result == selectedText && mode != .textGeneration {
                popupViewModel.setNotice(strings.unchangedResultNotice, kind: .info)
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
            popupViewModel.setNotice(strings.errorMessage(error), kind: .error)
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
            presentError(strings.errorMessage(error))
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
            print("Failed to save reasoning-unsupported model: \(error.localizedDescription)")
        }
    }

    private func showPopup(for mode: PopupPresentationMode) {
        switch mode {
        case .hidden:
            popupWindowController?.dismiss()
            return
        case .onDemandInput, .textGenerationInput, .processing, .result:
            popupWindowController?.present(size: popupSize(for: mode), mode: mode)
        }
    }

    private func popupSize(for mode: PopupPresentationMode) -> NSSize {
        PopupSizing.dialogSize(for: mode, outputText: popupOutputText(for: mode))
    }

    private func popupOutputText(for mode: PopupPresentationMode) -> String {
        switch mode {
        case .processing:
            return popupViewModel.streamingText
        case .result:
            return popupViewModel.resultText
        case .hidden, .onDemandInput, .textGenerationInput:
            return ""
        }
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
