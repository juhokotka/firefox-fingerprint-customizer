/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Minimal nsIAboutModule for about:home and about:newtab.
 *
 * The full New Tab Page (Activity Stream) has been removed from this build.
 * Both pages now resolve to the built-in blank tab so that typing
 * about:newtab or about:home still produces a valid, empty document.
 */

const BLANK_TAB_URL = "chrome://browser/content/blanktab.html";

class AboutNewTabRedirector {
  constructor() {
    this.wrappedJSObject = this;
  }

  getURIFlags() {
    return (
      Ci.nsIAboutModule.ALLOW_SCRIPT |
      Ci.nsIAboutModule.URI_MUST_LOAD_IN_CHILD |
      Ci.nsIAboutModule.URI_CAN_LOAD_IN_PRIVILEGEDABOUT_PROCESS |
      Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT
    );
  }

  getChromeURI() {
    return Services.io.newURI(BLANK_TAB_URL);
  }

  newChannel(uri, loadInfo) {
    let channel = Services.io.newChannelFromURIWithLoadInfo(
      this.getChromeURI(),
      loadInfo
    );
    channel.originalURI = uri;
    return channel;
  }

  QueryInterface = ChromeUtils.generateQI(["nsIAboutModule"]);
}

export function AboutNewTabRedirectorStub() {
  return new AboutNewTabRedirector();
}
