import Foundation

enum DefaultPresetLoader {
    static let fileName = "default-presets.json"

    static func load() -> [PresetPrompt]? {
        for url in candidateURLs() where FileManager.default.fileExists(atPath: url.path) {
            do {
                return try load(from: url)
            } catch {
                print("Failed to load \(fileName) from \(url.path): \(error.localizedDescription)")
            }
        }
        return nil
    }

    static func load(from url: URL) throws -> [PresetPrompt] {
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode([PresetPrompt].self, from: data)
    }

    private static func candidateURLs() -> [URL] {
        var urls: [URL] = []

        if let bundledURL = Bundle.main.url(forResource: "default-presets", withExtension: "json") {
            urls.append(bundledURL)
        }

        let currentDirectoryURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        urls.append(currentDirectoryURL.appendingPathComponent("Resources/\(fileName)"))
        urls.append(currentDirectoryURL.appendingPathComponent("swift/Resources/\(fileName)"))

        if let executablePath = CommandLine.arguments.first, !executablePath.isEmpty {
            var directory = URL(fileURLWithPath: executablePath).standardizedFileURL.deletingLastPathComponent()
            for _ in 0..<8 {
                urls.append(directory.appendingPathComponent("Resources/\(fileName)"))
                directory.deleteLastPathComponent()
            }
        }

        var seen = Set<String>()
        return urls.filter { seen.insert($0.standardizedFileURL.path).inserted }
    }
}
