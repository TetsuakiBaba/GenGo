import AppKit
import Foundation
import Sparkle

@MainActor
final class AppCoordinator: NSObject, ObservableObject {
    private let settingsStore = SettingsStore()
    private let hotKeyCenter = HotKeyCenter()
    private let selectionService = SelectionService()
    private let llmService = LLMService()
    private let mouseSelectionMonitor = MouseSelectionMonitor()
    private lazy var selectionActionButtonController = SelectionActionButtonController()
    private lazy var selectionActionMenuController = SelectionActionMenuController()

    private var statusItemController: StatusItemController?
    private var popupWindowController: PopupWindowController?
    private var settingsWindowController: SettingsWindowController?
    private var updaterController: SPUStandardUpdaterController?

    let popupViewModel = PopupViewModel()
    @Published private(set) var activeLanguage: AppLanguage = .ja

    private var currentSelectionContext: SelectionContext?
    private var isProcessing = false
    private var processingTask: Task<Void, Never>?
    private var activeProcessingID: UUID?

    private struct ProcessingRequest {
        let selectedText: String
        let prompt: String
        let mode: ProcessingMode
    }

    private var lastProcessingRequest: ProcessingRequest?
    private var selectionCaptureTask: Task<Void, Never>?
    private var lastSelectionFingerprint: String?
    private var lastSelectionDate = Date.distantPast
    private var hasRequestedSelectionPermission = false

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
        configureMouseSelectionActions()
    }

    func stop() {
        cancelProcessingTask()
        selectionCaptureTask?.cancel()
        mouseSelectionMonitor.stop()
        selectionActionButtonController.dismiss()
        hotKeyCenter.unregisterAll()
    }

    func openSettingsWindow() {
        selectionCaptureTask?.cancel()
        selectionActionButtonController.dismiss()

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
        cancelProcessingTask()
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
        configureMouseSelectionActions()
        statusItemController?.reloadMenu()
        settingsWindowController?.reload(with: settingsStore.settings)
    }

    func applyCurrentResult() {
        Task {
            await applyCurrentResultAsync()
        }
    }

    func copyCurrentResult() {
        guard !popupViewModel.resultText.isEmpty else {
            return
        }

        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()

        if pasteboard.setString(popupViewModel.resultText, forType: .string) {
            popupViewModel.setNotice(strings.resultCopiedNotice, kind: .success)
        } else {
            popupViewModel.setNotice(strings.resultCopyFailedNotice, kind: .error)
        }
    }

    func submitOnDemandPrompt() {
        let prompt = popupViewModel.promptText.trimmingCharacters(in: .whitespacesAndNewlines)
        let selectedText = popupViewModel.sourceText

        guard !prompt.isEmpty else {
            popupViewModel.setNotice(strings.onDemandPromptRequired, kind: .error)
            return
        }

        startProcessing(
            selectedText: selectedText,
            prompt: prompt,
            mode: .onDemand,
            allowAutoApply: false
        )
    }

    func submitTextGeneration() {
        let prompt = popupViewModel.promptText.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !prompt.isEmpty else {
            popupViewModel.setNotice(strings.generationPromptRequired, kind: .error)
            return
        }

        startProcessing(
            selectedText: "",
            prompt: prompt,
            mode: .textGeneration,
            allowAutoApply: false
        )
    }

    func cancelCurrentProcessing() {
        guard activeProcessingID != nil else {
            return
        }

        let partialResult = popupViewModel.streamingText
        let sourceText = popupViewModel.sourceText
        let mode = popupViewModel.processingMode
        cancelProcessingTask()

        guard let mode else {
            dismissPopup()
            return
        }

        popupViewModel.showResult(originalText: sourceText, resultText: partialResult, mode: mode)
        popupViewModel.setNotice(
            partialResult.isEmpty ? strings.processingCancelledWithoutResultNotice : strings.processingCancelledNotice,
            kind: .info
        )
        showPopup(for: .result)
    }

    func regenerateCurrentResult() {
        guard let request = lastProcessingRequest else {
            return
        }

        startProcessing(
            selectedText: request.selectedText,
            prompt: request.prompt,
            mode: request.mode,
            allowAutoApply: false
        )
    }

    func submitFollowUpPrompt() {
        let followUpPrompt = popupViewModel.followUpPromptText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !followUpPrompt.isEmpty else {
            popupViewModel.setNotice(strings.followUpPromptRequired, kind: .error)
            return
        }

        startProcessing(
            selectedText: popupViewModel.resultText,
            prompt: followUpPrompt,
            mode: popupViewModel.processingMode ?? .onDemand,
            allowAutoApply: false
        )
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

    private func configureMouseSelectionActions() {
        selectionCaptureTask?.cancel()
        selectionCaptureTask = nil
        mouseSelectionMonitor.stop()
        selectionActionButtonController.dismiss()

        guard settings.selectionActionsEnabled else {
            return
        }

        mouseSelectionMonitor.start { [weak self] in
            self?.selectionActionButtonController.dismiss()
            self?.selectionCaptureTask?.cancel()
            self?.selectionCaptureTask = nil
        } onSelectionGesture: { [weak self] location, modifiers in
            self?.handleMouseSelectionGesture(at: location, modifiers: modifiers)
        }
    }

    private func handleMouseSelectionGesture(at location: NSPoint, modifiers: NSEvent.ModifierFlags) {
        guard settings.selectionActionsEnabled, !isProcessing, popupViewModel.presentationMode == .hidden else {
            return
        }

        if settings.selectionActionMode == .optionMenu, !modifiers.contains(.option) {
            return
        }

        guard selectionService.ensureAccessibilityPermission(prompt: false) else {
            if !hasRequestedSelectionPermission {
                hasRequestedSelectionPermission = true
                _ = selectionService.ensureAccessibilityPermission(prompt: true)
            }
            return
        }

        selectionCaptureTask?.cancel()
        selectionCaptureTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 160_000_000)
            guard !Task.isCancelled, let self else {
                return
            }
            self.selectionCaptureTask = nil
            await self.presentSelectionActionIfAvailable(at: location)
        }
    }

    private func presentSelectionActionIfAvailable(at location: NSPoint) async {
        let sourceBundleIdentifier = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
        guard !isExcludedFromSelectionActions(sourceBundleIdentifier) else {
            return
        }

        let capture: SelectionCaptureResult?
        if let accessibleCapture = selectionService.captureAccessibleSelectedText() {
            capture = accessibleCapture
        } else if selectionService.focusedSelectionIsSecure() {
            capture = nil
        } else {
            capture = try? await selectionService.captureSelectedText()
        }

        guard
            !Task.isCancelled,
            let capture,
            let selectedText = capture.selectedText,
            !isExcludedFromSelectionActions(capture.context.bundleIdentifier)
        else {
            return
        }

        let fingerprint = selectionFingerprint(text: selectedText, context: capture.context)
        let now = Date()
        if fingerprint == lastSelectionFingerprint, now.timeIntervalSince(lastSelectionDate) < 0.75 {
            return
        }
        lastSelectionFingerprint = fingerprint
        lastSelectionDate = now

        switch settings.selectionActionMode {
        case .bubble:
            selectionActionButtonController.present(at: location) { [weak self] in
                self?.presentSelectionActionMenu(for: capture, at: location)
            }
        case .immediateMenu, .optionMenu:
            presentSelectionActionMenu(for: capture, at: location)
        }
    }

    private func presentSelectionActionMenu(for capture: SelectionCaptureResult, at location: NSPoint) {
        selectionActionButtonController.dismiss()
        selectionActionMenuController.present(
            at: location,
            presets: settings.presetPrompts,
            strings: strings
        ) { [weak self] choice in
            self?.handleSelectionActionMenuChoice(choice, capture: capture)
        }
    }

    private func handleSelectionActionMenuChoice(
        _ choice: SelectionActionMenuChoice,
        capture: SelectionCaptureResult
    ) {
        guard let selectedText = capture.selectedText else {
            return
        }

        currentSelectionContext = capture.context
        switch choice {
        case .onDemand:
            popupViewModel.prepareOnDemandInput(selectedText: selectedText)
            showPopup(for: .onDemandInput)

        case .preset(let index):
            guard settings.presetPrompts.indices.contains(index), settings.presetPrompts[index].enabled else {
                return
            }
            let preset = settings.presetPrompts[index]
            startProcessing(
                selectedText: selectedText,
                prompt: preset.prompt,
                mode: .preset(index: index),
                allowAutoApply: settings.autoApplyAndClose
            )
        }
    }

    private func isExcludedFromSelectionActions(_ bundleIdentifier: String?) -> Bool {
        guard let bundleIdentifier else {
            return false
        }

        if bundleIdentifier.caseInsensitiveCompare(Bundle.main.bundleIdentifier ?? "") == .orderedSame {
            return true
        }
        return settings.excludedSelectionActionBundleIdentifiers.contains(bundleIdentifier.lowercased())
    }

    private func selectionFingerprint(text: String, context: SelectionContext) -> String {
        let range = context.selectedTextRange
        return [
            context.bundleIdentifier ?? "",
            String(range?.location ?? -1),
            String(range?.length ?? -1),
            text
        ].joined(separator: "|")
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
                    startProcessing(
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
        allowAutoApply: Bool,
        operationID: UUID
    ) async {
        guard activeProcessingID == operationID else {
            return
        }
        let currentSettings = settings
        popupViewModel.showProcessing(
            sourceText: selectedText,
            promptText: prompt,
            mode: mode,
            provider: currentSettings.llmProvider
        )
        showPopup(for: .processing)

        defer {
            if activeProcessingID == operationID {
                activeProcessingID = nil
                processingTask = nil
                isProcessing = false
            }
        }

        do {
            let result = try await llmService.processCustomPromptStreaming(
                inputText: selectedText,
                customPrompt: prompt,
                settings: currentSettings
            ) { [weak self] preview in
                guard self?.activeProcessingID == operationID else {
                    return
                }
                self?.popupViewModel.setStreamingPreview(preview)
            } onLocalReasoningUnsupportedModel: { [weak self] modelId in
                await self?.rememberLocalReasoningUnsupportedModel(modelId)
            }

            guard activeProcessingID == operationID else {
                return
            }

            if result == selectedText && mode != .textGeneration {
                popupViewModel.showResult(originalText: selectedText, resultText: result, mode: mode)
                popupViewModel.setNotice(strings.unchangedResultNotice, kind: .info)
                showPopup(for: .result)
                return
            }

            popupViewModel.showResult(originalText: selectedText, resultText: result, mode: mode)
            showPopup(for: .result)

            if allowAutoApply {
                await applyCurrentResultAsync()
            }
        } catch {
            guard activeProcessingID == operationID, !Task.isCancelled else {
                return
            }
            popupViewModel.setNotice(strings.errorMessage(error), kind: .error)
            showPopup(for: .processing)
        }
    }

    private func startProcessing(
        selectedText: String,
        prompt: String,
        mode: ProcessingMode,
        allowAutoApply: Bool
    ) {
        guard !isProcessing else {
            return
        }

        let operationID = UUID()
        isProcessing = true
        activeProcessingID = operationID
        lastProcessingRequest = ProcessingRequest(selectedText: selectedText, prompt: prompt, mode: mode)
        processingTask = Task { [weak self] in
            await self?.processSelectedText(
                selectedText: selectedText,
                prompt: prompt,
                mode: mode,
                allowAutoApply: allowAutoApply,
                operationID: operationID
            )
        }
    }

    private func cancelProcessingTask() {
        activeProcessingID = nil
        processingTask?.cancel()
        processingTask = nil
        isProcessing = false
    }

    private func applyCurrentResultAsync() async {
        guard let mode = popupViewModel.processingMode else {
            return
        }

        let resultText = popupViewModel.resultText
        guard !resultText.isEmpty else {
            return
        }

        popupViewModel.reset()
        popupWindowController?.dismiss()

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
        if mode != .hidden {
            selectionCaptureTask?.cancel()
            selectionActionButtonController.dismiss()
        }

        switch mode {
        case .hidden:
            popupWindowController?.dismiss()
            return
        case .onDemandInput, .textGenerationInput, .processing, .result:
            popupWindowController?.present(size: popupSize(for: mode), mode: mode)
        }
    }

    private func popupSize(for mode: PopupPresentationMode) -> NSSize {
        PopupSizing.dialogSize(
            for: mode,
            outputText: popupOutputText(for: mode),
            hasNotice: popupViewModel.notice != nil
        )
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
