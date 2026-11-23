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
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-device", [
      buildRow(
        doc,
        "fingerprint-editor-device-type",
        buildSelect(
          doc,
          "deviceType",
          lazy.FingerprintProfileStore.getAvailableDeviceTypes().map(type => ({
            value: type,
            label: type,
          })),
          profile.device?.name
        )
      ),
      buildRow(
        doc,
        "fingerprint-editor-device-variant",
        buildSelect(
          doc,
          "deviceVariant",
          getAllVariantNames().map(name => ({ value: name, label: name })),
          profile.device?.name
        )
      ),
      buildRow(
        doc,
        "fingerprint-editor-platform",
        buildInput(doc, "platform", profile.device?.platform)
      ),
      buildRow(
        doc,
        "fingerprint-editor-user-agent",
        buildInput(doc, "userAgent", profile.device?.userAgent)
      ),
      buildRow(
        doc,
        "fingerprint-editor-oscpu",
        buildInput(doc, "oscpu", profile.device?.oscpu)
      ),
      buildRow(
        doc,
        "fingerprint-editor-app-version",
        buildInput(doc, "appVersion", profile.device?.appVersion)
      ),
      buildRow(
        doc,
        "fingerprint-editor-navigator-platform",
        buildInput(doc, "navigatorPlatform", profile.device?.navigatorPlatform)
      ),
      buildRow(
        doc,
        "fingerprint-editor-hardware-concurrency",
        buildNumberInput(
          doc,
          "hardwareConcurrency",
          profile.device?.hardwareConcurrency
        )
      ),
      buildRow(
        doc,
        "fingerprint-editor-max-touch-points",
        buildNumberInput(doc, "maxTouchPoints", profile.device?.maxTouchPoints)
      ),
      buildRow(
        doc,
        "fingerprint-editor-do-not-track",
        buildInput(doc, "doNotTrack", profile.device?.doNotTrack)
      ),
      buildRow(
        doc,
        "fingerprint-editor-device-pixel-ratio",
        buildNumberInput(
          doc,
          "devicePixelRatio",
          profile.device?.devicePixelRatio
        )
      ),
      buildRow(
        doc,
        "fingerprint-editor-disk-size",
        buildNumberInput(doc, "diskSizeGB", profile.device?.diskSizeGB)
      ),
    ], true)
  );

  // Section: Screen
  let screen = profile.device?.screen || {};
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-screen", [
      buildRow(
        doc,
        "fingerprint-editor-screen-width",
        buildNumberInput(doc, "screenWidth", screen.width)
      ),
      buildRow(
        doc,
        "fingerprint-editor-screen-height",
        buildNumberInput(doc, "screenHeight", screen.height)
      ),
      buildRow(
        doc,
        "fingerprint-editor-screen-avail-width",
        buildNumberInput(doc, "screenAvailWidth", screen.availWidth)
      ),
      buildRow(
        doc,
        "fingerprint-editor-screen-avail-height",
        buildNumberInput(doc, "screenAvailHeight", screen.availHeight)
      ),
      buildRow(
        doc,
        "fingerprint-editor-screen-pixel-depth",
        buildNumberInput(doc, "screenPixelDepth", screen.pixelDepth)
      ),
      buildRow(
        doc,
        "fingerprint-editor-screen-color-depth",
        buildNumberInput(doc, "screenColorDepth", screen.colorDepth)
      ),
    ])
  );

  // Section: WebGL
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-webgl", [
      buildRow(
        doc,
        "fingerprint-editor-webgl-vendor",
        buildInput(doc, "webglVendor", profile.device?.webglVendor)
      ),
      buildRow(
        doc,
        "fingerprint-editor-webgl-renderer",
        buildInput(doc, "webglRenderer", profile.device?.webglRenderer)
      ),
    ])
  );

  // Section: Audio & Media
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-media", [
      buildRow(
        doc,
        "fingerprint-editor-audio-sample-rate",
        buildNumberInput(doc, "audioSampleRate", profile.device?.audioSampleRate)
      ),
      buildRow(
        doc,
        "fingerprint-editor-fonts",
        buildTextarea(
          doc,
          "fontSet",
          (profile.device?.fontSet || []).join(", ")
        )
      ),
    ])
  );

  // Section: Storage
  let storage = profile.storage || {};
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-storage", [
      buildRow(
        doc,
        "fingerprint-editor-storage-quota",
        buildNumberInput(doc, "storageQuota", storage.quota)
      ),
    ])
  );

  // Section: Location
  let location = profile.location || {};
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-location", [
      buildRow(
        doc,
        "fingerprint-editor-country",
        buildInput(doc, "country", location.country)
      ),
      buildRow(
        doc,
        "fingerprint-editor-timezone",
        buildInput(doc, "timezone", location.timezone)
      ),
      buildRow(
        doc,
        "fingerprint-editor-language",
        buildInput(doc, "language", location.language)
      ),
      buildRow(
        doc,
        "fingerprint-editor-languages",
        buildTextarea(doc, "languages", (location.languages || []).join(", "))
      ),
    ])
  );

  // Section: Noise
  let noise = profile.noise || {};
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-noise", [
      buildRow(
        doc,
        "fingerprint-editor-canvas-seed",
        buildTextarea(doc, "canvasSeed", toHex(noise.canvasSeed))
      ),
      buildRow(
        doc,
        "fingerprint-editor-webgl-seed",
        buildTextarea(doc, "webglSeed", toHex(noise.webglSeed))
      ),
      buildRow(
        doc,
        "fingerprint-editor-text-seed",
        buildTextarea(doc, "textSeed", toHex(noise.textSeed))
      ),
    ])
  );

  // Section: Privacy Options
  container.appendChild(
    buildSection(doc, "fingerprint-editor-section-privacy", [
      buildCheckbox(doc, "webrtcHideIP", profile.webrtcHideIP),
      buildRow(
        doc,
        "fingerprint-editor-geolocation",
        buildSelect(
          doc,
          "geolocation",
          [
            {
              value: "blocked",
              l10nId: "fingerprint-editor-geolocation-blocked",
            },
            {
              value: "allowed",
              l10nId: "fingerprint-editor-geolocation-allowed",
            },
          ],
          profile.geolocation
        )
      ),
    ])
  );

  // Regenerate buttons
  let btnRow = doc.createElementNS(HTML_NS, "moz-button-group");
  btnRow.className = "detailed-actions";

  let rerollDeviceBtn = makeButton(doc, "fingerprint-editor-reroll-device");
  rerollDeviceBtn.addEventListener("click", () => {
    reroll("rerollDevice");
  });

  let rerollLocationBtn = makeButton(doc, "fingerprint-editor-reroll-location");
  rerollLocationBtn.addEventListener("click", () => {
    reroll("rerollLocation");
  });

  let rerollNoiseBtn = makeButton(doc, "fingerprint-editor-reroll-noise");
  rerollNoiseBtn.addEventListener("click", () => {
    reroll("rerollNoise");
  });

  let recalcStorageBtn = makeButton(
    doc,
    "fingerprint-editor-recalculate-storage"
  );
  recalcStorageBtn.addEventListener("click", () => {
    let diskSizeGB =
      parseInt(container.querySelector('[name="diskSizeGB"]')?.value, 10) || 256;
    let diskBytes = diskSizeGB * 1024 * 1024 * 1024;
    // Firefox best-effort quota: min(10% of disk, 10 GiB).
    let quota = Math.min(Math.floor(diskBytes * 0.10), 10 * 1024 * 1024 * 1024);
    let quotaEl = container.querySelector('[name="storageQuota"]');
    if (quotaEl) {
      quotaEl.value = quota;
    }
  });

  btnRow.append(
    rerollDeviceBtn,
    rerollLocationBtn,
    rerollNoiseBtn,
    recalcStorageBtn
  );
  container.appendChild(btnRow);

  host.appendChild(container);

  function reroll(method) {
    if (!userContextId) {
      return;
    }
    let updated = lazy.FingerprintProfileStore[method](userContextId);
    host.textContent = "";
    buildEditor(host, updated, userContextId);
  }
}

