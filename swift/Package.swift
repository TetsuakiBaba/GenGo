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
    targets: [
        .executableTarget(
            name: "GenGoSwift",
            path: "Sources/GenGoSwift"
        )
    ]
)
