import AppKit
import SwiftUI

enum SelectionActionMenuChoice {
    case onDemand
    case preset(index: Int)
}

@MainActor
final class SelectionActionButtonController: NSWindowController {
    private var dismissTask: Task<Void, Never>?
    private var action: (() -> Void)?

    init() {
        let iconImage = Self.selectionIconImage()
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 38, height: 38),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .popUpMenu
        panel.collectionBehavior = [.canJoinAllSpaces, .transient, .ignoresCycle]
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.isMovable = false
        panel.ignoresMouseEvents = false
        panel.becomesKeyOnlyIfNeeded = true
        panel.isReleasedWhenClosed = false

        super.init(window: panel)

        panel.contentView = NSHostingView(
            rootView: SelectionActionButtonView(iconImage: iconImage) { [weak self] in
                self?.performAction()
            }
        )
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func present(at mouseLocation: NSPoint, action: @escaping () -> Void) {
        guard let window else {
            return
        }

        dismissTask?.cancel()
        self.action = action

        let size = window.frame.size
        let screen = NSScreen.screens.first { NSMouseInRect(mouseLocation, $0.frame, false) } ?? NSScreen.main
        let visibleFrame = screen?.visibleFrame ?? .zero
        var origin = NSPoint(x: mouseLocation.x + 10, y: mouseLocation.y - size.height - 10)
        origin.x = min(max(origin.x, visibleFrame.minX + 6), visibleFrame.maxX - size.width - 6)
        origin.y = min(max(origin.y, visibleFrame.minY + 6), visibleFrame.maxY - size.height - 6)

        window.setFrameOrigin(origin)
        window.orderFrontRegardless()

        dismissTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled else {
                return
            }
            self?.dismiss()
        }
    }

    func dismiss() {
        dismissTask?.cancel()
        dismissTask = nil
        action = nil
        window?.orderOut(nil)
    }

    private func performAction() {
        let action = action
        dismiss()
        action?()
    }

    private static func selectionIconImage() -> NSImage? {
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

        guard let icon = iconURLs.lazy.compactMap({ NSImage(contentsOf: $0) }).first else {
            return nil
        }
        icon.isTemplate = false
        icon.accessibilityDescription = "GenGo"
        return icon
    }
}

private struct SelectionActionButtonView: View {
    let iconImage: NSImage?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Color(nsColor: .windowBackgroundColor).opacity(0.97))

                if let iconImage {
                    Image(nsImage: iconImage)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFit()
                        .frame(width: 29, height: 29)
                } else {
                    Text("G")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.accentColor)
                }
            }
            .frame(width: 34, height: 34)
            .overlay(
                Circle()
                    .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("GenGo")
        .padding(2)
    }
}

@MainActor
final class SelectionActionMenuController: NSObject {
    private var action: ((SelectionActionMenuChoice) -> Void)?

    func present(
        at location: NSPoint,
        presets: [PresetPrompt],
        strings: AppStrings,
        action: @escaping (SelectionActionMenuChoice) -> Void
    ) {
        self.action = action

        let menu = NSMenu(title: "GenGo")
        menu.autoenablesItems = false

        let header = NSMenuItem(title: "GenGo", action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)
        menu.addItem(.separator())

        let onDemandItem = NSMenuItem(
            title: strings.selectionActionOnDemandTitle,
            action: #selector(selectOnDemand),
            keyEquivalent: ""
        )
        onDemandItem.target = self
        onDemandItem.image = NSImage(systemSymbolName: "text.cursor", accessibilityDescription: nil)
        menu.addItem(onDemandItem)

        let enabledPresets = presets.enumerated().filter { $0.element.enabled }
        if !enabledPresets.isEmpty {
            menu.addItem(.separator())
        }

        for (index, preset) in enabledPresets {
            let item = NSMenuItem(
                title: Self.menuTitle(for: preset, index: index, strings: strings),
                action: #selector(selectPreset(_:)),
                keyEquivalent: ""
            )
            item.target = self
            item.representedObject = NSNumber(value: index)
            item.image = NSImage(systemSymbolName: "wand.and.stars", accessibilityDescription: nil)
            menu.addItem(item)
        }

        _ = menu.popUp(positioning: nil, at: location, in: nil)
        self.action = nil
    }

    @objc private func selectOnDemand() {
        action?(.onDemand)
    }

    @objc private func selectPreset(_ sender: NSMenuItem) {
        guard let number = sender.representedObject as? NSNumber else {
            return
        }
        action?(.preset(index: number.intValue))
    }

    private static func menuTitle(for preset: PresetPrompt, index: Int, strings: AppStrings) -> String {
        let limit = 42
        let presetName = preset.name
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !presetName.isEmpty {
            return presetName.count <= limit
                ? presetName
                : String(presetName.prefix(limit)) + "…"
        }

        let singleLinePrompt = preset.prompt
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !singleLinePrompt.isEmpty else {
            return strings.presetItemTitle(index + 1)
        }

        if singleLinePrompt.count <= limit {
            return singleLinePrompt
        }
        return String(singleLinePrompt.prefix(limit)) + "…"
    }
}
