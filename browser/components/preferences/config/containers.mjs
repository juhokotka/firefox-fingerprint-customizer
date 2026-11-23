/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";
import { containerOptions } from "chrome://browser/content/usercontext/container-select.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "idnService", function () {
  return Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);
});

Preferences.addAll([
  {
    id: "browser.link.force_default_user_context_id_for_external_opens",
    type: "bool",
  },
]);

const IDENTITY_CHANGE_TOPICS = [
  "contextual-identity-created",
  "contextual-identity-updated",
  "contextual-identity-deleted",
  "contextual-identity-reordered",
];

const SITE_ASSOCIATION_CHANGE_TOPIC =
  "contextual-identity-site-association-changed";

const SWITCH_DURING_NAVIGATION_PREF =
  "privacy.containers.switchDuringNavigation.enabled";

function siteContainersEnabled() {
  return Services.prefs.getBoolPref(SWITCH_DURING_NAVIGATION_PREF, false);
}

// gotoPref records a previous category only for navigations within the settings,
// where the entrypoint of the URL, if any, belongs to another section.
let pendingSource = history.state?.previousCategory
  ? "preferences"
  : URL.fromURI(document.documentURIObject).searchParams.get("entrypoint");

let sectionShown = false;

document.addEventListener("paneshown", event => {
  if (event.detail.category != "paneContainers") {
    sectionShown = false;
    return;
  }
  // Re-requesting the already selected category dispatches paneshown again.
  if (sectionShown) {
    return;
  }
  sectionShown = true;

  Glean.containers.manageContainersOpened.record({
    source: pendingSource || "unknown",
  });
  // Coming back to the section is a navigation within the settings.
  pendingSource = "preferences";
});

function openContainerDialog(userContextId) {
  let identity = {
    name: "",
    icon: "fingerprint",
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

function openSiteContainerDialog() {
  window.gSubDialog.open(
    "chrome://browser/content/preferences/dialogs/siteContainer.xhtml"
  );
}

const HTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * Asks the user to confirm removing a container that still has open tabs.
 * Uses an in-page <dialog> so the confirmation matches the rest of the
 * settings UI instead of the native macOS prompt window.
 *
 * @param {number} count Number of open tabs in the container.
 * @returns {Promise<boolean>} Whether the removal should proceed.
 */
async function confirmRemoveContainer(count) {
  let [title, message, okButton, cancelButton] =
    await document.l10n.formatValues([
      { id: "containers-remove-alert-title" },
      { id: "containers-remove-alert-msg", args: { count } },
      { id: "containers-remove-ok-button" },
      { id: "containers-remove-cancel-button" },
    ]);

  let dialog = document.createElementNS(HTML_NS, "dialog");
  dialog.className = "container-confirm-dialog";

  let icon = document.createElementNS(HTML_NS, "span");
  icon.className = "container-confirm-icon";

  let heading = document.createElementNS(HTML_NS, "h2");
  heading.className = "container-confirm-title";
  heading.textContent = title;

  let body = document.createElementNS(HTML_NS, "p");
  body.className = "container-confirm-message";
  body.textContent = message;

  let content = document.createElementNS(HTML_NS, "div");
  content.className = "container-confirm-content";
  content.append(heading, body);

  let layout = document.createElementNS(HTML_NS, "div");
  layout.className = "container-confirm-layout";
  layout.append(icon, content);

  let actions = document.createElementNS(HTML_NS, "moz-button-group");
  actions.className = "container-confirm-actions";

  let cancel = document.createElementNS(HTML_NS, "moz-button");
  cancel.textContent = cancelButton;
  cancel.addEventListener("click", () => dialog.close("cancel"));

  let remove = document.createElementNS(HTML_NS, "moz-button");
  remove.setAttribute("type", "destructive");
  remove.textContent = okButton;
  remove.addEventListener("click", () => dialog.close("remove"));

  actions.append(cancel, remove);
  dialog.append(layout, actions);
  document.body.appendChild(dialog);

  let confirmed = await new Promise(resolve => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "remove"),
      { once: true }
    );
    dialog.showModal();
  });
  dialog.remove();
  return confirmed;
}

async function removeContainer(userContextId) {
  let count = lazy.ContextualIdentityService.countContainerTabs(userContextId);
  if (count > 0 && !(await confirmRemoveContainer(count))) {
    return;
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
            value: container.userContextId,
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

    /** @param {CustomEvent} event */
    onUserReorder(event) {
      const { draggedElement, insertAt } = event.detail;
      const userContextId = parseInt(draggedElement.getAttribute("value"), 10);
      lazy.ContextualIdentityService.move([userContextId], insertAt);
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
    Glean.containers.addContainerClicked.record({ source: "preferences" });
    openContainerDialog(null);
  },
});

