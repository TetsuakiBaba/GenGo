#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SWIFT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SWIFT_DIR}/.." && pwd)"

APP_NAME="${APP_NAME:-GenGo}"
DIST_DIR="${DIST_DIR:-${SWIFT_DIR}/dist}"
APP_DIR="${APP_DIR:-${DIST_DIR}/${APP_NAME}.app}"
PACKAGE_SCRIPT="${PACKAGE_SCRIPT:-${SCRIPT_DIR}/package-macos-app.sh}"
NOTARIZE_TARGET="${NOTARIZE_TARGET:-none}"
SIGN_IDENTITY="${SIGN_IDENTITY:-${DEVELOPER_ID_APPLICATION:-}}"
BUILD_ARCHS="${BUILD_ARCHS:-$(uname -m)}"
BUNDLE_EXECUTABLE_NAME="${BUNDLE_EXECUTABLE_NAME:-${APP_NAME}}"
SIGN_KEYCHAIN="${SIGN_KEYCHAIN:-}"

if [[ -f "${REPO_ROOT}/package.json" ]]; then
    DEFAULT_VERSION="$(/usr/bin/plutil -extract version raw -o - "${REPO_ROOT}/package.json" 2>/dev/null || true)"
else
    DEFAULT_VERSION=""
fi

BUILD_VERSION="${BUILD_VERSION:-${DEFAULT_VERSION:-0.1.0}}"
SHORT_VERSION="${SHORT_VERSION:-${BUILD_VERSION}}"

read -r -a BUILD_ARCH_ARRAY <<< "${BUILD_ARCHS}"
if [[ "${#BUILD_ARCH_ARRAY[@]}" -gt 1 ]]; then
    ARCHIVE_ARCH_LABEL="${ARCHIVE_ARCH_LABEL:-universal}"
else
    ARCHIVE_ARCH_LABEL="${ARCHIVE_ARCH_LABEL:-${BUILD_ARCH_ARRAY[0]}}"
fi

ARTIFACT_PREFIX="${ARTIFACT_PREFIX:-${APP_NAME}-${BUILD_VERSION}-macos-${ARCHIVE_ARCH_LABEL}}"
ZIP_PATH="${DIST_DIR}/${ARTIFACT_PREFIX}.zip"
DMG_PATH="${DIST_DIR}/${ARTIFACT_PREFIX}.dmg"
SHA_PATH="${DIST_DIR}/${ARTIFACT_PREFIX}-sha256.txt"
NOTARIZE_ZIP_PATH="${DIST_DIR}/${ARTIFACT_PREFIX}-notarize.zip"

sign_path() {
    local path="$1"
    local -a cmd=(codesign --force --options runtime --sign "${SIGN_IDENTITY}")

    if [[ "${SIGN_IDENTITY}" != "-" ]]; then
        cmd+=(--timestamp)
    fi

    if [[ -n "${SIGN_KEYCHAIN}" ]]; then
        cmd+=(--keychain "${SIGN_KEYCHAIN}")
    fi

    "${cmd[@]}" "${path}"
}

sign_app_bundle() {
    local frameworks_dir="${APP_DIR}/Contents/Frameworks"
    local executable_path="${APP_DIR}/Contents/MacOS/${BUNDLE_EXECUTABLE_NAME}"

    if [[ ! -n "${SIGN_IDENTITY}" ]]; then
        echo "SIGN_IDENTITY is required for signing." >&2
        exit 1
    fi

    if [[ -n "${SIGN_KEYCHAIN}" ]]; then
        echo "Checking signing identities in ${SIGN_KEYCHAIN}..."
        security find-identity -v -p codesigning "${SIGN_KEYCHAIN}" || true
    fi

    if [[ -d "${frameworks_dir}" ]]; then
        while IFS= read -r -d '' library_path; do
            sign_path "${library_path}"
        done < <(find "${frameworks_dir}" -type f \( -name "*.dylib" -o -name "*.so" \) -print0 | sort -z)
    fi

    sign_path "${executable_path}"
    sign_path "${APP_DIR}"

    codesign --verify --deep --strict --verbose=2 "${APP_DIR}"

    if ! spctl --assess --type exec --verbose=4 "${APP_DIR}"; then
        echo "spctl assessment is expected to fail until notarization has completed."
    fi
}

