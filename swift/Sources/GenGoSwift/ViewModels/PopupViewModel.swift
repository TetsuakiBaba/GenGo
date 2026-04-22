import Foundation

@MainActor
final class PopupViewModel: ObservableObject {
    @Published var presentationMode: PopupPresentationMode = .hidden
    @Published var sourceText: String = ""
    @Published var promptText: String = ""
    @Published var streamingText: String = ""
    @Published var resultText: String = ""
    @Published var notice: InlineNotice?
    @Published var llmProvider: LLMProvider?

    var processingMode: ProcessingMode?

    func prepareOnDemandInput(selectedText: String) {
        presentationMode = .onDemandInput
        sourceText = selectedText
        promptText = ""
        streamingText = ""
        resultText = ""
        notice = nil
        llmProvider = nil
        processingMode = .onDemand
    }

    func prepareTextGenerationInput() {
        presentationMode = .textGenerationInput
        sourceText = ""
        promptText = ""
        streamingText = ""
        resultText = ""
        notice = nil
        llmProvider = nil
        processingMode = .textGeneration
    }

    func showProcessing(sourceText: String, promptText: String, mode: ProcessingMode, provider: LLMProvider) {
        presentationMode = .processing
        self.sourceText = sourceText
        self.promptText = promptText
        self.streamingText = ""
        self.resultText = ""
        self.notice = nil
        self.llmProvider = provider
        self.processingMode = mode
    }

    func showResult(originalText: String, resultText: String, mode: ProcessingMode) {
        presentationMode = .result
        sourceText = originalText
        self.resultText = resultText
        self.streamingText = ""
        self.notice = nil
        self.llmProvider = nil
        self.processingMode = mode
    }

    func setStreamingPreview(_ text: String) {
        streamingText = text
    }

    func setNotice(_ text: String, kind: InlineNotice.Kind) {
        notice = InlineNotice(text: text, kind: kind)
    }

    func reset() {
        presentationMode = .hidden
        sourceText = ""
        promptText = ""
        streamingText = ""
        resultText = ""
        notice = nil
        llmProvider = nil
        processingMode = nil
    }
}
