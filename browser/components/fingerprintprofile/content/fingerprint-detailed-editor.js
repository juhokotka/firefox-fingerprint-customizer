/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HTML_NS = "http://www.w3.org/1999/xhtml";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FingerprintProfileStore:
    "resource://gre/modules/FingerprintProfileStore.sys.mjs",
});

let loadedResolvers = Promise.withResolvers();
document.mozSubdialogReady = loadedResolvers.promise;

window.addEventListener("DOMContentLoaded", async () => {
  try {
    let params = window.arguments[0] || {};
    let profile = params.profile;
    let userContextId = params.userContextId;
    let host = document.getElementById("detailedEditorHost");

    buildEditor(host, profile, userContextId);
  } catch (e) {
    console.error("fingerprint-detailed-editor: failed to render:", e);
    Cu.reportError(e);
  } finally {
    loadedResolvers.resolve();
  }
});

function buildEditor(host, profile, userContextId) {
  let doc = host.ownerDocument;

  let container = doc.createElementNS(HTML_NS, "div");
  container.className = "detailed-fingerprint-editor";

  // Section: Device
  container.appendChild(buildSection(doc, "Device", [
    buildRow(doc, "Device Type", buildSelect(doc, "deviceType",
      lazy.FingerprintProfileStore.getAvailableDeviceTypes(), profile.device?.name)),
    buildRow(doc, "Specific Variant", buildSelect(doc, "deviceVariant",
      getAllVariantNames(), profile.device?.name)),
    buildRow(doc, "Platform", buildInput(doc, "platform", profile.device?.platform)),
    buildRow(doc, "User Agent", buildInput(doc, "userAgent", profile.device?.userAgent)),
    buildRow(doc, "OS CPU", buildInput(doc, "oscpu", profile.device?.oscpu)),
    buildRow(doc, "App Version", buildInput(doc, "appVersion", profile.device?.appVersion)),
    buildRow(doc, "Navigator Platform", buildInput(doc, "navigatorPlatform", profile.device?.navigatorPlatform)),
    buildRow(doc, "Hardware Concurrency", buildNumberInput(doc, "hardwareConcurrency", profile.device?.hardwareConcurrency)),
    buildRow(doc, "Max Touch Points", buildNumberInput(doc, "maxTouchPoints", profile.device?.maxTouchPoints)),
    buildRow(doc, "Do Not Track", buildInput(doc, "doNotTrack", profile.device?.doNotTrack)),
    buildRow(doc, "Device Pixel Ratio", buildNumberInput(doc, "devicePixelRatio", profile.device?.devicePixelRatio)),
    buildRow(doc, "Disk Size (GB)", buildNumberInput(doc, "diskSizeGB", profile.device?.diskSizeGB)),
  ]));

  // Section: Screen
  let screen = profile.device?.screen || {};
  container.appendChild(buildSection(doc, "Screen", [
    buildRow(doc, "Width", buildNumberInput(doc, "screenWidth", screen.width)),
    buildRow(doc, "Height", buildNumberInput(doc, "screenHeight", screen.height)),
    buildRow(doc, "Avail Width", buildNumberInput(doc, "screenAvailWidth", screen.availWidth)),
    buildRow(doc, "Avail Height", buildNumberInput(doc, "screenAvailHeight", screen.availHeight)),
    buildRow(doc, "Pixel Depth", buildNumberInput(doc, "screenPixelDepth", screen.pixelDepth)),
    buildRow(doc, "Color Depth", buildNumberInput(doc, "screenColorDepth", screen.colorDepth)),
  ]));

  // Section: WebGL
  container.appendChild(buildSection(doc, "WebGL", [
    buildRow(doc, "Vendor", buildInput(doc, "webglVendor", profile.device?.webglVendor)),
    buildRow(doc, "Renderer", buildInput(doc, "webglRenderer", profile.device?.webglRenderer)),
  ]));

  // Section: Audio & Media
  container.appendChild(buildSection(doc, "Audio & Media", [
    buildRow(doc, "Audio Sample Rate", buildNumberInput(doc, "audioSampleRate", profile.device?.audioSampleRate)),
    buildRow(doc, "Fonts (comma-separated)", buildTextarea(doc, "fontSet", (profile.device?.fontSet || []).join(", "))),
  ]));

  // Section: Storage
  let storage = profile.storage || {};
  container.appendChild(buildSection(doc, "Storage", [
    buildRow(doc, "Quota (bytes)", buildNumberInput(doc, "storageQuota", storage.quota)),
    buildRow(doc, "Usage (bytes)", buildNumberInput(doc, "storageUsage", storage.usage)),
  ]));

  // Section: Location
  let location = profile.location || {};
  container.appendChild(buildSection(doc, "Location", [
    buildRow(doc, "Country", buildInput(doc, "country", location.country)),
    buildRow(doc, "Timezone", buildInput(doc, "timezone", location.timezone)),
    buildRow(doc, "Language", buildInput(doc, "language", location.language)),
    buildRow(doc, "Languages (comma-separated)", buildTextarea(doc, "languages", (location.languages || []).join(", "))),
  ]));

  // Section: Noise
  let noise = profile.noise || {};
  container.appendChild(buildSection(doc, "Fingerprint Noise", [
    buildRow(doc, "Canvas Seed (hex)", buildTextarea(doc, "canvasSeed", (noise.canvasSeed || []).map(b => b.toString(16).padStart(2, "0")).join(""))),
    buildRow(doc, "WebGL Seed (hex)", buildTextarea(doc, "webglSeed", (noise.webglSeed || []).map(b => b.toString(16).padStart(2, "0")).join(""))),
    buildRow(doc, "Text Seed (hex)", buildTextarea(doc, "textSeed", (noise.textSeed || []).map(b => b.toString(16).padStart(2, "0")).join(""))),
  ]));

  // Section: Privacy Options
  container.appendChild(buildSection(doc, "Privacy Options", [
    buildRow(doc, "WebRTC Hide IP", buildCheckbox(doc, "webrtcHideIP", profile.webrtcHideIP)),
    buildRow(doc, "Geolocation", buildSelect(doc, "geolocation", ["blocked", "allowed"], profile.geolocation)),
  ]));

  // Regenerate buttons
  let btnRow = doc.createElementNS(HTML_NS, "div");
  btnRow.className = "detailed-btn-row";

  let rerollDeviceBtn = doc.createElementNS(HTML_NS, "button");
  rerollDeviceBtn.textContent = "Reroll Device";
  rerollDeviceBtn.type = "button";
  rerollDeviceBtn.addEventListener("click", () => {
    if (userContextId) {
      profile = lazy.FingerprintProfileStore.rerollDevice(userContextId);
      host.textContent = "";
      buildEditor(host, profile, userContextId);
    }
  });

  let rerollNoiseBtn = doc.createElementNS(HTML_NS, "button");
  rerollNoiseBtn.textContent = "Reroll Noise";
  rerollNoiseBtn.type = "button";
  rerollNoiseBtn.addEventListener("click", () => {
    if (userContextId) {
      profile = lazy.FingerprintProfileStore.rerollNoise(userContextId);
      host.textContent = "";
      buildEditor(host, profile, userContextId);
    }
  });

  let rerollLocationBtn = doc.createElementNS(HTML_NS, "button");
  rerollLocationBtn.textContent = "Reroll Location";
  rerollLocationBtn.type = "button";
  rerollLocationBtn.addEventListener("click", () => {
    if (userContextId) {
      profile = lazy.FingerprintProfileStore.rerollLocation(userContextId);
      host.textContent = "";
      buildEditor(host, profile, userContextId);
    }
  });

  let recalcStorageBtn = doc.createElementNS(HTML_NS, "button");
  recalcStorageBtn.textContent = "Recalculate Storage";
  recalcStorageBtn.type = "button";
  recalcStorageBtn.addEventListener("click", () => {
    let diskSizeGB =
      parseInt(container.querySelector('[name="diskSizeGB"]')?.value, 10) || 256;
    let diskBytes = diskSizeGB * 1024 * 1024 * 1024;
    let quotaFraction = 0.20 + Math.random() * 0.60;
    let quota = Math.floor(diskBytes * quotaFraction);
    let usageMB = 5 * Math.pow(10, Math.random() * 2);
    let usage = Math.floor(usageMB * 1024 * 1024);
    usage = Math.min(usage, Math.floor(quota * 0.01));
    usage = Math.max(usage, 5 * 1024 * 1024);
    let quotaEl = container.querySelector('[name="storageQuota"]');
    let usageEl = container.querySelector('[name="storageUsage"]');
    if (quotaEl) quotaEl.value = quota;
    if (usageEl) usageEl.value = usage;
  });

  btnRow.append(rerollDeviceBtn, rerollLocationBtn, rerollNoiseBtn,
                recalcStorageBtn);
  container.appendChild(btnRow);

  host.appendChild(container);
}

