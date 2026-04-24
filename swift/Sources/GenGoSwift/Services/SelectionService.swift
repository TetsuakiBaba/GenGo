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
        let focusedElement = focusedElement(for: sourceApp)
        let context = SelectionContext(
            applicationName: sourceApp?.localizedName ?? "Unknown",
            bundleIdentifier: sourceApp?.bundleIdentifier,
            application: sourceApp,
            focusedElement: focusedElement,
            selectedTextRange: focusedElement.flatMap(selectedTextRange(for:))
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
        try await pasteText(text, context: context, restoreSelection: true)
    }

    func insertGeneratedText(_ text: String, context: SelectionContext?) async throws {
        try await pasteText(text, context: context, restoreSelection: false)
    }

    private func pasteText(_ text: String, context: SelectionContext?, restoreSelection: Bool) async throws {
        guard ensureAccessibilityPermission(prompt: true) else {
            throw SelectionError.accessibilityPermissionDenied
        }

        let originalString = pasteboard.string(forType: .string)
        writePasteboard(text)

        if let context {
            await restoreFocus(for: context, restoreSelection: restoreSelection)
        }

        try await Task.sleep(nanoseconds: 120_000_000)
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

    private func restoreFocus(for context: SelectionContext, restoreSelection: Bool) async {
        if let application = context.application {
            application.activate(options: [.activateIgnoringOtherApps])
        }

        try? await Task.sleep(nanoseconds: 180_000_000)

        guard let targetElement = restorableFocusedElement(for: context) else {
            return
        }

        if restoreSelection, let selectedTextRange = context.selectedTextRange {
            var range = selectedTextRange
            if let axRange = AXValueCreate(.cfRange, &range) {
                _ = AXUIElementSetAttributeValue(
                    targetElement,
                    kAXSelectedTextRangeAttribute as CFString,
                    axRange
                )
                try? await Task.sleep(nanoseconds: 80_000_000)
            }
        }
    }

    private func restorableFocusedElement(for context: SelectionContext) -> AXUIElement? {
        if let focusedElement = context.focusedElement {
            let focusResult = AXUIElementSetAttributeValue(
                focusedElement,
                kAXFocusedAttribute as CFString,
                kCFBooleanTrue
            )

            if focusResult == .success {
                return focusedElement
            }
        }

        guard let fallbackElement = focusedElement(for: context.application) else {
            return context.focusedElement
        }

        _ = AXUIElementSetAttributeValue(
            fallbackElement,
            kAXFocusedAttribute as CFString,
            kCFBooleanTrue
        )

        return fallbackElement
    }

    private func focusedElement(for application: NSRunningApplication?) -> AXUIElement? {
        guard let application else {
            return nil
        }

        let appElement = AXUIElementCreateApplication(application.processIdentifier)
        guard
            let value = attributeValue(kAXFocusedUIElementAttribute as CFString, on: appElement),
            CFGetTypeID(value) == AXUIElementGetTypeID()
        else {
            return nil
        }

        return unsafeBitCast(value, to: AXUIElement.self)
    }

    private func selectedTextRange(for element: AXUIElement) -> CFRange? {
        guard
            let value = attributeValue(kAXSelectedTextRangeAttribute as CFString, on: element),
            CFGetTypeID(value) == AXValueGetTypeID()
        else {
            return nil
        }

        let axValue = unsafeBitCast(value, to: AXValue.self)

        guard AXValueGetType(axValue) == .cfRange else {
            return nil
        }

        var range = CFRange()
        guard AXValueGetValue(axValue, .cfRange, &range) else {
            return nil
        }

        return range
    }

    private func attributeValue(_ attribute: CFString, on element: AXUIElement) -> CFTypeRef? {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute, &value)
        guard result == .success else {
            return nil
        }

        return value
    }
}