function toHex(bytes) {
  return (bytes || []).map(b => b.toString(16).padStart(2, "0")).join("");
}

function buildSection(doc, titleId, rows, open = false) {
  let section = doc.createElementNS(HTML_NS, "details");
  section.className = "detailed-section";
  if (open) {
    section.setAttribute("open", "");
  }

  let header = doc.createElementNS(HTML_NS, "summary");
  header.className = "detailed-section-header";

  let title = doc.createElementNS(HTML_NS, "span");
  title.className = "detailed-section-title";
  doc.l10n.setAttributes(title, titleId);
  header.appendChild(title);
  section.appendChild(header);

  let grid = doc.createElementNS(HTML_NS, "div");
  grid.className = "detailed-grid";
  for (let row of rows) {
    grid.appendChild(row);
  }
  section.appendChild(grid);
  return section;
}

function buildRow(doc, labelId, control) {
  let row = doc.createElementNS(HTML_NS, "div");
  row.className = "detailed-row";
  if (control.localName === "moz-textarea") {
    row.classList.add("detailed-row-wide");
  }

  let label = doc.createElementNS(HTML_NS, "label");
  doc.l10n.setAttributes(label, labelId);
  row.appendChild(label);
  row.appendChild(control);
  return row;
}

function buildInput(doc, name, value) {
  let input = doc.createElementNS(HTML_NS, "moz-input-text");
  input.setAttribute("name", name);
  input.setAttribute("value", value || "");
  return input;
}

