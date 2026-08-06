/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Thin adapter that triggers PWindowGlobal IPC sync to push a fingerprint
 * Profile to all content processes hosting tabs in the given container.
 *
 * Also sets BrowsingContext override fields (LanguageOverride, TimezoneOverride,
 * UserAgentOverride, PlatformOverride, OscpuOverride) on every top-level
 * BrowsingContext in the container — these are separate from the ProfileArgs
 * IPC and are consumed by the Gecko layer directly.
 */
export const ProfileSyncAdapter = {
  /**
   * Push a profile (or null to clear) to every content process that has at
   * least one top-level tab in the given container.
   *
   * @param {number} userContextId
   * @param {object|null} profileDict - A FingerprintProfileDict-shaped plain
   *   object, or null to clear the profile.
   */
  syncProfileToContentProcesses(userContextId, profileDict) {
    for (let win of Services.wm.getEnumerator("navigator:browser")) {
      let gBrowser = win.gBrowser;
      if (!gBrowser) {
        continue;
      }
      for (let tab of gBrowser.tabs) {
        let browser = tab.linkedBrowser;
        if (!browser?.browsingContext) {
          continue;
        }
        let bc = browser.browsingContext;
        if (bc.originAttributes.userContextId !== userContextId) {
          continue;
        }

        // Push ProfileArgs to content process via PWindowGlobal.
        let wgp = bc.currentWindowGlobal;
        if (wgp) {
          try {
            wgp.updateProfile(profileDict);
          } catch (e) {
            Cu.reportError(
              `ProfileSyncAdapter: failed to sync profile to WGP for userContextId ${userContextId}: ${e}`
            );
          }
        }

        // Set BrowsingContext override fields on the top-level BC.
        if (profileDict) {
          this._applyBrowsingContextOverrides(bc, profileDict);
        }
      }
    }
  },

  /**
   * Set language, timezone, UA, platform, and oscpu overrides on the
   * top-level BrowsingContext.  These are consumed by the Gecko layer
   * (Navigator, DateTimeFormat, nsHttpHandler, etc.) independently of
   * the ProfileArgs IPC cache.
   */
  _applyBrowsingContextOverrides(bc, profileDict) {
    let top = bc.top;
    let { device, location } = profileDict;
    if (!device && !location) {
      return;
    }

    // Each override is set in its own try/catch so that a failure on one
    // field does not prevent the others from being applied.
    // WebIDL exposes these as attributes (not setXxx() methods):
    //   languageOverride, timezoneOverride, customUserAgent,
    //   customPlatform, customOscpu
    if (location) {
      if (location.languages?.length) {
        try {
          top.languageOverride = location.languages.join(",");
        } catch (e) {
          Cu.reportError(`ProfileSyncAdapter: languageOverride failed: ${e}`);
        }
      }
      if (location.timezone) {
        try {
          top.timezoneOverride = location.timezone;
        } catch (e) {
          Cu.reportError(`ProfileSyncAdapter: timezoneOverride failed: ${e}`);
        }
      }
    }
    if (device) {
      if (device.userAgent) {
        try {
          top.customUserAgent = device.userAgent;
        } catch (e) {
          Cu.reportError(`ProfileSyncAdapter: customUserAgent failed: ${e}`);
        }
      }
      if (device.platform) {
        try {
          top.customPlatform = device.platform;
        } catch (e) {
          Cu.reportError(`ProfileSyncAdapter: customPlatform failed: ${e}`);
        }
      }
      if (device.oscpu) {
        try {
          top.customOscpu = device.oscpu;
        } catch (e) {
          Cu.reportError(`ProfileSyncAdapter: customOscpu failed: ${e}`);
        }
      }
    }
  },
};
