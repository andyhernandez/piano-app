import UIKit
import Capacitor

/// The bridge view controller with the app's own native plugins registered.
class KeyCadenceViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MidiPlugin())
    }
}
