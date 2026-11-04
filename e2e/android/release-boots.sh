#!/usr/bin/env bash
# Check that the release APK, which has no INTERNET permission and no DevTools
# socket, starts and renders the welcome screen. Reads the screen through
# Android's accessibility tree, which includes the WebView's text.
#
# Usage: e2e/android/release-boots.sh <release.apk>
set -euo pipefail

APK="$1"
APP_ID=com.icarus.diary

if [[ "$APK" == *unsigned* ]]; then
  echo "Skipping: $APK is unsigned and can't be installed."
  exit 0
fi

adb uninstall "$APP_ID" > /dev/null 2>&1 || true
adb install "$APK"
adb shell am start -W -n "$APP_ID/.MainActivity"

for _ in $(seq 1 30); do
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
