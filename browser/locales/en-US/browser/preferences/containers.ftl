# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

containers-window-new3 =
    .title = Add New Container
    .style = min-width: 32em
# Variables
#   $name (String) - Name of the container
containers-window-update-settings3 =
    .title = { $name } Container Settings
    .style = min-width: 32em

containers-window-close =
    .key = w

containers-name-label2 =
    .label = Name
    .placeholder = Add a name

containers-icon-label2 =
    .label = Icon

containers-color-label2 =
    .label = Color

## Fingerprint settings in the container editor.

containers-fingerprint-header = Fingerprint Settings
containers-fingerprint-device =
    .label = Device
containers-fingerprint-country =
    .label = Location
containers-fingerprint-random =
    .label = Random
containers-fingerprint-regenerate =
    .label = Regenerate Fingerprint
containers-fingerprint-detailed =
    .label = Detailed Edit

## Detailed fingerprint editor (standalone dialog).

fingerprint-editor-window =
    .title = Fingerprint Editor
fingerprint-editor-dialog =
    .buttonlabelaccept = Save
    .buttonaccesskeyaccept = S

fingerprint-editor-section-device = Device
fingerprint-editor-section-screen = Screen
fingerprint-editor-section-webgl = WebGL
fingerprint-editor-section-media = Audio & Media
fingerprint-editor-section-storage = Storage
fingerprint-editor-section-location = Location
fingerprint-editor-section-noise = Fingerprint Noise
fingerprint-editor-section-privacy = Privacy Options

fingerprint-editor-device-type = Device Type
fingerprint-editor-device-variant = Specific Variant
fingerprint-editor-platform = Platform
fingerprint-editor-user-agent = User Agent
fingerprint-editor-oscpu = OS CPU
fingerprint-editor-app-version = App Version
fingerprint-editor-navigator-platform = Navigator Platform
fingerprint-editor-hardware-concurrency = Hardware Concurrency
fingerprint-editor-max-touch-points = Max Touch Points
fingerprint-editor-do-not-track = Do Not Track
fingerprint-editor-device-pixel-ratio = Device Pixel Ratio
fingerprint-editor-disk-size = Disk Size (GB)

fingerprint-editor-screen-width = Width
fingerprint-editor-screen-height = Height
fingerprint-editor-screen-avail-width = Avail Width
fingerprint-editor-screen-avail-height = Avail Height
fingerprint-editor-screen-pixel-depth = Pixel Depth
fingerprint-editor-screen-color-depth = Color Depth

fingerprint-editor-webgl-vendor = Vendor
fingerprint-editor-webgl-renderer = Renderer

fingerprint-editor-audio-sample-rate = Audio Sample Rate
fingerprint-editor-fonts = Fonts (comma-separated)

fingerprint-editor-storage-quota = Quota (bytes)
fingerprint-editor-storage-usage = Usage (bytes)

fingerprint-editor-country = Country
fingerprint-editor-timezone = Timezone
fingerprint-editor-language = Language
fingerprint-editor-languages = Languages (comma-separated)

fingerprint-editor-canvas-seed = Canvas Seed (hex)
fingerprint-editor-webgl-seed = WebGL Seed (hex)
fingerprint-editor-text-seed = Text Seed (hex)

fingerprint-editor-geolocation = Geolocation
fingerprint-editor-geolocation-blocked =
    .label = Blocked
fingerprint-editor-geolocation-allowed =
    .label = Allowed
fingerprint-editor-webrtc-hide-ip =
    .label = WebRTC Hide IP

fingerprint-editor-reroll-device =
    .label = Reroll Device
fingerprint-editor-reroll-location =
    .label = Reroll Location
fingerprint-editor-reroll-noise =
    .label = Reroll Noise
fingerprint-editor-recalculate-storage =
    .label = Recalculate Storage

containers-dialog2 =
    .buttonlabelaccept = Save
    .buttonaccesskeyaccept = S

## Dialog that binds a website to a container.

containers-site-window =
    .title = Add Website

containers-site-label =
    .label = Website
    .placeholder = example.com

containers-site-container-label =
    .label = Container

containers-site-dialog =
    .buttonlabelaccept = Save
    .buttonaccesskeyaccept = S

# Shown below the website field when the typed website is not a host, or when
# it is a URL that does not use the https scheme.
containers-site-invalid-error = Enter a valid, secure website
# Shown below the website field when the typed website is already bound to a
# container.
containers-site-duplicate-error = This website is already in your list

## Container creation panel, anchored to the URL bar.

containers-panel-title = Add New Container
containers-panel-create-button =
    .label = Done
containers-panel-cancel-button =
    .label = Cancel

## Container status button in the URL bar.

# Title of the toolbar button that reports the container / persona state.
container-status-button =
    .tooltiptext = Privacy Container
# $name (String) - name of the active container (persona).
container-status-active = Privacy Container: { $name }
# Label of the toolbar button when no privacy container is active.
container-status-off = Containers
container-status-normal = Containers
# Short chip label; the tooltip and panel carry the details.
container-status-mismatch = Mismatch
# $name (String) - name of the active container (persona).
container-status-tooltip-active =
    .tooltiptext = Active persona: { $name }
# $target (String) - the container the selected tab is actually browsing as,
# or a description of a normal tab.
# $persona (String) - description of the browser-level identity.
container-status-tooltip-mismatch =
    .tooltiptext = This tab is browsing as { $target }. { $persona } Click for options.

## Containers panel, anchored to the URL bar button.

containers-list-title = Privacy Containers
containers-list-normal-mode = Normal Mode
containers-list-empty = No containers yet.
containers-list-add =
    .label = New Container
containers-list-edit =
    .tooltiptext = Edit container

## Identity mismatch card. The prose is split into fragments so the two
## container names can be rendered as inline pills between them.

containers-mismatch-title = Identity mismatch
containers-mismatch-persona-lead = This tab is browsing as
containers-mismatch-persona-mid = . Your active persona is
containers-mismatch-persona-tail = .
containers-mismatch-normal-lead = This is a normal tab using your real device fingerprint. Your active persona is
containers-mismatch-normal-tail = .
containers-mismatch-off-lead = This tab is still browsing as
containers-mismatch-off-tail = , but privacy containers are off. New pages you open will use your real fingerprint.
# $name (String) - name of the container to reopen the tab in.
containers-mismatch-reopen =
    .label = Reopen in { $name }
# $name (String) - name of the container to adopt as the active persona.
containers-mismatch-switch =
    .label = Switch to { $name }
containers-mismatch-close-tab =
    .label = Close tab
containers-mismatch-reopen-normal =
    .label = Reopen as normal tab
containers-mismatch-keep =
    .label = Keep