Preferences.addSetting({
  id: "containers-new-tab-check",
  pref: "privacy.userContext.newTabContainerOnLeftClick.enabled",
});

Preferences.addSetting({
  id: "containers-external-links-check",
  pref: "browser.link.force_default_user_context_id_for_external_opens",
});

Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "site-containers-add-button";

    containers;

    beforeRefresh() {
      this.containers = lazy.ContextualIdentityService.getPublicIdentities();
    }

    async visible() {
      return siteContainersEnabled();
    }

    async disabled() {
      return !this.containers.length;
    }

    onUserClick() {
      openSiteContainerDialog();
    }

    setup() {
      for (const topic of IDENTITY_CHANGE_TOPICS) {
        Services.obs.addObserver(this.emitChange, topic);
      }
      Services.prefs.addObserver(
        SWITCH_DURING_NAVIGATION_PREF,
        this.emitChange
      );
      return () => {
        for (const topic of IDENTITY_CHANGE_TOPICS) {
          Services.obs.removeObserver(this.emitChange, topic);
        }
        Services.prefs.removeObserver(
          SWITCH_DURING_NAVIGATION_PREF,
          this.emitChange
        );
      };
    }
  }
);

Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "site-containers-list";

    associations;
    containers;

    beforeRefresh() {
      this.associations = lazy.ContextualIdentityService.getSiteAssociations()
        .map(({ site, userContextId }) => ({
          site,
          userContextId,
          displaySite: lazy.idnService.domainToDisplay(site),
        }))
        .sort((a, b) => a.displaySite.localeCompare(b.displaySite));
      this.containers = containerOptions();
    }

    async visible() {
      return siteContainersEnabled() && !!this.associations.length;
    }

    async getControlConfig() {
      let options = await Promise.all(
        this.associations.map(association => this.#itemConfig(association))
      );
      return { options };
    }

    async #itemConfig({ site, userContextId, displaySite }) {
      let [selectLabel] = await document.l10n.formatValues([
        { id: "containers-site-container-select", args: { site: displaySite } },
      ]);

      return {
        key: site,
        control: "moz-box-item",
        iconSrc: `page-icon:https://${site}/`,
        controlAttrs: {
          label: displaySite,
          value: site,
        },
        options: [
          {
            key: `${site}-container`,
            control: "container-select",
            value: String(userContextId),
            controlAttrs: {
              slot: "actions",
              size: "small",
              site,
              "aria-label": selectLabel,
            },
            options: this.containers.map(attrs => ({
              key: `${site}-container-${attrs.value}`,
              control: "moz-option",
              controlAttrs: attrs,
            })),
          },
          {
            key: `${site}-remove`,
            control: "moz-button",
            iconSrc: "chrome://global/skin/icons/delete.svg",
            l10nId: "containers-site-remove-button",
            controlAttrs: {
              slot: "actions",
              action: "remove",
              value: site,
            },
          },
        ],
      };
    }

    onUserClick(e) {
      if (e.target.getAttribute("action") !== "remove") {
        return;
      }
      lazy.ContextualIdentityService.removeSiteAssociation(
        e.target.getAttribute("value")
      );
    }

    setup() {
      const topics = [...IDENTITY_CHANGE_TOPICS, SITE_ASSOCIATION_CHANGE_TOPIC];
      for (const topic of topics) {
        Services.obs.addObserver(this.emitChange, topic);
      }
      Services.prefs.addObserver(
        SWITCH_DURING_NAVIGATION_PREF,
        this.emitChange
      );
      return () => {
        for (const topic of topics) {
          Services.obs.removeObserver(this.emitChange, topic);
        }
        Services.prefs.removeObserver(
          SWITCH_DURING_NAVIGATION_PREF,
          this.emitChange
        );
      };
    }
  }
);

SettingGroupManager.registerGroups({
  containers: {
    l10nId: "containers-card-header2",
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
          type: "reorderable-list",
        },
      },
      {
        id: "containers-new-tab-check",
        l10nId: "containers-new-tab-check3",
      },
      {
        id: "containers-external-links-check",
        l10nId: "containers-external-links-check",
      },
    ],
  },
  siteContainers: {
    l10nId: "containers-sites-card-header",
    headingLevel: 2,
    items: [
      {
        id: "site-containers-add-button",
        control: "moz-button",
        l10nId: "containers-sites-add-button",
      },
      {
        id: "site-containers-list",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
      },
    ],
  },
});
