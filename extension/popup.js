/**
 * Dropboard Web Clipper — popup.js
 *
 * Flow:
 *  1. On load: read chrome.storage.sync for { appUrl, workspaceId, workspaceName }
 *  2. If not configured → show setup screen
 *  3. If configured → query active tab URL+title, message content.js for selection,
 *     then show the main form
 *  4. Save → POST to {appUrl}/api/v1/items with credentials: "include"
 *  5. Success → show success screen, auto-close after 2s
 */

"use strict";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const screens = {
  loading: document.getElementById("state-loading"),
  setup:   document.getElementById("state-setup"),
  main:    document.getElementById("state-main"),
  success: document.getElementById("state-success"),
  error:   document.getElementById("state-error"),
};

// Setup
const setupUrlInput  = document.getElementById("setup-url");
const btnSaveSetup   = document.getElementById("btn-save-setup");

// Main form
const tabLink        = document.getElementById("tab-link");
const tabNote        = document.getElementById("tab-note");
const urlField       = document.getElementById("url-field");
const fieldTitle     = document.getElementById("field-title");
const fieldUrl       = document.getElementById("field-url");
const fieldNote      = document.getElementById("field-note");
const fieldTags      = document.getElementById("field-tags");
const highlightNotice  = document.getElementById("highlight-notice");
const highlightPreview = document.getElementById("highlight-preview");
const workspaceLabel   = document.getElementById("workspace-label");
const btnSettings    = document.getElementById("btn-settings");
const btnOpenSite    = document.getElementById("btn-open-site");
const btnSave        = document.getElementById("btn-save");
const labelNote      = document.getElementById("label-note");

// Success
const successSubtitle = document.getElementById("success-subtitle");
const btnView         = document.getElementById("btn-view");

// Error
const errorMessage = document.getElementById("error-message");
const btnRetry     = document.getElementById("btn-retry");

// ── State ─────────────────────────────────────────────────────────────────────
let appUrl        = "";
let workspaceId   = "";
let workspaceName = "";
let currentTab    = null;
let highlightText = "";
let currentType   = "link";  // "link" | "note"
// savedItemId is available for future use (e.g. deep-link to item)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let savedItemId   = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle("hidden", key !== name);
  }
}

function truncate(str, maxLen) {
  if (!str) return "";
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}

function parseTags(raw) {
  return raw
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
}

// ── Initialise ────────────────────────────────────────────────────────────────
async function init() {
  showScreen("loading");

  // Load stored settings
  const stored = await chrome.storage.sync.get(["appUrl", "workspaceId", "workspaceName"]);
  appUrl        = stored.appUrl        || "";
  workspaceId   = stored.workspaceId   || "";
  workspaceName = stored.workspaceName || "";

  if (!appUrl || !workspaceId) {
    showScreen("setup");
    return;
  }

  // Get active tab info
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
    } catch (_e) {
      currentTab = null;
    }

  // Try to get selected text from the page via content script
  highlightText = "";
  if (currentTab && currentTab.id) {
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { type: "GET_SELECTION" });
      if (response && response.selection) {
        highlightText = response.selection.trim();
      }
    } catch (_e) {
      // Content script not injected (e.g. chrome:// pages) — ignore
    }
  }

  populateForm();
  showScreen("main");
}

function populateForm() {
  // Pre-fill URL and title from the active tab
  if (currentTab) {
    fieldUrl.value   = currentTab.url   || "";
    fieldTitle.value = currentTab.title || "";
  }

  // Show workspace label
  workspaceLabel.textContent = workspaceName ? `Workspace: ${workspaceName}` : "";

  // Show highlight notice if text is selected
  if (highlightText) {
    highlightPreview.textContent = truncate(highlightText, 80);
    highlightNotice.classList.remove("hidden");
    // In note mode, pre-fill the note field with the highlight
    if (currentType === "note") {
      fieldNote.value = highlightText;
    }
  } else {
    highlightNotice.classList.add("hidden");
  }
}

