/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

dictionary FingerprintScreenDict {
  long width = 0;
  long height = 0;
  long availWidth = 0;
  long availHeight = 0;
  long availLeft = 0;
  long availTop = 0;
  long pixelDepth = 0;
  long colorDepth = 0;
};

dictionary FingerprintMediaDeviceDict {
  DOMString kind = "";
  DOMString label = "";
};

dictionary FingerprintDeviceDict {
  DOMString name = "";
  DOMString platform = "";
  DOMString userAgent = "";
  DOMString oscpu = "";
  DOMString appVersion = "";
  DOMString navigatorPlatform = "";
  long hardwareConcurrency = 0;
  long maxTouchPoints = 0;
  DOMString doNotTrack = "";
  FingerprintScreenDict screen = {};
  double devicePixelRatio = 1.0;
  DOMString webglVendor = "";
  DOMString webglRenderer = "";
  long audioSampleRate = 48000;
  sequence<DOMString> fontSet = [];
  sequence<FingerprintMediaDeviceDict> mediaDevices = [];
};

dictionary FingerprintLocationDict {
  DOMString country = "";
  DOMString timezone = "";
  DOMString language = "";
  sequence<DOMString> languages = [];
};

dictionary FingerprintNoiseDict {
  sequence<octet> canvasSeed = [];
  sequence<octet> webglSeed = [];
  sequence<octet> textSeed = [];
};

dictionary FingerprintProfileDict {
  FingerprintDeviceDict device = {};
  FingerprintLocationDict location = {};
  FingerprintNoiseDict noise = {};
  boolean webrtcHideIP = false;
  DOMString geolocation = "";
  sequence<DOMString> allowedExtensions = [];
};

partial interface WindowGlobalParent {
  /**
   * Push a fingerprint Profile to the content process for this WindowGlobal's
   * container. The content process caches it keyed by userContextId.
   * Pass null to clear the Profile for this container.
   */
  [Throws]
  undefined updateProfile(optional FingerprintProfileDict profile = {});
};
