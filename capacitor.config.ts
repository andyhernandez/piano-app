import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iPad build. The web app is exported statically (NEXT_OUTPUT=export, no base path) into `out/`
 * and wrapped by Capacitor; see docs/ipad.md for the Xcode steps.
 */
const config: CapacitorConfig = {
  appId: "com.andyhernandez.keycadence",
  appName: "KeyCadence",
  webDir: "out",
  backgroundColor: "#101326",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    // The app is landscape-first; the status bar sits over the 72px header like the PWA.
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
};

export default config;
