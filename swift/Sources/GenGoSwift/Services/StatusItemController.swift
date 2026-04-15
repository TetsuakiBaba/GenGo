import AppKit

@MainActor
final class StatusItemController: NSObject {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private weak var coordinator: AppCoordinator?

    init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        super.init()
        configure()
    }

    private func configure() {
        if let button = statusItem.button {
            button.toolTip = "GenGo"
            button.image = NSImage(systemSymbolName: "text.badge.star", accessibilityDescription: "GenGo")
            button.image?.isTemplate = true
        }

        let menu = NSMenu()
        menu.addItem(withTitle: "GenGo", action: nil, keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(withTitle: "設定…", action: #selector(openSettings), keyEquivalent: ",").target = self
        menu.addItem(withTitle: "About", action: #selector(showAbout), keyEquivalent: "").target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: "終了", action: #selector(quit), keyEquivalent: "q").target = self
        statusItem.menu = menu
    }

    @objc private func openSettings() {
        coordinator?.openSettingsWindow()
    }

    @objc private func showAbout() {
        coordinator?.showAbout()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
