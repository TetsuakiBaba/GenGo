import Foundation
import XCTest
@testable import GenGoSwift

final class LLMServiceTests: XCTestCase {
    func testNVIDIABuildRequestUsesOpenAICompatibleJSONFormat() throws {
        let settings = AppSettings(
            llmProvider: .remote,
            llmEndpoint: "https://integrate.api.nvidia.com/v1/",
            apiKey: "  nvapi-test-key\n",
            modelName: "meta/muse-glimmer-30b",
            openAICompatibleStreamingEnabled: false,
            openAICompatibleReasoningDisabled: true,
            maxTokens: 8192
        )

        let request = try LLMService().makeRequest(
            prompt: "Which number is larger, 9.11 or 9.8?",
            settings: settings,
            modelIdentifier: "meta/muse-glimmer-30b",
            includeLocalReasoning: false
        )
        let body = try XCTUnwrap(
            JSONSerialization.jsonObject(with: try XCTUnwrap(request.httpBody)) as? [String: Any]
        )
        let messages = try XCTUnwrap(body["messages"] as? [[String: Any]])

        XCTAssertEqual(request.url?.absoluteString, "https://integrate.api.nvidia.com/v1/chat/completions")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer nvapi-test-key")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
        XCTAssertEqual(request.timeoutInterval, 180)
        XCTAssertEqual(body["model"] as? String, "meta/muse-glimmer-30b")
        XCTAssertEqual(body["max_tokens"] as? Int, 8192)
        XCTAssertEqual(body["stream"] as? Bool, false)
        XCTAssertEqual(body["reasoning_effort"] as? String, "none")
        XCTAssertEqual(messages.first?["role"] as? String, "user")
        XCTAssertEqual(messages.first?["content"] as? String, "Which number is larger, 9.11 or 9.8?")
        XCTAssertNil(body["max_completion_tokens"])
    }

    func testReasoningEffortIsOmittedUnlessExplicitlyDisabled() throws {
        let settings = AppSettings(
            llmProvider: .remote,
            llmEndpoint: "https://example.com/v1",
            apiKey: "key",
            modelName: "custom-model"
        )

        let request = try LLMService().makeRequest(
            prompt: "Hello",
            settings: settings,
            modelIdentifier: "custom-model",
            includeLocalReasoning: false
        )
        let body = try XCTUnwrap(
            JSONSerialization.jsonObject(with: try XCTUnwrap(request.httpBody)) as? [String: Any]
        )

        XCTAssertNil(body["reasoning_effort"])
    }

    func testOpenAICompatibleStreamingCanBeEnabled() throws {
        let settings = AppSettings(
            llmProvider: .remote,
            llmEndpoint: "https://example.com/v1/chat/completions",
            apiKey: "key",
            modelName: "custom-model",
            openAICompatibleStreamingEnabled: true
        )

        let request = try LLMService().makeRequest(
            prompt: "Hello",
            settings: settings,
            modelIdentifier: "custom-model",
            includeLocalReasoning: false
        )
        let body = try XCTUnwrap(
            JSONSerialization.jsonObject(with: try XCTUnwrap(request.httpBody)) as? [String: Any]
        )

        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "text/event-stream")
        XCTAssertEqual(body["stream"] as? Bool, true)
    }
}
