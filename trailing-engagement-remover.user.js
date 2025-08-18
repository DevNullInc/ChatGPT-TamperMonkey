// ==UserScript==
// @name         ChatGPT De-Engager (Safe Version)
// @namespace    local.kill.followups
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  // Toggle this to true to actually make changes, or false to only log them
  const SCRIPT_ENABLED = false;

  const killLines = [
    /^(?:let me know|would you like|should i|if you want|want me to|i can|need me to|do you want|any questions|what do you think)\b.*$/i
  ];

  function scrub(text) {
    let original = text;

    // Remove lines that match engagement patterns
    for (const rx of killLines) {
      text = text.replace(new RegExp(rx.source + "\\n?$", rx.flags + "m"), "");
    }

    // Remove short trailing question at end
    text = text.replace(/\n?.{1,300}\?\s*$/m, "");

    return text.trimEnd();
  }

  function cleanNode(node) {
    const blocks = node.querySelectorAll('[data-message-author-role="assistant"] .markdown, [data-message-author-role="assistant"] .prose, [data-message-author-role="assistant"]');

    blocks.forEach(el => {
      if (el.closest('pre, code')) return;

      const before = el.innerText;
      const after = scrub(before);

      if (after !== before) {
        if (!SCRIPT_ENABLED) {
          console.log("[De-Engager] Match found. Would scrub:", { original: before, cleaned: after });
          return;
        }

        // Safe: only scrub text nodes, preserve formatting
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            child.textContent = scrub(child.textContent);
          }
        });
      }
    });
  }

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "childList") {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) cleanNode(n);
        });
      } else if (m.type === "characterData" && m.target.parentElement) {
        cleanNode(m.target.parentElement);
      }
    }
  });

  mo.observe(document.body, { subtree: true, childList: true, characterData: true });

  // First pass on initial content
  cleanNode(document.body);
})();
