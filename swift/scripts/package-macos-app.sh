#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SWIFT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SWIFT_DIR}/.." && pwd)"

APP_NAME="${APP_NAME:-GenGo}"
PRODUCT_NAME="${PRODUCT_NAME:-GenGoSwift}"
BUNDLE_EXECUTABLE_NAME="${BUNDLE_EXECUTABLE_NAME:-${APP_NAME}}"
BUNDLE_IDENTIFIER="${BUNDLE_IDENTIFIER:-io.github.tetsuakibaba.gengo.swift}"
APP_CATEGORY="${APP_CATEGORY:-public.app-category.utilities}"
MIN_SYSTEM_VERSION="${MIN_SYSTEM_VERSION:-13.0}"
BUILD_CONFIGURATION="${BUILD_CONFIGURATION:-release}"
BUILD_ARCHS="${BUILD_ARCHS:-$(uname -m)}"
ICON_SOURCE="${ICON_SOURCE:-${REPO_ROOT}/icons/icon.icns}"
TRAY_ICON_SOURCE="${TRAY_ICON_SOURCE:-${REPO_ROOT}/icons/newicon.png}"
DIST_DIR="${DIST_DIR:-${SWIFT_DIR}/dist}"
APP_DIR="${APP_DIR:-${DIST_DIR}/${APP_NAME}.app}"
SPARKLE_FEED_URL="${SPARKLE_FEED_URL:-}"
SPARKLE_PUBLIC_ED_KEY="${SPARKLE_PUBLIC_ED_KEY:-}"
SPARKLE_FRAMEWORK_SOURCE="${SPARKLE_FRAMEWORK_SOURCE:-}"

if [[ -f "${REPO_ROOT}/package.json" ]]; then
    DEFAULT_VERSION="$(/usr/bin/plutil -extract version raw -o - "${REPO_ROOT}/package.json" 2>/dev/null || true)"
else
    DEFAULT_VERSION=""
fi

BUILD_VERSION="${BUILD_VERSION:-${DEFAULT_VERSION:-0.1.0}}"
SHORT_VERSION="${SHORT_VERSION:-${BUILD_VERSION}}"

read -r -a BUILD_ARCH_ARRAY <<< "${BUILD_ARCHS}"

BUILD_CMD=(swift build -c "${BUILD_CONFIGURATION}")
SHOW_BIN_CMD=(swift build -c "${BUILD_CONFIGURATION}" --show-bin-path)

for arch in "${BUILD_ARCH_ARRAY[@]}"; do
    BUILD_CMD+=(--arch "${arch}")
    SHOW_BIN_CMD+=(--arch "${arch}")
done

echo "Building ${PRODUCT_NAME} (${BUILD_ARCHS})..."
(
    cd "${SWIFT_DIR}"
    "${BUILD_CMD[@]}"
)

BIN_PATH="$(
    cd "${SWIFT_DIR}"
    "${SHOW_BIN_CMD[@]}"
)"
EXECUTABLE_SOURCE="${BIN_PATH}/${PRODUCT_NAME}"
EXECUTABLE_DESTINATION="${APP_DIR}/Contents/MacOS/${BUNDLE_EXECUTABLE_NAME}"
INFO_PLIST_PATH="${APP_DIR}/Contents/Info.plist"
ICON_DESTINATION="${APP_DIR}/Contents/Resources/${APP_NAME}.icns"
TRAY_ICON_DESTINATION="${APP_DIR}/Contents/Resources/GenGoTrayIcon.png"

if [[ ! -x "${EXECUTABLE_SOURCE}" ]]; then
    echo "Built executable not found: ${EXECUTABLE_SOURCE}" >&2
    exit 1
fi

rm -rf "${APP_DIR}"
mkdir -p \
    "${APP_DIR}/Contents/MacOS" \
    "${APP_DIR}/Contents/Resources" \
    "${APP_DIR}/Contents/Frameworks"

cp "${EXECUTABLE_SOURCE}" "${EXECUTABLE_DESTINATION}"
chmod 755 "${EXECUTABLE_DESTINATION}"

if otool -L "${EXECUTABLE_DESTINATION}" | grep -q "Sparkle.framework"; then
    if [[ -z "${SPARKLE_FRAMEWORK_SOURCE}" ]]; then
        while IFS= read -r candidate; do
            SPARKLE_FRAMEWORK_SOURCE="${candidate}"
            break
        done < <(find "${SWIFT_DIR}/.build" -type d -name "Sparkle.framework" -print | sort)
    fi

    if [[ ! -d "${SPARKLE_FRAMEWORK_SOURCE}" ]]; then
        echo "Sparkle.framework was linked but could not be found under ${SWIFT_DIR}/.build." >&2
        echo "Set SPARKLE_FRAMEWORK_SOURCE to the built Sparkle.framework path if needed." >&2
        exit 1
    fi

    echo "Embedding Sparkle.framework..."
    ditto "${SPARKLE_FRAMEWORK_SOURCE}" "${APP_DIR}/Contents/Frameworks/Sparkle.framework"
fi

if [[ -f "${ICON_SOURCE}" ]]; then
    cp "${ICON_SOURCE}" "${ICON_DESTINATION}"
fi

if [[ -f "${TRAY_ICON_SOURCE}" ]]; then
    cp "${TRAY_ICON_SOURCE}" "${TRAY_ICON_DESTINATION}"
fi

cat > "${INFO_PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleExecutable</key>
    <string>${BUNDLE_EXECUTABLE_NAME}</string>
    <key>CFBundleIconFile</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_IDENTIFIER}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${SHORT_VERSION}</string>
    <key>CFBundleVersion</key>
    <string>${BUILD_VERSION}</string>
    <key>LSApplicationCategoryType</key>
    <string>${APP_CATEGORY}</string>
    <key>LSMinimumSystemVersion</key>
    <string>${MIN_SYSTEM_VERSION}</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
EOF

if [[ -n "${SPARKLE_PUBLIC_ED_KEY}" ]]; then
    SPARKLE_FEED_URL="${SPARKLE_FEED_URL:-https://tetsuakibaba.github.io/GenGo/swift/appcast.xml}"
    /usr/bin/plutil -insert SUFeedURL -string "${SPARKLE_FEED_URL}" "${INFO_PLIST_PATH}"
    /usr/bin/plutil -insert SUPublicEDKey -string "${SPARKLE_PUBLIC_ED_KEY}" "${INFO_PLIST_PATH}"
elif [[ -n "${SPARKLE_FEED_URL}" ]]; then
    echo "Skipping Sparkle Info.plist keys because SPARKLE_PUBLIC_ED_KEY is missing." >&2
fi

if ! otool -l "${EXECUTABLE_DESTINATION}" | grep -q "@executable_path/../Frameworks"; then
    install_name_tool -add_rpath "@executable_path/../Frameworks" "${EXECUTABLE_DESTINATION}"
fi

xcrun swift-stdlib-tool \
    --copy \
    --platform macosx \
    --scan-executable "${EXECUTABLE_DESTINATION}" \
    --destination "${APP_DIR}/Contents/Frameworks"

/usr/bin/xattr -cr "${APP_DIR}"
/usr/bin/plutil -lint "${INFO_PLIST_PATH}" >/dev/null

echo "Packaged app bundle:"
echo "${APP_DIR}"