function buildSection(doc, title, rows) {
  let section = doc.createElementNS(HTML_NS, "fieldset");
  let legend = doc.createElementNS(HTML_NS, "legend");
  legend.textContent = title;
  section.appendChild(legend);
  for (let row of rows) {
    section.appendChild(row);
  }
  return section;
}

function buildRow(doc, label, control) {
  let row = doc.createElementNS(HTML_NS, "div");
  row.className = "detailed-row";
  let labelEl = doc.createElementNS(HTML_NS, "label");
  labelEl.textContent = label;
  row.appendChild(labelEl);
  row.appendChild(control);
  return row;
}

function buildInput(doc, name, value) {
  let input = doc.createElementNS(HTML_NS, "input");
  input.name = name;
  input.value = value || "";
  input.className = "detailed-input";
  return input;
}

function buildNumberInput(doc, name, value) {
  let input = doc.createElementNS(HTML_NS, "input");
  input.type = "number";
  input.name = name;
  input.value = value || 0;
  input.className = "detailed-input";
  return input;
}

function buildTextarea(doc, name, value) {
  let ta = doc.createElementNS(HTML_NS, "textarea");
  ta.name = name;
  ta.value = value || "";
  ta.rows = 2;
  ta.className = "detailed-input";
  return ta;
}

