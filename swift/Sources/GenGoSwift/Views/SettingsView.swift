import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel

    private var supportedLanguages: [AppLanguage] {
        AppLanguage.allCases
    }

    private var text: AppStrings {
        AppStrings(languageCode: viewModel.draft.language)
    }

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
        .onChange(of: viewModel.draft) { _ in
            viewModel.handleDraftChange()
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

                Text(text.settingsHeroSubtitle)
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
            subtitle: text.llmSectionSubtitle,
            systemImage: "cpu"
        ) {
            VStack(alignment: .leading, spacing: 18) {
                labeledField(text.providerLabel) {
                    Picker(text.providerLabel, selection: $viewModel.draft.llmProvider) {
                        ForEach(LLMProvider.allCases) { provider in
                            Text(provider.displayName).tag(provider)
                        }
                    }
                    .font(AppTypography.body)
                    .pickerStyle(.segmented)
                    .controlSize(.large)
                }

                if viewModel.draft.llmProvider.usesEndpoint {
                    labeledField(text.endpointLabel) {
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
                }

                if viewModel.draft.llmProvider.usesModelCatalog {
                    VStack(alignment: .leading, spacing: 10) {
                        labeledField(text.modelLabel) {
                            Picker(modelPickerTitle, selection: $viewModel.draft.localModelInstanceId) {
                                Text(text.autoSelectModelLabel).tag("")
                                ForEach(viewModel.localModels) { model in
                                    Text(modelLabel(model)).tag(model.id)
                                }
                            }
                            .font(AppTypography.body)
                            .labelsHidden()
                            .controlSize(.large)

                            HStack(spacing: 12) {
                                Button(viewModel.isLoadingModels ? text.loadingLabel : text.refreshButtonTitle) {
                                    Task {
                                        await viewModel.refreshLocalModels()
                                    }
                                }
                                .font(AppTypography.button)
                                .disabled(viewModel.isLoadingModels)
                                .controlSize(.large)

                                if !viewModel.localModels.isEmpty {
                                    Text(text.availableModelCount(viewModel.localModels.count))
                                        .font(AppTypography.helper)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        if viewModel.draft.llmProvider == .ollama {
                            labeledField(text.manualModelNameLabel) {
                                TextField("llama3.2", text: $viewModel.draft.localModelInstanceId)
                                    .font(AppTypography.monoBody)
                                    .textFieldStyle(.roundedBorder)
                                    .controlSize(.large)

                                Text(text.manualModelNameHelp)
                                    .font(AppTypography.helper)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } else if viewModel.draft.llmProvider.usesRemoteCredentials {
                    VStack(alignment: .leading, spacing: 18) {
                        labeledField("API Key") {
                            SecureField("sk-...", text: $viewModel.draft.apiKey)
                                .font(AppTypography.body)
                                .textFieldStyle(.roundedBorder)
                                .controlSize(.large)

                            Text(text.apiKeyHelp)
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
                } else {
                    Label(text.appleFoundationModelHelp, systemImage: viewModel.draft.llmProvider.systemImage)
                        .font(AppTypography.callout)
                        .foregroundStyle(.secondary)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(Color(nsColor: .textBackgroundColor))
                        )
                }

                labeledField("Max Tokens") {
                    HStack(spacing: 14) {
                        Stepper(value: $viewModel.draft.maxTokens, in: 128...32768, step: 128) {
                            Text(text.maxTokensStepperLabel)
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
            subtitle: text.shortcutsSectionSubtitle,
            systemImage: "command"
        ) {
            VStack(alignment: .leading, spacing: 18) {
                labeledField(text.onDemandShortcutLabel) {
                    TextField("Ctrl+Shift+1", text: $viewModel.draft.onDemandShortcutKey)
                        .font(AppTypography.monoBody)
                        .textFieldStyle(.roundedBorder)
                        .controlSize(.large)

                    Text(text.shortcutExampleHelp)
                        .font(AppTypography.helper)
                        .foregroundStyle(.secondary)
                }

                Divider()

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(text.presetsTitle)
                            .font(AppTypography.subsectionTitle)
                        Text(text.presetsHelp)
                            .font(AppTypography.helper)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button(text.addPresetButtonTitle) {
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
            subtitle: text.behaviorSectionSubtitle,
            systemImage: "slider.horizontal.3"
        ) {
            VStack(alignment: .leading, spacing: 18) {
                Toggle(text.autoApplyAndCloseLabel, isOn: $viewModel.draft.autoApplyAndClose)
                    .font(AppTypography.body)
                    .toggleStyle(.switch)

                labeledField(text.uiLanguageLabel) {
                    Picker(text.uiLanguageLabel, selection: $viewModel.draft.language) {
                        ForEach(supportedLanguages, id: \.code) { language in
                            Text(language.displayName).tag(language.code)
                        }
                    }
                    .font(AppTypography.body)
                    .pickerStyle(.menu)
                    .controlSize(.large)

                    Text(text.uiLanguageHelp)
                        .font(AppTypography.helper)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var footerBar: some View {
        HStack(alignment: .center, spacing: 14) {
            footerStatus

            Spacer(minLength: 12)

            Button(text.resetButtonTitle) {
                viewModel.reset()
            }
            .font(AppTypography.button)
            .controlSize(.large)

            Button(text.testConnectionButtonTitle) {
                Task {
                    await viewModel.testConnection()
                }
            }
            .font(AppTypography.button)
            .controlSize(.large)

            Button(viewModel.canSaveTestedConnection ? text.saveAndActivateButtonTitle : text.saveButtonTitle) {
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

    private var footerStatus: some View {
        VStack(alignment: .leading, spacing: 8) {
            if viewModel.hasUnsavedChanges {
                Label(text.unsavedChangesTitle, systemImage: "exclamationmark.circle.fill")
                    .font(AppTypography.callout)
                    .foregroundStyle(.orange)
            }

            if let notice = viewModel.notice {
                noticeView(notice)
            } else {
                Text(viewModel.hasUnsavedChanges ? text.unsavedChangesHelp : text.footerHelp)
                    .font(AppTypography.callout)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func presetCard(preset: Binding<PresetPrompt>) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Toggle(text.enabledLabel, isOn: preset.enabled)
                    .font(AppTypography.body)
                    .toggleStyle(.switch)

                Spacer()

                Button(text.deleteButtonTitle, role: .destructive) {
                    viewModel.removePresetPrompt(id: preset.wrappedValue.id)
                }
                .font(AppTypography.button)
                .controlSize(.regular)
            }

            labeledField(text.shortcutLabel) {
                TextField("Ctrl+1", text: preset.shortcutKey)
                    .font(AppTypography.monoBody)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.large)
            }

            labeledField(text.promptLabel) {
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
        text.endpointHelpText(for: viewModel.draft.llmProvider)
    }

    private var modelPickerTitle: String {
        text.modelPickerTitle(for: viewModel.draft.llmProvider)
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
