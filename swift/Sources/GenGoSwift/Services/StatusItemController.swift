import AppKit

@MainActor
final class StatusItemController: NSObject, NSMenuItemValidation {
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
            button.image = Self.statusIcon()
            button.imagePosition = .imageOnly
        }

        let menu = NSMenu()
        menu.addItem(withTitle: "GenGo", action: nil, keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(withTitle: "設定…", action: #selector(openSettings), keyEquivalent: ",").target = self
        if coordinator?.supportsSoftwareUpdates == true {
            menu.addItem(withTitle: "アップデートを確認…", action: #selector(checkForUpdates), keyEquivalent: "").target = self
        }
        menu.addItem(withTitle: "About", action: #selector(showAbout), keyEquivalent: "").target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: "終了", action: #selector(quit), keyEquivalent: "q").target = self
        statusItem.menu = menu
    }

    private static func statusIcon() -> NSImage? {
        let iconURLs = [
            Bundle.main.url(forResource: "GenGo", withExtension: "icns"),
            Bundle.main.resourceURL?.appendingPathComponent("GenGo.icns"),
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
                .appendingPathComponent("../icons/icon.icns")
                .standardizedFileURL,
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
                .appendingPathComponent("icons/icon.icns")
                .standardizedFileURL
        ].compactMap { $0 }

        for iconURL in iconURLs {
            guard let image = NSImage(contentsOf: iconURL) else {
                continue
            }

            image.size = NSSize(width: 18, height: 18)
            image.isTemplate = true
            image.accessibilityDescription = "GenGo"
            return image
        }

        let fallbackImage = NSImage(systemSymbolName: "text.badge.star", accessibilityDescription: "GenGo")
        fallbackImage?.isTemplate = true
        return fallbackImage
    }

    @objc private func openSettings() {
        coordinator?.openSettingsWindow()
    }

    @objc private func showAbout() {
        coordinator?.showAbout()
    }

    @objc private func checkForUpdates(_ sender: NSMenuItem) {
        coordinator?.checkForUpdates(sender)
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }

    func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        if menuItem.action == #selector(checkForUpdates(_:)) {
            return coordinator?.canCheckForUpdates ?? false
        }

        return true
    }
}
