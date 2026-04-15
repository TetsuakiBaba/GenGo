import Foundation

@MainActor
final class PopupViewModel: ObservableObject {
    @Published var presentationMode: PopupPresentationMode = .hidden
    @Published var title: String = "GenGo"
    @Published var sourceText: String = ""
    @Published var promptText: String = ""
    @Published var streamingText: String = ""
    @Published var resultText: String = ""
    @Published var notice: InlineNotice?

    var processingMode: ProcessingMode?

    func prepareOnDemandInput(selectedText: String) {
        presentationMode = .onDemandInput
        title = "オンデマンドプロンプト"
        sourceText = selectedText
        promptText = ""
        streamingText = ""
        resultText = ""
        notice = nil
        processingMode = .onDemand
    }

    func prepareTextGenerationInput() {
        presentationMode = .textGenerationInput
        title = "テキスト生成"
        sourceText = ""
        promptText = ""
        streamingText = ""
        resultText = ""
        notice = InlineNotice(text: "選択テキストが見つからなかったため、生成モードで待機しています。", kind: .info)
        processingMode = .textGeneration
    }

    func showProcessing(title: String, sourceText: String, promptText: String, mode: ProcessingMode) {
        presentationMode = .processing
        self.title = title
        self.sourceText = sourceText
        self.promptText = promptText
        self.streamingText = ""
        self.resultText = ""
        self.notice = nil
        self.processingMode = mode
    }

    func showResult(originalText: String, resultText: String, mode: ProcessingMode) {
        presentationMode = .result
        title = "処理結果"
        sourceText = originalText
        self.resultText = resultText
        self.streamingText = ""
        self.notice = nil
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
        title = "GenGo"
        sourceText = ""
        promptText = ""
        streamingText = ""
        resultText = ""
        notice = nil
        processingMode = nil
    }
}