function buildNumberInput(doc, name, value) {
  let input = doc.createElementNS(HTML_NS, "moz-input-number");
  input.setAttribute("name", name);
  input.setAttribute("value", value || 0);
  return input;
}

function buildTextarea(doc, name, value) {
  let textarea = doc.createElementNS(HTML_NS, "moz-textarea");
  textarea.setAttribute("name", name);
  textarea.setAttribute("rows", "2");
  textarea.setAttribute("value", value || "");
  return textarea;
}

/**
 * @param {Document} doc
 * @param {string} name
 * @param {Array<{value: string, label?: string, l10nId?: string}>} choices
 * @param {string} [selected]
 */
function buildSelect(doc, name, choices, selected) {
  let values = choices.map(choice => choice.value);
  // Mirror the native select: fall back to the first option when the stored
  // value doesn't match any choice.
  let value = values.includes(selected) ? selected : values[0];

  let select = doc.createElementNS(HTML_NS, "moz-select");
  select.setAttribute("name", name);
  select.setAttribute("value", value);

  for (let { value: choiceValue, label, l10nId } of choices) {
    let option = doc.createElementNS(HTML_NS, "moz-option");
    option.setAttribute("value", choiceValue);
    if (l10nId) {
      doc.l10n.setAttributes(option, l10nId);
    } else {
      option.setAttribute("label", label ?? choiceValue);
    }
    select.appendChild(option);
  }
  return select;
}

function buildCheckbox(doc, name, checked) {
  let checkbox = doc.createElementNS(HTML_NS, "moz-checkbox");
  checkbox.className = "detailed-checkbox";
  checkbox.setAttribute("name", name);
  if (checked) {
    checkbox.setAttribute("checked", "true");
  }
  doc.l10n.setAttributes(checkbox, "fingerprint-editor-webrtc-hide-ip");
  return checkbox;
}

function makeButton(doc, l10nId) {
  let button = doc.createElementNS(HTML_NS, "moz-button");
  doc.l10n.setAttributes(button, l10nId);
  return button;
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

  // usage is not persisted: estimate().usage is per-origin and passed
  // through unchanged, so a container-level constant would be a signal.
  profile.storage = {
    quota: parseInt(getVal(form, "storageQuota"), 10),
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