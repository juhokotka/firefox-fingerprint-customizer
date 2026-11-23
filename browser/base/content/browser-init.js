/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let _resolveDelayedStartup;
var delayedStartupPromise = new Promise(resolve => {
  _resolveDelayedStartup = resolve;
});

var gBrowserInit = {
  delayedStartupFinished: false,
  domContentLoaded: false,

  _tabToAdopt: undefined,
  _firstContentWindowPaintDeferred: Promise.withResolvers(),
  idleTasksFinished: Promise.withResolvers(),
  _reducedProtectionPrefObserver: null,

  /**
   * Handles considerations when the enabled state of the Translations feature
   * changes during runtime, such as being blocked or re-enabled in the AI Settings.
   */
  _translationsEnabledStateObserver: {
    observe(_subject, topic, data) {
      if (topic !== "translations:enabled-state-changed") {
        console.warn(`received unexpected topic: ${topic}`);
        return;
      }

      // Ensures that the Application Menu correctly includes or omits the translate-page menu item.
      XULBrowserWindow._updateElementsForContentType();

      if (data === "enabled") {
        // When the feature is re-enabled, ensure that actor instances exist for all tabs.
        // This loop is synchronous, but should be lightweight to instantiate only the actor objects.
        // Any expensive work is scheduled asynchronously to the event loop by the actor itself after construction.
        for (const tab of gBrowser.tabs) {
          try {
            const windowGlobal =
              tab.linkedBrowser?.browsingContext?.currentWindowGlobal;

            if (
              !windowGlobal ||
              windowGlobal.isClosed ||
              !windowGlobal.isCurrentGlobal
            ) {
              // This tab's windowGlobal is not relevant to create a Translations actor.
              continue;
            }

            // Ensure that a Translations actor instance is (re)created for each open tab that is allowed to have one.
            windowGlobal.getActor("Translations");
          } catch {
            // Not every tab is allowed to have a Translations actor, which is okay.
            // See ActorManagerParent for the official allow list of URLs.
          }
        }
      }
    },
  },

  _setupFirstContentWindowPaintPromise() {
    let lastTransactionId = window.windowUtils.lastTransactionId;
    let layerTreeListener = () => {
      if (this.getTabToAdopt()) {
        // Need to wait until we finish adopting the tab, or we might end
        // up focusing the initial browser and then losing focus when it
        // gets swapped out for the tab to adopt.
        return;
      }
      removeEventListener("MozLayerTreeReady", layerTreeListener);
      let listener = e => {
        if (e.transactionId > lastTransactionId) {
          window.removeEventListener("MozAfterPaint", listener);
          this._firstContentWindowPaintDeferred.resolve();
        }
      };
      addEventListener("MozAfterPaint", listener);
    };
    addEventListener("MozLayerTreeReady", layerTreeListener);
  },

  getTabToAdopt() {
    if (this._tabToAdopt !== undefined) {
      return this._tabToAdopt;
    }

    if (window.arguments && window.XULElement.isInstance(window.arguments[0])) {
      this._tabToAdopt = window.arguments[0];

      // Clear the reference of the tab being adopted from the arguments.
      window.arguments[0] = null;
    } else {
      // There was no tab to adopt in the arguments, set _tabToAdopt to null
      // to avoid checking it again.
      this._tabToAdopt = null;
    }

    return this._tabToAdopt;
  },

  _clearTabToAdopt() {
    this._tabToAdopt = null;
  },

  // Used to check if the new window is still adopting an existing tab as its first tab
  // (e.g. from the WebExtensions internals).
  isAdoptingTab() {
    return !!this.getTabToAdopt();
  },

  onBeforeInitialXULLayout() {
    this._setupFirstContentWindowPaintPromise();

    if (!window.toolbar.visible) {
      document.documentElement.setAttribute("popup-window", true);
    }

    updateBookmarkToolbarVisibility();

    // Set a sane starting width/height for all resolutions on new profiles.
    if (ChromeUtils.shouldResistFingerprinting("RoundWindowSize", null)) {
      // When the fingerprinting resistance is enabled, making sure that we don't
      // have a maximum window to interfere with generating rounded window dimensions.
      document.documentElement.setAttribute("sizemode", "normal");
    } else if (!document.documentElement.hasAttribute("width")) {
      const TARGET_WIDTH = 1280;
      const TARGET_HEIGHT = 1040;
      let width = Math.min(screen.availWidth * 0.9, TARGET_WIDTH);
      let height = Math.min(screen.availHeight * 0.9, TARGET_HEIGHT);

      document.documentElement.setAttribute("width", width);
      document.documentElement.setAttribute("height", height);

      if (width < TARGET_WIDTH && height < TARGET_HEIGHT) {
        document.documentElement.setAttribute("sizemode", "maximized");
      }
    }
    {
      const toolbarMenubar = document.getElementById("toolbar-menubar");
      const nativeMenubar = Services.appinfo.nativeMenubar;
      toolbarMenubar.collapsed = nativeMenubar;
      if (nativeMenubar) {
        toolbarMenubar.removeAttribute("autohide");
      } else {
        document.l10n.setAttributes(
          toolbarMenubar,
          "toolbar-context-menu-menu-bar-cmd"
        );
        toolbarMenubar.setAttribute("data-l10n-attrs", "toolbarname");
      }
    }
    // If opening a Taskbar Tab or AI window, add an attribute to the top-level element
    // to inform window styling.
    if (window.arguments?.[1] instanceof Ci.nsIPropertyBag2) {
      let extraOptions = window.arguments[1];
      if (extraOptions.hasKey("taskbartab")) {
        let taskbarTabId = extraOptions.getPropertyAsAString("taskbartab");
        let taskbarTabClass = extraOptions.get("taskbartabclass");
        if (taskbarTabClass) {
          window.document.documentElement.setAttribute(
            "windowclass",
            taskbarTabClass
          );
        }
        window.document.documentElement.setAttribute(
          "taskbartab",
          taskbarTabId
        );
        window.document.documentElement.id = "taskbartab-" + taskbarTabId;
      }
      if (extraOptions.hasKey("ai-window")) {
        document.documentElement.setAttribute("ai-window", true);
      }
      if (extraOptions.hasKey("aiwindow-immersive-view")) {
        document.documentElement.setAttribute("aiwindow-immersive-view", true);
      }
      if (extraOptions.hasKey("chromeless-window")) {
        document.documentElement.setAttribute("chromeless-window", true);
      }
      if (extraOptions.hasKey("web-extension-popup-window")) {
        document.documentElement.setAttribute(
          "web-extension-popup-window",
          true
        );
      }
      if (extraOptions.hasKey("aswebauth")) {
        document.documentElement.setAttribute("aswebauth", true);
      }
    }

    let tabToAdopt = this.getTabToAdopt();
    if (tabToAdopt?.hasAttribute?.("mini-window")) {
      document.documentElement.setAttribute("mini-window", "true");
      if (tabToAdopt.hasAttribute("cropped-mini-window")) {
        document.documentElement.setAttribute("cropped-mini-window", "true");
      }
    }

    // Run menubar initialization first, to avoid CustomTitlebar code picking
    // up mutations from it and causing a reflow.
    BrowserUtils.callModulesFromCategory(
      {
        categoryName:
          "browser-window-before-initial-xul-layout-document-preparation",
        jsGlobal: globalThis,
      },
      window
    );

    // Update the customtitlebar attribute so the window can be sized
    // correctly.
    window.TabBarVisibility.update();

    if (
      Services.prefs.getBoolPref(
        "toolkit.legacyUserProfileCustomizations.windowIcon",
        false
      )
    ) {
      document.documentElement.setAttribute("icon", "main-window");
    }

    // The following modules would be initialized:
    // CustomTitlebar, LightweightThemeConsumer, and ToolbarIconColor.
    // ToolbarIconColor.init should be called after we set the attributes, since
    // it might change the toolbars' computed text color.
    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-before-initial-xul-layout",
        jsGlobal: globalThis,
      },
      window
    );
  },

  onDOMContentLoaded() {
    // All of this needs setting up before we create the first remote browser.
    window.docShell.treeOwner
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIAppWindow).XULBrowserWindow = window.XULBrowserWindow;
    BrowserUtils.callModulesFromCategory(
      { categoryName: "browser-window-domcontentloaded-before-tabbrowser" },
      window
    );

    // This adds gBrowser to the global scope.
    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-domcontentloaded-tabbrowser",
        jsGlobal: globalThis,
      },
      window
    );
    gURLBar.addGBrowserListeners();
    if (Services.prefs.getBoolPref("browser.search.widget.new", false)) {
      document.getElementById("searchbar-new")?.addGBrowserListeners();
    }

    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-domcontentloaded",
        jsGlobal: globalThis,
      },
      window
    );

    // Hack to ensure that the various initial pages favicon is loaded
    // instantaneously, to avoid flickering and improve perceived performance.
    this._callWithURIToLoad(uriToLoad => {
      let url = URL.parse(uriToLoad);
      if (!url) {
        return;
      }
      let nonQuery = url.URI.prePath + url.pathname;
      if (nonQuery in gPageIcons) {
        gBrowser.setIcon(gBrowser.selectedTab, gPageIcons[nonQuery]);
      }
    });

    updateFxaToolbarMenu(gFxaToolbarEnabled, true);

    updatePrintCommands(gPrintEnabled);

    // Setting the focus will cause a style flush, it's preferable to call anything
    // that will modify the DOM from within this function before this call.
    this._setInitialFocus();

    this.domContentLoaded = true;
  },

  onLoad() {
    gBrowser.addEventListener("DOMUpdateBlockedPopups", e =>
      PopupAndRedirectBlockerObserver.handleEvent(e)
    );
    gBrowser.addEventListener("DOMUpdateBlockedRedirect", e =>
      PopupAndRedirectBlockerObserver.handleEvent(e)
    );
    gBrowser.addEventListener(
      "TranslationsParent:LanguageState",
      FullPageTranslationsPanel
    );
    gBrowser.addEventListener(
      "TranslationsParent:OfferTranslation",
      FullPageTranslationsPanel
    );
    gBrowser.tabContainer.addEventListener("TabSelect", () => {
      FullPageTranslationsPanel.onLocationChange(gBrowser.selectedBrowser);
    });
    gBrowser.addTabsProgressListener(FullPageTranslationsPanel);

    window.addEventListener("AppCommand", HandleAppCommandEvent, true);

    if (!gMultiProcessBrowser) {
      // There is a Content:Click message manually sent from content.
      gBrowser.tabpanels.addEventListener("click", contentAreaClick, {
        capture: true,
        mozSystemGroup: true,
      });
    }

    // hook up UI through progress listener
    gBrowser.addProgressListener(window.XULBrowserWindow);
    gBrowser.addTabsProgressListener(window.TabsProgressListener);

    // TODO bug 2038578: audit these consumers and move any that don't need
    // to run before SessionStore's per-window init to 'browser-window-load'.
    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-load-before-sessionstore-init",
        jsGlobal: globalThis,
      },
      window
    );

    // Certain kinds of automigration rely on this notification to complete
    // their tasks BEFORE the browser window is shown. SessionStore uses it to
    // restore tabs into windows AFTER important parts like gMultiProcessBrowser
    // have been initialized.
    Services.obs.notifyObservers(window, "browser-window-before-show");

    if (
      !window.toolbar.visible ||
      window.document.documentElement.hasAttribute("taskbartab") ||
      window.document.documentElement.hasAttribute("cropped-mini-window")
    ) {
      // adjust browser UI for popups
      gURLBar.readOnly = true;
    }

    BrowserUtils.callModulesFromCategory(
      { categoryName: "browser-window-load", jsGlobal: globalThis },
      window
    );

    // Update UI if browser is under remote control.
    gRemoteControl.updateVisualCue();

    // If we are given a tab to swap in, take care of it before first paint to
    // avoid an about:blank flash.
    let tabToAdopt = this.getTabToAdopt();
    if (tabToAdopt) {
      let evt = new CustomEvent("before-initial-tab-adopted", {
        bubbles: true,
      });
      gBrowser.tabpanels.dispatchEvent(evt);

      // Stop the about:blank load
      gBrowser.stop();

      // Remove the speculative focus from the urlbar to let the url be formatted.
      gURLBar.removeAttribute("focused");

      let swapBrowsers = () => {
        if (Tabbrowser.isTabGroupLabel(tabToAdopt)) {
          // TODO bug 1967937: Merge this case with the tab group case below.
          gBrowser.adoptTabGroup(tabToAdopt.group, { elementIndex: 0 });
          gBrowser.removeTab(gBrowser.selectedTab);
        } else if (Tabbrowser.isTabGroup(tabToAdopt)) {
          // Via gBrowser.replaceGroupWithWindow
          let tempBlankTab = gBrowser.selectedTab;
          gBrowser.adoptTabGroup(tabToAdopt, { tabIndex: 0, selectTab: true });
          gBrowser.removeTab(tempBlankTab);
          Glean.tabgroup.groupInteractions.move_window.add(1);
        } else if (Tabbrowser.isSplitViewWrapper(tabToAdopt)) {
          let tempBlankTab = gBrowser.selectedTab;
          let splitview = gBrowser.adoptSplitView(tabToAdopt, {
            elementIndex: 0,
            selectTab: true,
          });
          // If tabs are multiselected, add the newly adopted splitview back into the selection
          if (gBrowser.selectedTabs.length > 1) {
            gBrowser.addRangeToMultiSelectedTabs(
              splitview.tabs[0],
              splitview.tabs[splitview.tabs.length - 1]
            );
          }
          gBrowser.removeTab(tempBlankTab);
        } else {
          if (tabToAdopt.group) {
            Glean.tabgroup.tabInteractions.remove_new_window.add();
          }
          gBrowser.swapBrowsersAndCloseOther(gBrowser.selectedTab, tabToAdopt);
        }

        // Clear the reference to the tab once its adoption has been completed.
        this._clearTabToAdopt();
      };
      if (
        Tabbrowser.isTab(tabToAdopt) &&
        !tabToAdopt.linkedBrowser.isRemoteBrowser
      ) {
        swapBrowsers();
      } else {
        // For remote browsers, wait for the paint event, otherwise the tabs
        // are not yet ready and focus gets confused because the browser swaps
        // out while tabs are switching.
        addEventListener("MozAfterPaint", swapBrowsers, { once: true });
      }
    }

    // Wait until chrome is painted before executing code not critical to making the window visible
    this._boundDelayedStartup = this._delayedStartup.bind(this);
    window.addEventListener("MozAfterPaint", this._boundDelayedStartup);

    if (!PrivateBrowsingUtils.enabled) {
      document.getElementById("Tools:PrivateBrowsing").hidden = true;
      document.getElementById("menu_newPrivateWindow").hidden = true;
      // Setting disabled doesn't disable the shortcut, so we just remove
      // the keybinding.
      document.getElementById("key_privatebrowsing").remove();
    }

    if (BrowserUIUtils.quitShortcutDisabled) {
      document.getElementById("key_quitApplication").remove();
      document.getElementById("menu_FileQuitItem").removeAttribute("key");

      PanelMultiView.getViewNode(
        document,
        "appMenu-quit-button2"
      )?.removeAttribute("key");
    }

    if (window.browsingContext.isDocumentPiP) {
      for (const cmd of ["Browser:AddBookmarkAs", "Browser:Reload"]) {
        document.getElementById(cmd).setAttribute("disabled", "true");
      }
    }

    this._loadHandled = true;
  },

  _cancelDelayedStartup() {
    window.removeEventListener("MozAfterPaint", this._boundDelayedStartup);
    this._boundDelayedStartup = null;
  },

  _delayedStartup() {
    Glean.browserTimings.startupTimeline.delayedStartupStarted.set(
      Services.telemetry.msSinceProcessStart()
    );

    this._cancelDelayedStartup();

    gBrowser.addEventListener(
      "PermissionStateChange",
      function () {
        gIdentityHandler.refreshIdentityBlock();
        gPermissionPanel.updateSharingIndicator();
      },
      true
    );

    this._handleURIToLoad();

    Services.obs.addObserver(gIdentityHandler, "perm-changed");
    Services.obs.addObserver(gRemoteControl, "devtools-socket");
    Services.obs.addObserver(gRemoteControl, "marionette-listening");
    Services.obs.addObserver(gRemoteControl, "remote-listening");
    Services.obs.addObserver(
      gSessionHistoryObserver,
      "browser:purge-session-history"
    );
    Services.obs.addObserver(
      gStoragePressureObserver,
      "QuotaManager::StoragePressure"
    );
    Services.obs.addObserver(gXPInstallObserver, "addon-install-disabled");
    Services.obs.addObserver(gXPInstallObserver, "addon-install-started");
    Services.obs.addObserver(gXPInstallObserver, "addon-install-blocked");
    Services.obs.addObserver(
      gXPInstallObserver,
      "addon-install-fullscreen-blocked"
    );
    Services.obs.addObserver(
      gXPInstallObserver,
      "addon-install-origin-blocked"
    );
    Services.obs.addObserver(
      gXPInstallObserver,
      "addon-install-policy-blocked"
    );
    Services.obs.addObserver(
      gXPInstallObserver,
      "addon-install-webapi-blocked"
    );
    Services.obs.addObserver(gXPInstallObserver, "addon-install-failed");
    Services.obs.addObserver(gXPInstallObserver, "addon-install-confirmation");
    Services.obs.addObserver(gKeywordURIFixup, "keyword-uri-fixup");
    Services.obs.addObserver(gLocaleChangeObserver, "intl:app-locales-changed");
    TranslationsParent.ensurePrefObservers();
    Services.obs.addObserver(
      this._translationsEnabledStateObserver,
      "translations:enabled-state-changed"
    );

    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-delayed-startup",
        profilerMarker: "delayed-startup-task",
        jsGlobal: globalThis,
      },
      window
    );

    UpdateUrlbarSearchSplitterState();

    let safeMode = document.getElementById("helpSafeMode");
    if (Services.appinfo.inSafeMode) {
      document.l10n.setAttributes(safeMode, "menu-help-exit-troubleshoot-mode");
      safeMode.setAttribute(
        "appmenu-data-l10n-id",
        "appmenu-help-exit-troubleshoot-mode"
      );
    }

    // BiDi UI
    gBidiUI = isBidiEnabled();
    if (gBidiUI) {
      document.getElementById("documentDirection-separator").hidden = false;
      document.getElementById("documentDirection-swap").hidden = false;
      document.getElementById("textfieldDirection-separator").hidden = false;
      document.getElementById("textfieldDirection-swap").hidden = false;
    }

    // Setup click-and-hold gestures access to the session history
    // menus if global click-and-hold isn't turned on
    if (!Services.prefs.getBoolPref("ui.click_hold_context_menus", false)) {
      SetClickAndHoldHandlers();
    }

    function initBackForwardButtonTooltip(tooltipId, l10nId, shortcutId) {
      let shortcut = document.getElementById(shortcutId);
      shortcut = ShortcutUtils.prettifyShortcut(shortcut);

      let tooltip = document.getElementById(tooltipId);
      document.l10n.setAttributes(tooltip, l10nId, { shortcut });
    }

    initBackForwardButtonTooltip(
      "back-button-tooltip-description",
      "navbar-tooltip-back-3",
      "goBackKb"
    );

    initBackForwardButtonTooltip(
      "forward-button-tooltip-description",
      "navbar-tooltip-forward-3",
      "goForwardKb"
    );

    if (AppConstants.platform != "macosx") {
      updateEditUIVisibility();
      let placesContext = document.getElementById("placesContext");
      placesContext.addEventListener("popupshowing", updateEditUIVisibility);
      placesContext.addEventListener("popuphiding", updateEditUIVisibility);
    }

    let wasMinimized = window.windowState == window.STATE_MINIMIZED;
    window.addEventListener("sizemodechange", () => {
      let isMinimized = window.windowState == window.STATE_MINIMIZED;
      if (wasMinimized != isMinimized) {
        wasMinimized = isMinimized;
        UpdatePopupNotificationsVisibility();
      }
    });

    window.addEventListener("mousemove", MousePosTracker);
    window.addEventListener("mouseout", MousePosTracker);
    window.addEventListener("dragover", MousePosTracker);

    // aHTMLTooltip is used for both the browser UI and in-process <browser>s.
    // Set an attribute for in-process pages such as about:preferences, so we
    // can adjust the tooltip style (e.g. follow content's preferred color
    // scheme) for that case. We only do this for tabbrowser <browser>s, since
    // other in-process <browser>s (e.g. the sidebar) follow the chrome's style.
    let htmlTooltip = document.getElementById("aHTMLTooltip");
    htmlTooltip.addEventListener("popupshowing", () => {
      let browser =
        htmlTooltip.triggerNode?.documentGlobal.browsingContext.top
          .embedderElement;
      htmlTooltip.toggleAttribute(
        "contenttooltip",
        browser?.getTabBrowser() == gBrowser
      );
    });

    gNavToolbox.addEventListener("customizationstarting", CustomizationHandler);
    gNavToolbox.addEventListener("aftercustomization", CustomizationHandler);

    SessionStore.promiseInitialized.then(() => {
      // Bail out if the window has been closed in the meantime.
      if (window.closed) {
        return;
      }

      BrowserUtils.callModulesFromCategory(
        {
          categoryName: "browser-window-sessionstore-initialized",
          jsGlobal: globalThis,
        },
        window
      );
    });

    if (BrowserHandler.kiosk) {
      // We don't modify popup windows for kiosk mode
      if (!gURLBar.readOnly) {
        window.fullScreen = true;
      }
    }

    if (Services.policies.status === Services.policies.ACTIVE) {
      if (!Services.policies.isAllowed("hideShowMenuBar")) {
        document
          .getElementById("toolbar-menubar")
          .removeAttribute("toolbarname");
      }
      if (!Services.policies.isAllowed("profileImport")) {
        document.documentElement.setAttribute("disableprofileimport", "true");
      }
      if (!Services.policies.isAllowed("filepickers")) {
        let savePageCommand = document.getElementById("Browser:SavePage");
        let openFileCommand = document.getElementById("Browser:OpenFile");

        savePageCommand.setAttribute("disabled", "true");
        openFileCommand.setAttribute("disabled", "true");

        document.addEventListener("FilePickerBlocked", function (event) {
          let browser = event.target;

          let notificationBox = browser
            .getTabBrowser()
            ?.getNotificationBox(browser);

          // Prevent duplicate notifications
          if (
            notificationBox &&
            !notificationBox.getNotificationWithValue("filepicker-blocked")
          ) {
            notificationBox.appendNotification("filepicker-blocked", {
              label: {
                "l10n-id": "filepicker-blocked-infobar",
              },
              priority: notificationBox.PRIORITY_INFO_LOW,
            });
          }
        });
      }
      let policies = Services.policies.getActivePolicies();
      if ("ManagedBookmarks" in policies) {
        let managedBookmarks = policies.ManagedBookmarks;
        let children = managedBookmarks.filter(
          child => !("toplevel_name" in child)
        );
        if (children.length) {
          let managedBookmarksButton =
            document.createXULElement("toolbarbutton");
          managedBookmarksButton.setAttribute("id", "managed-bookmarks");
          managedBookmarksButton.setAttribute("class", "bookmark-item");
          let toplevel = managedBookmarks.find(
            element => "toplevel_name" in element
          );
          if (toplevel) {
            managedBookmarksButton.setAttribute(
              "label",
              toplevel.toplevel_name
            );
          } else {
            document.l10n.setAttributes(
              managedBookmarksButton,
              "managed-bookmarks"
            );
          }
          managedBookmarksButton.setAttribute("context", "placesContext");
          managedBookmarksButton.setAttribute("container", "true");
          managedBookmarksButton.setAttribute("removable", "false");
          managedBookmarksButton.setAttribute("type", "menu");

          let managedBookmarksPopup = document.createXULElement("menupopup");
          managedBookmarksPopup.setAttribute("id", "managed-bookmarks-popup");
          managedBookmarksPopup.addEventListener("command", event =>
            PlacesToolbarHelper.openManagedBookmark(event)
          );
          managedBookmarksPopup.addEventListener(
            "dragover",
            event => (event.dataTransfer.effectAllowed = "none")
          );
          managedBookmarksPopup.addEventListener("dragstart", event =>
            PlacesToolbarHelper.onDragStartManaged(event)
          );
          managedBookmarksPopup.addEventListener("popupshowing", event =>
            PlacesToolbarHelper.populateManagedBookmarks(event.currentTarget)
          );
          managedBookmarksPopup.setAttribute("placespopup", "true");
          managedBookmarksPopup.toggleAttribute("nonnative", true);
          managedBookmarksPopup.setAttribute("is", "places-popup");
          managedBookmarksPopup.classList.add("toolbar-menupopup");
          managedBookmarksButton.appendChild(managedBookmarksPopup);

          gNavToolbox.palette.appendChild(managedBookmarksButton);

          CustomizableUI.ensureWidgetPlacedInWindow(
            "managed-bookmarks",
            window
          );

          // Add button if it doesn't exist
          if (!CustomizableUI.getPlacementOfWidget("managed-bookmarks")) {
            CustomizableUI.addWidgetToArea(
              "managed-bookmarks",
              CustomizableUI.AREA_BOOKMARKS,
              0
            );
          }
        }
      }
    }

    SessionStore.promiseAllWindowsRestored.then(() => {
      this._schedulePerWindowIdleTasks();
      document.documentElement.setAttribute("sessionrestored", "true");
    });

    // Update the container status button to reflect current pref state.
    // Create and insert the container status button dynamically.
    // This bypasses XUL cache and CustomizableUI issues.
    try {
      let navBarTarget = document.getElementById("nav-bar-customization-target");
      let urlbarContainer = document.getElementById("urlbar-container");
      let existingBtn = document.getElementById("urlbar-container-button");

      // Remove old button if it exists (from XUL or previous run)
      if (existingBtn) {
        existingBtn.remove();
      }

        if (navBarTarget && urlbarContainer) {
          // Create the button element — sits inside the URL bar, right after
          // the site identity box, so it shares the address bar's leading
          // area instead of taking space from the nav-bar.
          let btn = document.createXULElement("toolbarbutton");
          btn.id = "urlbar-container-button";
          btn.className = "container-status-button";
          btn.setAttribute("data-l10n-attrs", "tooltiptext");
          document.l10n.setAttributes(btn, "container-status-button");

          // Inner content: status icon, label, status dot.
          let content = document.createXULElement("hbox");
          content.className = "container-status-content";
          content.setAttribute("align", "center");

          let icon = document.createXULElement("image");
          icon.className = "container-status-icon off";

          let label = document.createXULElement("label");
          label.className = "container-status-text";
          document.l10n.setAttributes(label, "container-status-off");

          let dot = document.createXULElement("image");
          dot.className = "container-status-dot off";

          // Menu affordance: makes the chip read as a control that opens a
          // list, not as a passive status label.
          let caret = document.createXULElement("image");
          caret.className = "container-status-caret";

          content.appendChild(icon);
          content.appendChild(label);
          content.appendChild(dot);
          content.appendChild(caret);
          btn.appendChild(content);

          // Insert inside the URL bar, directly after the identity box.
          let identityBox = document.getElementById("identity-box");
          if (identityBox) {
            identityBox.after(btn);
          } else {
            // Fallback for a URL bar whose slots have not been populated yet.
            btn.setAttribute("urlbar-slot", "site-info");
            navBarTarget.insertBefore(btn, urlbarContainer);
          }

          // ── Panel builder ──────────────────────────────────────────
          function buildContainerPanel(panel) {
            panel.textContent = "";

            const HTML_NS = "http://www.w3.org/1999/xhtml";
            const html = name => document.createElementNS(HTML_NS, name);
            const l10n = (el, id, args) => {
              document.l10n.setAttributes(el, id, args);
              return el;
            };
            // A footer/styled button.
            const makeButton = (id, args, onClick, primary) => {
              let b = html("moz-button");
              if (primary) {
                b.setAttribute("type", "primary");
              }
              l10n(b, id, args);
              b.addEventListener("click", () => {
                panel.hidePopup();
                onClick();
              });
              return b;
            };
            // A selectable row.  Rows are plain HTML so they can hold a
            // two-line label plus a trailing button, which panel-item can't.
            const makeRow = extraClass => {
              let row = html("div");
              row.className = "containers-panel-item" +
                (extraClass ? " " + extraClass : "");
              row.setAttribute("role", "button");
              row.setAttribute("tabindex", "0");
              // Keep keyboard activation in sync with the click handler.
              row.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  row.click();
                }
              });
              return row;
            };
            const makeCheck = () => {
              let check = html("span");
              check.className = "containers-panel-check";
              return check;
            };
            const makePill = identity => {
              let pill = html("span");
              pill.className = "pmc-pill identity-color-" + identity.color;
              pill.textContent = identity.name ||
                ("Container " + identity.userContextId);
              return pill;
            };

            let containerMode = Services.prefs.getBoolPref(
              "privacy.browser.containerMode", false
            );

            // Read the sticky selected container (set when the user picks
            // a container in this panel).  Falls back to 0 = no selection.
            let activeUcId = Services.prefs.getIntPref(
              "privacy.browser.selectedUserContextId", 0
            );

            // A container is truly active only when containerMode is on,
            // a container is selected, AND that container still exists.
            // If the container was deleted, clear the stale state.
            let hasActiveContainer = false;
            if (containerMode && activeUcId > 0) {
              try {
                let ident = ContextualIdentityService.getPublicIdentityFromId(activeUcId);
                if (ident && ident.name) {
                  hasActiveContainer = true;
                } else {
                  Services.prefs.setIntPref(
                    "privacy.browser.selectedUserContextId", 0
                  );
                  Services.prefs.setBoolPref(
                    "privacy.browser.containerMode", false
                  );
                  containerMode = false;
                  activeUcId = 0;
                }
              } catch (e) {
                console.error("[ContainerButton] Panel identity lookup error:", e);
              }
            }

            // ── Panel scaffolding (157 panel-header / body / footer) ──
            let panelHeader = document.createXULElement("box");
            panelHeader.className = "panel-header";
            let panelTitle = html("h1");
            let panelTitleSpan = html("span");
            panelTitleSpan.setAttribute("data-l10n-id", "containers-list-title");
            panelTitle.appendChild(panelTitleSpan);
            panelHeader.appendChild(panelTitle);
            panel.appendChild(panelHeader);
            panel.appendChild(document.createXULElement("toolbarseparator"));

            let vbox = document.createXULElement("vbox");
            vbox.className = "panel-subview-body containers-panel-content";

            // ── Identity mismatch card ──
            // When the selected tab's real identity differs from the
            // browser-level identity (active persona OR Normal Mode),
            // surface it at the top with one-click resolution.
            try {
              let ms = ContainerStatusUI._getState();
              if (ms && ms.mismatch && (ms.persona || ms.tabIdentity)) {
                let makeHeader = () => {
                  let header = document.createXULElement("hbox");
                  header.className = "pmc-header";
                  header.setAttribute("align", "center");
                  let hIcon = document.createXULElement("image");
                  hIcon.className = "pmc-header-icon";
                  let hTitle = document.createXULElement("label");
                  hTitle.className = "pmc-title";
                  document.l10n.setAttributes(hTitle,
                    "containers-mismatch-title");
                  header.appendChild(hIcon);
                  header.appendChild(hTitle);
                  return header;
                };

                let card = document.createXULElement("vbox");
                card.className = "persona-mismatch-card";
                card.appendChild(makeHeader());

                // The prose is assembled from fragment messages so the two
                // container names can stay rendered as color-coded pills.
                let fragment = id => l10n(html("span"), id);
                let text = html("div");
                text.className = "pmc-text";

                if (ms.persona) {
                  // Active persona, but this tab lives elsewhere.
                  if (ms.tabIdentity) {
                    text.append(
                      fragment("containers-mismatch-persona-lead"), " ",
                      makePill(ms.tabIdentity),
                      fragment("containers-mismatch-persona-mid"), " ",
                      makePill(ms.persona),
                      fragment("containers-mismatch-persona-tail"));
                  } else {
                    text.append(
                      fragment("containers-mismatch-normal-lead"), " ",
                      makePill(ms.persona),
                      fragment("containers-mismatch-normal-tail"));
                  }
                  card.appendChild(text);
                  card.appendChild(makeButton("containers-mismatch-reopen",
                    { name: ms.persona.name },
                    () => ContainerStatusUI.reopenSelectedTabInActivePersona(),
                    true));
                } else {
                  // Normal Mode, but this tab still belongs to a container
                  // and keeps presenting that container's fingerprint.
                  text.append(
                    fragment("containers-mismatch-off-lead"), " ",
                    makePill(ms.tabIdentity),
                    fragment("containers-mismatch-off-tail"));
                  card.appendChild(text);
                  card.appendChild(makeButton("containers-mismatch-switch",
                    { name: ms.tabIdentity.name || ("Container " + ms.tabUcId) },
                    () => ContainerStatusUI.switchPersonaToSelectedTab(),
                    true));
                }

                let row = html("div");
                row.className = "pmc-actions";
                if (ms.persona) {
                  row.appendChild(makeButton("containers-mismatch-close-tab",
                    null, () => ContainerStatusUI.closeSelectedTab()));
                } else {
                  row.appendChild(makeButton("containers-mismatch-reopen-normal",
                    null, () => ContainerStatusUI.reopenSelectedTabAsNormal()));
                }
                row.appendChild(makeButton("containers-mismatch-keep",
                  null, () => {}));
                card.appendChild(row);

                vbox.appendChild(card);
              }
            } catch (e) {
              console.error("[ContainerButton] Mismatch card error:", e);
            }

            // ── Normal Mode row ──
            let normalRow = makeRow("containers-panel-mode-btn");
            let normalIcon = html("span");
            normalIcon.className =
              "userContext-icon identity-icon-fingerprint identity-color-gray";
            let normalName = html("span");
            normalName.className = "containers-panel-name";
            l10n(normalName, "containers-list-normal-mode");
            normalRow.appendChild(normalIcon);
            normalRow.appendChild(normalName);
            if (!hasActiveContainer) {
              normalRow.classList.add("selected");
              normalRow.appendChild(makeCheck());
            }
            normalRow.addEventListener("click", function () {
              // Only a real state change (a persona was active) counts as a
              // switch; clicking the already-selected Normal Mode must not
              // spawn tabs.
              let wasActive =
                Services.prefs.getBoolPref("privacy.browser.containerMode", false) ||
                Services.prefs.getIntPref(
                  "privacy.browser.selectedUserContextId", 0) > 0;

              Services.prefs.setBoolPref("privacy.browser.containerMode", false);
              Services.prefs.setBoolPref("privacy.fingerprint.profileMode", false);
              Services.prefs.setIntPref("privacy.browser.selectedUserContextId", 0);

              // Mirror container switching: every identity switch lands you
              // in a new tab of the new identity.  Old container tabs stay
              // open and keep their fingerprints, so the mismatch UI rings
              // them instead.
              if (wasActive) {
                let newTab = gBrowser.addTrustedTab(BROWSER_NEW_TAB_URL);
                gBrowser.selectedTab = newTab;
              }
              ContainerStatusUI._updateButtonStatus();
              panel.hidePopup();
            });
            vbox.appendChild(normalRow);

            vbox.appendChild(document.createXULElement("toolbarseparator"));

            // ── Container list ──
            let identities = [];
            try {
              identities = ContextualIdentityService.getPublicIdentities();
              console.log("[ContainerButton] Identities found:", identities.length);
            } catch (e) {
              console.error("[ContainerButton] Failed to get identities:", e);
            }

            if (identities.length === 0) {
              let empty = html("div");
              empty.className = "containers-panel-empty";
              l10n(empty, "containers-list-empty");
              vbox.appendChild(empty);
            } else {
              for (let identity of identities) {
                let ucId = identity.userContextId;
                let isActive = containerMode && ucId === activeUcId;

                let row = makeRow("containers-panel-row");
                if (isActive) {
                  row.classList.add("selected");
                }
                row.dataset.usercontextid = ucId;

                // Container icon (round, tinted, identity-colored)
                let icon = html("span");
                icon.className = "userContext-icon identity-icon-" +
                  identity.icon + " identity-color-" + identity.color;

                // Name + subtitle stacked vertically (grows to fill)
                let nameBox = html("div");
                nameBox.className = "containers-panel-namebox";

                let nameLabel = html("span");
                nameLabel.className = "containers-panel-name";
                nameLabel.textContent = identity.name || ("Container " + ucId);

                // Build subtitle: short device type - country
                let subtitle = "";
                try {
                  let profile = FingerprintProfileStore.getProfile(ucId);
                  if (profile && profile.device) {
                    let devType = profile.device.type || "";
                    let devName = profile.device.name || "";
                    if (!devType) {
                      let lowerName = devName.toLowerCase();
                      if (lowerName.startsWith("mac")) {
                        devType = "Mac";
                      } else if (lowerName.startsWith("linux")) {
                        devType = "Linux";
                      } else if (lowerName.startsWith("windows")) {
                        devType = "Windows";
                      }
                    }
                    // Migrate old profiles that still have type "MacBook".
                    if (devType === "MacBook") { devType = "Mac"; }
                    let country = profile.location ? (profile.location.country || "") : "";
                    if (devType && country) {
                      subtitle = devType + " - " + country;
                    } else if (devType) {
                      subtitle = devType;
                    } else if (country) {
                      subtitle = country;
                    }
                  }
                } catch (e) {
                  console.error("[ContainerButton] Subtitle error:", e);
                }

                nameBox.appendChild(nameLabel);
                if (subtitle) {
                  let subLabel = html("span");
                  subLabel.className = "containers-panel-subtitle";
                  subLabel.textContent = subtitle;
                  nameBox.appendChild(subLabel);
                }

                row.appendChild(icon);
                row.appendChild(nameBox);

                // Active checkmark
                if (isActive) {
                  row.appendChild(makeCheck());
                }

                // Edit button (trailing; pushed to the end by CSS)
                let editBtn = html("moz-button");
                editBtn.className = "containers-panel-edit-btn";
                editBtn.setAttribute("type", "icon ghost");
                editBtn.setAttribute("size", "small");
                // browser.xhtml is an XML document, so attribute names stay
                // case-sensitive; moz-button observes the lowercase "iconsrc".
                editBtn.setAttribute(
                  "iconsrc",
                  "chrome://global/skin/icons/edit.svg"
                );
                editBtn.setAttribute("data-l10n-id", "containers-list-edit");
                editBtn.addEventListener("click", function (event) {
                  event.stopPropagation();
                  event.preventDefault();
                  panel.hidePopup();
                  openPreferences("containers");
                });
                row.appendChild(editBtn);

                let containerName = identity.name || ("Container " + ucId);

                // Switching handler — opens a NEW tab in the target container.
                // Firefox architecture: tabs are permanently bound to their
                // container at creation time; you cannot change an existing
                // tab's container.  So we always create a new tab.
                row.addEventListener("click", function (event) {
                  if (event.button !== 0) return;
                  event.stopPropagation();
                  try {
                    console.log("[ContainerButton] Switching to container:", ucId, containerName);
                    // Ensure container mode is enabled
                    Services.prefs.setBoolPref("privacy.browser.containerMode", true);
                    Services.prefs.setBoolPref("privacy.userContext.enabled", true);
                    Services.prefs.setBoolPref("privacy.userContext.ui.enabled", true);
                    Services.prefs.setBoolPref("privacy.fingerprint.profileMode", true);
                    // Record the sticky selection so new tabs inherit it.
                    Services.prefs.setIntPref("privacy.browser.selectedUserContextId", ucId);

                    // Create the new container tab and select it immediately.
                    // Firefox now requires a triggeringPrincipal for addTab.
                    let triggeringPrincipal =
                      Services.scriptSecurityManager.createNullPrincipal({
                        userContextId: ucId,
                      });
                    let newTab = gBrowser.addTab(BROWSER_NEW_TAB_URL, {
                      userContextId: ucId,
                      triggeringPrincipal,
                    });
                    gBrowser.selectedTab = newTab;
                    console.log("[ContainerButton] Tab created. userContextId:",
                                newTab.userContextId, "expected:", ucId);

                    // Sync fingerprint profile to the new tab.
                    ContainerProfileSync.syncToTab(newTab);

                    // Update button immediately, then retry after delays.
                    ContainerStatusUI._updateButtonStatus();
                    setTimeout(() => ContainerStatusUI._updateButtonStatus(), 50);
                    setTimeout(() => ContainerStatusUI._updateButtonStatus(), 200);

                    panel.hidePopup();
                  } catch (e) {
                    console.error("[ContainerButton] Failed to open container tab:", e);
                  }
                });

                vbox.appendChild(row);
              }
            }

            panel.appendChild(vbox);

            // ── Footer ──
            let footer = html("moz-button-group");
            footer.className = "panel-footer containers-panel-footer";
            let addBtn = html("moz-button");
            addBtn.setAttribute("type", "primary");
            addBtn.setAttribute("data-l10n-id", "containers-list-add");
            addBtn.addEventListener("click", function () {
              openPreferences("containers");
              panel.hidePopup();
            });
            footer.appendChild(addBtn);
            panel.appendChild(footer);
          }

          // Click handler: toggle panel
          btn.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            try {
              let panel = document.getElementById("containers-panel");
              if (!panel) {
                console.error("[ContainerButton] containers-panel element not found!");
                return;
              }
              if (panel.state === "open") {
                panel.hidePopup();
              } else {
                try {
                  buildContainerPanel(panel);
                } catch (buildErr) {
                  console.error("[ContainerButton] buildContainerPanel error:", buildErr);
                  // Fallback: build a minimal panel so the user can still switch
                  panel.textContent = "";
                  let vbox = document.createXULElement("vbox");
                  vbox.className = "containers-panel-content";
                  let errMsg = document.createXULElement("label");
                  errMsg.textContent = "Error building panel: " + buildErr.message;
                  vbox.appendChild(errMsg);
                  panel.appendChild(vbox);
                }
                let anchor = btn.getBoundingClientRect().width
                  ? btn
                  : document.getElementById("urlbar") || btn;
                panel.openPopup(anchor, "after_start", 0, 0, false, false);
              }
            } catch (e) {
              console.error("[ContainerButton] Click handler error:", e);
            }
          });

          console.log("[ContainerButton] Button created and inserted inside the urlbar");
        } else {
          console.error("[ContainerButton] navBarTarget or urlbarContainer not found!");
        }

    // Wire up the File menu "Containers" item
    let containersMenuItem = document.getElementById("menu_containersPanel");
    if (containersMenuItem) {
      containersMenuItem.addEventListener("command", function() {
        let button = document.getElementById("urlbar-container-button");
        let panel = document.getElementById("containers-panel");
        if (!panel || !button) {
          console.error("[ContainerButton] Cannot open panel from menu: panel or button missing");
          return;
        }
        if (panel.state === "open") {
          panel.hidePopup();
        } else {
          // Trigger the same click handler logic
          let clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          button.dispatchEvent(clickEvent);
        }
      });
      console.log("[ContainerButton] Menu item wired up");
    }

    // Default-on container mode. New profiles get the pref default; this
    // one-time migration applies it to profiles created before the default
    // existed, then makes sure a real container + fingerprint profile is
    // selected so the address-bar chip always has a meaningful identity.
    (async () => {
      const MODE_PREF = "privacy.browser.containerMode";
      const SELECTED_PREF = "privacy.browser.selectedUserContextId";
      const MIGRATED_PREF = "privacy.browser.containerDefaultApplied";
      try {
        if (!Services.prefs.getBoolPref(MIGRATED_PREF, false)) {
          Services.prefs.setBoolPref(MIGRATED_PREF, true);
          if (Services.prefs.getIntPref(SELECTED_PREF, 0) === 0) {
            Services.prefs.setBoolPref(MODE_PREF, true);
          }
        }
        if (!Services.prefs.getBoolPref(MODE_PREF, false)) {
          return;
        }

        Services.prefs.setBoolPref("privacy.userContext.enabled", true);
        Services.prefs.setBoolPref("privacy.userContext.ui.enabled", true);

        let identities = ContextualIdentityService.getPublicIdentities();
        let selected = Services.prefs.getIntPref(SELECTED_PREF, 0);
        let identity = identities.find(i => i.userContextId === selected);
        if (!identity) {
          identity =
            identities[0] ||
            ContextualIdentityService.create("Personal", "fingerprint", "blue");
          selected = identity.userContextId;
          Services.prefs.setIntPref(SELECTED_PREF, selected);
        }

        if (!FingerprintProfileStore.getProfile(selected)) {
          let profile = FingerprintProfileStore.generateProfile();
          await FingerprintProfileStore.saveProfile(selected, profile);
        }
        Services.prefs.setBoolPref("privacy.fingerprint.profileMode", true);

        // If the selected tab is a normal tab showing a chrome/about page,
        // move it into the container on startup. These pages have no state
        // to lose, and this keeps the default experience free of a
        // mismatch warning on Settings/New Tab. Web pages are left alone
        // so the user does not lose form data; the chip flags them instead.
        if (gBrowser.selectedTab?.userContextId === 0) {
          let uri = gBrowser.currentURI?.spec || "";
          let canReopen = uri.startsWith("about:") ||
            uri.startsWith("chrome:");
          if (canReopen) {
            let oldTab = gBrowser.selectedTab;
            let newTab = gBrowser.addTrustedTab(uri, {
              userContextId: selected,
            });
            gBrowser.selectedTab = newTab;
            gBrowser.removeTab(oldTab);
            ContainerProfileSync.syncToTab(newTab);
          }
        }

        ContainerStatusUI._updateButtonStatus();
      } catch (e) {
        console.error("[ContainerButton] default container bootstrap failed:", e);
      }
    })();

      // Update button status
      ContainerStatusUI._updateButtonStatus();

      // Keep the button label in sync when the user switches tabs.
      gBrowser.tabContainer.addEventListener("TabSelect", function() {
        ContainerStatusUI._updateButtonStatus();
      });

      // Ensure privacy.fingerprint.profileMode is in sync with
      // privacy.browser.containerMode on startup.  profileMode controls
      // whether ShouldResistFingerprinting() activates the profile-based
      // intercept points (hardwareConcurrency, screen, canvas, WebGL,
      // audio, fonts, etc.).
      let cm = Services.prefs.getBoolPref("privacy.browser.containerMode", false);
      Services.prefs.setBoolPref("privacy.fingerprint.profileMode", cm);

      // Re-push all container profiles to content processes.  The C++
      // ParentProfileCache is in-memory only and starts empty on every
      // browser launch, so we must repopulate it by calling updateProfile
      // on each open container tab's WindowGlobalParent.
      ContainerProfileSync.syncAll();

      // Add identity badges to tabs restored before this listener existed,
      // plus a delayed catch-up for late session-restore tabs.
      ContainerStatusUI.updateTabBadges();
      setTimeout(() => ContainerStatusUI.updateTabBadges(), 1500);

      // When a new container tab is opened (via link click, session restore,
      // etc.), push the profile to its content process.
      gBrowser.tabContainer.addEventListener("TabOpen", function(event) {
        let tab = event.target;
        if (tab.userContextId && tab.userContextId !== 0) {
          ContainerProfileSync.syncToTab(tab);
        }
        ContainerStatusUI.updateTabBadges();
      });
    } catch (e) {
      console.error("[ContainerButton] Init error:", e);
    }

    Referrals.maybeLockPref();

    this.delayedStartupFinished = true;
    _resolveDelayedStartup();
    Services.obs.notifyObservers(window, "browser-delayed-startup-finished");
    Glean.browserTimings.startupTimeline.delayedStartupFinished.set(
      Services.telemetry.msSinceProcessStart()
    );
    // We've announced that delayed startup has finished. Do not add code past this point.
  },

  /**
   * Resolved on the first MozLayerTreeReady and next MozAfterPaint in the
   * parent process.
   */
  get firstContentWindowPaintPromise() {
    return this._firstContentWindowPaintDeferred.promise;
  },

  _setInitialFocus() {
    let initiallyFocusedElement = document.commandDispatcher.focusedElement;

    // To prevent startup flicker, the urlbar has the 'focused' attribute set
    // by default. If we are not sure the urlbar will be focused in this
    // window, we need to remove the attribute before first paint.
    // TODO (bug 1629956): The urlbar having the 'focused' attribute by default
    // isn't a useful optimization anymore since UrlbarInput needs layout
    // information to focus the urlbar properly.
    let shouldRemoveFocusedAttribute = true;

    this._callWithURIToLoad(uriToLoad => {
      if (
        isBlankPageURL(uriToLoad) ||
        uriToLoad == "about:privatebrowsing" ||
        this.getTabToAdopt()?.isEmpty
      ) {
        gURLBar.select();
        shouldRemoveFocusedAttribute = false;
        return;
      }

      // If the initial browser is remote, in order to optimize for first paint,
      // we'll defer switching focus to that browser until it has painted.
      // Otherwise use a regular promise to guarantee that mutationobserver
      // microtasks that could affect focusability have run.
      let promise = gBrowser.selectedBrowser.isRemoteBrowser
        ? this.firstContentWindowPaintPromise
        : Promise.resolve();

      promise.then(() => {
        // If focus didn't move while we were waiting, we're okay to move to
        // the browser.
        if (
          document.commandDispatcher.focusedElement == initiallyFocusedElement
        ) {
          gBrowser.selectedBrowser.focus();
        }
      });
    });

    // Delay removing the attribute using requestAnimationFrame to avoid
    // invalidating styles multiple times in a row if uriToLoadPromise
    // resolves before first paint.
    if (shouldRemoveFocusedAttribute) {
      window.requestAnimationFrame(() => {
        if (shouldRemoveFocusedAttribute) {
          gURLBar.removeAttribute("focused");
        }
      });
    }
  },

  _handleURIToLoad() {
    this._callWithURIToLoad(uriToLoad => {
      if (!uriToLoad) {
        // We don't check whether window.arguments[5] (userContextId) is set
        // because tabbrowser.js takes care of that for the initial tab.
        return;
      }

      // We don't check if uriToLoad is a XULElement because this case has
      // already been handled before first paint, and the argument cleared.
      if (Array.isArray(uriToLoad)) {
        // This function throws for certain malformed URIs, so use exception handling
        // so that we don't disrupt startup
        try {
          gBrowser.loadTabs(uriToLoad, {
            inBackground: false,
            replace: true,
            // See below for the semantics of window.arguments. Only the minimum is supported.
            userContextId: window.arguments[5],
            triggeringPrincipal:
              window.arguments[8] ||
              Services.scriptSecurityManager.getSystemPrincipal(),
            allowInheritPrincipal: window.arguments[9],
            policyContainer: window.arguments[10],
            fromExternal: true,
          });
        } catch (e) {}
      } else if (window.arguments.length >= 3) {
        // window.arguments[1]: extraOptions (nsIPropertyBag)
        //                 [2]: referrerInfo (nsIReferrerInfo)
        //                 [3]: postData (nsIInputStream)
        //                 [4]: allowThirdPartyFixup (bool)
        //                 [5]: userContextId (int)
        //                 [6]: originPrincipal (nsIPrincipal)
        //                 [7]: originStoragePrincipal (nsIPrincipal)
        //                 [8]: triggeringPrincipal (nsIPrincipal)
        //                 [9]: allowInheritPrincipal (bool)
        //                 [10]: policyContainer (nsIPolicyContainer)
        //                 [11]: nsOpenWindowInfo
        let userContextId =
          window.arguments[5] != undefined
            ? window.arguments[5]
            : Ci.nsIScriptSecurityManager.DEFAULT_USER_CONTEXT_ID;

        let hasValidUserGestureActivation = undefined;
        let textDirectiveUserActivation = undefined;
        let fromExternal = undefined;
        let globalHistoryOptions = undefined;
        let triggeringRemoteType = undefined;
        let forceAllowDataURI = false;
        let schemelessInput = Ci.nsILoadInfo.SchemelessInputTypeUnset;
        if (window.arguments[1]) {
          if (!(window.arguments[1] instanceof Ci.nsIPropertyBag2)) {
            throw new Error(
              "window.arguments[1] must be null or Ci.nsIPropertyBag2!"
            );
          }

          let extraOptions = window.arguments[1];
          if (extraOptions.hasKey("hasValidUserGestureActivation")) {
            hasValidUserGestureActivation = extraOptions.getPropertyAsBool(
              "hasValidUserGestureActivation"
            );
          }
          if (extraOptions.hasKey("textDirectiveUserActivation")) {
            textDirectiveUserActivation = extraOptions.getPropertyAsBool(
              "textDirectiveUserActivation"
            );
          }
          if (extraOptions.hasKey("fromExternal")) {
            fromExternal = extraOptions.getPropertyAsBool("fromExternal");
          }
          if (extraOptions.hasKey("triggeringSponsoredURL")) {
            globalHistoryOptions = {
              triggeringSponsoredURL: extraOptions.getPropertyAsACString(
                "triggeringSponsoredURL"
              ),
            };
            if (extraOptions.hasKey("triggeringSponsoredURLVisitTimeMS")) {
              globalHistoryOptions.triggeringSponsoredURLVisitTimeMS =
                extraOptions.getPropertyAsUint64(
                  "triggeringSponsoredURLVisitTimeMS"
                );
            }
            if (extraOptions.hasKey("triggeringSource")) {
              globalHistoryOptions.triggeringSource =
                extraOptions.getPropertyAsACString("triggeringSource");
            }
          }
          if (extraOptions.hasKey("triggeringRemoteType")) {
            triggeringRemoteType = extraOptions.getPropertyAsACString(
              "triggeringRemoteType"
            );
          }
          if (extraOptions.hasKey("forceAllowDataURI")) {
            forceAllowDataURI =
              extraOptions.getPropertyAsBool("forceAllowDataURI");
          }
          if (extraOptions.hasKey("schemelessInput")) {
            schemelessInput =
              extraOptions.getPropertyAsUint32("schemelessInput");
          }
        }

        try {
          openLinkIn(uriToLoad, "current", {
            referrerInfo: window.arguments[2] || null,
            postData: window.arguments[3] || null,
            allowThirdPartyFixup: window.arguments[4] || false,
            userContextId,
            // pass the origin principal (if any) and force its use to create
            // an initial about:blank viewer if present:
            originPrincipal: window.arguments[6],
            originStoragePrincipal: window.arguments[7],
            triggeringPrincipal: window.arguments[8],
            // TODO fix allowInheritPrincipal to default to false.
            // Default to true unless explicitly set to false because of bug 1475201.
            allowInheritPrincipal: window.arguments[9] !== false,
            policyContainer: window.arguments[10],
            forceAboutBlankViewerInCurrent: !!window.arguments[6],
            forceAllowDataURI,
            hasValidUserGestureActivation,
            textDirectiveUserActivation,
            fromExternal,
            globalHistoryOptions,
            triggeringRemoteType,
            schemelessInput,
          });
        } catch (e) {
          console.error(e);
        }

        window.focus();
      } else {
        // Note: loadOneOrMoreURIs *must not* be called if window.arguments.length >= 3.
        // Such callers expect that window.arguments[0] is handled as a single URI.
        loadOneOrMoreURIs(uriToLoad, {
          newWindowLoad: true,
        });
      }
    });
  },

  /**
   * Use this function as an entry point to schedule tasks that
   * need to run once per window after startup, and can be scheduled
   * by using an idle callback.
   *
   * The functions scheduled here will fire from idle callbacks
   * once every window has finished being restored by session
   * restore, and after the equivalent only-once tasks
   * have run (from _scheduleStartupIdleTasks in BrowserGlue.sys.mjs).
   */
  _schedulePerWindowIdleTasks() {
    // Bail out if the window has been closed in the meantime.
    if (window.closed) {
      return;
    }

    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-idle-tasks",
        profilerMarker: "perWindowIdleTask",
        idleDispatch: window,
        jsGlobal: globalThis,
      },
      window
    );

    // This should always go last, since the idle tasks above execute in order.
    // Dispatch it on the same idle queue as the consumers above (the window's,
    // via requestIdleCallback) so it runs after them. Note that this observer
    // notification is not guaranteed to fire, since the window could close
    // before we get here.
    requestIdleCallback(() => {
      if (window.closed) {
        return;
      }
      this.idleTasksFinished.resolve();
      Services.obs.notifyObservers(
        window,
        "browser-idle-startup-tasks-finished"
      );
    });
  },

  // Returns the URI(s) to load at startup if it is immediately known, or a
  // promise resolving to the URI to load.
  get uriToLoadPromise() {
    delete this.uriToLoadPromise;
    return (this.uriToLoadPromise = (function () {
      // window.arguments[0]: URI to load (string), or an nsIArray of
      //                      nsISupportsStrings to load, or a xul:tab of
      //                      a tabbrowser, which will be replaced by this
      //                      window (for this case, all other arguments are
      //                      ignored).
      let uri = window.arguments?.[0];
      if (!uri || window.XULElement.isInstance(uri)) {
        return null;
      }

      let defaultArgs = BrowserHandler.defaultArgs;

      // If the given URI is different from the homepage, we want to load it.
      if (uri != defaultArgs) {
        AboutNewTab.noteNonDefaultStartup();

        if (uri instanceof Ci.nsIArray) {
          // Transform the nsIArray of nsISupportsString's into a JS Array of
          // JS strings.
          return Array.from(
            uri.enumerate(Ci.nsISupportsString),
            supportStr => supportStr.data
          );
        } else if (uri instanceof Ci.nsISupportsString) {
          return uri.data;
        }
        return uri;
      }

      // The URI appears to be the the homepage. We want to load it only if
      // session restore isn't about to override the homepage.
      let willOverride = SessionStartup.willOverrideHomepage;
      if (typeof willOverride == "boolean") {
        return willOverride ? null : uri;
      }
      return willOverride.then(willOverrideHomepage =>
        willOverrideHomepage ? null : uri
      );
    })());
  },

  // Calls the given callback with the URI to load at startup.
  // Synchronously if possible, or after uriToLoadPromise resolves otherwise.
  _callWithURIToLoad(callback) {
    let uriToLoad = this.uriToLoadPromise;
    if (uriToLoad && uriToLoad.then) {
      uriToLoad.then(callback);
    } else {
      callback(uriToLoad);
    }
  },

  onUnload() {
    BrowserUtils.callModulesFromCategory(
      { categoryName: "browser-window-unload-begin", jsGlobal: globalThis },
      window
    );

    // In certain scenarios it's possible for unload to be fired before onload,
    // (e.g. if the window is being closed after browser.js loads but before the
    // load completes). In that case, there's nothing to do here.
    if (!this._loadHandled) {
      return;
    }

    try {
      gBrowser.removeProgressListener(window.XULBrowserWindow);
      gBrowser.removeTabsProgressListener(window.TabsProgressListener);
    } catch (ex) {}

    // Bug 1952900 to allow switching to unload category without leaking
    ChromeUtils.importESModule(
      "moz-src:///browser/components/genai/LinkPreview.sys.mjs"
    ).LinkPreview.teardown(window);

    BrowserUtils.callModulesFromCategory(
      { categoryName: "browser-window-unload", jsGlobal: globalThis },
      window
    );

    // Now either cancel delayedStartup, or clean up the services initialized from
    // it.
    if (this._boundDelayedStartup) {
      this._cancelDelayedStartup();
    } else {
      BrowserUtils.callModulesFromCategory(
        {
          categoryName: "browser-window-unload-delayed-startup",
          jsGlobal: globalThis,
        },
        window
      );

      Services.obs.removeObserver(gIdentityHandler, "perm-changed");
      Services.obs.removeObserver(gRemoteControl, "devtools-socket");
      Services.obs.removeObserver(gRemoteControl, "marionette-listening");
      Services.obs.removeObserver(gRemoteControl, "remote-listening");
      Services.obs.removeObserver(
        gSessionHistoryObserver,
        "browser:purge-session-history"
      );
      Services.obs.removeObserver(
        gStoragePressureObserver,
        "QuotaManager::StoragePressure"
      );
      Services.obs.removeObserver(gXPInstallObserver, "addon-install-disabled");
      Services.obs.removeObserver(gXPInstallObserver, "addon-install-started");
      Services.obs.removeObserver(gXPInstallObserver, "addon-install-blocked");
      Services.obs.removeObserver(
        gXPInstallObserver,
        "addon-install-fullscreen-blocked"
      );
      Services.obs.removeObserver(
        gXPInstallObserver,
        "addon-install-origin-blocked"
      );
      Services.obs.removeObserver(
        gXPInstallObserver,
        "addon-install-policy-blocked"
      );
      Services.obs.removeObserver(
        gXPInstallObserver,
        "addon-install-webapi-blocked"
      );
      Services.obs.removeObserver(gXPInstallObserver, "addon-install-failed");
      Services.obs.removeObserver(
        gXPInstallObserver,
        "addon-install-confirmation"
      );
      Services.obs.removeObserver(gKeywordURIFixup, "keyword-uri-fixup");
      Services.obs.removeObserver(
        gLocaleChangeObserver,
        "intl:app-locales-changed"
      );
      Services.obs.removeObserver(
        this._translationsEnabledStateObserver,
        "translations:enabled-state-changed"
      );
    }

    BrowserUtils.callModulesFromCategory(
      {
        categoryName: "browser-window-unload-tabbrowser",
        jsGlobal: globalThis,
      },
      window
    );
    window.XULBrowserWindow = null;
    window.docShell.treeOwner
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIAppWindow).XULBrowserWindow = null;

    BrowserUtils.callModulesFromCategory(
      { categoryName: "browser-window-final-unload", jsGlobal: globalThis },
      window
    );
  },
};
