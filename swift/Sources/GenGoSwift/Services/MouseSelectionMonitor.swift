import AppKit

@MainActor
final class MouseSelectionMonitor {
    private var eventMonitor: Any?
    private var mouseDownLocation: NSPoint?
    private var didDrag = false

    private var onInteractionBegan: (() -> Void)?
    private var onSelectionGesture: ((NSPoint, NSEvent.ModifierFlags) -> Void)?

    func start(
        onInteractionBegan: @escaping () -> Void,
        onSelectionGesture: @escaping (NSPoint, NSEvent.ModifierFlags) -> Void
    ) {
        stop()
        self.onInteractionBegan = onInteractionBegan
        self.onSelectionGesture = onSelectionGesture

        eventMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.leftMouseDown, .leftMouseDragged, .leftMouseUp]
        ) { [weak self] event in
            Task { @MainActor [weak self] in
                self?.handle(event)
            }
        }
    }

    func stop() {
        if let eventMonitor {
            NSEvent.removeMonitor(eventMonitor)
        }
        eventMonitor = nil
        mouseDownLocation = nil
        didDrag = false
        onInteractionBegan = nil
        onSelectionGesture = nil
    }

    private func handle(_ event: NSEvent) {
        switch event.type {
        case .leftMouseDown:
            mouseDownLocation = NSEvent.mouseLocation
            didDrag = false
            onInteractionBegan?()

        case .leftMouseDragged:
            guard let mouseDownLocation else {
                return
            }
            let currentLocation = NSEvent.mouseLocation
            let distance = hypot(
                currentLocation.x - mouseDownLocation.x,
                currentLocation.y - mouseDownLocation.y
            )
            if distance >= 4 {
                didDrag = true
            }

        case .leftMouseUp:
            let representsSelectionGesture = didDrag || event.clickCount >= 2
            mouseDownLocation = nil
            didDrag = false

            guard representsSelectionGesture else {
                return
            }
            onSelectionGesture?(NSEvent.mouseLocation, event.modifierFlags)

        default:
            break
        }
    }
}
