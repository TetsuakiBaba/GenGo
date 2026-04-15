import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let coordinator = AppCoordinator()

    func applicationDidFinishLaunching(_ notification: Notification) {
        coordinator.start()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        coordinator.openSettingsWindow()
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        coordinator.stop()
    }
}
