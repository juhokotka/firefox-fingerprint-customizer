/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The about:home startup cache was part of the New Tab Page implementation,
 * which has been removed from this build. Keep a no-op object so the
 * browser-before-ui-startup category entry and BrowserGlue's shutdown path
 * continue to work.
 */

export const AboutHomeStartupCache = {
  init() {},
  uninit() {},
};
