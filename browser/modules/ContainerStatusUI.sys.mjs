/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
});

export const ContainerStatusUI = {
  /**
   * Toggle the container panel open/closed.
   */
  togglePanel(event) {
    let button = event.target;
    let panel = button.ownerDocument.getElementById("containers-panel");
    if (panel.state === "open") {
      panel.hidePopup();
    } else {
      panel.openPopup(button, "after_start", 0, 0, false, false);
    }
  },

  /**
   * Toggle the container panel from a menu item.
   */
  togglePanelFromMenu(event) {
    let win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) return;
    let button = win.document.getElementById("urlbar-container-button");
    let panel = win.document.getElementById("containers-panel");
    if (panel.state === "open") {
      panel.hidePopup();
    } else {
      panel.openPopup(button, "after_start", 0, 0, false, false);
    }
  },

  /**
   * Build the panel content. Called on popupshowing.
   */
  buildPanelContent() {
    let panel = Services.wm.getMostRecentWindow("navigator:browser")
      .document.getElementById("containers-panel");
    let doc = panel.ownerDocument;
    let win = doc.defaultView;

    panel.textContent = "";

    let container = doc.createXULElement("vbox");
    container.className = "containers-panel-content";

    let containerMode = Services.prefs.getBoolPref("privacy.browser.containerMode", false);
    let userContextEnabled = Services.prefs.getBoolPref("privacy.userContext.enabled", false);

    // Normal Mode button at top
    let normalBtn = doc.createXULElement("button");
    normalBtn.className = "containers-panel-normal-btn";
    normalBtn.setAttribute("label", "Normal Mode");
    if (!containerMode) {
      normalBtn.setAttribute("disabled", "true");
      normalBtn.setAttribute("label", "✓ Normal Mode (Active)");
    }
    normalBtn.addEventListener("command", () => {
      this.switchToNormalMode();
      panel.hidePopup();
    });
    container.appendChild(normalBtn);

    // Separator
    let sep1 = doc.createXULElement("menuseparator");
    container.appendChild(sep1);

    // Container list
    let identities = lazy.ContextualIdentityService.getPublicIdentities();
    if (identities.length === 0) {
      let empty = doc.createXULElement("label");
      empty.textContent = "No containers yet. Click + to create one.";
      empty.className = "containers-panel-empty";
      container.appendChild(empty);
    } else {
      for (let identity of identities) {
        let item = this._buildContainerItem(doc, identity, panel);
        container.appendChild(item);
      }
    }

    // Separator
    let sep2 = doc.createXULElement("menuseparator");
    container.appendChild(sep2);

    // Add container button (+)
    let addBtn = doc.createXULElement("button");
    addBtn.className = "containers-panel-add-btn";
    addBtn.setAttribute("label", "+ New Container");
    addBtn.addEventListener("command", () => {
      win.openPreferences("containers");
      panel.hidePopup();
    });
    container.appendChild(addBtn);

    panel.appendChild(container);
  },

  /**
   * Build a single container item with edit icon.
   */
  _buildContainerItem(doc, identity, panel) {
    let row = doc.createXULElement("hbox");
    row.className = "containers-panel-item";
    row.setAttribute("align", "center");

    // Container icon
    let icon = doc.createXULElement("image");
    icon.className = "userContext-icon identity-icon-" + identity.icon +
      " identity-color-" + identity.color;
    icon.style.width = "16px";
    icon.style.height = "16px";

    // Container name
    let name = doc.createXULElement("label");
    name.className = "containers-panel-name";
    name.value = identity.name ||
      lazy.ContextualIdentityService.getUserContextLabel(identity.userContextId);

    // Edit pencil icon
    let editBtn = doc.createXULElement("toolbarbutton");
    editBtn.className = "containers-panel-edit-btn";
    editBtn.setAttribute("tooltiptext", "Edit");
    editBtn.style.width = "20px";
    editBtn.style.height = "20px";
    editBtn.addEventListener("command", e => {
      e.stopPropagation();
      let win = doc.defaultView;
      win.openPreferences("containers");
      panel.hidePopup();
    });

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(editBtn);

    // Click on the row (not the edit button) opens a container tab
    row.addEventListener("click", () => {
      this._openContainerTab(identity.userContextId);
      panel.hidePopup();
    });

    return row;
  },

  /**
   * Switch to normal mode (disable containers).
   */
  switchToNormalMode() {
    Services.prefs.setBoolPref("privacy.browser.containerMode", false);
    Services.prefs.setBoolPref("privacy.userContext.enabled", false);
    Services.prefs.setBoolPref("privacy.userContext.ui.enabled", false);
    this._updateButtonStatus();
  },

  /**
   * Switch to container mode (enable containers).
   */
  switchToContainerMode() {
    Services.prefs.setBoolPref("privacy.browser.containerMode", true);
    Services.prefs.setBoolPref("privacy.userContext.enabled", true);
    Services.prefs.setBoolPref("privacy.userContext.ui.enabled", true);
    this._updateButtonStatus();
  },

  /**
   * Update the button's visual status (red dot/off or green dot/on).
   */
  _updateButtonStatus() {
    let win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) {
      return;
    }
    let button = win.document.getElementById("urlbar-container-button");
    if (!button) {
      return;
    }

    let containerMode = Services.prefs.getBoolPref(
      "privacy.browser.containerMode",
      false
    );
    let dot = button.querySelector(".container-status-dot");
    let text = button.querySelector(".container-status-text");

    if (dot) {
      dot.className = "container-status-dot " + (containerMode ? "on" : "off");
    }
    if (text) {
      text.value = containerMode ? "Privacy Container: On" : "Privacy Container: Off";
    }
  },

  /**
   * Open a new tab in the given container.
   */
  _openContainerTab(userContextId) {
    let win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) {
      return;
    }

    // Enable container mode if not already
    let containerMode = Services.prefs.getBoolPref(
      "privacy.browser.containerMode",
      false
    );
    if (!containerMode) {
      this.switchToContainerMode();
    }

    win.gBrowser.addTab(win.BROWSER_NEW_TAB_URL, {
      userContextId,
    });
  },

  /**
   * Initialize: observe pref changes to update button status.
   */
  init() {
    Services.prefs.addObserver("privacy.browser.containerMode", () => {
      this._updateButtonStatus();
    });
    Services.prefs.addObserver("privacy.userContext.enabled", () => {
      this._updateButtonStatus();
    });
  },
};

// Initialize on module load
ContainerStatusUI.init();
