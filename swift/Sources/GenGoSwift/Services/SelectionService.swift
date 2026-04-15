import AppKit
import ApplicationServices
import Foundation

@MainActor
final class SelectionService {
    private let pasteboard = NSPasteboard.general
    private let copyKeyCode: CGKeyCode = 8
    private let pasteKeyCode: CGKeyCode = 9

    enum SelectionError: LocalizedError {
        case accessibilityPermissionDenied
        case eventCreationFailed

        var errorDescription: String? {
            switch self {
            case .accessibilityPermissionDenied:
                return "アクセシビリティ権限が必要です。システム設定 > プライバシーとセキュリティ > アクセシビリティ で GenGo を許可してください。"
            case .eventCreationFailed:
                return "キーボードイベントを作成できませんでした。"
            }
        }
    }

    func ensureAccessibilityPermission(prompt: Bool) -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: prompt] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    func captureSelectedText() async throws -> SelectionCaptureResult {
        guard ensureAccessibilityPermission(prompt: true) else {
            throw SelectionError.accessibilityPermissionDenied
        }

        let sourceApp = NSWorkspace.shared.frontmostApplication
        let context = SelectionContext(
            applicationName: sourceApp?.localizedName ?? "Unknown",
            bundleIdentifier: sourceApp?.bundleIdentifier,
            application: sourceApp
        )

        let originalString = pasteboard.string(forType: .string)
        let marker = "__GENGO_SWIFT_TEMP_MARKER__"

        writePasteboard(marker)

        try sendModifiedKey(
            keyCode: copyKeyCode,
            flags: .maskCommand
        )

        try await Task.sleep(nanoseconds: 250_000_000)

        let captured = pasteboard.string(forType: .string)
        restorePasteboard(originalString)

        let selectedText: String?
        if let captured, captured != marker, !captured.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            selectedText = captured
        } else {
            selectedText = nil
        }

        return SelectionCaptureResult(selectedText: selectedText, context: context)
    }

    func applyReplacement(_ text: String, context: SelectionContext?) async throws {
        try await pasteText(text, context: context)
    }

    func insertGeneratedText(_ text: String, context: SelectionContext?) async throws {
        try await pasteText(text, context: context)
    }

    private func pasteText(_ text: String, context: SelectionContext?) async throws {
        guard ensureAccessibilityPermission(prompt: true) else {
            throw SelectionError.accessibilityPermissionDenied
        }

        let originalString = pasteboard.string(forType: .string)
        writePasteboard(text)

        if let application = context?.application {
            application.activate(options: [.activateIgnoringOtherApps])
        }

        try await Task.sleep(nanoseconds: 250_000_000)
        try sendModifiedKey(keyCode: pasteKeyCode, flags: .maskCommand)
        try await Task.sleep(nanoseconds: 250_000_000)

        restorePasteboard(originalString)
    }

    private func writePasteboard(_ string: String) {
        pasteboard.clearContents()
        pasteboard.setString(string, forType: .string)
    }

    private func restorePasteboard(_ string: String?) {
        pasteboard.clearContents()
        if let string {
            pasteboard.setString(string, forType: .string)
        }
    }

    private func sendModifiedKey(keyCode: CGKeyCode, flags: CGEventFlags) throws {
        guard
            let keyDown = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
            let keyUp = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false)
        else {
            throw SelectionError.eventCreationFailed
        }

        keyDown.flags = flags
        keyUp.flags = flags

        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
    }
}
