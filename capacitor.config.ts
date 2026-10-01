import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iPad build. The web app is exported statically (NEXT_OUTPUT=export, no base path) into `out/`
 * and wrapped by Capacitor; see docs/ipad.md for the Xcode steps.
 */
const config: CapacitorConfig = {
  appId: "com.andyhernandez.keycadence",
  appName: "EasyKeys",
  webDir: "out",
  backgroundColor: "#fbf7ef",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    // The app is landscape-first and hides the iOS status bar (Info.plist UIStatusBarHidden) so the clock and
    // battery never sit on top of the 72px header's buttons.
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
};

export default config;
