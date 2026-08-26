import Foundation
import XCTest
@testable import GenGoSwift

final class AppSettingsTests: XCTestCase {
    func testDecodingLegacySettingsUsesSelectionActionDefaults() throws {
        let json = """
        {
          "autoApplyAndClose": false,
          "language": "ja",
          "llmProvider": "local",
          "llmEndpoint": "http://127.0.0.1:1234",
          "apiKey": "",
          "modelName": "gpt-4o-mini",
          "localModelInstanceId": "",
          "localReasoningUnsupportedModels": [],
          "maxTokens": 4096,
          "onDemandShortcutKey": "Ctrl+0",
          "presetPrompts": [
            {
              "id": "11111111-1111-1111-1111-111111111111",
              "shortcutKey": "Ctrl+1",
              "prompt": "Translate",
              "enabled": true
            }
          ]
        }
        """

        let settings = try JSONDecoder().decode(AppSettings.self, from: Data(json.utf8))

        XCTAssertTrue(settings.selectionActionsEnabled)
        XCTAssertEqual(settings.selectionActionMode, .bubble)
        XCTAssertEqual(settings.selectionActionExcludedBundleIdentifiers, "")
        XCTAssertEqual(settings.presetPrompts.first?.name, "")
        XCTAssertFalse(settings.openAICompatibleStreamingEnabled)
        XCTAssertFalse(settings.openAICompatibleReasoningDisabled)
    }

    func testOpenAICompatibleStreamingDefaultsToDisabledForLegacySettings() throws {
        let data = try JSONEncoder().encode(AppSettings())
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        object.removeValue(forKey: "openAICompatibleStreamingEnabled")

        let legacyData = try JSONSerialization.data(withJSONObject: object)
        let decoded = try JSONDecoder().decode(AppSettings.self, from: legacyData)

        XCTAssertFalse(decoded.openAICompatibleStreamingEnabled)
    }

    func testNormalizingExcludedBundleIdentifiersTrimsAndDeduplicates() {
        var settings = AppSettings(
            selectionActionExcludedBundleIdentifiers: " com.apple.Terminal,com.example.App\nCOM.EXAMPLE.APP "
        )

        settings.normalize()

        XCTAssertEqual(
            settings.selectionActionExcludedBundleIdentifiers,
            "com.apple.Terminal, com.example.App"
        )
        XCTAssertEqual(
            settings.excludedSelectionActionBundleIdentifiers,
            ["com.apple.terminal", "com.example.app"]
        )
    }

    func testPresetNameRoundTripsAndIsTrimmedDuringNormalization() throws {
        var settings = AppSettings(
            presetPrompts: [
                PresetPrompt(name: "  日英翻訳  ", shortcutKey: "Ctrl+1", prompt: "Translate")
            ]
        )

        settings.normalize()
        let data = try JSONEncoder().encode(settings)
        let decoded = try JSONDecoder().decode(AppSettings.self, from: data)

        XCTAssertEqual(decoded.presetPrompts.first?.name, "日英翻訳")
    }

    func testDefaultPresetLoaderDecodesEditableJSON() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let url = directory.appendingPathComponent("default-presets.json")
        let json = """
        [
          {
            "name": "要約",
            "shortcutKey": "Ctrl+2",
            "prompt": "Summarize the text.",
            "enabled": true
          }
        ]
        """
        try Data(json.utf8).write(to: url)

        let presets = try DefaultPresetLoader.load(from: url)

        XCTAssertEqual(presets.count, 1)
        XCTAssertEqual(presets[0].name, "要約")
        XCTAssertEqual(presets[0].shortcutKey, "Ctrl+2")
        XCTAssertEqual(presets[0].prompt, "Summarize the text.")
        XCTAssertTrue(presets[0].enabled)
    }
}
