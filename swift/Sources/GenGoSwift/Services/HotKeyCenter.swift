import Carbon.HIToolbox
import Foundation

final class HotKeyCenter {
    private struct Registration {
        let hotKeyRef: EventHotKeyRef
        let action: () -> Void
    }

    private let signature: OSType = 0x474E474F // "GNGO"
    private var registrations: [UInt32: Registration] = [:]
    private var nextIdentifier: UInt32 = 1
    private var eventHandler: EventHandlerRef?

    init() {
        installEventHandler()
    }

    deinit {
        unregisterAll()
        if let eventHandler {
            RemoveEventHandler(eventHandler)
        }
    }

    func unregisterAll() {
        for registration in registrations.values {
            UnregisterEventHotKey(registration.hotKeyRef)
        }
        registrations.removeAll()
    }

    @discardableResult
    func register(shortcut rawShortcut: String, action: @escaping () -> Void) -> Bool {
        guard let shortcut = KeyboardShortcut.parse(rawShortcut) else {
            return false
        }

        let hotKeyID = EventHotKeyID(signature: signature, id: nextIdentifier)
        var hotKeyRef: EventHotKeyRef?

        let status = RegisterEventHotKey(
            shortcut.keyCode,
            shortcut.carbonModifiers,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )

        guard status == noErr, let hotKeyRef else {
            return false
        }

        registrations[nextIdentifier] = Registration(hotKeyRef: hotKeyRef, action: action)
        nextIdentifier += 1
        return true
    }

    private func installEventHandler() {
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        InstallEventHandler(
            GetApplicationEventTarget(),
            { _, eventRef, userData in
                guard
                    let userData,
                    let eventRef
                else {
                    return noErr
                }

                let center = Unmanaged<HotKeyCenter>.fromOpaque(userData).takeUnretainedValue()
                return center.handleHotKeyEvent(eventRef)
            },
            1,
            &eventType,
            UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()),
            &eventHandler
        )
    }

    private func handleHotKeyEvent(_ eventRef: EventRef) -> OSStatus {
        var hotKeyID = EventHotKeyID()
        let status = GetEventParameter(
            eventRef,
            EventParamName(kEventParamDirectObject),
            EventParamType(typeEventHotKeyID),
            nil,
            MemoryLayout<EventHotKeyID>.size,
            nil,
            &hotKeyID
        )

        guard status == noErr, let registration = registrations[hotKeyID.id] else {
            return noErr
        }

        registration.action()
        return noErr
    }
}
