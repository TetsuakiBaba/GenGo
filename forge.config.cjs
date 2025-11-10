const path = require('path');

module.exports = {
    packagerConfig: {
        name: 'GenGo',
        executableName: 'GenGo',
        // appBundleId: 'com.gengo.electron',
        appCategoryType: 'public.app-category.utilities',
        icon: "icons/icon", // アイコンファイルのパスを指定（拡張子なし、各プラットフォームで自動選択）
        prune: true, // 不要なdevDependenciesを除外
        asar: true, // ASARアーカイブを使用
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
        "osxNotarize": {
            "tool": "notarytool",
            "appBundleId": "GenGo",
            "appleId": "microhost@gmail.com",
            "appleIdPassword": "parc-yhzu-ejpl-hdjv",
            "teamId": "ZE8M4T49DP",
        },
        ignore: [
            /^\/out\//,
            /^\/\.vscode\//,
            /^\/\.git\//,
            /^\/forge\.config\.js$/,
            /^\/README\.md$/,
            /^\/\.gitignore$/,
            /^\/\.DS_Store$/
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
                setupIcon: path.resolve('./icons/icon.ico'),
                iconUrl: 'https://raw.githubusercontent.com/TetsuakiBaba/GenGo/main/icons/icon.ico',
                loadingGif: path.resolve('./images/installer_loading.gif'),
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
                background: path.resolve('./images/dmg_background.png'), // DMG背景画像（オプション）
                icon: path.resolve('./icons/icon.icns'), // DMG用アイコン（オプション）
                'icon-size': 100,
                window: {
                    size: {
                        width: 600,
                        height: 400
                    }
                },
                contents: [
                    { x: 180, y: 170, type: 'file', path: path.resolve('./out/GenGo-darwin-arm64/GenGo.app') },
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
            console.log(`Pre-packaging for ${platform}-${arch}`);
        },
        postPackage: async (config, buildPath, electronVersion, platform, arch) => {
            // パッケージング後のカスタムフック
            console.log(`Post-packaging for ${platform}-${arch} at ${buildPath}`);
        }
    }
};
