#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SWIFT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SWIFT_DIR}/.." && pwd)"

APP_NAME="${APP_NAME:-GenGo}"
DIST_DIR="${DIST_DIR:-${SWIFT_DIR}/dist}"
BUILD_VERSION="${BUILD_VERSION:-}"
SHORT_VERSION="${SHORT_VERSION:-${BUILD_VERSION}}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-TetsuakiBaba/GenGo}"
RELEASE_TAG="${RELEASE_TAG:-}"
SPARKLE_BIN_DIR="${SPARKLE_BIN_DIR:-}"
SPARKLE_PRIVATE_KEY_PATH="${SPARKLE_PRIVATE_KEY_PATH:-}"
SPARKLE_PRIVATE_KEY_BASE64="${SPARKLE_PRIVATE_KEY_BASE64:-}"
SPARKLE_APPCAST_PATH="${SPARKLE_APPCAST_PATH:-${DIST_DIR}/swift-appcast.xml}"
SPARKLE_ARCHIVE_PATH="${SPARKLE_ARCHIVE_PATH:-}"
SPARKLE_DOWNLOAD_URL="${SPARKLE_DOWNLOAD_URL:-}"
SPARKLE_RELEASE_NOTES_URL="${SPARKLE_RELEASE_NOTES_URL:-}"
SPARKLE_MIN_SYSTEM_VERSION="${SPARKLE_MIN_SYSTEM_VERSION:-13.0.0}"

if [[ -z "${BUILD_VERSION}" ]]; then
    if [[ -f "${REPO_ROOT}/package.json" ]]; then
        BUILD_VERSION="$(/usr/bin/plutil -extract version raw -o - "${REPO_ROOT}/package.json" 2>/dev/null || true)"
        SHORT_VERSION="${SHORT_VERSION:-${BUILD_VERSION}}"
    fi
fi

if [[ -z "${BUILD_VERSION}" ]]; then
    echo "BUILD_VERSION is required to generate the Sparkle appcast." >&2
    exit 1
fi

if [[ -z "${SHORT_VERSION}" ]]; then
    SHORT_VERSION="${BUILD_VERSION}"
fi

if [[ -z "${RELEASE_TAG}" ]]; then
    RELEASE_TAG="swift-v${BUILD_VERSION}"
fi

if [[ -z "${SPARKLE_ARCHIVE_PATH}" ]]; then
    archive_count=0
    for candidate in "${DIST_DIR}/${APP_NAME}-${BUILD_VERSION}-macos-"*.zip; do
        if [[ -f "${candidate}" ]]; then
            SPARKLE_ARCHIVE_PATH="${candidate}"
            archive_count=$((archive_count + 1))
        fi
    done

    if [[ "${archive_count}" -ne 1 ]]; then
        echo "Expected exactly one Sparkle update zip for ${APP_NAME} ${BUILD_VERSION}, found ${archive_count}." >&2
        exit 1
    fi
fi

if [[ ! -f "${SPARKLE_ARCHIVE_PATH}" ]]; then
    echo "Sparkle archive not found: ${SPARKLE_ARCHIVE_PATH}" >&2
    exit 1
fi

if [[ -z "${SPARKLE_BIN_DIR}" ]]; then
    while IFS= read -r candidate; do
        SPARKLE_BIN_DIR="$(dirname "${candidate}")"
        break
    done < <(find "${SWIFT_DIR}/.build" -type f -path "*/bin/sign_update" ! -path "*/old_dsa_scripts/*" -print | sort)
fi

if [[ ! -x "${SPARKLE_BIN_DIR}/sign_update" ]]; then
    echo "Sparkle sign_update was not found. Build the Swift package first or set SPARKLE_BIN_DIR." >&2
    exit 1
fi

cleanup_private_key=""
if [[ -n "${SPARKLE_PRIVATE_KEY_BASE64}" ]]; then
    cleanup_private_key="${RUNNER_TEMP:-${DIST_DIR}}/sparkle_ed_private_key"
    printf "%s" "${SPARKLE_PRIVATE_KEY_BASE64}" | base64 -D > "${cleanup_private_key}"
    chmod 600 "${cleanup_private_key}"
    SPARKLE_PRIVATE_KEY_PATH="${cleanup_private_key}"
