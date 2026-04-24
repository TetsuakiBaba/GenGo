import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let coordinator = AppCoordinator()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.mainMenu = AppMenuBuilder.makeMainMenu(target: self)
        coordinator.start()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        coordinator.openSettingsWindow()
        return true
    }

    @objc func openSettingsWindow(_ sender: Any?) {
        coordinator.openSettingsWindow()
    }

    func applicationWillTerminate(_ notification: Notification) {
        coordinator.stop()
    }
}
