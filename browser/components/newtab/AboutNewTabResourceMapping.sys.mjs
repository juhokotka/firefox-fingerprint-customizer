/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Compatibility shim for the removed New Tab Page resource mapping.
 *
 * ASRouter is still present in this tree and reads the New Tab add-on version
 * while evaluating message targeting. The add-on no longer exists, so report
 * no version instead of failing to load the module.
 */

export const AboutNewTabResourceMapping = {
  addonVersion: null,

  init() {},

  uninit() {},
};
