/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "resource://gre/modules/ContextualIdentityService.sys.mjs",
  FingerprintProfileStore:
    "resource://gre/modules/FingerprintProfileStore.sys.mjs",
});

function getBrowserWindow() {
  return window.browsingContext.topChromeWindow;
}

function hasOpenTabs(userContextId) {
  let win = getBrowserWindow();
  if (!win || !win.gBrowser) {
    return false;
  }
  for (let tab of win.gBrowser.tabs) {
    if (
      tab.hasAttribute("usercontextid") &&
      parseInt(tab.getAttribute("usercontextid"), 10) === userContextId
    ) {
      return true;
    }
  }
  return false;
}

function openContainerTab(userContextId) {
  let win = getBrowserWindow();
  if (!win) {
    return;
  }
  win.gBrowser.addTab(win.BROWSER_NEW_TAB_URL, {
    userContextId,
  });
}

function getFingerprintSummary(userContextId) {
  try {
    let profile = lazy.FingerprintProfileStore.getProfile(userContextId);
    if (!profile) {
      return "";
    }
    let parts = [];
    if (profile.device?.name) {
      parts.push(profile.device.name);
    }
    if (profile.location?.country) {
      parts.push(`${profile.location.country} / ${profile.location.timezone}`);
    }
    return parts.join(" — ");
  } catch (e) {
    return "";
  }
}

function renderContainers() {
  let list = document.getElementById("containers-list");
  let empty = document.getElementById("containers-empty");
  let identities = lazy.ContextualIdentityService.getPublicIdentities();

  list.textContent = "";

  if (identities.length === 0) {
    list.hidden = true;
    empty.hidden = false;
    return;
  }

  list.hidden = false;
  empty.hidden = true;

  for (let identity of identities) {
    let item = document.createElement("div");
    item.className = "container-item";

    let isOpen = hasOpenTabs(identity.userContextId);

    // Status dot
    let dot = document.createElement("span");
    dot.className = "status-dot " + (isOpen ? "status-on" : "status-off");

    // Icon
    let icon = document.createElement("img");
    icon.className = "container-icon";
    icon.src = lazy.ContextualIdentityService.getContainerIconURL(identity.icon);

    // Name
    let name = document.createElement("span");
    name.className = "container-name";
    name.textContent = identity.name ||
      lazy.ContextualIdentityService.getUserContextLabel(identity.userContextId);

    // Status text
    let status = document.createElement("span");
    status.className = "container-status";
    status.textContent = isOpen ? "on" : "off";

    item.appendChild(dot);
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(status);

    // Fingerprint summary
    let fpSummary = getFingerprintSummary(identity.userContextId);
    if (fpSummary) {
      let fp = document.createElement("div");
      fp.className = "container-fingerprint";
      fp.textContent = fpSummary;
      item.appendChild(fp);
    }

    item.addEventListener("click", () => {
      openContainerTab(identity.userContextId);
    });

    list.appendChild(item);
  }
}

document.getElementById("new-container-btn").addEventListener("click", () => {
  let win = getBrowserWindow();
  if (win) {
    win.openPreferences("containers");
  }
});

// Render on load
renderContainers();

// Re-render when tabs change (container opened/closed)
let win = getBrowserWindow();
if (win) {
  win.gBrowser.tabContainer.addEventListener("TabOpen", renderContainers);
  win.gBrowser.tabContainer.addEventListener("TabClose", renderContainers);
}

// Re-render when sidebar is shown
window.addEventListener("focus", renderContainers);
