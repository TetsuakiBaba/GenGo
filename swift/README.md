# GenGo for macOS

`./swift/` 配下には Swift 版の macOS アプリプロジェクトを置いています。Electron 版は `../electron/`、共有アイコンは `../icons/` にあります。

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

Apple Intelligence / Apple Foundation Models provider を含めるため、workflow は `macos-26` runner 上で macOS 26 SDK を使ってビルドします。SDK が古い場合は、Apple Intelligence なしの Release を黙って作らないようにビルドを失敗させます。

必要な GitHub Secrets:

- `MACOS_CERTIFICATE_P12_BASE64`
- `MACOS_CERTIFICATE_PASSWORD`
- `MACOS_KEYCHAIN_PASSWORD`
- `MACOS_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

Secret の意味:

- `MACOS_CERTIFICATE_P12_BASE64`: `Developer ID Application` 証明書を秘密鍵つきで export した `.p12` を base64 化した値
- `MACOS_CERTIFICATE_PASSWORD`: `.p12` export 時に設定したパスワード
- `MACOS_KEYCHAIN_PASSWORD`: GitHub Actions ランナー内で一時 keychain を作るための任意のパスワード
- `MACOS_SIGNING_IDENTITY`: 例 `Developer ID Application: TETSUAKI BABA (ZE8M4T49DP)`
- `APPLE_ID`: notarization に使う Apple ID
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `APPLE_APP_SPECIFIC_PASSWORD`: notarization 用の app-specific password

`MACOS_CERTIFICATE_PASSWORD` は Apple ID のパスワードではなく、`.p12` を export したときのパスワードです。

`.p12` は `Keychain Access` の `My Certificates` から、`Developer ID Application` 証明書とその private key を含んだ状態で export してください。証明書だけを export すると GitHub Actions 側で `0 valid identities found` になります。

#### Secrets を準備する

ローカルで `.p12` を base64 化する例:

```bash
base64 < /path/to/developer-id-application.p12 | pbcopy
```

これを GitHub の `Settings` -> `Secrets and variables` -> `Actions` に登録します。

#### まず手動で workflow を試す

最初は `Actions` タブから `Swift macOS Release` を `Run workflow` で実行するのがおすすめです。

- `workflow_dispatch` 実行では workflow artifact は作られます
- draft GitHub Release は作られません
- notarization と signing が通るかを先に確認する用途です

#### GitHub Release を作るまでの git コマンド

Swift 側の変更と workflow を含む commit を先に push してから、タグを打ちます。

```bash
cd /path/to/GenGo

git status
git add swift .github
git commit -m "Prepare Swift macOS release"
git push origin main
```

その後、現在の `main` の commit に対して Swift 用タグを付けて push します。

```bash
cd /path/to/GenGo

git tag swift-v0.10.2
git push origin swift-v0.10.2
```

これで `push.tags: swift-v*` がトリガーされ、workflow が draft release を作成します。

#### タグ運用の注意

- タグは `swift/` ディレクトリ単体ではなく、リポジトリ全体の commit に付きます
- 既存の `swift-v0.10.1` が古い commit を指している場合は、そのままでは最新の Swift workflow は走りません
- すでに公開していない限り retag もできますが、通常は `swift-v0.10.2` のように次の番号を使う方が安全です

#### Actions で失敗したときの確認

- `Validate signing identity` で `0 valid identities found` の場合は、`.p12` に private key が入っていないか、`MACOS_CERTIFICATE_PASSWORD` が誤っています
- `The specified item could not be found in the keychain.` の場合は、署名 identity 名か keychain import の問題であることが多いです
- `No Keychain password item found for profile` の場合は、`NOTARYTOOL_PROFILE` 名の typo か、`store-credentials` 未実行です

ローカルで `.p12` が正しいか確認する例:

```bash
P12_PATH="/path/to/developer-id-application.p12"
P12_PASSWORD="p12-export-password"
TMP_KEYCHAIN="$HOME/tmp-gengo-signing.keychain-db"
TMP_KEYCHAIN_PASSWORD="temporary-keychain-password"

security delete-keychain "$TMP_KEYCHAIN" 2>/dev/null || true
security create-keychain -p "$TMP_KEYCHAIN_PASSWORD" "$TMP_KEYCHAIN"
security unlock-keychain -p "$TMP_KEYCHAIN_PASSWORD" "$TMP_KEYCHAIN"
security import "$P12_PATH" \
  -k "$TMP_KEYCHAIN" \
  -P "$P12_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security
security set-key-partition-list \
  -S apple-tool:,apple: \
  -s \
  -k "$TMP_KEYCHAIN_PASSWORD" \
  "$TMP_KEYCHAIN"
security find-identity -v -p codesigning "$TMP_KEYCHAIN"
```

ここで `1 valid identities found` 以上が出れば、GitHub Actions に渡す `.p12` として妥当です。

## 注意点

- 選択テキストの取得と貼り戻しには macOS のアクセシビリティ権限が必要です
- 設定ファイルは Electron 版とは分離され、`Application Support/GenGo/settings.json` に保存されます
- 初回起動時は Gatekeeper と notarization の状態によって確認ダイアログが表示されることがあります
- 既定では LM Studio のエンドポイント `http://127.0.0.1:1234` を使用します
- `.app` bundle では App Transport Security が有効になるため、ローカル LM Studio へ接続するための `NSAllowsLocalNetworking` を `Info.plist` に含めています
