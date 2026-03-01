/**
 * Dropboard Web Clipper — options.js
 *
 * Settings page logic:
 *  - Load stored { appUrl, workspaceId, workspaceName } on page open
 *  - Connect: fetch /api/v1/workspaces, list them for selection
 *  - Save: persist selected workspace
 *  - Disconnect: clear all stored settings
 */

"use strict";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const inputUrl         = document.getElementById("input-url");
const btnConnect       = document.getElementById("btn-connect");
const btnDisconnect    = document.getElementById("btn-disconnect");
const statusBar        = document.getElementById("status-bar");
const workspaceCard    = document.getElementById("workspace-card");
const workspaceList    = document.getElementById("workspace-list");
const btnSaveWorkspace = document.getElementById("btn-save-workspace");
const versionTag       = document.getElementById("version-tag");

// ── State ─────────────────────────────────────────────────────────────────────
let loadedWorkspaces   = [];
let selectedWorkspaceId = "";

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Show extension version
  const manifest = chrome.runtime.getManifest();
  versionTag.textContent = `v${manifest.version}`;

  const stored = await chrome.storage.sync.get(["appUrl", "workspaceId", "workspaceName"]);

  if (stored.appUrl) {
    inputUrl.value = stored.appUrl;
  }

  if (stored.workspaceId) {
    selectedWorkspaceId = stored.workspaceId;
    // Attempt to load workspace list to show selection UI
    await loadWorkspaces(stored.appUrl, stored.workspaceId);
  }
}

// ── Status bar helpers ────────────────────────────────────────────────────────
function showStatus(type, message) {
  statusBar.textContent = message;
  statusBar.className   = type; // "success" | "error"
}

function clearStatus() {
  statusBar.textContent = "";
  statusBar.className   = "";
}

// ── Load + render workspaces ──────────────────────────────────────────────────
async function loadWorkspaces(appUrl, activeId) {
  try {
    const res = await fetch(`${appUrl}/api/v1/workspaces`, {
      credentials: "include",
    });

    if (!res.ok) {
      const msg = res.status === 401
        ? "Not signed in — open Dropboard and log in first."
        : `API error ${res.status}`;
      showStatus("error", msg);
      return;
    }

    const data = await res.json();
    loadedWorkspaces = data?.data || [];

    if (!loadedWorkspaces.length) {
      showStatus("error", "No workspaces found. Create one in Dropboard first.");
      return;
    }

    renderWorkspaces(activeId || loadedWorkspaces[0].id);
    workspaceCard.style.display = "block";
    clearStatus();
  } catch (_e) {
    showStatus("error", `Could not reach ${appUrl}. Check the URL and try again.`);
  }
}

function renderWorkspaces(activeId) {
  selectedWorkspaceId = activeId;
  workspaceList.innerHTML = "";

  for (const ws of loadedWorkspaces) {
    const isSelected = ws.id === activeId;
    const div = document.createElement("div");
    div.className = `workspace-option${isSelected ? " selected" : ""}`;
    div.dataset.id = ws.id;
    div.innerHTML = `
      <div class="workspace-radio"></div>
      <span class="workspace-name">${escapeHtml(ws.name)}</span>
    `;
    div.addEventListener("click", () => {
      selectedWorkspaceId = ws.id;
      renderWorkspaces(ws.id);
    });
    workspaceList.appendChild(div);
  }
}

// ── Connect button ────────────────────────────────────────────────────────────
btnConnect.addEventListener("click", async () => {
  const url = inputUrl.value.trim().replace(/\/$/, "");
  if (!url) {
    inputUrl.focus();
    showStatus("error", "Please enter the App URL.");
    return;
  }

  btnConnect.disabled     = true;
  btnConnect.textContent  = "Connecting…";
  workspaceCard.style.display = "none";
  clearStatus();

  await loadWorkspaces(url, selectedWorkspaceId);

  btnConnect.disabled    = false;
  btnConnect.textContent = "Connect & Load Workspaces";
});

// ── Save workspace ────────────────────────────────────────────────────────────
btnSaveWorkspace.addEventListener("click", async () => {
  if (!selectedWorkspaceId) {
    showStatus("error", "Please select a workspace.");
    return;
  }

  const appUrl = inputUrl.value.trim().replace(/\/$/, "");
  const ws     = loadedWorkspaces.find(w => w.id === selectedWorkspaceId);

  if (!ws) {
    showStatus("error", "Selected workspace not found.");
    return;
  }

  await chrome.storage.sync.set({
    appUrl,
    workspaceId:   ws.id,
    workspaceName: ws.name,
  });

  showStatus("success", `Saved! Using workspace "${ws.name}".`);
});

// ── Disconnect ────────────────────────────────────────────────────────────────
btnDisconnect.addEventListener("click", async () => {
  await chrome.storage.sync.clear();
  inputUrl.value       = "";
  loadedWorkspaces     = [];
  selectedWorkspaceId  = "";
  workspaceCard.style.display = "none";
  clearStatus();
  showStatus("success", "Disconnected. All settings cleared.");
});

// ── XSS-safe helper ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