fi

if [[ -n "${GITHUB_ACTIONS:-}" && -z "${SPARKLE_PRIVATE_KEY_PATH}" ]]; then
    echo "SPARKLE_PRIVATE_KEY_BASE64 or SPARKLE_PRIVATE_KEY_PATH is required in GitHub Actions." >&2
    exit 1
fi

sign_update_cmd=("${SPARKLE_BIN_DIR}/sign_update")
if [[ -n "${SPARKLE_PRIVATE_KEY_PATH}" ]]; then
    sign_update_cmd+=("-f" "${SPARKLE_PRIVATE_KEY_PATH}")
fi
sign_update_cmd+=("${SPARKLE_ARCHIVE_PATH}")

signature_output="$("${sign_update_cmd[@]}")"

if [[ -n "${cleanup_private_key}" ]]; then
    rm -f "${cleanup_private_key}"
fi

if [[ "${signature_output}" =~ sparkle:edSignature=\"([^\"]+)\" ]]; then
    ed_signature="${BASH_REMATCH[1]}"
else
    echo "Could not parse Sparkle EdDSA signature from sign_update output:" >&2
    echo "${signature_output}" >&2
    exit 1
fi

if [[ "${signature_output}" =~ length=\"([0-9]+)\" ]]; then
    archive_length="${BASH_REMATCH[1]}"
else
    archive_length="$(wc -c < "${SPARKLE_ARCHIVE_PATH}" | tr -d '[:space:]')"
fi

archive_name="$(basename "${SPARKLE_ARCHIVE_PATH}")"

if [[ -z "${SPARKLE_DOWNLOAD_URL}" ]]; then
    SPARKLE_DOWNLOAD_URL="https://github.com/${GITHUB_REPOSITORY}/releases/download/${RELEASE_TAG}/${archive_name}"
fi

if [[ -z "${SPARKLE_RELEASE_NOTES_URL}" ]]; then
    SPARKLE_RELEASE_NOTES_URL="https://github.com/${GITHUB_REPOSITORY}/releases/tag/${RELEASE_TAG}"
fi

xml_escape() {
    local value="$1"
    value="${value//&/&amp;}"
    value="${value//</&lt;}"
    value="${value//>/&gt;}"
    value="${value//\"/&quot;}"
    printf "%s" "${value}"
}

pub_date="$(LC_ALL=C TZ=UTC date -u "+%a, %d %b %Y %H:%M:%S %z")"
mkdir -p "$(dirname "${SPARKLE_APPCAST_PATH}")"

cat > "${SPARKLE_APPCAST_PATH}" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
    <channel>
        <title>GenGo Swift Updates</title>
        <link>$(xml_escape "https://github.com/${GITHUB_REPOSITORY}")</link>
        <description>GenGo for macOS update feed</description>
        <language>ja</language>
        <item>
            <title>$(xml_escape "${APP_NAME} ${SHORT_VERSION}")</title>
            <sparkle:version>$(xml_escape "${BUILD_VERSION}")</sparkle:version>
            <sparkle:shortVersionString>$(xml_escape "${SHORT_VERSION}")</sparkle:shortVersionString>
            <sparkle:minimumSystemVersion>$(xml_escape "${SPARKLE_MIN_SYSTEM_VERSION}")</sparkle:minimumSystemVersion>
            <sparkle:releaseNotesLink>$(xml_escape "${SPARKLE_RELEASE_NOTES_URL}")</sparkle:releaseNotesLink>
            <pubDate>${pub_date}</pubDate>
            <enclosure url="$(xml_escape "${SPARKLE_DOWNLOAD_URL}")"
                       sparkle:edSignature="$(xml_escape "${ed_signature}")"
                       length="$(xml_escape "${archive_length}")"
                       type="application/octet-stream" />
        </item>
    </channel>
</rss>
EOF

if command -v xmllint >/dev/null 2>&1; then
    xmllint --noout "${SPARKLE_APPCAST_PATH}"
fi

echo "Generated Sparkle appcast:"
echo "${SPARKLE_APPCAST_PATH}"
