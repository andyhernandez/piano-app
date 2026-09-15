import Foundation
import Capacitor
import CoreMIDI
import CoreAudioKit

/**
 * CoreMIDI bridge for the web app. iOS WebKit has no Web MIDI, so the wrapper listens to every MIDI source on the
 * iPad (USB class-compliant keyboards, Bluetooth MIDI, network sessions) and forwards note-on / note-off events to
 * the page as a "notes" event. `src/lib/input/native-midi.ts` is the JavaScript side.
 */
@objc(MidiPlugin)
public class MidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MidiPlugin"
    public let jsName = "Midi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "devices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pairBluetooth", returnType: CAPPluginReturnPromise),
    ]

    private var client: MIDIClientRef = 0
    private var port: MIDIPortRef = 0
    private var connected = Set<MIDIEndpointRef>()
    private var timebase = mach_timebase_info_data_t()
    private var running = false

    public override func load() {
        mach_timebase_info(&timebase)
    }

    // MARK: - Methods called from JavaScript

    @objc func start(_ call: CAPPluginCall) {
        if !running {
            let clientStatus = MIDIClientCreateWithBlock("KeyCadence" as CFString, &client) { [weak self] notification in
                guard let self = self else { return }
                let id = notification.pointee.messageID
                if id == .msgSetupChanged || id == .msgObjectAdded || id == .msgObjectRemoved {
                    DispatchQueue.main.async {
                        self.refreshSources()
                        self.notifyListeners("devices", data: ["devices": self.deviceNames()])
                    }
                }
            }
            guard clientStatus == noErr else {
                call.reject("CoreMIDI client failed (\(clientStatus))")
                return
            }
            let portStatus = MIDIInputPortCreateWithBlock(client, "KeyCadence In" as CFString, &port) { [weak self] packetList, _ in
                self?.receive(packetList)
            }
            guard portStatus == noErr else {
                call.reject("CoreMIDI input port failed (\(portStatus))")
                return
            }
            running = true
        }
        refreshSources()
        call.resolve(["devices": deviceNames()])
    }

    @objc func stop(_ call: CAPPluginCall) {
        for source in connected {
            MIDIPortDisconnectSource(port, source)
        }
        connected.removeAll()
        call.resolve()
    }

    @objc func devices(_ call: CAPPluginCall) {
        call.resolve(["devices": deviceNames(), "connected": connected.count])
    }

    /// Bluetooth MIDI keyboards pair through Apple's own sheet; nothing else in the app knows about Bluetooth.
    @objc func pairBluetooth(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let picker = CABTMIDICentralViewController()
            picker.navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(self.dismissPairing))
            let nav = UINavigationController(rootViewController: picker)
            nav.modalPresentationStyle = .formSheet
            self.bridge?.viewController?.present(nav, animated: true)
            call.resolve()
        }
    }

    @objc private func dismissPairing() {
        bridge?.viewController?.dismiss(animated: true)
    }

    // MARK: - CoreMIDI

    private func refreshSources() {
        var live = Set<MIDIEndpointRef>()
        for i in 0..<MIDIGetNumberOfSources() {
            let source = MIDIGetSource(i)
            live.insert(source)
            if !connected.contains(source) && MIDIPortConnectSource(port, source, nil) == noErr {
                connected.insert(source)
            }
        }
        connected = connected.intersection(live)
    }

    private func deviceNames() -> [String] {
        var names: [String] = []
        for i in 0..<MIDIGetNumberOfSources() {
            var name: Unmanaged<CFString>?
            if MIDIObjectGetStringProperty(MIDIGetSource(i), kMIDIPropertyDisplayName, &name) == noErr, let value = name?.takeRetainedValue() {
                names.append(value as String)
            }
        }
        return names
    }

    /// Runs on CoreMIDI's realtime thread: parse, then hop to main to talk to the web view.
    private func receive(_ packetList: UnsafePointer<MIDIPacketList>) {
        let now = mach_absolute_time()
        var events: [[String: Any]] = []
        for packet in packetList.unsafeSequence() {
            let stamp = packet.pointee.timeStamp
            let ageMs = (stamp == 0 || stamp > now) ? 0.0 : Double(now - stamp) * Double(timebase.numer) / Double(timebase.denom) / 1_000_000.0
            let bytes = Array(packet.pointee.bytes())
            var i = 0
            while i < bytes.count {
                let status = bytes[i]
                if status < 0x80 { i += 1; continue }
                let command = status & 0xF0
                let length = (command == 0xC0 || command == 0xD0) ? 2 : (status >= 0xF0 ? 1 : 3)
                if i + length > bytes.count { break }
                if command == 0x90 || command == 0x80 {
                    let note = Int(bytes[i + 1])
                    let velocity = Int(bytes[i + 2])
                    let on = command == 0x90 && velocity > 0
                    events.append(["midi": note, "velocity": on ? Double(velocity) / 127.0 : 0.0, "kind": on ? "on" : "off", "ageMs": ageMs])
                }
                i += length
            }
        }
        if events.isEmpty { return }
        DispatchQueue.main.async {
            self.notifyListeners("notes", data: ["events": events])
        }
    }
}
