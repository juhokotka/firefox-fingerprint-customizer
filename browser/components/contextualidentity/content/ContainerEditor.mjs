/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HTML_NS = "http://www.w3.org/1999/xhtml";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs",
  FingerprintProfileStore:
    "resource://gre/modules/FingerprintProfileStore.sys.mjs",
});

/**
 * Renders the contextual identity (container) create/edit form and applies the
 * change to the ContextualIdentityService. Shared between the preferences
 * subdialog and the container-creation panel anchored to the URL bar so that
 * the form markup and the create/update logic live in a single place.
 *
 * @param {Element} host
 *   The element the form is appended to.
 * @param {object} [options]
 * @param {?number} [options.userContextId]
 *   When set, the form edits the matching container; otherwise it creates one.
 * @param {?object} [options.identity]
 *   The initial { name, icon, color } values. Defaults to an empty name and the
 *   first available icon and color.
 */
export class ContainerEditor {
  constructor(host, { userContextId = null, identity = null } = {}) {
    this.host = host;
    this.document = host.ownerDocument;
    this.userContextId = userContextId;
    this.identity = identity || {
      name: "",
      // The fingerprint is the product's identity mark, so containers no
      // longer expose an icon picker.
      icon: "fingerprint",
      color: lazy.ContextualIdentityService.containerColors[0],
    };
    this._profile = null;
  }

  render() {
    let doc = this.document;
    doc.defaultView.MozXULElement.insertFTLIfNeeded(
      "browser/preferences/containers.ftl"
    );

    this.form = doc.createElementNS(HTML_NS, "form");
    this.form.className = "container-editor";

    this._name = doc.createElementNS(HTML_NS, "moz-input-text");
    this._name.setAttribute("name", "name");
    doc.l10n.setAttributes(this._name, "containers-name-label2");

    this._colorPicker = this._createPicker("color", "containers-color-label2");
    this._colorPicker.classList.add("color-swatches");

    this.form.append(this._name, this._colorPicker);

    // Fingerprint Settings section.
    this._buildFingerprintSection(doc);

    this.host.append(this.form);

    this._name.value = this.identity.name;
    this._buildSwatches(
      this._colorPicker,
      this.identity.color,
      lazy.ContextualIdentityService.containerColors,
      color => `identity-icon-circle identity-color-${color}`,
      color => lazy.ContextualIdentityService.getContainerColorLabel(color)
    );
    // Load existing profile or auto-generate one.
    this._initProfile();
  }

  _buildFingerprintSection(doc) {
    let section = doc.createElementNS(HTML_NS, "div");
    section.className = "fingerprint-section";

    let header = doc.createElementNS(HTML_NS, "h2");
    header.className = "fingerprint-heading";
    doc.l10n.setAttributes(header, "containers-fingerprint-header");
    section.append(header);

    let rows = doc.createElementNS(HTML_NS, "div");
    rows.className = "fingerprint-rows";

    this._deviceSelect = this._createSelect(
      "fingerprint-device",
      "containers-fingerprint-device",
      lazy.FingerprintProfileStore.getAvailableDeviceTypes().map(type => ({
        value: type,
        label: type,
      }))
    );
    this._countrySelect = this._createSelect(
      "fingerprint-country",
      "containers-fingerprint-country",
      lazy.FingerprintProfileStore.getAvailableCountries().map(loc => ({
        value: loc.country,
        label: `${loc.country} (${loc.language})`,
      }))
    );

    rows.append(this._deviceSelect, this._countrySelect);
    section.append(rows);

    let actions = doc.createElementNS(HTML_NS, "moz-button-group");
    actions.className = "fingerprint-actions";

    this._generateBtn = doc.createElementNS(HTML_NS, "moz-button");
    this._generateBtn.setAttribute("type", "primary");
    this._generateBtn.setAttribute(
      "data-l10n-id",
      "containers-fingerprint-regenerate"
    );
    this._generateBtn.addEventListener("click", () => this._regenerateProfile());
    actions.append(this._generateBtn);

    this._detailedEditBtn = doc.createElementNS(HTML_NS, "moz-button");
    this._detailedEditBtn.setAttribute(
      "data-l10n-id",
      "containers-fingerprint-detailed"
    );
    this._detailedEditBtn.addEventListener("click", () =>
      this._openDetailedEditor()
    );
    actions.append(this._detailedEditBtn);

    section.append(actions);

    this._profileSummary = doc.createElementNS(HTML_NS, "div");
    this._profileSummary.className = "fingerprint-summary";
    section.append(this._profileSummary);

    this.form.append(section);
  }

