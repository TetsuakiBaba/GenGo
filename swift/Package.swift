// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GenGoSwift",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "GenGoSwift",
            targets: ["GenGoSwift"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.9.1")
    ],
    targets: [
        .executableTarget(
            name: "GenGoSwift",
            dependencies: [
                .product(name: "Sparkle", package: "Sparkle")
            ],
            path: "Sources/GenGoSwift"
        )
    ]
)
