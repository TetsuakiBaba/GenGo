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

    func reloadMenu() {
        configure()
    }

    private func configure() {
        let strings = coordinator?.strings ?? AppStrings(language: .ja)

        if let button = statusItem.button {
            button.toolTip = "GenGo"
            button.image = Self.statusIcon()
            button.imagePosition = .imageOnly
        }

        let menu = NSMenu()
        menu.addItem(withTitle: "GenGo", action: nil, keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(withTitle: strings.settingsMenuTitle, action: #selector(openSettings), keyEquivalent: ",").target = self
        if coordinator?.supportsSoftwareUpdates == true {
            menu.addItem(withTitle: strings.checkForUpdatesMenuTitle, action: #selector(checkForUpdates), keyEquivalent: "").target = self
        }
        menu.addItem(withTitle: strings.aboutMenuTitle, action: #selector(showAbout), keyEquivalent: "").target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: strings.quitMenuTitle, action: #selector(quit), keyEquivalent: "q").target = self
        statusItem.menu = menu
    }

    private static func statusIcon() -> NSImage? {
        let currentDirectoryURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let templateIconURLs = [
            Bundle.main.url(forResource: "GenGoTrayIcon", withExtension: "png"),
            Bundle.main.resourceURL?.appendingPathComponent("GenGoTrayIcon.png"),
            currentDirectoryURL
                .appendingPathComponent("../icons/newicon.png")
                .standardizedFileURL,
            currentDirectoryURL
                .appendingPathComponent("icons/newicon.png")
                .standardizedFileURL
        ].compactMap { $0 }

        if let image = statusIcon(from: templateIconURLs, isTemplate: true, usesLuminanceMask: true) {
            return image
        }

        let appIconURLs = [
            Bundle.main.url(forResource: "GenGo", withExtension: "icns"),
            Bundle.main.resourceURL?.appendingPathComponent("GenGo.icns"),
            currentDirectoryURL
                .appendingPathComponent("../icons/icon.icns")
                .standardizedFileURL,
            currentDirectoryURL
                .appendingPathComponent("icons/icon.icns")
                .standardizedFileURL
        ].compactMap { $0 }

        if let image = statusIcon(from: appIconURLs, isTemplate: false) {
            return image
        }

        let fallbackImage = NSImage(systemSymbolName: "text.badge.star", accessibilityDescription: "GenGo")
        fallbackImage?.isTemplate = true
        return fallbackImage
    }

    private static func statusIcon(
        from iconURLs: [URL],
        isTemplate: Bool,
        usesLuminanceMask: Bool = false
    ) -> NSImage? {
        for iconURL in iconURLs {
            guard let image = NSImage(contentsOf: iconURL) else {
                continue
            }

            let statusImage = usesLuminanceMask ? (templateMaskImage(from: image) ?? image) : image
            statusImage.size = NSSize(width: 18, height: 18)
            statusImage.isTemplate = isTemplate
            statusImage.accessibilityDescription = "GenGo"
            return statusImage
        }

        return nil
    }

    private static func templateMaskImage(from image: NSImage) -> NSImage? {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return nil
        }

        let width = cgImage.width
        let height = cgImage.height
        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)

        guard let inputContext = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: bitmapInfo
        ) else {
            return nil
        }

        inputContext.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

        var maskPixels = [UInt8](repeating: 0, count: height * bytesPerRow)
        for offset in stride(from: 0, to: pixels.count, by: bytesPerPixel) {
            let red = Int(pixels[offset])
            let green = Int(pixels[offset + 1])
            let blue = Int(pixels[offset + 2])
            let luminance = UInt8((red * 299 + green * 587 + blue * 114) / 1000)

            maskPixels[offset] = 0
            maskPixels[offset + 1] = 0
            maskPixels[offset + 2] = 0
            maskPixels[offset + 3] = luminance
        }

        guard let outputContext = CGContext(
            data: &maskPixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: bitmapInfo
        ),
            let outputImage = outputContext.makeImage()
        else {
            return nil
        }

        return NSImage(cgImage: outputImage, size: image.size)
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
