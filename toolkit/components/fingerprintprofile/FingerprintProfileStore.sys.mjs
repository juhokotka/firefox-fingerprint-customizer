/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContainerAdapter: "resource://gre/modules/ContainerAdapter.sys.mjs",
  StorageAdapter: "resource://gre/modules/StorageAdapter.sys.mjs",
  ProfileSyncAdapter: "resource://gre/modules/ProfileSyncAdapter.sys.mjs",
});

// Per-OS font rosters (device.fontSet). Imported eagerly rather than through a
// lazy getter because DEVICE_DATABASE below is evaluated at module load.
// FontRosterData.sys.mjs is a generated data module with no imports of its own,
// so there is no import cycle here.
const {
  MACOS_ROSTER,
  LINUX_ROSTER,
  LINUX_ROSTER_FEDORA,
  WINDOWS_ROSTER,
} = ChromeUtils.importESModule(
  "resource://gre/modules/FontRosterData.sys.mjs"
);

// --- Device Database ---
// Devices are grouped into 3 types: Mac, Linux, Windows.
// Each type has multiple chip/hardware variants. The primary page
// only exposes the 3 types (random variant); the Detailed Edit page
// lets users pick a specific variant.
const DEVICE_DATABASE = {
  Mac: [
    {
      name: "MacBook Air M1",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 2560, height: 1600, availWidth: 2560, availHeight: 1577, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 44100,
      diskSizeGB: 256,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Air Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Air Speakers" },
      ],
    },
    {
      name: "MacBook Pro M1",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 2560, height: 1600, availWidth: 2560, availHeight: 1577, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 44100,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Air M2",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 2560, height: 1664, availWidth: 2560, availHeight: 1641, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 256,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Air Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Air Speakers" },
      ],
    },
    {
      name: "MacBook Pro M2",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 2560, height: 1600, availWidth: 2560, availHeight: 1577, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Pro M2 Pro",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3024, height: 1964, availWidth: 3024, availHeight: 1941, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Air M3",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 2560, height: 1664, availWidth: 2560, availHeight: 1641, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Air Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Air Speakers" },
      ],
    },
    {
      name: "MacBook Pro M3",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3024, height: 1964, availWidth: 3024, availHeight: 1941, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Pro M3 Pro",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3024, height: 1964, availWidth: 3024, availHeight: 1941, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 1024,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Pro M3 Max",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3456, height: 2234, availWidth: 3456, availHeight: 2211, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 1024,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Air M4",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 10,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 2560, height: 1664, availWidth: 2560, availHeight: 1641, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Air Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Air Speakers" },
      ],
    },
    {
      name: "MacBook Pro M4",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 10,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3024, height: 1964, availWidth: 3024, availHeight: 1941, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Pro M4 Pro",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 14,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3024, height: 1964, availWidth: 3024, availHeight: 1941, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 1024,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "MacBook Pro M4 Max",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 3456, height: 2234, availWidth: 3456, availHeight: 2211, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 1024,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "MacBook Pro Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "MacBook Pro Speakers" },
      ],
    },
    {
      name: "Mac mini M2",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1416, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 256,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
    {
      name: "Mac mini M2 Pro",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 10,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1416, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
    {
      name: "Mac mini M4",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 10,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1416, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 256,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
    {
      name: "Mac mini M4 Pro",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1416, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
    {
      name: "iMac 24-inch M3",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 4480, height: 2520, availWidth: 4480, availHeight: 2497, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 256,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "iMac Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "iMac Speakers" },
      ],
    },
    {
      name: "iMac 24-inch M4",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 4480, height: 2520, availWidth: 4480, availHeight: 2497, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 256,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "iMac Microphone" },
        { kind: "videoinput", label: "FaceTime HD Camera" },
        { kind: "audiooutput", label: "iMac Speakers" },
      ],
    },
    {
      name: "Mac Studio M2 Max",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 5120, height: 2880, availWidth: 5120, availHeight: 2857, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
    {
      name: "Mac Studio M2 Ultra",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 24,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 5120, height: 2880, availWidth: 5120, availHeight: 2857, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 1024,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
    {
      name: "Mac Pro M2 Ultra",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Intel Mac OS X 10.15",
      appVersion: "5.0 (Macintosh)",
      navigatorPlatform: "MacIntel",
      hardwareConcurrency: 24,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 2.0,
      screen: { width: 5120, height: 2880, availWidth: 5120, availHeight: 2857, availLeft: 0, availTop: 23, pixelDepth: 30, colorDepth: 30 },
      webglVendor: "Google Inc. (Apple)",
      webglRenderer: "Apple GPU",
      audioSampleRate: 48000,
      diskSizeGB: 1024,
      fontSet: MACOS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "External Microphone" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "External Speakers" },
      ],
    },
  ],
  Linux: [
    {
      name: "Linux Desktop (Ubuntu, NVIDIA RTX 3060)",
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Linux x86_64",
      appVersion: "5.0 (X11)",
      navigatorPlatform: "Linux x86_64",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1416, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (NVIDIA)",
      webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 OpenGL 4.6)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: LINUX_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "USB Audio Device (Microphone)" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "Built-in Audio Stereo" },
      ],
    },
    {
      name: "Linux Desktop (Ubuntu, Intel UHD 770)",
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Linux x86_64",
      appVersion: "5.0 (X11)",
      navigatorPlatform: "Linux x86_64",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1056, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Intel)",
      webglRenderer: "Mesa Intel(R) UHD Graphics 770 (ADL-S GT1)",
      audioSampleRate: 48000,
      diskSizeGB: 500,
      fontSet: LINUX_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "USB Audio Device (Microphone)" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "Built-in Audio Stereo" },
      ],
    },
    {
      name: "Linux Desktop (Ubuntu, AMD RX 7600)",
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Linux x86_64",
      appVersion: "5.0 (X11)",
      navigatorPlatform: "Linux x86_64",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 3840, height: 2160, availWidth: 3840, availHeight: 2136, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (AMD)",
      webglRenderer: "ANGLE (AMD, AMD Radeon RX 7600 (navy24, LLVM 15.0.7, DRM 3.54, 6.8.0), OpenGL 4.6)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: LINUX_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "USB Audio Device (Microphone)" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "Built-in Audio Stereo" },
      ],
    },
    {
      name: "Linux Desktop (Fedora, NVIDIA RTX 4070)",
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Linux x86_64",
      appVersion: "5.0 (X11)",
      navigatorPlatform: "Linux x86_64",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1416, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (NVIDIA)",
      webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 OpenGL 4.6)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: LINUX_ROSTER_FEDORA,
      mediaDevices: [
        { kind: "audioinput", label: "USB Audio Device (Microphone)" },
        { kind: "videoinput", label: "USB Camera" },
        { kind: "audiooutput", label: "Built-in Audio Stereo" },
      ],
    },
    {
      name: "Laptop (Ubuntu, Intel Iris Xe)",
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Linux x86_64",
      appVersion: "5.0 (X11)",
      navigatorPlatform: "Linux x86_64",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.25,
      screen: { width: 1920, height: 1200, availWidth: 1920, availHeight: 1176, availLeft: 0, availTop: 24, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Intel)",
      webglRenderer: "Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: LINUX_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Integrated Microphone" },
        { kind: "videoinput", label: "Integrated Camera" },
        { kind: "audiooutput", label: "Built-in Audio Stereo" },
      ],
    },
  ],
  Windows: [
    {
      name: "Windows 11 Desktop (Intel i7, UHD 770)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Intel)",
      webglRenderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "HD Webcam (USB)" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
    {
      name: "Windows 11 Desktop (AMD Ryzen 9, RTX 4070)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (NVIDIA)",
      webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "HD Webcam (USB)" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
    {
      name: "Windows 11 Desktop (Intel i9, RTX 4090)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 24,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (NVIDIA)",
      webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 2000,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "HD Webcam (USB)" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
    {
      name: "Windows 11 Desktop (AMD Ryzen 7, RX 7800 XT)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (AMD)",
      webglRenderer: "ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "HD Webcam (USB)" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
    {
      name: "Windows 11 Laptop (Intel i5, Iris Xe)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.25,
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (Intel)",
      webglRenderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "Integrated Camera" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
    {
      name: "Windows 11 Laptop (AMD Ryzen 7, Radeon 780M)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 16,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.5,
      screen: { width: 2560, height: 1600, availWidth: 2560, availHeight: 1560, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (AMD)",
      webglRenderer: "ANGLE (AMD, AMD Radeon 780M Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 512,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "Integrated Camera" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
    {
      name: "Windows 10 Desktop (Intel i7, GTX 1660)",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0",
      oscpu: "Windows NT 10.0; Win64; x64",
      appVersion: "5.0 (Windows)",
      navigatorPlatform: "Win32",
      hardwareConcurrency: 12,
      maxTouchPoints: 0,
      doNotTrack: "unspecified",
      devicePixelRatio: 1.0,
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, availLeft: 0, availTop: 40, pixelDepth: 24, colorDepth: 24 },
      webglVendor: "Google Inc. (NVIDIA)",
      webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      audioSampleRate: 48000,
      diskSizeGB: 1000,
      fontSet: WINDOWS_ROSTER,
      mediaDevices: [
        { kind: "audioinput", label: "Microphone Array (Realtek Audio)" },
        { kind: "videoinput", label: "HD Webcam (USB)" },
        { kind: "audiooutput", label: "Speakers (Realtek Audio)" },
      ],
    },
  ],
};

// --- External Display Pool ---
// Desktop devices without built-in displays (Mac mini, Mac Studio, Mac Pro,
// Linux/Windows desktops) are connected to external monitors whose resolution
// varies per user. The screen resolution is randomized from these pools to
// reflect real-world diversity. Devices with built-in displays (MacBooks, iMacs,
// laptops) keep their fixed screen resolution since every unit of the same model
// ships with identical display hardware.
const EXTERNAL_DISPLAYS = {
  Mac: [
    { width: 1920, height: 1080, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 2560, height: 1440, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 2560, height: 1440, devicePixelRatio: 2.0, pixelDepth: 30, colorDepth: 30 },
    { width: 3440, height: 1440, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 3840, height: 2160, devicePixelRatio: 1.5, pixelDepth: 30, colorDepth: 30 },
    { width: 3840, height: 2160, devicePixelRatio: 2.0, pixelDepth: 30, colorDepth: 30 },
    { width: 5120, height: 2880, devicePixelRatio: 2.0, pixelDepth: 30, colorDepth: 30 },
  ],
  Linux: [
    { width: 1920, height: 1080, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 2560, height: 1440, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 3440, height: 1440, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 3840, height: 2160, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 3840, height: 2160, devicePixelRatio: 1.5, pixelDepth: 30, colorDepth: 30 },
  ],
  Windows: [
    { width: 1920, height: 1080, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 1920, height: 1080, devicePixelRatio: 1.25, pixelDepth: 24, colorDepth: 24 },
    { width: 2560, height: 1440, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 2560, height: 1440, devicePixelRatio: 1.25, pixelDepth: 24, colorDepth: 24 },
    { width: 3440, height: 1440, devicePixelRatio: 1.0, pixelDepth: 24, colorDepth: 24 },
    { width: 3840, height: 2160, devicePixelRatio: 1.5, pixelDepth: 30, colorDepth: 30 },
    { width: 3840, height: 2160, devicePixelRatio: 2.0, pixelDepth: 30, colorDepth: 30 },
  ],
};

function deviceHasBuiltInDisplay(device) {
  let name = (device.name || "").toLowerCase();
  return name.includes("macbook") || name.includes("imac") || name.includes("laptop");
}

// --- Location Database ---
const LOCATION_DATABASE = [
  { country: "US", timezone: "America/New_York", language: "en-US", languages: ["en-US", "en"] },
  { country: "GB", timezone: "Europe/London", language: "en-GB", languages: ["en-GB", "en"] },
  { country: "JP", timezone: "Asia/Tokyo", language: "ja-JP", languages: ["ja-JP", "ja", "en-US", "en"] },
  { country: "DE", timezone: "Europe/Berlin", language: "de-DE", languages: ["de-DE", "de", "en-US", "en"] },
  { country: "CN", timezone: "Asia/Shanghai", language: "zh-CN", languages: ["zh-CN", "zh", "en-US", "en"] },
  { country: "FR", timezone: "Europe/Paris", language: "fr-FR", languages: ["fr-FR", "fr", "en-US", "en"] },
  { country: "CA", timezone: "America/Toronto", language: "en-CA", languages: ["en-CA", "en", "fr-CA", "fr"] },
  { country: "AU", timezone: "Australia/Sydney", language: "en-AU", languages: ["en-AU", "en"] },
  { country: "KR", timezone: "Asia/Seoul", language: "ko-KR", languages: ["ko-KR", "ko", "en-US", "en"] },
  { country: "BR", timezone: "America/Sao_Paulo", language: "pt-BR", languages: ["pt-BR", "pt", "en-US", "en"] },
  { country: "IN", timezone: "Asia/Kolkata", language: "en-IN", languages: ["en-IN", "en", "hi-IN", "hi"] },
  { country: "SG", timezone: "Asia/Singapore", language: "en-SG", languages: ["en-SG", "en", "zh-SG", "zh"] },
];

function generateRandomBytes(length) {
  let arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr);
}

/**
 * FingerprintProfileStore — the JS Runtime that manages three-layer
 * fingerprint profiles for containers.
 *
 * Only depends on the three Adapter interfaces (ContainerAdapter,
 * StorageAdapter, ProfileSyncAdapter); does not import Firefox internal
 * modules directly.
 */
export const FingerprintProfileStore = {
  _cache: new Map(),

  // Containers whose Profile is known to be in the parent-side cache that
  // WindowGlobalParent::Init() replays to every new WindowGlobal. A sync only
  // fills that cache when a live WindowGlobal exists at the time, so this set
  // tracks which containers still need the fallback push from
  // _installWindowGlobalObserver().
  _parentCachePrimed: new Set(),
  _windowGlobalObserverInstalled: false,

  getAvailableDeviceTypes() {
    return Object.keys(DEVICE_DATABASE);
  },

  getDeviceVariants(deviceType) {
    let variants = DEVICE_DATABASE[deviceType];
    if (!variants) {
      return [];
    }
    return variants.map(d => ({ name: d.name }));
  },

  // Keep the old method for backward compatibility but make it return all variants
  getAvailableDevices() {
    let all = [];
    for (let type of Object.keys(DEVICE_DATABASE)) {
      for (let dev of DEVICE_DATABASE[type]) {
        all.push({ name: dev.name, type });
      }
    }
    return all;
  },

  getAvailableCountries() {
    return LOCATION_DATABASE.map(l => ({ country: l.country, language: l.language }));
  },

  /**
   * Generate a complete three-layer profile.
   * @param {object} [options]
   * @param {string} [options.deviceType] - One of "Mac", "Linux", "Windows".
   *   A random variant within that type is picked.
   * @param {string} [options.deviceVariant] - Specific variant name across all
   *   types. Takes precedence over deviceType.
   * @param {string} [options.country] - Country code from the location database.
   *   If omitted, a random location is selected.
   * @returns {object} A FingerprintProfileDict-shaped plain object.
   */
  generateProfile({ deviceType, deviceVariant, country } = {}) {
    let device;
    let resolvedType = deviceType || "";
    if (deviceVariant) {
      // Find the specific variant across all types
      for (let type of Object.keys(DEVICE_DATABASE)) {
        let found = DEVICE_DATABASE[type].find(d => d.name === deviceVariant);
        if (found) {
          device = found;
          resolvedType = type;
          break;
        }
      }
      if (!device) {
        throw new Error(`Unknown device variant: ${deviceVariant}`);
      }
    } else if (deviceType) {
      // Pick a random variant within the given type
      let variants = DEVICE_DATABASE[deviceType];
      if (!variants || variants.length === 0) {
        throw new Error(`Unknown device type: ${deviceType}`);
      }
      device = variants[Math.floor(Math.random() * variants.length)];
    } else {
      // Pick a completely random device
      let allTypes = Object.keys(DEVICE_DATABASE);
      let randomType = allTypes[Math.floor(Math.random() * allTypes.length)];
      device = DEVICE_DATABASE[randomType][Math.floor(Math.random() * DEVICE_DATABASE[randomType].length)];
      resolvedType = randomType;
    }

    let location = country
      ? LOCATION_DATABASE.find(l => l.country === country)
      : LOCATION_DATABASE[Math.floor(Math.random() * LOCATION_DATABASE.length)];
    if (!location) {
      throw new Error(`Unknown country: ${country}`);
    }

    return this._buildProfile(device, location, resolvedType);
  },

  _deviceToDict(device, deviceType) {
    let screen;
    let devicePixelRatio;
    if (!deviceHasBuiltInDisplay(device)) {
      let pool = EXTERNAL_DISPLAYS[deviceType] || EXTERNAL_DISPLAYS.Mac;
      let display = pool[Math.floor(Math.random() * pool.length)];
      if (deviceType === "Windows") {
        screen = {
          width: display.width,
          height: display.height,
          availWidth: display.width,
          availHeight: display.height - 40,
          availLeft: 0,
          availTop: 40,
          pixelDepth: display.pixelDepth,
          colorDepth: display.colorDepth,
        };
      } else {
        let menuBar = display.devicePixelRatio >= 2.0 ? 23 : 24;
        screen = {
          width: display.width,
          height: display.height,
          availWidth: display.width,
          availHeight: display.height - menuBar,
          availLeft: 0,
          availTop: menuBar,
          pixelDepth: display.pixelDepth,
          colorDepth: display.colorDepth,
        };
      }
      devicePixelRatio = display.devicePixelRatio;
    } else {
      screen = { ...device.screen };
      devicePixelRatio = device.devicePixelRatio;
    }
    // macOS Firefox uses native GL (no ANGLE), so it reports vendor "Apple"
    // and a renderer naming the GPU family. "Google Inc. (Apple)" is Chrome's
    // ANGLE string and "Apple GPU" is Safari's, so replaying them verbatim
    // would be a synthetic mixture. Derive a coherent chip string from the
    // device name instead (M1/M2 Pro/M3 Max/...).
    let webglVendor = device.webglVendor;
    let webglRenderer = device.webglRenderer;
    if (device.platform === "MacIntel") {
      webglVendor = "Apple";
      let chip = /\bM[0-9](?:\s+(?:Pro|Max|Ultra))?\b/.exec(device.name);
      webglRenderer = chip ? `Apple ${chip[0]}` : "Apple GPU";
    }
    return {
      type: deviceType || "",
      name: device.name,
      platform: device.platform,
      userAgent: device.userAgent,
      oscpu: device.oscpu,
      appVersion: device.appVersion,
      navigatorPlatform: device.navigatorPlatform,
      hardwareConcurrency: device.hardwareConcurrency,
      maxTouchPoints: device.maxTouchPoints,
      doNotTrack: device.doNotTrack,
      screen,
      devicePixelRatio,
      webglVendor,
      webglRenderer,
      audioSampleRate: device.audioSampleRate,
      diskSizeGB: device.diskSizeGB,
      fontSet: [...device.fontSet],
      mediaDevices: device.mediaDevices.map(d => ({ ...d })),
    };
  },

  _generateStorage(device) {
    // Firefox's best-effort quota is min(10% of disk, 10 GiB): the temporary
    // storage limit is half the disk and the group limit is a fifth of that,
    // capped at 10 GiB (see QuotaManager). For any realistic disk this is a
    // constant 10 GiB, so diskSizeGB is no longer web-visible. The old 20–80%
    // fraction was Chrome's semantics and produced 100–800 GB, i.e. an
    // impossible value for Firefox.
    let diskSizeGB = device.diskSizeGB || 256;
    let diskBytes = diskSizeGB * 1024 * 1024 * 1024;
    let quota = Math.min(Math.floor(diskBytes * 0.10), 10 * 1024 * 1024 * 1024);
    // usage is intentionally not spoofed: estimate().usage is scoped to the
    // current origin, so a container-wide constant is trivially detectable by
    // re-reading it after writing a few bytes.
    return { quota };
  },

  _buildProfile(device, location, deviceType) {
    return {
      device: this._deviceToDict(device, deviceType),
      location: {
        country: location.country,
        timezone: location.timezone,
        language: location.language,
        languages: [...location.languages],
      },
      noise: {
        canvasSeed: generateRandomBytes(16),
        webglSeed: generateRandomBytes(16),
        textSeed: generateRandomBytes(16),
      },
      storage: this._generateStorage(device),
      webrtcHideIP: true,
      geolocation: "blocked",
      allowedExtensions: [],
    };
  },

  /**
   * Re-randomize only the device layer, keeping location and noise unchanged.
   * @param {number} userContextId
   * @param {object} [options]
   * @param {string} [options.deviceType] - One of "Mac", "Linux", "Windows".
   * @param {string} [options.deviceVariant] - Specific variant name. Takes
   *   precedence over deviceType.
   * @returns {object|null} The updated profile, or null if none exists.
   */
  rerollDevice(userContextId, { deviceType, deviceVariant } = {}) {
    let profile = this.getProfile(userContextId);
    if (!profile) {
      return null;
    }
    let device;
    if (deviceVariant) {
      for (let type of Object.keys(DEVICE_DATABASE)) {
        let found = DEVICE_DATABASE[type].find(d => d.name === deviceVariant);
        if (found) {
          device = found;
          break;
        }
      }
      if (!device) {
        throw new Error(`Unknown device variant: ${deviceVariant}`);
      }
    } else if (deviceType) {
      let variants = DEVICE_DATABASE[deviceType];
      if (!variants || variants.length === 0) {
        throw new Error(`Unknown device type: ${deviceType}`);
      }
      device = variants[Math.floor(Math.random() * variants.length)];
    } else {
      let allTypes = Object.keys(DEVICE_DATABASE);
      let randomType = allTypes[Math.floor(Math.random() * allTypes.length)];
      device = DEVICE_DATABASE[randomType][Math.floor(Math.random() * DEVICE_DATABASE[randomType].length)];
    }
    // Determine the device type for storage
    let resolvedType = deviceType || "";
    if (!resolvedType) {
      if (deviceVariant) {
        for (let type of Object.keys(DEVICE_DATABASE)) {
          if (DEVICE_DATABASE[type].includes(device)) {
            resolvedType = type;
            break;
          }
        }
      } else {
        // Random selection — find which type the device belongs to
        for (let type of Object.keys(DEVICE_DATABASE)) {
          if (DEVICE_DATABASE[type].includes(device)) {
            resolvedType = type;
            break;
          }
        }
      }
    }
    profile.device = this._deviceToDict(device, resolvedType);
    profile.storage = this._generateStorage(device);
    this.saveProfile(userContextId, profile);
    return profile;
  },

  /**
   * Re-randomize only the location layer, keeping device and noise unchanged.
   */
  rerollLocation(userContextId, country) {
    let profile = this.getProfile(userContextId);
    if (!profile) {
      return null;
    }
    let location = country
      ? LOCATION_DATABASE.find(l => l.country === country)
      : LOCATION_DATABASE[Math.floor(Math.random() * LOCATION_DATABASE.length)];
    if (!location) {
      throw new Error(`Unknown country: ${country}`);
    }
    profile.location = {
      country: location.country,
      timezone: location.timezone,
      language: location.language,
      languages: [...location.languages],
    };
    this.saveProfile(userContextId, profile);
    return profile;
  },

  /**
   * Re-randomize only the noise layer (canvas/webgl seeds), keeping device
   * and location unchanged.
   */
  rerollNoise(userContextId) {
    let profile = this.getProfile(userContextId);
    if (!profile) {
      return null;
    }
    profile.noise = {
      canvasSeed: generateRandomBytes(16),
      webglSeed: generateRandomBytes(16),
      textSeed: generateRandomBytes(16),
    };
    this.saveProfile(userContextId, profile);
    return profile;
  },

  /**
   * Get the stored profile for a container.
   * Checks the in-memory cache first, then ContainerAdapter, then disk.
   * @returns {object|null} The profile dict, or null if none exists.
   */
  getProfile(userContextId) {
    if (this._cache.has(userContextId)) {
      return this._cache.get(userContextId);
    }
    let profile = lazy.ContainerAdapter.getFingerprintProfile(userContextId);
    if (profile) {
      // Migration: populate device.type for old profiles that lack it.
      if (profile.device && !profile.device.type) {
        let devName = (profile.device.name || "").toLowerCase();
        if (devName.startsWith("mac")) {
          profile.device.type = "Mac";
        } else if (devName.startsWith("linux")) {
          profile.device.type = "Linux";
        } else if (devName.startsWith("windows")) {
          profile.device.type = "Windows";
        }
      }
      this._cache.set(userContextId, profile);
    }
    return profile;
  },

  /**
   * Save a profile for a container and sync to content processes.
   * Persists to both ContainerIdentityService (for cross-session stability)
   * and disk (via StorageAdapter as backup).
   * @param {number} userContextId
   * @param {object} profileDict - A FingerprintProfileDict-shaped object.
   */
  async saveProfile(userContextId, profileDict) {
    this._cache.set(userContextId, profileDict);

    // Store in ContextualIdentityService (persists across sessions).
    // userContextId 0 has no container identity, so only disk is used.
    if (userContextId !== 0) {
      lazy.ContainerAdapter.setFingerprintProfile(userContextId, profileDict);
    }

    // Push to content processes via PWindowGlobal IPC (synchronous — must
    // happen before any await so the profile takes effect immediately).
    let pushed =
      lazy.ProfileSyncAdapter.syncProfileToContentProcesses(userContextId, profileDict);
    if (pushed) {
      this._parentCachePrimed.add(userContextId);
    } else {
      this._parentCachePrimed.delete(userContextId);
      this._installWindowGlobalObserver();
    }

    // Also persist to disk as a backup (async, non-critical).
    try {
      await lazy.StorageAdapter.write(userContextId, profileDict);
    } catch (e) {
      Cu.reportError(`FingerprintProfileStore: failed to write to disk: ${e}`);
    }
  },

  /**
   * Remove the profile for a container.
   */
  async removeProfile(userContextId) {
    this._cache.delete(userContextId);
    if (userContextId !== 0) {
      lazy.ContainerAdapter.removeFingerprintProfile(userContextId);
    }
    try {
      await lazy.StorageAdapter.remove(userContextId);
    } catch (e) {
      // File may not exist; ignore.
    }
    // Clear in content processes.
    lazy.ProfileSyncAdapter.syncProfileToContentProcesses(userContextId, null);
  },

  /**
   * profileMode: the Profile used by non-container tabs (userContextId 0).
   *
   * Containers get their Profile from ContextualIdentityService; there is no
   * container identity 0, so without this those tabs have no Profile at all
   * and every font-roster check fails open, exposing the host's full font
   * table. The default is generated once (fixed Windows device + en-US),
   * persisted, and re-synced on every startup.
   *
   * @returns {Promise<object|null>} the default profile, or null when
   *   profileMode is off.
   */
  async ensureDefaultProfile() {
    if (!Services.prefs.getBoolPref("privacy.fingerprint.profileMode", false)) {
      return null;
    }
    this._installDefaultProfileObserver();
    this._installWindowGlobalObserver();
    if (this._cache.has(0)) {
      return this._cache.get(0);
    }
    let stored = null;
    try {
      stored = await lazy.StorageAdapter.read(0);
    } catch (e) {
      // Unreadable or missing: regenerate below.
    }
    if (!stored) {
      stored = this._buildProfile(
        DEVICE_DATABASE.Windows[0],
        LOCATION_DATABASE[0],
        "Windows"
      );
      try {
        await lazy.StorageAdapter.write(0, stored);
      } catch (e) {
        Cu.reportError(
          `FingerprintProfileStore: failed to write default profile: ${e}`
        );
      }
    }
    this._cache.set(0, stored);
    let pushed = lazy.ProfileSyncAdapter.syncProfileToContentProcesses(0, stored);
    if (pushed) {
      this._parentCachePrimed.add(0);
    } else {
      // No tab has a WindowGlobal yet (typical at startup), so the parent
      // cache is still empty; the observer installed above will push this
      // profile as soon as the first WindowGlobal for this container exists.
      this._parentCachePrimed.delete(0);
    }
    return stored;
  },

  _defaultProfileObserverInstalled: false,

  _installDefaultProfileObserver() {
    if (this._defaultProfileObserverInstalled) {
      return;
    }
    this._defaultProfileObserverInstalled = true;
    Services.prefs.addObserver("privacy.fingerprint.profileMode", () => {
      if (Services.prefs.getBoolPref("privacy.fingerprint.profileMode", false)) {
        this.ensureDefaultProfile().catch(Cu.reportError);
      } else {
        this.removeProfile(0).catch(Cu.reportError);
      }
    });
  },

  /**
   * Fallback for the startup race: syncProfileToContentProcesses() can run
   * before any tab in the container has a WindowGlobal, in which case nothing
   * lands in the parent-side cache and WindowGlobalParent::Init() has nothing
   * to replay to the first real document. Push the cached profile from here
   * as soon as such a WindowGlobal appears, which also primes the parent cache
   * for all later windows.
   */
  _installWindowGlobalObserver() {
    if (this._windowGlobalObserverInstalled) {
      return;
    }
    this._windowGlobalObserverInstalled = true;
    Services.obs.addObserver(subject => {
      let wgp = subject;
      let bc = wgp?.browsingContext;
      if (!bc) {
        return;
      }
      let userContextId = bc.originAttributes.userContextId;
      if (this._parentCachePrimed.has(userContextId)) {
        return;
      }
      let profile = this._cache.get(userContextId);
      if (!profile) {
        return;
      }
      try {
        wgp.updateProfile(profile);
        this._parentCachePrimed.add(userContextId);
      } catch (e) {
        Cu.reportError(
          `FingerprintProfileStore: failed to push cached profile to a new WindowGlobal: ${e}`
        );
      }
    }, "window-global-created");
  },
};
