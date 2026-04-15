import SwiftUI

enum AppTypography {
    static let heroTitle = Font.system(size: 30, weight: .semibold, design: .rounded)
    static let windowTitle = Font.system(size: 27, weight: .semibold, design: .rounded)
    static let sectionTitle = Font.title2.weight(.semibold)
    static let subsectionTitle = Font.title3.weight(.semibold)
    static let label = Font.body.weight(.medium)
    static let body = Font.body
    static let callout = Font.callout
    static let helper = Font.footnote
    static let meta = Font.footnote.weight(.semibold)
    static let button = Font.body.weight(.medium)
    static let monoBody = Font.system(size: 15, weight: .regular, design: .monospaced)
    static let monoEmphasis = Font.system(size: 16, weight: .regular, design: .monospaced)
    static let closeIcon = Font.system(size: 12, weight: .bold)
}
