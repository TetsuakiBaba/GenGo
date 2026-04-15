import Foundation

enum ResponseCleaner {
    static func clean(_ response: String, keepThinking: Bool = false) -> String {
        var cleaned = response.trimmingCharacters(in: .whitespacesAndNewlines)

        if keepThinking {
            cleaned = replacing(in: cleaned, pattern: #"<think>\s*"#, with: "【思考中...】\n")
            cleaned = replacing(in: cleaned, pattern: #"\s*</think>"#, with: "\n【思考完了】\n")
        } else {
            cleaned = replacing(
                in: cleaned,
                pattern: #"<think>[\s\S]*?</think>"#,
                with: "",
                options: [.dotMatchesLineSeparators]
            )
            cleaned = replacing(
                in: cleaned,
                pattern: #"<think>[\s\S]*"#,
                with: "",
                options: [.dotMatchesLineSeparators]
            )
        }

        let simplePatterns: [(String, String)] = [
            (#"^#+\s*"#, ""),
            (#"```[\s\S]*?```"#, ""),
            (#"`([^`]+)`"#, "$1"),
            (#"\*\*([^*]+)\*\*"#, "$1"),
            (#"\*([^*]+)\*"#, "$1"),
            (#"__([^_]+)__"#, "$1"),
            (#"_([^_]+)_"#, "$1"),
            (#"^(以下が|これが|結果:|処理結果:|回答:|翻訳結果:|修正結果:|校正結果:|変換結果:|翻訳:|修正版:|校正版:)[\s\n]*"#, ""),
            (#"^(以下のように|次のように|このように)[\s\n]*"#, ""),
            (#"^(修正されたテキスト:|校正されたテキスト:|翻訳されたテキスト:)[\s\n]*"#, ""),
            (#"^(Here is|This is|Result:|Translation:|Correction:|Revised:|Modified:|The result is:)[\s\n]*"#, ""),
            (#"^(Translated text:|Corrected text:|Modified text:|Revised text:)[\s\n]*"#, ""),
            (#"^(The translation is:|The correction is:)[\s\n]*"#, ""),
            (#"^[""「『](.*)[""」』]$"#, "$1"),
            (#"^'(.*)'$"#, "$1"),
            (#"^(→|⇒|➤|▶)\s*"#, ""),
            (#"[\s\n]*(以上です|です。以上|になります|となります)[\s\n]*$"#, ""),
            (#"[\s\n]*(That's all|That's it|Hope this helps)[\s\n]*$"#, "")
        ]

        for (pattern, replacement) in simplePatterns {
            cleaned = replacing(in: cleaned, pattern: pattern, with: replacement, options: [.anchorsMatchLines])
        }

        cleaned = replacing(in: cleaned, pattern: #"^\s+|\s+$"#, with: "", options: [.anchorsMatchLines])
        cleaned = replacing(in: cleaned, pattern: #"\n\s*\n"#, with: "\n")

        cleaned = cleaned
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")

        return cleaned
    }

    private static func replacing(
        in text: String,
        pattern: String,
        with replacement: String,
        options: NSRegularExpression.Options = []
    ) -> String {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else {
            return text
        }

        let range = NSRange(text.startIndex..., in: text)
        return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: replacement)
    }
}