notarytool_args() {
    if [[ -n "${NOTARYTOOL_PROFILE:-}" ]]; then
        printf -- "--keychain-profile\0%s\0" "${NOTARYTOOL_PROFILE}"
        return
    fi

    if [[ -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
        printf -- "--apple-id\0%s\0--password\0%s\0--team-id\0%s\0" \
            "${APPLE_ID}" \
            "${APPLE_APP_SPECIFIC_PASSWORD}" \
            "${APPLE_TEAM_ID}"
        return
    fi

    echo "Notarization requested, but no notarytool credentials are configured." >&2
    echo "Use NOTARYTOOL_PROFILE or APPLE_ID + APPLE_TEAM_ID + APPLE_APP_SPECIFIC_PASSWORD." >&2
    exit 1
}

notarize_archive() {
    local archive_path="$1"
    local -a args

    while IFS= read -r -d '' arg; do
        args+=("${arg}")
    done < <(notarytool_args)

    xcrun notarytool submit "${archive_path}" "${args[@]}" --wait
}

create_release_zip() {
    rm -f "${ZIP_PATH}"
    ditto -c -k --sequesterRsrc --keepParent "${APP_DIR}" "${ZIP_PATH}"
}

create_release_dmg() {
    local staging_dir
    staging_dir="$(mktemp -d "${DIST_DIR}/dmg-staging.XXXXXX")"

    rm -f "${DMG_PATH}"
    cp -R "${APP_DIR}" "${staging_dir}/"
    ln -s /Applications "${staging_dir}/Applications"
    hdiutil create \
        -volname "${APP_NAME}" \
        -srcfolder "${staging_dir}" \
        -ov \
        -format UDZO \
        "${DMG_PATH}" >/dev/null
    rm -rf "${staging_dir}"

    if [[ -n "${SIGN_IDENTITY}" ]]; then
        local -a dmg_sign_cmd=(codesign --force --sign "${SIGN_IDENTITY}")

        if [[ "${SIGN_IDENTITY}" != "-" ]]; then
            dmg_sign_cmd+=(--timestamp)
        fi

        if [[ -n "${SIGN_KEYCHAIN}" ]]; then
            dmg_sign_cmd+=(--keychain "${SIGN_KEYCHAIN}")
        fi

        /usr/bin/xattr -cr "${DMG_PATH}"
        "${dmg_sign_cmd[@]}" "${DMG_PATH}"
    fi
}

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

"${PACKAGE_SCRIPT}"

if [[ -n "${SIGN_IDENTITY}" ]]; then
    echo "Signing ${APP_DIR}..."
    /usr/bin/xattr -cr "${APP_DIR}"
    sign_app_bundle
else
    echo "Skipping signing because SIGN_IDENTITY is not set."
fi

case "${NOTARIZE_TARGET}" in
    none|zip|dmg|both)
        ;;
    *)
        echo "Unsupported NOTARIZE_TARGET: ${NOTARIZE_TARGET}" >&2
        exit 1
        ;;
esac

if [[ "${NOTARIZE_TARGET}" == "zip" || "${NOTARIZE_TARGET}" == "both" ]]; then
    if [[ -z "${SIGN_IDENTITY}" ]]; then
        echo "Zip notarization requires a signed app bundle." >&2
        exit 1
    fi

    rm -f "${NOTARIZE_ZIP_PATH}"
    ditto -c -k --sequesterRsrc --keepParent "${APP_DIR}" "${NOTARIZE_ZIP_PATH}"
    notarize_archive "${NOTARIZE_ZIP_PATH}"
    xcrun stapler staple -v "${APP_DIR}"
    xcrun stapler validate -v "${APP_DIR}"
    rm -f "${NOTARIZE_ZIP_PATH}"
fi

create_release_zip
create_release_dmg

if [[ "${NOTARIZE_TARGET}" == "dmg" || "${NOTARIZE_TARGET}" == "both" ]]; then
    if [[ -z "${SIGN_IDENTITY}" ]]; then
        echo "DMG notarization requires a signed app bundle." >&2
        exit 1
    fi

    notarize_archive "${DMG_PATH}"
    xcrun stapler staple -v "${DMG_PATH}"
    xcrun stapler validate -v "${DMG_PATH}"
fi

shasum -a 256 "${ZIP_PATH}" "${DMG_PATH}" > "${SHA_PATH}"

echo
echo "Artifacts:"
echo "${APP_DIR}"
echo "${ZIP_PATH}"
echo "${DMG_PATH}"
echo "${SHA_PATH}"