  /**
   * Builds a moz-select listing a leading "Random" choice followed by the given
   * choices. The field name is preserved so the control still answers to the
   * same lookups as the native select it replaces.
   *
   * @param {string} name
   *   The form field name.
   * @param {string} l10nId
   *   The Fluent id carrying the label.
   * @param {Array<{ value: string, label: string }>} choices
   *   The choices to append after the Random entry.
   * @returns {Element}
   */
  _createSelect(name, l10nId, choices) {
    let doc = this.document;
    let select = doc.createElementNS(HTML_NS, "moz-select");
    select.setAttribute("name", name);
    doc.l10n.setAttributes(select, l10nId);

    let random = doc.createElementNS(HTML_NS, "moz-option");
    random.setAttribute("value", "");
    random.setAttribute("data-l10n-id", "containers-fingerprint-random");
    select.append(random);

    for (let { value, label } of choices) {
      let option = doc.createElementNS(HTML_NS, "moz-option");
      option.setAttribute("value", value);
      option.setAttribute("label", label);
      select.append(option);
    }

    return select;
  }

  _initProfile() {
    if (this.userContextId) {
      this._profile = lazy.FingerprintProfileStore.getProfile(this.userContextId);
    }
    if (!this._profile) {
      this._profile = lazy.FingerprintProfileStore.generateProfile();
    }
    this._updateProfileSummary();
  }

  _regenerateProfile() {
    let deviceType = this._deviceSelect.value || undefined;
    let country = this._countrySelect.value || undefined;
    this._profile = lazy.FingerprintProfileStore.generateProfile({
      deviceType,
      country,
    });
    this._updateProfileSummary();
  }

  _openDetailedEditor() {
    try {
      let win = this.document.defaultView;
      // The editor runs inside a preferences subdialog iframe. openDialog is
      // only available on the top-level chrome window, so resolve it via
      // browsingContext.topChromeWindow.
      let topWin = win.browsingContext
        ? win.browsingContext.topChromeWindow
        : win;
      topWin.openDialog(
        "chrome://browser/content/fingerprintprofile/fingerprint-detailed-editor.xhtml",
        "_blank",
        "chrome,dialog=no,resizable,centerscreen,width=640,height=720",
        {
          profile: this._profile,
          userContextId: this.userContextId,
          onSave: (updatedProfile) => {
            this._profile = updatedProfile;
            this._updateProfileSummary();
          },
        }
      );
    } catch (e) {
      console.error("[ContainerEditor] Failed to open detailed editor:", e);
      this.document.defaultView.alert("Failed to open detailed editor: " + e.message);
    }
  }

  _updateProfileSummary() {
    if (!this._profile) {
      this._profileSummary.textContent = "";
      return;
    }
    let { device, location } = this._profile;
    let parts = [];
    if (device?.name) {
      parts.push(device.name);
    }
    if (location?.country) {
      parts.push(`${location.country} / ${location.timezone}`);
    }
    if (device?.userAgent) {
      parts.push(device.userAgent);
    }
    this._profileSummary.textContent = parts.join(" — ");
  }

  _createPicker(pickerName, l10nId) {
    let picker = this.document.createElementNS(HTML_NS, "moz-visual-picker");
    picker.setAttribute("type", "radio");
    picker.setAttribute("name", pickerName);
    picker.classList.add("swatches");
    this.document.l10n.setAttributes(picker, l10nId);
    return picker;
  }

  _buildSwatches(picker, selected, values, iconClass, getLabel) {
    let doc = this.document;
    for (let value of values) {
      let title = getLabel(value);

      let item = doc.createElementNS(HTML_NS, "moz-visual-picker-item");
      item.className = "swatch";
      item.value = value;
      item.ariaLabel = title;
      item.title = title;

      let icon = doc.createElementNS(HTML_NS, "span");
      icon.className = `userContext-icon ${iconClass(value)}`;

      item.append(icon);
      picker.append(item);
    }

    picker.value = selected;
  }

  focus() {
    this._name.focus();
  }

  get isValid() {
    return !!this._name.value.trim();
  }

  async commit() {
    let formData = new FormData(this.form);
    let containerName = formData.get("name").trim();
    let color = formData.get("color");
    // Fingerprint is the fixed container mark; there is no icon picker.
    let icon = "fingerprint";

    if (!lazy.ContextualIdentityService.getContainerColorCode(color)) {
      throw new Error("Internal error. The color value doesn't match.");
    }

    let userContextId = this.userContextId;
    if (userContextId) {
      lazy.ContextualIdentityService.update(
        userContextId,
        containerName,
        icon,
        color
      );
    } else {
      let identity = lazy.ContextualIdentityService.create(
        containerName,
        icon,
        color
      );
      userContextId = identity.userContextId;
    }

    // Save the fingerprint profile for this container.
    if (this._profile && userContextId) {
      await lazy.FingerprintProfileStore.saveProfile(
        userContextId,
        this._profile
      );
    }
  }
}
