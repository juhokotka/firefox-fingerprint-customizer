/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
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

function buildContainerItem(identity) {
  let isOpen = hasOpenTabs(identity.userContextId);

  let item = document.createElement("button");
  item.type = "button";
  item.className = "container-item";

  // Leading icon: the same round, tinted identity badge used by every other
  // container surface.
  let badge = document.createElement("span");
  badge.className =
    "container-badge userContext-icon identity-icon-" +
    identity.icon +
    " identity-color-" +
    identity.color;
  item.appendChild(badge);

  let text = document.createElement("span");
  text.className = "container-text";

  let name = document.createElement("span");
  name.className = "container-name";
  name.textContent =
    identity.name ||
    lazy.ContextualIdentityService.getUserContextLabel(identity.userContextId);
  text.appendChild(name);

  let summary = getFingerprintSummary(identity.userContextId);
  if (summary) {
    let fingerprint = document.createElement("span");
    fingerprint.className = "container-fingerprint";
    fingerprint.textContent = summary;
    text.appendChild(fingerprint);
  }
  item.appendChild(text);

  let status = document.createElement("span");
  status.className = "container-status";
  let dot = document.createElement("span");
  dot.className = "status-dot " + (isOpen ? "status-on" : "status-off");
  let statusLabel = document.createElement("span");
  document.l10n.setAttributes(
    statusLabel,
    isOpen ? "sidebar-containers-in-use" : "sidebar-containers-idle"
  );
  status.append(dot, statusLabel);
  item.appendChild(status);

  item.addEventListener("click", () => {
    openContainerTab(identity.userContextId);
  });

  return item;
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
    list.appendChild(buildContainerItem(identity));
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