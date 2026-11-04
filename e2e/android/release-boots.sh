#!/usr/bin/env bash
# Check that the release APK, which has no INTERNET permission and no DevTools
# socket, starts and renders the welcome screen. Reads the screen through
# Android's accessibility tree, which includes the WebView's text.
#
# Usage: e2e/android/release-boots.sh <release.apk>
set -euo pipefail

APK="$1"
APP_ID=com.icarus.diary

adb uninstall "$APP_ID" > /dev/null 2>&1 || true
adb install "$APK"

# A freshly booted emulator can still be finishing its setup and ignore a
# launch ("user setup not complete"), so start the app again until it's in
# the foreground.
for _ in $(seq 1 30); do
  if ! adb shell dumpsys activity activities | grep -q "ResumedActivity.*$APP_ID"; then
    adb shell am start -W -n "$APP_ID/.MainActivity" > /dev/null
  fi
  adb shell uiautomator dump /sdcard/window.xml > /dev/null 2>&1 || true
  if adb shell cat /sdcard/window.xml 2>/dev/null | grep -q 'Start a new diary'; then
    echo "The release APK shows the welcome screen."
    adb exec-out screencap -p > release-welcome.png
    adb uninstall "$APP_ID" > /dev/null
    exit 0
  fi
  sleep 2
done

echo "The release APK did not show the welcome screen." >&2
adb exec-out screencap -p > release-welcome.png
adb logcat -d | grep -iE "icarus|tauri|chromium|AndroidRuntime" | tail -80 >&2 || true
exit 1
