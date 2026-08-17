import AppKit

@MainActor
final class StatusItemController: NSObject, NSMenuDelegate, NSMenuItemValidation {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private weak var coordinator: AppCoordinator?
    private var appearanceObservation: NSKeyValueObservation?
    private var appearanceUpdateTask: Task<Void, Never>?
    private var displayedFilledIcon: Bool?
    private var isMenuOpen = false

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
            button.imagePosition = .imageOnly
            updateStatusIcon(for: button)

            if appearanceObservation == nil {
                appearanceObservation = button.observe(\.effectiveAppearance, options: [.new]) { [weak self] button, _ in
                    Task { @MainActor [weak self, weak button] in
                        guard let button else {
                            return
                        }
                        self?.scheduleStatusIconUpdate(for: button)
                    }
                }
            }
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
        menu.delegate = self
        statusItem.menu = menu
    }

    private func updateStatusIcon(for button: NSStatusBarButton) {
        let usesFilledIcon = Self.usesFilledIcon(for: button.effectiveAppearance)
        guard displayedFilledIcon != usesFilledIcon else {
            return
        }

        button.image = Self.statusIcon(usesFilledIcon: usesFilledIcon)
        displayedFilledIcon = usesFilledIcon
    }

    private func scheduleStatusIconUpdate(for button: NSStatusBarButton) {
        appearanceUpdateTask?.cancel()
        appearanceUpdateTask = Task { @MainActor [weak self, weak button] in
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled, let self, let button, !self.isMenuOpen else {
                return
            }
            self.updateStatusIcon(for: button)
        }
    }

    private static func usesFilledIcon(for appearance: NSAppearance) -> Bool {
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
    }

    private static func statusIcon(usesFilledIcon: Bool) -> NSImage? {
        let currentDirectoryURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let bundledIconName = usesFilledIcon ? "GenGoTrayIconDark" : "GenGoTrayIcon"
        let sourceIconName = usesFilledIcon ? "gengoicon2026-filled.png" : "gengoicon2026.png"
        let templateIconURLs = [
            Bundle.main.url(forResource: bundledIconName, withExtension: "png"),
            Bundle.main.resourceURL?.appendingPathComponent("\(bundledIconName).png"),
            currentDirectoryURL
                .appendingPathComponent("../icons/\(sourceIconName)")
                .standardizedFileURL,
            currentDirectoryURL
                .appendingPathComponent("icons/\(sourceIconName)")
                .standardizedFileURL
        ].compactMap { $0 }

        if let image = statusIcon(from: templateIconURLs, isTemplate: true, preparesTemplateMask: true) {
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

    func menuWillOpen(_ menu: NSMenu) {
        isMenuOpen = true
        appearanceUpdateTask?.cancel()
    }

    func menuDidClose(_ menu: NSMenu) {
        isMenuOpen = false
        guard let button = statusItem.button else {
            return
        }
        scheduleStatusIconUpdate(for: button)
    }

    private static func statusIcon(
        from iconURLs: [URL],
        isTemplate: Bool,
        preparesTemplateMask: Bool = false
    ) -> NSImage? {
        for iconURL in iconURLs {
            guard let image = NSImage(contentsOf: iconURL) else {
                continue
            }

            let statusImage = preparesTemplateMask ? (templateMaskImage(from: image) ?? image) : image
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

        var visibleLuminanceTotal = 0
        var visiblePixelCount = 0
        var luminanceValues = [UInt8](repeating: 0, count: width * height)

        for offset in stride(from: 0, to: pixels.count, by: bytesPerPixel) {
            let red = Int(pixels[offset])
            let green = Int(pixels[offset + 1])
            let blue = Int(pixels[offset + 2])
            let alpha = Int(pixels[offset + 3])
            let luminance = UInt8((red * 299 + green * 587 + blue * 114) / 1000)
            luminanceValues[offset / bytesPerPixel] = luminance

            if alpha > 0 {
                visibleLuminanceTotal += Int(luminance)
                visiblePixelCount += 1
            }
        }

        let averageVisibleLuminance = visiblePixelCount > 0 ? visibleLuminanceTotal / visiblePixelCount : 0
        let usesLuminanceMask = averageVisibleLuminance > 127
        var maskPixels = [UInt8](repeating: 0, count: height * bytesPerRow)

        for offset in stride(from: 0, to: pixels.count, by: bytesPerPixel) {
            let alpha = Int(pixels[offset + 3])
            let luminance = Int(luminanceValues[offset / bytesPerPixel])
            let maskAlpha = usesLuminanceMask ? UInt8((luminance * alpha) / 255) : UInt8(alpha)

            maskPixels[offset] = 0
            maskPixels[offset + 1] = 0
            maskPixels[offset + 2] = 0
            maskPixels[offset + 3] = maskAlpha
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
