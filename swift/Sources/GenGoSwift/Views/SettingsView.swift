import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel

    private let supportedLanguages: [(code: String, label: String)] = [
        ("ja", "日本語"),
        ("en", "English")
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    heroCard
                    llmSection
                    shortcutSection
                    behaviorSection
                }
                .padding(24)
            }
            .background(Color(nsColor: .windowBackgroundColor))

            Divider()

            footerBar
        }
        .font(AppTypography.body)
        .frame(minWidth: 820, minHeight: 760)
        .task {
            viewModel.handleAppear()
        }
        .onChange(of: viewModel.draft.llmProvider) { _ in
            viewModel.handleProviderChange()
        }
    }

    private var heroCard: some View {
        HStack(alignment: .top, spacing: 18) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
                    )
                    .frame(width: 68, height: 68)

                Image(systemName: "sparkles.rectangle.stack")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(Color.accentColor)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("GenGo")
                    .font(AppTypography.heroTitle)

                Text("ショートカット処理と LLM 接続を macOS ネイティブに整える設定画面です。")
                    .font(AppTypography.callout)
                    .foregroundStyle(.secondary)

                HStack(spacing: 10) {
                    statusPill(
                        title: viewModel.draft.llmProvider.displayName,
                        systemImage: viewModel.draft.llmProvider.systemImage
                    )
                    statusPill(
                        title: "Max \(viewModel.draft.maxTokens)",
                        systemImage: "text.badge.checkmark"
                    )
                }
            }

            Spacer()
        }
        .padding(24)
        .background(cardBackground)
    }

    private var llmSection: some View {
        settingsCard(
            title: "LLM",
            subtitle: "LM Studio、Ollama、OpenAI 互換 API のどれでも同じ操作感で使えるように整えます。",
            systemImage: "cpu"
        ) {
            VStack(alignment: .leading, spacing: 18) {
                labeledField("Provider") {
                    Picker("Provider", selection: $viewModel.draft.llmProvider) {
                        ForEach(LLMProvider.allCases) { provider in
                            Text(provider.displayName).tag(provider)
                        }
                    }
                    .font(AppTypography.body)
                    .pickerStyle(.segmented)
                    .controlSize(.large)
                }

                labeledField("Endpoint") {
                    TextField(
                        endpointPlaceholder,
                        text: $viewModel.draft.llmEndpoint
                    )
                    .font(AppTypography.body)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.large)

                    Text(endpointHelpText)
                    .font(AppTypography.helper)
                    .foregroundStyle(.secondary)
                }

                if viewModel.draft.llmProvider.usesModelCatalog {
                    VStack(alignment: .leading, spacing: 10) {
                        labeledField("モデル") {
                            Picker(modelPickerTitle, selection: $viewModel.draft.localModelInstanceId) {
                                Text("自動選択").tag("")
                                ForEach(viewModel.localModels) { model in
                                    Text(modelLabel(model)).tag(model.id)
                                }
                            }
                            .font(AppTypography.body)
                            .labelsHidden()
                            .controlSize(.large)

                            HStack(spacing: 12) {
                                Button(viewModel.isLoadingModels ? "読込中..." : "更新") {
                                    Task {
                                        await viewModel.refreshLocalModels()
                                    }
                                }
                                .font(AppTypography.button)
                                .disabled(viewModel.isLoadingModels)
                                .controlSize(.large)

                                if !viewModel.localModels.isEmpty {
                                    Text("\(viewModel.localModels.count) 件のモデルを利用可能")
                                        .font(AppTypography.helper)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        if viewModel.draft.llmProvider == .ollama {
                            labeledField("モデル名を直接指定") {
                                TextField("llama3.2", text: $viewModel.draft.localModelInstanceId)
                                    .font(AppTypography.monoBody)
                                    .textFieldStyle(.roundedBorder)
                                    .controlSize(.large)

                                Text("一覧にないモデル名も指定できます。ローカルモデルは `ollama pull <model>` の後に更新すると一覧へ表示されます。")
                                    .font(AppTypography.helper)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } else {
                    VStack(alignment: .leading, spacing: 18) {
                        labeledField("API Key") {
                            SecureField("sk-...", text: $viewModel.draft.apiKey)
                                .font(AppTypography.body)
                                .textFieldStyle(.roundedBorder)
                                .controlSize(.large)

                            Text("OpenAI 互換 API で認証が必要な場合のみ設定します。")
                                .font(AppTypography.helper)
                                .foregroundStyle(.secondary)
                        }

                        labeledField("Model Name") {
                            TextField("gpt-4o-mini", text: $viewModel.draft.modelName)
                                .font(AppTypography.body)
                                .textFieldStyle(.roundedBorder)
                                .controlSize(.large)
                        }
                    }
                }

                labeledField("Max Tokens") {
                    HStack(spacing: 14) {
                        Stepper(value: $viewModel.draft.maxTokens, in: 128...32768, step: 128) {
                            Text("出力上限を調整")
                                .font(AppTypography.body)
                        }
                        .controlSize(.large)

                        Spacer()

                        Text("\(viewModel.draft.maxTokens)")
                            .font(AppTypography.monoBody)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var shortcutSection: some View {
        settingsCard(
            title: "Shortcuts",
            subtitle: "プリセットとオンデマンドの両方をグローバルショートカットで呼び出せます。",
            systemImage: "command"
        ) {
            VStack(alignment: .leading, spacing: 18) {
                labeledField("オンデマンド実行") {
                    TextField("Ctrl+Shift+1", text: $viewModel.draft.onDemandShortcutKey)
                        .font(AppTypography.monoBody)
                        .textFieldStyle(.roundedBorder)
                        .controlSize(.large)

                    Text("例: `Ctrl+Shift+1`, `Cmd+1`, `Alt+Space`")
                        .font(AppTypography.helper)
                        .foregroundStyle(.secondary)
                }

                Divider()

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("プリセット")
                            .font(AppTypography.subsectionTitle)
                        Text("最大 5 件まで。保存時に重複とショートカット形式を検証します。")
                            .font(AppTypography.helper)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("プリセットを追加") {
                        viewModel.addPresetPrompt()
                    }
                    .font(AppTypography.button)
                    .disabled(!viewModel.canAddPreset)
                    .controlSize(.large)
                }

                ForEach($viewModel.draft.presetPrompts) { $preset in
                    presetCard(preset: $preset)
                }
            }
        }
    }

    private var behaviorSection: some View {
        settingsCard(
            title: "Behavior",
            subtitle: "Apple らしい最小限の操作で流れるように使えるよう、挙動まわりをまとめています。",
            systemImage: "slider.horizontal.3"
        ) {
            VStack(alignment: .leading, spacing: 18) {
                Toggle("プリセット実行後に自動で適用して閉じる", isOn: $viewModel.draft.autoApplyAndClose)
                    .font(AppTypography.body)
                    .toggleStyle(.switch)

                labeledField("UI Language") {
                    Picker("UI Language", selection: $viewModel.draft.language) {
                        ForEach(supportedLanguages, id: \.code) { language in
                            Text(language.label).tag(language.code)
                        }
                    }
                    .font(AppTypography.body)
                    .pickerStyle(.menu)
                    .controlSize(.large)

                    Text("現状の Swift 版では日本語 / English の設定値を保持します。")
                        .font(AppTypography.helper)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var footerBar: some View {
        HStack(alignment: .center, spacing: 14) {
            if let notice = viewModel.notice {
                noticeView(notice)
            } else {
                Text("変更は保存後にショートカット登録へ反映されます。")
                    .font(AppTypography.callout)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 12)

            Button("デフォルトに戻す") {
                viewModel.reset()
            }
            .font(AppTypography.button)
            .controlSize(.large)

            Button("接続テスト") {
                Task {
                    await viewModel.testConnection()
                }
            }
            .font(AppTypography.button)
            .controlSize(.large)

            Button("保存") {
                viewModel.save()
            }
            .font(AppTypography.button)
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private func presetCard(preset: Binding<PresetPrompt>) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Toggle("有効", isOn: preset.enabled)
                    .font(AppTypography.body)
                    .toggleStyle(.switch)

                Spacer()

                Button("削除", role: .destructive) {
                    viewModel.removePresetPrompt(id: preset.wrappedValue.id)
                }
                .font(AppTypography.button)
                .controlSize(.regular)
            }

            labeledField("ショートカット") {
                TextField("Ctrl+1", text: preset.shortcutKey)
                    .font(AppTypography.monoBody)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.large)
            }

            labeledField("プロンプト") {
                TextEditor(text: preset.prompt)
                    .font(AppTypography.monoBody)
                    .frame(minHeight: 110)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Color(nsColor: .textBackgroundColor))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
                    )
            }
        }
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

    private func settingsCard<Content: View>(
        title: String,
        subtitle: String,
        systemImage: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: systemImage)
                    .font(AppTypography.subsectionTitle)
                    .foregroundStyle(Color.accentColor)
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(AppTypography.sectionTitle)
                    Text(subtitle)
                        .font(AppTypography.callout)
                        .foregroundStyle(.secondary)
                }
            }

            content()
        }
        .padding(22)
        .background(cardBackground)
    }

    private func labeledField<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(AppTypography.label)
                .foregroundStyle(.secondary)
            content()
        }
    }

    private func statusPill(title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(AppTypography.meta)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(
                Capsule(style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
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

    private var endpointPlaceholder: String {
        viewModel.draft.llmProvider.defaultEndpoint
    }

    private var endpointHelpText: String {
        switch viewModel.draft.llmProvider {
        case .local:
            return "LM Studio のベース URL を指定します。API パスは自動で補完されます。"
        case .ollama:
            return "Ollama のベース URL を指定します。`/api/chat` と `/api/tags` は自動で補完されます。"
        case .remote:
            return "OpenAI 互換 API のベース URL を指定します。`/chat/completions` は自動で補完されます。"
        }
    }

    private var modelPickerTitle: String {
        switch viewModel.draft.llmProvider {
        case .local:
            return "LM Studio モデル"
        case .ollama:
            return "Ollama モデル"
        case .remote:
            return "モデル"
        }
    }

    private func modelLabel(_ model: LocalModelInstance) -> String {
        if viewModel.draft.llmProvider == .ollama {
            return model.displayName
        }

        return model.displayName == model.id ? model.id : "\(model.displayName) (\(model.id))"
    }

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(Color(nsColor: .controlBackgroundColor))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
            )
    }
}
