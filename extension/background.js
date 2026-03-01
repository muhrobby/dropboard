/**
 * Dropboard Web Clipper — background.js (MV3 Service Worker)
 *
 * Responsibilities:
 *  - Install: create context menus
 *  - Context menu clicks: save selection or page link directly
 *  - Keyboard shortcut (Alt+D): open popup (handled automatically by the browser
 *    when default_popup is set; here we handle the case where it's used as a
 *    command to trigger a quick-save with no popup)
 *  - Badge: show "✓" briefly after a successful save triggered from context menu
 */

"use strict";

const MENU_SAVE_PAGE      = "dropboard-save-page";
const MENU_SAVE_SELECTION = "dropboard-save-selection";
const MENU_SAVE_LINK      = "dropboard-save-link";

// ── Install: create context menus ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       MENU_SAVE_PAGE,
    title:    "Save page to Dropboard",
    contexts: ["page", "frame"],
  });

  chrome.contextMenus.create({
    id:       MENU_SAVE_SELECTION,
    title:    "Save selection to Dropboard",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id:       MENU_SAVE_LINK,
    title:    "Save link to Dropboard",
    contexts: ["link"],
  });
});

// ── Context menu handler ──────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const stored = await chrome.storage.sync.get(["appUrl", "workspaceId"]);
  const { appUrl, workspaceId } = stored;

  if (!appUrl || !workspaceId) {
    // Not configured — open the popup options page
    chrome.runtime.openOptionsPage();
    return;
  }

  if (info.menuItemId === MENU_SAVE_PAGE) {
    await quickSave({
      appUrl,
      workspaceId,
      type: "link",
      content: tab.url,
      title: tab.title || tab.url,
    }, tab);
  }

  if (info.menuItemId === MENU_SAVE_SELECTION) {
    const selection = info.selectionText || "";
    await quickSave({
      appUrl,
      workspaceId,
      type: "note",
      content: selection,
      title: tab.title ? `From: ${tab.title}` : "Saved selection",
      note: tab.url,
    }, tab);
  }

  if (info.menuItemId === MENU_SAVE_LINK) {
    const linkUrl = info.linkUrl || "";
    await quickSave({
      appUrl,
      workspaceId,
      type: "link",
      content: linkUrl,
      title: info.linkText || linkUrl,
    }, tab);
  }
});

// ── Keyboard command ──────────────────────────────────────────────────────────
// The browser opens the popup automatically via default_popup when the user
// presses Alt+D. No additional handling needed here.

// ── Quick-save helper ─────────────────────────────────────────────────────────
async function quickSave(payload, tab) {
  try {
    const res = await fetch(`${payload.appUrl}/api/v1/items`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:        payload.type,
        workspaceId: payload.workspaceId,
        content:     payload.content,
        title:       payload.title  || undefined,
        note:        payload.note   || undefined,
        tags:        payload.tags   || [],
      }),
    });

    if (res.ok) {
      // Flash green badge on the extension icon
      if (tab && tab.id) {
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
        chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "", tabId: tab.id });
        }, 2000);
      }
    } else {
      flashErrorBadge(tab);
    }
  } catch (_e) {
    flashErrorBadge(tab);
  }
}

function flashErrorBadge(tab) {
  if (!tab || !tab.id) return;
  chrome.action.setBadgeBackgroundColor({ color: "#f43f5e" });
  chrome.action.setBadgeText({ text: "!", tabId: tab.id });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
  }, 2500);
}
