import SwiftUI

struct PopupView: View {
    @EnvironmentObject private var coordinator: AppCoordinator
    @ObservedObject var viewModel: PopupViewModel
    @FocusState private var focusedField: FocusField?

    private enum FocusField {
        case onDemandPrompt
        case generationPrompt
    }

    private var isTextGenerationMode: Bool {
        viewModel.processingMode == .textGeneration
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            header

            if let notice = viewModel.notice {
                noticeView(notice)
            }

            switch viewModel.presentationMode {
            case .hidden:
                placeholderSection
            case .onDemandInput:
                onDemandInputSection
            case .textGenerationInput:
                textGenerationSection
            case .processing:
                processingSection
            case .result:
                resultSection
            }
        }
        .font(AppTypography.body)
        .padding(22)
        .frame(minWidth: 560, idealWidth: 760, minHeight: 320, idealHeight: 480)
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear {
            updateFocus()
        }
        .onChange(of: viewModel.presentationMode) { _ in
            updateFocus()
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text(viewModel.title)
                    .font(AppTypography.windowTitle)

                HStack(spacing: 10) {
                    if !viewModel.sourceText.isEmpty, viewModel.presentationMode != .result {
                        headerPill(title: "対象文字数 \(viewModel.sourceText.count)", systemImage: "textformat.size")
                    }

                    if let mode = viewModel.processingMode {
                        headerPill(title: modeTitle(mode), systemImage: modeSymbol(mode))
                    }
                }
            }

            Spacer()

            Button {
                coordinator.dismissPopup()
            } label: {
                Image(systemName: "xmark")
                    .font(AppTypography.closeIcon)
                    .foregroundStyle(.secondary)
                    .frame(width: 30, height: 30)
                    .background(
                        Circle()
                            .fill(Color(nsColor: .controlBackgroundColor))
                    )
            }
            .buttonStyle(.plain)
            .keyboardShortcut(.cancelAction)
        }
    }

    private var placeholderSection: some View {
        cardContainer {
            Text("待機中です")
                .font(AppTypography.callout)
                .foregroundStyle(.secondary)
        }
    }

    private var onDemandInputSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            cardContainer {
                sectionTitle("処理指示")
                editorSurface(text: $viewModel.promptText, focus: .onDemandPrompt)
                    .frame(height: 116)
            }

            actionRow(primaryTitle: "処理実行") {
                coordinator.submitOnDemandPrompt()
            }
        }
    }

    private var textGenerationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            cardContainer {
                sectionTitle("生成指示")
                editorSurface(text: $viewModel.promptText, focus: .generationPrompt)
                    .frame(minHeight: 170)
            }

            actionRow(primaryTitle: "テキスト生成") {
                coordinator.submitTextGeneration()
            }
        }
    }

    private var processingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            cardContainer {
                HStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.regular)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(isTextGenerationMode ? "テキストを生成しています..." : "LM Studio に問い合わせています...")
                            .font(AppTypography.subsectionTitle)
                        Text("ストリーミング応答を受け取り次第、ここにリアルタイム表示します。")
                            .font(AppTypography.callout)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
            }

            cardContainer {
                sectionTitle(viewModel.streamingText.isEmpty ? "応答待ち" : "ストリーミング結果")

                if !viewModel.streamingText.isEmpty {
                    scrollText(viewModel.streamingText)
                        .frame(minHeight: 220)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("応答を待っています。")
                            .font(AppTypography.label)
                        Text("モデルの初回トークン生成中は数秒かかることがあります。")
                            .font(AppTypography.callout)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(surfaceBackground)
                }
            }
        }
    }

    private var resultSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            if isTextGenerationMode {
                cardContainer {
                    sectionTitle("生成結果")
                    scrollText(viewModel.resultText)
                        .frame(minHeight: 260)
                }
            } else {
                HStack(alignment: .top, spacing: 16) {
                    cardContainer {
                        sectionTitle("元のテキスト")
                        scrollText(viewModel.sourceText)
                            .frame(minHeight: 240)
                    }

                    cardContainer {
                        sectionTitle("処理結果")
                        scrollText(viewModel.resultText)
                            .frame(minHeight: 240)
                    }
                }
            }

            actionRow(primaryTitle: isTextGenerationMode ? "カーソル位置に挿入" : "適用") {
                coordinator.applyCurrentResult()
            }
        }
    }

    private func noticeView(_ notice: InlineNotice) -> some View {
        let color: Color
        switch notice.kind {
        case .info:
            color = .blue
        case .error:
            color = .red
        case .success:
            color = .green
        }

        return HStack(spacing: 10) {
            Image(systemName: iconName(for: notice.kind))
                .font(AppTypography.label)
            Text(notice.text)
                .font(AppTypography.callout)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color(nsColor: .controlBackgroundColor))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
                )
        )
        .foregroundStyle(color)
    }

    private func cardContainer<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color(nsColor: .controlBackgroundColor))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
                )
        )
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(AppTypography.subsectionTitle)
            .foregroundStyle(.primary)
    }

    private func editorSurface(text: Binding<String>, focus: FocusField) -> some View {
        TextEditor(text: text)
            .focused($focusedField, equals: focus)
            .font(AppTypography.monoEmphasis)
            .scrollContentBackground(.hidden)
            .padding(10)
            .background(surfaceBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
            )
    }

    private func scrollText(_ text: String) -> some View {
        ScrollView {
            Text(text.isEmpty ? " " : text)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
                .font(AppTypography.monoBody)
                .padding(14)
        }
        .background(surfaceBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }

    private func actionRow(primaryTitle: String, action: @escaping () -> Void) -> some View {
        HStack {
            Spacer()

            Button("閉じる") {
                coordinator.dismissPopup()
            }
            .font(AppTypography.button)
            .buttonStyle(.bordered)
            .controlSize(.large)

            Button(primaryTitle) {
                action()
            }
            .font(AppTypography.button)
            .keyboardShortcut(.return, modifiers: [.command])
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }

    private func headerPill(title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(AppTypography.meta)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(
                Capsule(style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
    }

    private var surfaceBackground: some View {
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .fill(Color(nsColor: .textBackgroundColor))
    }

    private func modeTitle(_ mode: ProcessingMode) -> String {
        switch mode {
        case .preset:
            return "プリセット"
        case .onDemand:
            return "オンデマンド"
        case .textGeneration:
            return "生成"
        }
    }

    private func modeSymbol(_ mode: ProcessingMode) -> String {
        switch mode {
        case .preset:
            return "wand.and.stars"
        case .onDemand:
            return "slider.horizontal.below.rectangle"
        case .textGeneration:
            return "text.badge.plus"
        }
    }

    private func iconName(for kind: InlineNotice.Kind) -> String {
        switch kind {
        case .info:
            return "info.circle.fill"
        case .error:
            return "exclamationmark.triangle.fill"
        case .success:
            return "checkmark.circle.fill"
        }
    }

    private func updateFocus() {
        switch viewModel.presentationMode {
        case .onDemandInput:
            focusedField = .onDemandPrompt
        case .textGenerationInput:
            focusedField = .generationPrompt
        default:
            focusedField = nil
        }
    }
}
