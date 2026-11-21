/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Compatibility shim for the removed New Tab Page (Activity Stream).
 *
 * A number of browser components still ask AboutNewTab for the new tab URL
 * and for top site / visit identifiers. They now receive neutral values and
 * every new tab resolves to about:blank.
 */

const ABOUT_BLANK = "about:blank";

export const AboutNewTab = {
  QueryInterface: ChromeUtils.generateQI([
    "nsIObserver",
    "nsISupportsWeakReference",
  ]),

  initialized: false,
  activityStream: null,
  activityStreamDebug: false,

  _newTabURL: ABOUT_BLANK,
  _newTabURLOverridden: false,

  init() {
    this.initialized = true;
  },

  uninit() {
    this.initialized = false;
  },

  onBrowserReady() {},

  toggleActivityStream() {
    return false;
  },

  get newTabURL() {
    return this._newTabURL;
  },

  set newTabURL(aNewTabURL) {
    let newTabURL = aNewTabURL.trim();
    if (!newTabURL) {
      newTabURL = ABOUT_BLANK;
    }
    this._newTabURL = newTabURL;
    this._newTabURLOverridden = newTabURL !== ABOUT_BLANK;
    this.notifyChange();
  },

  get newTabURLOverridden() {
    return this._newTabURLOverridden;
  },

  get activityStreamEnabled() {
    return false;
  },

  get willNotifyUser() {
    return false;
  },

  resetNewTabURL() {
    this._newTabURLOverridden = false;
    this._newTabURL = ABOUT_BLANK;
    this.notifyChange();
  },

  notifyChange() {
    Services.obs.notifyObservers(null, "newtab-url-changed", this._newTabURL);
  },

  getTopSites() {
    return [];
  },

  getVisitId() {
    return null;
  },

  noteNonDefaultStartup() {},

  maybeRecordTopsitesPainted() {},

  observe() {},
};