function buildSelect(doc, name, options, selected) {
  let select = doc.createElementNS(HTML_NS, "select");
  select.name = name;
  select.className = "detailed-input";
  for (let opt of options) {
    let option = doc.createElementNS(HTML_NS, "option");
    option.value = opt;
    option.textContent = opt;
    if (opt === selected) {
      option.selected = true;
    }
    select.appendChild(option);
  }
  return select;
}

function buildCheckbox(doc, name, checked) {
  let input = doc.createElementNS(HTML_NS, "input");
  input.type = "checkbox";
  input.name = name;
  input.checked = !!checked;
  input.className = "detailed-checkbox";
  return input;
}

function getAllVariantNames() {
  let names = [];
  let types = lazy.FingerprintProfileStore.getAvailableDeviceTypes();
  for (let type of types) {
    let variants = lazy.FingerprintProfileStore.getDeviceVariants(type);
    for (let v of variants) {
      names.push(v.name);
    }
  }
  return names;
}

// Handle Save button
document.addEventListener("dialogaccept", () => {
  let params = window.arguments[0] || {};
  let profile = params.profile;
  if (!profile) return;

  // Collect all form values
  let form = document.querySelector(".detailed-fingerprint-editor");

  profile.device.platform = getVal(form, "platform");
  profile.device.userAgent = getVal(form, "userAgent");
  profile.device.oscpu = getVal(form, "oscpu");
  profile.device.appVersion = getVal(form, "appVersion");
  profile.device.navigatorPlatform = getVal(form, "navigatorPlatform");
  profile.device.hardwareConcurrency = parseInt(getVal(form, "hardwareConcurrency"), 10);
  profile.device.maxTouchPoints = parseInt(getVal(form, "maxTouchPoints"), 10);
  profile.device.doNotTrack = getVal(form, "doNotTrack");
  profile.device.devicePixelRatio = parseFloat(getVal(form, "devicePixelRatio"));

  profile.device.screen.width = parseInt(getVal(form, "screenWidth"), 10);
  profile.device.screen.height = parseInt(getVal(form, "screenHeight"), 10);
  profile.device.screen.availWidth = parseInt(getVal(form, "screenAvailWidth"), 10);
  profile.device.screen.availHeight = parseInt(getVal(form, "screenAvailHeight"), 10);
  profile.device.screen.pixelDepth = parseInt(getVal(form, "screenPixelDepth"), 10);
  profile.device.screen.colorDepth = parseInt(getVal(form, "screenColorDepth"), 10);

  profile.device.webglVendor = getVal(form, "webglVendor");
  profile.device.webglRenderer = getVal(form, "webglRenderer");

  profile.device.audioSampleRate = parseInt(getVal(form, "audioSampleRate"), 10);
  profile.device.diskSizeGB = parseInt(getVal(form, "diskSizeGB"), 10);
  profile.device.fontSet = getVal(form, "fontSet").split(",").map(s => s.trim()).filter(s => s);

  profile.storage = {
    quota: parseInt(getVal(form, "storageQuota"), 10),
    usage: parseInt(getVal(form, "storageUsage"), 10),
  };

  profile.location.country = getVal(form, "country");
  profile.location.timezone = getVal(form, "timezone");
  profile.location.language = getVal(form, "language");
  profile.location.languages = getVal(form, "languages").split(",").map(s => s.trim()).filter(s => s);

  // Parse hex seeds
  let canvasHex = getVal(form, "canvasSeed");
  if (canvasHex) {
    profile.noise.canvasSeed = [];
    for (let i = 0; i < canvasHex.length; i += 2) {
      profile.noise.canvasSeed.push(parseInt(canvasHex.substr(i, 2), 16));
    }
  }
  let webglHex = getVal(form, "webglSeed");
  if (webglHex) {
    profile.noise.webglSeed = [];
    for (let i = 0; i < webglHex.length; i += 2) {
      profile.noise.webglSeed.push(parseInt(webglHex.substr(i, 2), 16));
    }
  }
  let textHex = getVal(form, "textSeed");
  if (textHex) {
    profile.noise.textSeed = [];
    for (let i = 0; i < textHex.length; i += 2) {
      profile.noise.textSeed.push(parseInt(textHex.substr(i, 2), 16));
    }
  }

  profile.webrtcHideIP = form.querySelector('[name="webrtcHideIP"]').checked;
  profile.geolocation = getVal(form, "geolocation");

  // Save
  if (params.userContextId) {
    lazy.FingerprintProfileStore.saveProfile(params.userContextId, profile);
  }

  // Call callback if provided
  if (params.onSave) {
    params.onSave(profile);
  }
});

function getVal(form, name) {
  let el = form.querySelector(`[name="${name}"]`);
  return el ? el.value : "";
}
