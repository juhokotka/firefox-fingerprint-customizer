/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
});

/**
 * Thin adapter that wraps ContextualIdentityService calls.
 * FingerprintProfileStore depends only on this interface, not on
 * ContextualIdentityService directly.
 */
export const ContainerAdapter = {
  getContainers() {
    return lazy.ContextualIdentityService.getPublicIdentities();
  },

  getContainer(userContextId) {
    return lazy.ContextualIdentityService.getPublicIdentityFromId(userContextId);
  },

  getFingerprintProfile(userContextId) {
    let identity = lazy.ContextualIdentityService.getPublicIdentityFromId(
      userContextId
    );
    return identity?.fingerprintProfile ?? null;
  },

  setFingerprintProfile(userContextId, profile) {
    lazy.ContextualIdentityService.setFingerprintProfile(
      userContextId,
      profile
    );
  },

  removeFingerprintProfile(userContextId) {
    lazy.ContextualIdentityService.setFingerprintProfile(
      userContextId,
      null
    );
  },

  onContainerChanged(callback) {
    let observer = (_subject, topic, data) => {
      callback(topic, data);
    };
    Services.obs.addObserver(observer, "contextual-identity-created");
    Services.obs.addObserver(observer, "contextual-identity-updated");
    Services.obs.addObserver(observer, "contextual-identity-deleted");
    return () => {
      Services.obs.removeObserver(observer, "contextual-identity-created");
      Services.obs.removeObserver(observer, "contextual-identity-updated");
      Services.obs.removeObserver(observer, "contextual-identity-deleted");
    };
  },
};
