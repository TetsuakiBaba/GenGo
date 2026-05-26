# GenGo

![GenGo Logo](./icons/newicon.png)

**GenGo** is a native macOS app for processing selected text with Large Language Models. It lives in the menu bar, watches global shortcuts, and lets you translate, proofread, rewrite, or generate text without leaving the app you are working in.

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FTetsuakiBaba%2FGenGo%2Fmain%2Fdocs%2Fversion.json&query=%24.version&label=version&color=blue)](https://github.com/TetsuakiBaba/GenGo/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://github.com/TetsuakiBaba/GenGo/releases)
[![Swift](https://img.shields.io/badge/main-Swift-orange.svg)](./swift)

## Status

GenGo is now developed and supported as a **Swift / SwiftUI macOS application**.

The older Electron implementation remains in `electron/` for historical reference only. It is not the supported application, and new fixes or features should target the Swift app under `swift/`.

The project version is defined in one place: [docs/version.json](./docs/version.json). The README badge, documentation site, and Swift release scripts read from that file.

## Features

### Native macOS App

- Menu bar app built with Swift and SwiftUI
- Global shortcuts for preset prompts and on-demand prompts
- Selected text capture and in-place replacement
- macOS accessibility integration for copy and paste workflows

### LLM Providers

- **LM Studio**: choose from models loaded in LM Studio
- **Ollama**: choose local or cloud models from the Ollama catalog
- **Apple Intelligence**: available on supported macOS versions
- **OpenAI-compatible APIs**: use a remote endpoint and API key when needed

### Prompt Workflows

- Preset prompts with custom shortcuts
- On-demand prompt mode
- Text generation mode when no text is selected
- Default preset for Japanese / English translation
- Up to 5 preset prompts

### Privacy Options

- Use LM Studio, Ollama, or Apple Intelligence for local-first workflows
- Use remote OpenAI-compatible providers only when explicitly configured
- Settings are stored locally in Application Support

## Installation

Download the latest macOS release from:

[https://github.com/TetsuakiBaba/GenGo/releases](https://github.com/TetsuakiBaba/GenGo/releases)

On first launch, macOS may ask for confirmation because the app was downloaded from the internet. GenGo also needs Accessibility permission so it can read selected text and paste the processed result back into the active app.

## Quick Start

### 1. Install an LLM Provider

Choose one provider:

**Ollama**

1. Install [Ollama](https://ollama.com/download).
2. Create an account from [https://ollama.com/](https://ollama.com/).
3. Sign in from the Ollama app Settings.
4. Make sure Cloud is enabled if you want to use Ollama cloud models.

**LM Studio**

1. Install [LM Studio](https://lmstudio.ai/).
2. Download a model from Discover or search.
3. Load the model in LM Studio and start the local server.

### 2. Configure GenGo

Open GenGo from the menu bar and choose **Settings**.

- Select the LLM provider.
- Select a model from the available model list.
- Click the connection test button.
- Save after the connection succeeds.

### 3. Use the Default Shortcut

1. Select text in any macOS application.
2. Press `Ctrl+1`.
3. Japanese text is translated into English, and English text is translated into Japanese.
4. Click **Apply** or press `Command+Enter` to replace the selected text.

If you press a shortcut without selecting text, GenGo opens text generation mode.

## Default Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+1` | Default Japanese / English translation preset |
| `Ctrl+0` | On-demand prompt / text generation |

Shortcuts can be changed in the Settings panel.

## Build from Source

Requirements:

- macOS
- Xcode command line tools
- Swift Package Manager

Run the Swift app locally:

```bash
git clone https://github.com/TetsuakiBaba/GenGo.git
cd GenGo/swift
swift build
swift run GenGoSwift
```

## Release Build

Swift release packaging scripts live under `swift/scripts/`.

Create local release artifacts:

```bash
cd swift
chmod +x scripts/package-macos-app.sh scripts/release-macos.sh
SIGN_IDENTITY="Developer ID Application: YOUR NAME (TEAMID)" \
NOTARIZE_TARGET=none \
scripts/release-macos.sh
```

Artifacts are written to `swift/dist/`:

- `GenGo.app`
- `GenGo-<version>-macos-<arch>.zip`
- `GenGo-<version>-macos-<arch>.dmg`
- SHA-256 checksum text files

For notarized releases and GitHub Actions setup, see [swift/README.md](./swift/README.md).

## Project Structure

```text
GenGo/
├── swift/                  # Supported Swift / SwiftUI macOS app
│   ├── Package.swift
│   ├── Sources/GenGoSwift/
│   └── scripts/
├── docs/                   # Documentation website / GitHub Pages
├── icons/                  # Shared application icons
├── electron/               # Legacy Electron implementation, unsupported
└── README.md
```

## Configuration Files

The Swift app stores settings in:

```text
~/Library/Application Support/GenGo/settings.json
```

Older `GenGoSwift` settings are migrated when possible. Electron settings are separate and are not the supported configuration path.

## Documentation

- Website: [https://tetsuakibaba.github.io/GenGo/](https://tetsuakibaba.github.io/GenGo/)
- Swift app notes: [swift/README.md](./swift/README.md)
- Releases: [GitHub Releases](https://github.com/TetsuakiBaba/GenGo/releases)

## Contributing

Contributions are welcome. Please target the Swift macOS app unless a change is explicitly about archived Electron code or documentation cleanup.

1. Fork the repository.
2. Create a feature branch.
3. Make changes under `swift/`, `docs/`, or shared assets as appropriate.
4. Run the relevant Swift build or documentation checks.
5. Open a pull request.

## Support

If you encounter a problem:

- Open an issue: [GitHub Issues](https://github.com/TetsuakiBaba/GenGo/issues)
- Check the docs: [GenGo Documentation](https://tetsuakibaba.github.io/GenGo/)
- View releases: [GitHub Releases](https://github.com/TetsuakiBaba/GenGo/releases)

Electron-specific issues are not currently supported.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

**Tetsuaki Baba**

- GitHub: [@TetsuakiBaba](https://github.com/TetsuakiBaba)
- Website: [GenGo Documentation](https://tetsuakibaba.github.io/GenGo/)
