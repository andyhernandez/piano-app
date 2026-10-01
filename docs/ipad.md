# KeyCadence on an iPad

There are two ways to get the app onto an iPad. The first needs nothing but Safari; the second gives you a real
app with its own icon, a full-screen window and no browser chrome, and needs a Mac with Xcode once.

## 1. Home Screen app from the website (two minutes)

Every push to `main` publishes the static build to <https://andyhernandez.github.io/piano-app/>.

1. Open that address in Safari on the iPad.
2. Tap the Share button, then **Add to Home Screen**, then **Add**.
3. Launch it from the icon. It opens full screen, keeps its data on the iPad (IndexedDB), and updates itself the next
   time it is opened with a connection.

## 2. Native app with Xcode (Capacitor)

The repo carries an iOS project in `ios/` that wraps the exported web app. Everything web-side is identical; the
wrapper adds the icon, the splash screen and the microphone permission prompt.

### Once, on the Mac

- Install Xcode from the App Store and open it once so it installs its command-line tools.
- Install Node 20 or newer (for example `brew install node`).
- Sign in to Xcode with your Apple ID (Xcode → Settings → Accounts). A free Apple ID can install to your own iPad
  for seven days at a time; a paid developer account ($99/year) keeps the install for a year and unlocks TestFlight.

### Each build

```
git clone https://github.com/andyhernandez/piano-app.git
cd piano-app
npm install
npm run ios
```

`npm run ios` exports the site into `out/`, copies it into the iOS project and opens Xcode. Then in Xcode:

1. Select the **App** target, open **Signing & Capabilities**, and pick your team. Xcode fixes the bundle identifier
   for a free account automatically (it appends your team id).
2. Plug the iPad in with a cable (or pair it over Wi-Fi in Window → Devices and Simulators) and choose it in the
   device menu at the top.
3. Press **Run** (⌘R). The first time, the iPad asks you to trust the developer certificate: Settings → General →
   VPN & Device Management → your Apple ID → Trust.

Without opening Xcode, `scripts/ipad-install.sh` does the same from the terminal: it builds with `xcodebuild`, then
installs and launches on the iPad with `devicectl`. It reads `DEVELOPMENT_TEAM`, `IPAD_UDID` and `IPAD_COREDEVICE`
from the environment (`xcrun devicectl list devices` prints the identifiers) and expects `npm run build:static &&
npx cap sync ios` to have run first.

After that the app is on the Home Screen like any other. To ship a new version, pull, run `npm run ios` again and
press Run. With a paid account you can instead **Product → Archive** and upload to TestFlight so the iPad updates
itself.

### What works where

| Input                     | Home Screen app (Safari) | Native app (Capacitor) |
|---------------------------|--------------------------|------------------------|
| Timer only                | yes                      | yes                    |
| Microphone (pitch, onset) | yes, after permission    | yes, after permission  |
| MIDI keyboard, USB        | no (iOS Safari has no Web MIDI) | yes, through CoreMIDI  |
| MIDI keyboard, Bluetooth  | no                       | yes, pair once from Settings or setup |

iOS WebKit does not implement Web MIDI, so the website cannot hear a keyboard. The native app carries its own bridge:
`ios/App/App/MidiPlugin.swift` opens CoreMIDI, connects every source (USB class-compliant keyboards through a USB-C or
Lightning adapter, Bluetooth MIDI, network sessions) and forwards note events to the page, where
`src/lib/input/native-midi.ts` presents them as the same MIDI source the blocks already use. Bluetooth keyboards pair
once through Apple's own sheet (the "Pair over Bluetooth" button on the setup screen, or "Pair" in Settings → Input).

### Files

- `capacitor.config.ts` — app id `com.andyhernandez.keycadence`, name, web directory.
- `ios/App/App/Info.plist` — microphone usage text, orientations.
- `ios/App/App/MidiPlugin.swift`, `KeyCadenceViewController.swift` — the CoreMIDI bridge and where it is registered.
- `ios/App/App/Assets.xcassets` — icon and splash generated from `public/icon.svg`.
- `npm run build:static` — the export on its own; `npm run ios:add` recreates the iOS project from scratch.
