#!/usr/bin/env bash
# Build, sign, install and launch KeyCadence on a connected iPad from the command line.
# Companion to docs/ipad.md: this is the "Xcode → Run" step without opening Xcode.
# Assumes `npm run build:static && npx cap sync ios` has already run.
set -euo pipefail

TEAM="${DEVELOPMENT_TEAM:-8858C589VB}"
UDID="${IPAD_UDID:-00008101-001C4D462E40001E}"
COREDEVICE="${IPAD_COREDEVICE:-41A8194D-F5EF-5937-9749-A27193E55BF4}"
DD="${DERIVED_DATA:-$(mktemp -d)/dd}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Building for iPad $UDID (team $TEAM)"
xcodebuild -project "$ROOT/ios/App/App.xcodeproj" -scheme App -configuration Debug \
  -destination "id=$UDID" -derivedDataPath "$DD" \
  DEVELOPMENT_TEAM="$TEAM" -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  build | grep -E 'error|BUILD (SUCCEEDED|FAILED)' || true

APP="$DD/Build/Products/Debug-iphoneos/App.app"
[ -d "$APP" ] || { echo "Build failed: $APP missing"; exit 1; }

echo "→ Installing"
xcrun devicectl device install app --device "$COREDEVICE" "$APP"
echo "→ Launching"
xcrun devicectl device process launch --device "$COREDEVICE" com.andyhernandez.keycadence
echo "✓ KeyCadence is on the iPad"
