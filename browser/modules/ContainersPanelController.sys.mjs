/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
});

export const ContainersPanelController = {
  /**
   * Build the panel content showing all containers with their status.
   * @param {Document} doc - The browser window document.
   * @param {Element} panel - The panel element to populate.
   */
  buildPanel(doc, panel) {
    // Clear existing content
    panel.textContent = "";

    let container = doc.createXULElement("vbox");
    container.className = "containers-panel-content";

    let identities = lazy.ContextualIdentityService.getPublicIdentities();

    if (identities.length === 0) {
      let empty = doc.createXULElement("label");
      empty.textContent = "No containers yet. Create one to get started.";
      empty.className = "containers-panel-empty";
      container.appendChild(empty);
    } else {
      for (let identity of identities) {
        let item = this._buildContainerItem(doc, identity);
        container.appendChild(item);
      }
    }

    // Add "New Container" button at the bottom
    let separator = doc.createXULElement("menuseparator");
    container.appendChild(separator);

    let newBtn = doc.createXULElement("button");
    newBtn.className = "containers-panel-new-btn";
    newBtn.setAttribute("label", "New Container");
    newBtn.addEventListener("command", () => {
      doc.defaultView.openPreferences("containers");
    });
    container.appendChild(newBtn);

    panel.appendChild(container);
  },

  /**
   * Build a single container item row with status indicator.
   */
  _buildContainerItem(doc, identity) {
    let row = doc.createXULElement("hbox");
    row.className = "containers-panel-item";
    row.setAttribute("align", "center");

    // Check if this container has open tabs
    let hasOpenTabs = this._hasOpenTabs(identity.userContextId);

    // Status indicator (green/red dot)
    let dot = doc.createElementNS("http://www.w3.org/1999/xhtml", "span");
    dot.className = "containers-status-dot " +
      (hasOpenTabs ? "containers-status-on" : "containers-status-off");

    // Container icon
    let icon = doc.createXULElement("image");
    icon.className = "userContext-icon identity-icon-" + identity.icon +
      " identity-color-" + identity.color;
    icon.style.width = "16px";
    icon.style.height = "16px";

    // Container name
    let name = doc.createXULElement("label");
    name.className = "containers-panel-name";
    let nameText = identity.name || lazy.ContextualIdentityService.getUserContextLabel(identity.userContextId);
    name.value = nameText;

    // Status text
    let status = doc.createXULElement("label");
    status.className = "containers-panel-status";
    status.value = hasOpenTabs ? "on" : "off";

    row.appendChild(dot);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(status);

    // Click to open a new tab in this container
    row.addEventListener("click", () => {
      this._openContainerTab(identity.userContextId);
      // Hide the panel
      let panel = row.closest("panel");
      if (panel) {
        panel.hidePopup();
      }
    });

    return row;
  },

  /**
   * Check if a container has any open tabs.
   */
  _hasOpenTabs(userContextId) {
    for (let win of Services.wm.getEnumerator("navigator:browser")) {
      if (win.closed || !win.gBrowser) {
        continue;
      }
      for (let tab of win.gBrowser.tabs) {
        if (
          tab.hasAttribute("usercontextid") &&
          parseInt(tab.getAttribute("usercontextid"), 10) === userContextId
        ) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Open a new tab in the given container.
   */
  _openContainerTab(userContextId) {
    let win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) {
      return;
    }
    win.gBrowser.addTab(win.BROWSER_NEW_TAB_URL, {
      userContextId,
    });
  },
};
