# GenGo for macOS

`./swift/` 配下には、既存の Electron 実装に触れずに追加した Swift 版の移植プロジェクトを置いています。

## 目的

- LM Studio にロード済みのローカルモデルを使ってテキスト処理する
- メニューバー常駐アプリとして動作する
- グローバルショートカットから選択テキストを取得し、その場で置換する
- プリセットプロンプト、オンデマンドプロンプト、テキスト生成モードを持つ

## 構成

- `Package.swift`: Swift Package Manager 定義
- `Sources/GenGoSwift/App`: アプリ起動、ウィンドウ、全体調停
- `Sources/GenGoSwift/Services`: LM Studio 通信、設定保存、ショートカット、選択テキスト操作
- `Sources/GenGoSwift/ViewModels`: ポップアップと設定画面の状態管理
- `Sources/GenGoSwift/Views`: SwiftUI ベースの UI

## 起動方法

```bash
cd swift
swift build
swift run GenGoSwift
```

## GitHub Releases 向け配布

Swift 版は Mac App Store ではなく、`Developer ID` 署名と notarization を付けた `.dmg` / `.zip` を GitHub Releases に公開する前提で整えています。

### ローカルで配布物を作る

```bash
cd swift
chmod +x scripts/package-macos-app.sh scripts/release-macos.sh
SIGN_IDENTITY="Developer ID Application: TETSUAKI BABA (ZE8M4T49DP)" \
NOTARIZE_TARGET=none \
scripts/release-macos.sh
```

これで `swift/dist/` に次の成果物が作成されます。

- `GenGo.app`
- `GenGo-<version>-macos-<arch>.zip`
- `GenGo-<version>-macos-<arch>.dmg`
- `GenGo-<version>-macos-<arch>-sha256.txt`

### notarization を付ける

`notarytool` は次のどちらかで認証できます。

- `NOTARYTOOL_PROFILE`
- `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_SPECIFIC_PASSWORD`

例:

```bash
cd swift
SIGN_IDENTITY="Developer ID Application: TETSUAKI BABA (ZE8M4T49DP)" \
APPLE_ID="your-apple-id@example.com" \
APPLE_TEAM_ID="ZE8M4T49DP" \
APPLE_APP_SPECIFIC_PASSWORD="app-specific-password" \
NOTARIZE_TARGET=both \
scripts/release-macos.sh
```

`NOTARIZE_TARGET=zip` で `.app` を stapled 状態にし、`NOTARIZE_TARGET=dmg` で `.dmg` を stapled 状態にします。通常は `both` で問題ありません。

### GitHub Actions で自動公開する

`.github/workflows/swift-release.yml` を追加してあり、`swift-v0.10.1` のようなタグを push すると、署名済みの成果物を作って draft release に添付します。

必要な GitHub Secrets:

- `MACOS_CERTIFICATE_P12_BASE64`
- `MACOS_CERTIFICATE_PASSWORD`
- `MACOS_KEYCHAIN_PASSWORD`
- `MACOS_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

`MACOS_CERTIFICATE_P12_BASE64` は `Developer ID Application` の `.p12` を base64 化した値です。

## 注意点

- 選択テキストの取得と貼り戻しには macOS のアクセシビリティ権限が必要です
- 設定ファイルは Electron 版とは分離され、`Application Support/GenGo/settings.json` に保存されます
- 初回起動時は Gatekeeper と notarization の状態によって確認ダイアログが表示されることがあります
- 既定では LM Studio のエンドポイント `http://127.0.0.1:1234` を使用します
- `.app` bundle では App Transport Security が有効になるため、ローカル LM Studio へ接続するための `NSAllowsLocalNetworking` を `Info.plist` に含めています
