import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// package.jsonからバージョン情報を取得する関数
async function getVersionFromPackage() {
    try {
        const packageJsonPath = join(__dirname, 'package.json');
        const packageData = JSON.parse(await readFile(packageJsonPath, 'utf8'));
        return packageData.version;
    } catch (error) {
        console.warn('package.jsonからバージョン情報を読み込めませんでした:', error);
        return '0.5.0'; // フォールバック値
    }
}

/**
 * i18n初期化
 */
export async function initI18n(language = 'en') {
    try {
        // package.jsonからバージョン情報を取得
        const packageVersion = await getVersionFromPackage();

        await i18next
            .use(Backend)
            .init({
                lng: language,
                fallbackLng: 'ja',
                debug: false,

                backend: {
                    loadPath: join(__dirname, 'locales', '{{lng}}', '{{ns}}.json'),
                },

                interpolation: {
                    escapeValue: false,
                },

                returnEmptyString: false,
                returnNull: false,
            });

        // バージョン情報を動的に追加
        i18next.addResourceBundle('en', 'translation', {
            app: { ...i18next.getResourceBundle('en', 'translation')?.app, version: packageVersion }
        }, true, true);

        i18next.addResourceBundle('ja', 'translation', {
            app: { ...i18next.getResourceBundle('ja', 'translation')?.app, version: packageVersion }
        }, true, true);

        console.log(`i18n initialized with language: ${language}, version: ${packageVersion}`);
        return i18next;
    } catch (error) {
        console.error('i18n initialization failed:', error);
        throw error;
    }
}

/**
 * 言語を変更
 */
export async function changeLanguage(language) {
    try {
        await i18next.changeLanguage(language);
        console.log(`Language changed to: ${language}`);
        return true;
    } catch (error) {
        console.error('Failed to change language:', error);
        return false;
    }
}

/**
 * 翻訳取得のヘルパー関数
 */
export function t(key, options = {}) {
    return i18next.t(key, options);
}

/**
 * 現在の言語を取得
 */
export function getCurrentLanguage() {
    return i18next.language;
}

/**
 * i18nデータを取得
 */
export function getI18nData() {
    try {
        const currentLanguage = i18next.language;
        const resourceBundle = i18next.getResourceBundle(currentLanguage, 'translation');
        return resourceBundle || {};
    } catch (error) {
        console.error('Failed to get i18n data:', error);
        return {};
    }
}

/**
 * 利用可能な言語一覧
 */
export const availableLanguages = [
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'en', name: 'English', nativeName: 'English' }
];

/**
 * パッケージバージョンを取得
 */
export async function getPackageVersion() {
    return await getVersionFromPackage();
}

export default i18next;
