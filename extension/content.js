/**
 * Dropboard Web Clipper — content.js
 *
 * Injected into every page at document_idle.
 *
 * Responsibilities:
 *  - Respond to GET_SELECTION messages from popup.js with the current
 *    window.getSelection() text (Highlight Sync).
 *  - Respond to GET_PAGE_INFO messages with { url, title } for the current page.
 */

"use strict";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SELECTION") {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    sendResponse({ selection: text });
    return true; // keep channel open for async
  }

  if (message.type === "GET_PAGE_INFO") {
    sendResponse({
      url:   window.location.href,
      title: document.title || "",
    });
    return true;
  }
});
