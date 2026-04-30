import Foundation

@MainActor
final class SettingsStore: ObservableObject {
    @Published private(set) var settings: AppSettings

    private let fileManager = FileManager.default
    private let directoryName = "GenGo"
    private let legacyDirectoryName = "GenGoSwift"
    private let fileName = "settings.json"

    init(settings: AppSettings = .default) {
        self.settings = settings
    }

    var settingsURL: URL {
        let baseURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return baseURL
            .appendingPathComponent(directoryName, isDirectory: true)
            .appendingPathComponent(fileName, isDirectory: false)
    }

    func load() {
        do {
            try migrateLegacySettingsIfNeeded()
            let url = settingsURL
            guard fileManager.fileExists(atPath: url.path) else {
                settings = .default
                return
            }

            let data = try Data(contentsOf: url)
            var decoded = try JSONDecoder().decode(AppSettings.self, from: data)
            if decoded.onDemandShortcutKey == "Ctrl+Shift+1" {
                decoded.onDemandShortcutKey = "Ctrl+0"
            }
            decoded.normalize()
            settings = decoded
        } catch {
            settings = .default
        }
    }

    func save(_ newSettings: AppSettings) throws {
        var normalized = newSettings
        normalized.normalize()

        let url = settingsURL
        let directoryURL = url.deletingLastPathComponent()

        if !fileManager.fileExists(atPath: directoryURL.path) {
            try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        }

        let data = try JSONEncoder.prettyEncoder.encode(normalized)
        try data.write(to: url, options: .atomic)
        settings = normalized
    }

    func reset() throws {
        try save(.default)
    }

    private func migrateLegacySettingsIfNeeded() throws {
        let destinationURL = settingsURL
        guard !fileManager.fileExists(atPath: destinationURL.path) else {
            return
        }

        let legacyURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent(legacyDirectoryName, isDirectory: true)
            .appendingPathComponent(fileName, isDirectory: false)

        guard fileManager.fileExists(atPath: legacyURL.path) else {
            return
        }

        let destinationDirectoryURL = destinationURL.deletingLastPathComponent()
        if !fileManager.fileExists(atPath: destinationDirectoryURL.path) {
            try fileManager.createDirectory(at: destinationDirectoryURL, withIntermediateDirectories: true)
        }

        try fileManager.copyItem(at: legacyURL, to: destinationURL)
    }
}

private extension JSONEncoder {
    static var prettyEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return encoder
    }
}
