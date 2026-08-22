/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
});

const IDENTITY_CHANGE_TOPICS = [
  "contextual-identity-created",
  "contextual-identity-updated",
  "contextual-identity-deleted",
];

function openContainerDialog(userContextId) {
  let identity = {
    name: "",
    icon: lazy.ContextualIdentityService.containerIcons[0],
    color: lazy.ContextualIdentityService.containerColors[0],
  };
  if (userContextId) {
    identity =
      lazy.ContextualIdentityService.getPublicIdentityFromId(userContextId);
    identity.name = lazy.ContextualIdentityService.getUserContextLabel(
      identity.userContextId
    );
  }
  window.gSubDialog.open(
    "chrome://browser/content/preferences/dialogs/containers.xhtml",
    undefined,
    { userContextId, identity }
  );
}

async function removeContainer(userContextId) {
  let count = lazy.ContextualIdentityService.countContainerTabs(userContextId);
  if (count > 0) {
    let [title, message, okButton, cancelButton] =
      await document.l10n.formatValues([
        { id: "containers-remove-alert-title" },
        { id: "containers-remove-alert-msg", args: { count } },
        { id: "containers-remove-ok-button" },
        { id: "containers-remove-cancel-button" },
      ]);

    let buttonFlags =
      Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_0 +
      Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_1;

    let rv = Services.prompt.confirmEx(
      window,
      title,
      message,
      buttonFlags,
      okButton,
      cancelButton,
      null,
      null,
      {}
    );
    if (rv != 0) {
      return;
    }
  }
  // If the deleted container is the active privacy persona, clear the
  // persona state so the toolbar button doesn't point at a dead container.
  try {
    if (
      Services.prefs.getIntPref(
        "privacy.browser.selectedUserContextId", 0) == userContextId
    ) {
      Services.prefs.setBoolPref("privacy.browser.containerMode", false);
      Services.prefs.setBoolPref("privacy.fingerprint.profileMode", false);
      Services.prefs.setIntPref(
        "privacy.browser.selectedUserContextId", 0);
    }
  } catch (e) {
    console.error("[containers] persona pref cleanup failed:", e);
  }

  // Remove the identity BEFORE closing its tabs, and never await anything
  // before this point.  In persona/container mode the preferences page
  // itself usually lives in a tab of the container being deleted, so
  // closeContainerTabs() destroys this very document; any continuation
  // scheduled after an await (including the removal below) would die with
  // the nuked compartment and the container would silently survive.
  // Doing the synchronous removal first keeps deletion atomic even when
  // this page is closed as part of it.
  try {
    lazy.ContextualIdentityService.remove(userContextId);
  } catch (e) {
    console.error("[containers] remove failed:", e);
  }

  // Close the container's tabs last.  A failure or a hang in the
  // tab-removal pipeline cannot block the deletion anymore (it already
  // happened above), so the promise is only guarded to keep this function
  // from staying pending forever when the document survives.
  if (count > 0) {
    try {
      await Promise.race([
        lazy.ContextualIdentityService.closeContainerTabs(userContextId),
        new Promise(resolve => setTimeout(resolve, 5000)),
      ]);
    } catch (e) {
      console.error("[containers] closeContainerTabs failed:", e);
    }
  }
}

Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "containers-list";

    containers;

    beforeRefresh() {
      this.containers = lazy.ContextualIdentityService.getPublicIdentities();
    }

    async getControlConfig() {
      let items = this.containers.map(container => {
        const containerName =
          lazy.ContextualIdentityService.getUserContextLabel(
            container.userContextId
          );
        return {
          control: "moz-box-item",
          iconSrc: lazy.ContextualIdentityService.getContainerIconURL(
            container.icon
          ),
          controlAttrs: {
            label: containerName,
            class: `containers-identity-item identity-color-${container.color}`,
          },
          options: [
            {
              control: "moz-button",
              iconSrc: "chrome://global/skin/icons/edit-outline.svg",
              l10nId: "containers-settings-button2",
              controlAttrs: {
                slot: "actions",
                action: "edit",
                value: container.userContextId,
              },
            },
            {
              control: "moz-button",
              iconSrc: "chrome://global/skin/icons/delete.svg",
              l10nId: "containers-remove-button3",
              controlAttrs: {
                slot: "actions",
                action: "remove",
                value: container.userContextId,
              },
            },
          ],
        };
      });
      return { options: items };
    }

    async onUserClick(e) {
      const action = e.target.getAttribute("action");
      const value = parseInt(e.target.getAttribute("value"), 10);
      if (action === "edit") {
        openContainerDialog(value);
      } else if (action === "remove") {
        await removeContainer(value);
      }
    }

    setup() {
      for (const topic of IDENTITY_CHANGE_TOPICS) {
        Services.obs.addObserver(this.emitChange, topic);
      }
      return () => {
        for (const topic of IDENTITY_CHANGE_TOPICS) {
          Services.obs.removeObserver(this.emitChange, topic);
        }
      };
    }
  }
);

Preferences.addSetting({
  id: "containers-add-button",
  onUserClick() {
    openContainerDialog(null);
  },
});

Preferences.addSetting({
  id: "containers-new-tab-check",
  pref: "privacy.userContext.newTabContainerOnLeftClick.enabled",
});

SettingGroupManager.registerGroups({
  containers: {
    l10nId: "containers-card-header2",
    supportPage: "containers",
    headingLevel: 2,
    items: [
      {
        id: "containers-add-button",
        control: "moz-button",
        l10nId: "containers-add-button2",
      },
      {
        id: "containers-list",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
      },
      {
        id: "containers-new-tab-check",
        l10nId: "containers-new-tab-check3",
      },
    ],
  },
});