// ── Type toggling ─────────────────────────────────────────────────────────────
function setType(type) {
  currentType = type;
  tabLink.classList.toggle("active", type === "link");
  tabNote.classList.toggle("active", type === "note");

  if (type === "link") {
    urlField.classList.remove("hidden");
    labelNote.innerHTML = 'Note <span class="optional">(optional)</span>';
    fieldNote.placeholder = "Add a note…";
    fieldNote.value = "";
  } else {
    urlField.classList.add("hidden");
    // In note mode the textarea is the primary content; pre-fill with highlight
    labelNote.innerHTML = 'Content';
    fieldNote.placeholder = "Write your note…";
    if (highlightText && !fieldNote.value) {
      fieldNote.value = highlightText;
    }
  }
}

tabLink.addEventListener("click", () => setType("link"));
tabNote.addEventListener("click", () => setType("note"));

// ── Settings button ───────────────────────────────────────────────────────────
btnSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ── Open site button ──────────────────────────────────────────────────────────
btnOpenSite.addEventListener("click", () => {
  chrome.tabs.create({ url: `${appUrl}/dashboard/pinboard` });
  window.close();
});

// ── Setup save ────────────────────────────────────────────────────────────────
btnSaveSetup.addEventListener("click", async () => {
  const url = setupUrlInput.value.trim().replace(/\/$/, "");
  if (!url) {
    setupUrlInput.focus();
    return;
  }

  // Try to load workspace list from the API to get workspaceId
  btnSaveSetup.disabled = true;
  btnSaveSetup.textContent = "Connecting…";

  try {
    const res = await fetch(`${url}/api/v1/workspaces`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(res.status === 401
        ? "Not logged in — open Dropboard and sign in first."
        : `API error ${res.status}`
      );
    }

    const data = await res.json();
    const workspaces = data?.data || [];

    if (!workspaces.length) {
      throw new Error("No workspaces found. Create one in Dropboard first.");
    }

    // Use the first workspace (most recently active)
    const ws = workspaces[0];

    await chrome.storage.sync.set({
      appUrl:        url,
      workspaceId:   ws.id,
      workspaceName: ws.name,
    });

    appUrl        = url;
    workspaceId   = ws.id;
    workspaceName = ws.name;

    init();
  } catch (err) {
    btnSaveSetup.disabled = false;
    btnSaveSetup.textContent = "Save & Continue";
    alert(err.message || "Failed to connect. Check the URL and try again.");
  }
});

// ── Save item ─────────────────────────────────────────────────────────────────
btnSave.addEventListener("click", saveItem);

async function saveItem() {
  const title = fieldTitle.value.trim();
  const note  = fieldNote.value.trim();
  const tags  = parseTags(fieldTags.value);

  if (currentType === "link") {
    const url = fieldUrl.value.trim();
    if (!url) {
      fieldUrl.focus();
      return;
    }
    await postItem({ type: "link", content: url, title, note: note || undefined, tags });
  } else {
    const content = note;
    if (!content) {
      fieldNote.focus();
      return;
    }
    await postItem({ type: "note", content, title: title || undefined, tags });
  }
}

async function postItem(body) {
  btnSave.disabled = true;
  btnSave.textContent = "Saving…";

  try {
    const res = await fetch(`${appUrl}/api/v1/items`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, workspaceId }),
    });

    if (!res.ok) {
      let msg = `Server error (${res.status})`;
      try {
        const json = await res.json();
        msg = json?.error || json?.message || msg;
      } catch (_e) {}

      if (res.status === 401) {
        msg = "Not signed in. Open Dropboard and log in, then try again.";
      }
      throw new Error(msg);
    }

    const data = await res.json();
    savedItemId = data?.data?.id || null;

    // Show success
    const typeLabel = body.type === "link" ? "Link" : "Note";
    successSubtitle.textContent = `${typeLabel} saved to your pinboard.`;
    showScreen("success");

    // Auto-close after 2.5 s
    setTimeout(() => window.close(), 2500);

  } catch (err) {
    errorMessage.textContent = err.message || "Unknown error.";
    showScreen("error");
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
      </svg>
      Save
    `;
  }
}

// ── Success actions ───────────────────────────────────────────────────────────
btnView.addEventListener("click", () => {
  chrome.tabs.create({ url: `${appUrl}/dashboard/pinboard` });
  window.close();
});

// ── Error retry ───────────────────────────────────────────────────────────────
btnRetry.addEventListener("click", () => {
  showScreen("main");
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
