const path = require('path');
const fs = require('fs');

const ELECTRON_DIR = __dirname;
const REPO_ROOT = path.resolve(ELECTRON_DIR, '..');
const iconPath = (...segments) => path.join(REPO_ROOT, 'icons', ...segments);
const appPath = (...segments) => path.join(ELECTRON_DIR, ...segments);
const FORGE_RESOURCE_DIR = appPath('.forge-resources');
const FORGE_ICON_DIR = path.join(FORGE_RESOURCE_DIR, 'icons');
const FORGE_IMAGE_DIR = path.join(FORGE_RESOURCE_DIR, 'images');
const SHARED_ICON_FILES = [
    'IconTemplate.png',
    'IconTemplate@2x.png.png',
    'icon.icns',
    'icon.ico',
    'newicon.png',
    'newicon_transparent.png',
];
const ELECTRON_IMAGE_FILES = [
    'about.png',
    'about.svg',
    'dmg_background.png',
    'settings.png',
    'settings.svg',
];

function prepareSharedResources() {
    fs.rmSync(FORGE_RESOURCE_DIR, { recursive: true, force: true });
    fs.mkdirSync(FORGE_ICON_DIR, { recursive: true });
    fs.mkdirSync(FORGE_IMAGE_DIR, { recursive: true });

    for (const fileName of SHARED_ICON_FILES) {
        fs.copyFileSync(iconPath(fileName), path.join(FORGE_ICON_DIR, fileName));
    }

    for (const fileName of ELECTRON_IMAGE_FILES) {
        fs.copyFileSync(appPath('images', fileName), path.join(FORGE_IMAGE_DIR, fileName));
    }
}

const osxNotarize = (() => {
    if (process.env.NOTARYTOOL_PROFILE) {
        return {
            tool: 'notarytool',
            keychainProfile: process.env.NOTARYTOOL_PROFILE,
        };
    }

    if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID) {
        return {
            tool: 'notarytool',
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
        };
    }

    return undefined;
})();

module.exports = {
    packagerConfig: {
        name: 'GenGo',
        executableName: 'GenGo',
        // appBundleId: 'com.gengo.electron',
        appCategoryType: 'public.app-category.utilities',
        icon: iconPath('icon'), // アイコンファイルのパスを指定（拡張子なし、各プラットフォームで自動選択）
        prune: true, // 不要なdevDependenciesを除外
        asar: true, // ASARアーカイブを使用
        extraResource: [
            // 追加のリソースファイルやフォルダを指定
            FORGE_IMAGE_DIR,
            FORGE_ICON_DIR,
        ],
        // Windows固有の設定
        win32metadata: {
            CompanyName: 'Tetsuaki Baba',
            FileDescription: 'GenGo - Generative Text Translation',
            OriginalFilename: 'GenGo.exe',
            ProductName: 'GenGo',
            InternalName: 'GenGo'
        },
        osxSign: {
        },
        ...(osxNotarize ? { osxNotarize } : {}),
        ignore: [
            /^\/out\//,
            /^\/images(\/|$)/,
            /^\/\.forge-resources(\/|$)/,
            /^\/\.vscode\//,
            /^\/\.git\//,
            /^\/forge\.config\.js$/,
            /^\/README\.md$/,
            /^\/\.gitignore$/,
            /^\/.*\.DS_Store$/
        ]
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'GenGo',
                authors: 'Tetsuaki Baba',
                description: 'Generative Text Translation on Local LLM',
                exe: 'GenGo.exe',
                setupExe: 'GenGoSetup.exe',
                setupIcon: iconPath('icon.ico'),
                iconUrl: 'https://raw.githubusercontent.com/TetsuakiBaba/GenGo/main/icons/icon.ico',
                // loadingGif: path.resolve('./images/installer_loading.gif'),
                noMsi: true
            },
            platforms: ['win32']
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
            config: {}
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                maintainer: 'Tetsuaki Baba',
                homepage: 'https://github.com/gengo-team/gengo-electron'
            },
            platforms: ['linux']
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {
                license: 'MIT',
                homepage: 'https://github.com/gengo-team/gengo-electron'
            },
            platforms: ['linux']
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                name: 'GenGo',
                title: 'GenGo ${version}',
                format: 'ULFO',
                background: appPath('images', 'dmg_background.png'), // DMG背景画像（オプション）
                icon: iconPath('icon.icns'), // DMG用アイコン（オプション）
                'icon-size': 100,
                window: {
                    size: {
                        width: 600,
                        height: 400
                    }
                },
                contents: [
                    { x: 180, y: 170, type: 'file', path: appPath('out', 'GenGo-darwin-arm64', 'GenGo.app') },
                    { x: 420, y: 170, type: 'link', path: '/Applications' }
                ]
            },
            platforms: ['darwin']
        }
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            platforms: ['darwin', 'win32'],
            config: {
                repository: {
                    owner: 'TetsuakiBaba',
                    description: 'Generative Text Translation on Local LLM',
                    name: 'GenGo',
                },
                prerelease: false,
                draft: true,
            },
        },
    ],
    hooks: {
        generateAssets: async (config, platform, arch) => {
            // アセット生成前のカスタムフック
            console.log(`Generating assets for ${platform}-${arch}`);
        },
        prePackage: async (config, platform, arch) => {
            // パッケージング前のカスタムフック
            prepareSharedResources();
            console.log(`Pre-packaging for ${platform}-${arch}`);
        },
        postPackage: async (config, buildPath, electronVersion, platform, arch) => {
            // パッケージング後のカスタムフック
            console.log(`Post-packaging for ${platform}-${arch} at ${buildPath}`);
        }
    }
};
