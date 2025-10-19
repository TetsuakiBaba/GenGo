# GenGo

![GenGo Logo](./icons/original.png)

**GenGo** is an AI-powered text processing tool that brings the power of Large Language Models (LLMs) to your fingertips. Process text instantly with customizable shortcuts, supporting both local and remote LLM providers.

[![Version](https://img.shields.io/badge/version-0.8.1-blue.svg)](https://github.com/TetsuakiBaba/GenGo/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://github.com/TetsuakiBaba/GenGo/releases)

## ✨ Features

### 🤖 Dual LLM Support
- **Local LLMs**: LM Studio
- **Remote LLMs**: OpenAI (GPT-4o, GPT-4o-mini), and other OpenAI-compatible APIs
- Seamless switching between providers

### 🌍 Smart Translation
- Automatic language detection
- Bidirectional translation between 10+ languages
- Natural and readable translations

### ⌨️ Global Shortcuts
- Customizable keyboard shortcuts
- Process selected text from any application
- Quick access to custom prompts

### 🎨 Custom Prompts
- Create and save custom processing templates
- Text proofreading, summarization, style conversion
- On-demand prompt execution

### 🔒 Privacy First
- Use local LLMs for complete offline operation
- No data sent externally when using local models
- Full control over your data

### 🌐 Multilingual UI
- Japanese and English support
- Easy language switching
- Localized interface

## 📦 Installation

### Download Pre-built Binaries

Download the latest release for your platform:
- [macOS (DMG)](https://github.com/TetsuakiBaba/GenGo/releases)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/TetsuakiBaba/GenGo.git
cd GenGo

# Install dependencies
npm install

# Run in development mode
npm start

# Build for your platform
npm run make
```

## 🚀 Quick Start

### 1. Setup LLM Provider

#### Option A: Local LLM (Recommended for Privacy)
1. Install [LM Studio](https://lmstudio.ai/)
2. Start your local LLM server
3. Open GenGo settings panel (from menu bar icon)
4. Select "Local" as LLM provider
5. Set the endpoint URL (default: `http://localhost:1234/v1`)

#### Option B: Remote LLM (OpenAI or compatible APIs)
1. Obtain an API key from [OpenAI](https://platform.openai.com/) or your LLM provider
2. Open GenGo settings panel (from menu bar icon)
3. Select "Remote" as LLM provider
4. Enter your API endpoint URL
5. Enter your API key
6. Select your preferred model (e.g., gpt-4o-mini)

### 2. Configure Settings

Open GenGo settings panel (from menu bar icon) to customize:
- **LLM Provider**: Choose between Local or Remote LLM
- **LLM Endpoint**: Set the API endpoint URL
- **API Key**: Enter your API key (for remote providers only)
- **Model Name**: Specify the model to use (for remote providers only)
- **Translation Languages**: Primary and secondary languages for translation
- **Shortcuts**: Global keyboard shortcuts (default: Ctrl+1, Ctrl+2)
- **Custom Prompts**: Add your own text processing prompts
- **Max Tokens**: Set maximum token limit (256-32768, default: 4096)

### 3. Use GenGo

1. Select text in any application
2. Press your configured shortcut:
   - **Ctrl+1**: Smart Translation
   - **Ctrl+2**: Text Correction
3. Review the processed result in the popup window
4. Click to copy the result or close the window

## ⚙️ Configuration

### LLM Settings

All LLM settings are configured through the **Settings Panel** (accessible from the menu bar icon):

**Local LLM Configuration:**
- Provider: Select "Local"
- Endpoint URL: `http://localhost:1234/v1` (LM Studio default)
- Max Tokens: 4096 (adjustable: 256-32768)

**Remote LLM Configuration:**
- Provider: Select "Remote"
- Endpoint URL: `https://api.openai.com/v1` (or your provider's base URL)
- API Key: Your API key
- Model Name: `gpt-4o-mini` (or your preferred model)
- Max Tokens: 4096 (adjustable: 256-32768)

### Keyboard Shortcuts

| Shortcut | Default | Action |
|----------|---------|--------|
| Shortcut 1 | Ctrl+1 (Cmd+1 on macOS) | Smart Translation |
| Shortcut 2 | Ctrl+2 (Cmd+2 on macOS) | Text Correction |

*Shortcuts can be customized in the Settings Panel*

## 🏗️ Architecture

GenGo is built with:
- **Electron**: Desktop application framework for macOS
- **Node.js**: Backend processing and LLM communication
- **Modern JavaScript**: ES6+ with module support
- **i18next**: Internationalization support
- **Bootstrap**: Responsive UI components

### Project Structure

```
GenGo/
├── main.js                 # Main Electron process
├── renderer.js             # Renderer process for main UI
├── preload.js              # Preload script for IPC
├── simple-llm-engine.js    # LLM communication layer
├── i18n.js                 # Internationalization setup
├── settings.html           # Settings UI
├── settings-preload.js     # Settings preload script
├── popup-ui.html           # Result popup UI
├── popup-preload.js        # Popup preload script
├── icons/                  # Application icons
├── locales/                # Translation files
│   ├── en/
│   │   └── translation.json
│   └── ja/
│       └── translation.json
└── docs/                   # Documentation website
    ├── index.html
    ├── style.css
    ├── script.js
    └── i18n.js
```

## 🔧 API Integration

### Supported LLM Providers

#### Local
- **LM Studio**: `http://localhost:1234/v1`

#### Remote
- **OpenAI**: `https://api.openai.com/v1`
- **Custom Endpoints**: Any OpenAI-compatible API base URL

*Note: `/chat/completions` is automatically appended to the endpoint URL*

### Example API Call

```javascript
// endpoint is automatically appended with /chat/completions
const fullEndpoint = `${endpoint}/chat/completions`;

const response = await fetch(fullEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}` // Only for remote
  },
  body: JSON.stringify({
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ],
    max_tokens: maxTokens,
    temperature: 0.7
  })
});
```

## 🌐 Internationalization

GenGo supports multiple languages through i18next:

- Japanese (ja)
- English (en)

To add a new language:
1. Create a new folder in `locales/` (e.g., `locales/fr/`)
2. Add `translation.json` with translated strings
3. Update `i18n.js` to include the new language

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Tetsuaki Baba**

- GitHub: [@TetsuakiBaba](https://github.com/TetsuakiBaba)
- Website: [GenGo Documentation](https://tetsuakibaba.github.io/GenGo/)

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Framework for building desktop apps
- [OpenAI](https://openai.com/) - GPT models
- [LM Studio](https://lmstudio.ai/) - Local LLM interface
- [Bootstrap](https://getbootstrap.com/) - UI components
- [i18next](https://www.i18next.com/) - Internationalization framework

## 📊 Changelog

### Version 0.8.1
- Added dual LLM support (local and remote)
- Implemented user-configurable API settings
- Added max tokens configuration
- Enhanced translation features
- Improved UI/UX with multilingual support
- Created documentation website

### Previous Versions
See [CHANGELOG.md](CHANGELOG.md) for full version history.

## 🐛 Known Issues

- macOS Gatekeeper may require manual approval on first launch (Right-click → Open)

## 🔮 Roadmap

- [ ] Windows version support
- [ ] Ollama local LLM support
- [ ] Support for more LLM providers (Gemini, Claude, etc.)
- [ ] Plugin system for custom processors
- [ ] Cloud sync for settings and prompts
- [ ] Voice input support
- [ ] Batch processing mode
- [ ] Chrome/Firefox browser extension

## 📞 Support

If you encounter any issues or have questions:
- [Open an issue](https://github.com/TetsuakiBaba/GenGo/issues)
- [Check documentation](https://tetsuakibaba.github.io/GenGo/)
- [View releases](https://github.com/TetsuakiBaba/GenGo/releases)

---

Made with ❤️ by [Tetsuaki Baba](https://github.com/TetsuakiBaba)
