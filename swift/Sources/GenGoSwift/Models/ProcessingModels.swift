import AppKit
import Foundation

struct LocalModelInstance: Identifiable, Hashable {
    let id: String
    let modelKey: String
    let displayName: String
}

struct SelectionContext {
    let applicationName: String
    let bundleIdentifier: String?
    let application: NSRunningApplication?
}

struct SelectionCaptureResult {
    let selectedText: String?
    let context: SelectionContext
}

enum ProcessingMode: Equatable {
    case preset(index: Int)
    case onDemand
    case textGeneration
}

enum PopupPresentationMode {
    case hidden
    case onDemandInput
    case textGenerationInput
    case processing
    case result
}

struct InlineNotice: Identifiable, Equatable {
    enum Kind: Equatable {
        case info
        case error
        case success
    }

    let id = UUID()
    let text: String
    let kind: Kind
}
