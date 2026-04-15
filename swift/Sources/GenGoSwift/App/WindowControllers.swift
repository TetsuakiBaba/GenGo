import AppKit
import SwiftUI

@MainActor
final class PopupWindowController: NSWindowController {
    init(coordinator: AppCoordinator, viewModel: PopupViewModel) {
        let rootView = PopupView(viewModel: viewModel)
            .environmentObject(coordinator)

        let hostingController = NSHostingController(rootView: rootView)
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 720, height: 420),
            styleMask: [.titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.moveToActiveSpace, .transient]
        panel.isMovableByWindowBackground = true
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.standardWindowButton(.zoomButton)?.isHidden = true
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.contentViewController = hostingController
        panel.isReleasedWhenClosed = false

        super.init(window: panel)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func present(size: NSSize) {
        guard let window else { return }

        if window.isVisible {
            let currentSize = window.frame.size
            if currentSize != size {
                var frame = window.frame
                frame.size = size
                window.setFrame(frame, display: true, animate: false)
            }
        } else {
            position(window: window, size: size)
            window.setContentSize(size)
        }

        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    func dismiss() {
        window?.orderOut(nil)
    }

    private func position(window: NSWindow, size: NSSize) {
        let mouseLocation = NSEvent.mouseLocation
        let targetScreen = NSScreen.screens.first(where: { NSMouseInRect(mouseLocation, $0.frame, false) }) ?? NSScreen.main
        let visibleFrame = targetScreen?.visibleFrame ?? NSScreen.main?.visibleFrame ?? .zero

        var origin = NSPoint(x: mouseLocation.x + 20, y: mouseLocation.y - size.height - 20)

        if origin.x + size.width > visibleFrame.maxX {
            origin.x = visibleFrame.maxX - size.width - 20
        }
        if origin.y < visibleFrame.minY {
            origin.y = visibleFrame.minY + 20
        }
        if origin.x < visibleFrame.minX {
            origin.x = visibleFrame.minX + 20
        }

        window.setFrameOrigin(origin)
    }
}

@MainActor
final class SettingsWindowController: NSWindowController {
    private let viewModel: SettingsViewModel

    init(coordinator: AppCoordinator) {
        self.viewModel = SettingsViewModel(settings: coordinator.settings, coordinator: coordinator)

        let rootView = SettingsView(viewModel: viewModel)
        let hostingController = NSHostingController(rootView: rootView)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 760, height: 760),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "GenGo Settings"
        window.center()
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.toolbarStyle = .unified
        window.isMovableByWindowBackground = true
        window.contentViewController = hostingController
        window.isReleasedWhenClosed = false

        super.init(window: window)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func reload(with settings: AppSettings) {
        viewModel.reload(from: settings)
    }
}
