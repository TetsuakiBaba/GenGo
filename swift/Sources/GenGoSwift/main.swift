import AppKit

let application = NSApplication.shared
let delegate: AppDelegate = MainActor.assumeIsolated {
    AppDelegate()
}

application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
