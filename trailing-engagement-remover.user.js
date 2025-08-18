// ==UserScript==
// @name         ChatGPT De-Engager (Strong Regex Edition)
// @namespace    local.kill.followups
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  const SCRIPT_ENABLED = false; // Set to true to apply changes

  const killPhrases = [
    "let me know",
    "would you like",
    "should i",
    "if you want",
    "want me to",
    "i can",
    "need me to",
    "do you want",
    "any questions",
    "what do you think"
  ];

  const engagementRegex = new RegExp(
    `\\n?.{0,500}?\\b(?:${killPhrases.join("|")}).{0,400}\\?\\s*$`,
    "im"
  );

  function scrub(text) {
    // Step 1: Try to match engagement-style paragraph at end
    let modified = text.replace(engagementRegex, "");

    // Step 2: Fall back to generic short question removal if nothing matched
    if (modified === text) {
      modified = modified.replace(/\n?.{1,300}\?\s*$/m, "");
    }

    return modified.trimEnd();
  }

  function cleanNode(node) {
    const blocks = node.querySelectorAll('[data-message-author-role="assistant"] .markdown, [data-message-author-role="assistant"] .prose, [data-message-author-role="assistant"]');

    blocks.forEach(el => {
      if (el.closest('pre, code')) return;

      const before = el.innerText;
      const after = scrub(before);

      if (after !== before) {
        if (!SCRIPT_ENABLED) {
          console.log("[De-Engager] Would remove engagement tail:", {
            original: before,
            cleaned: after
          });
          return;
        }

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

  // Initial scrub
  cleanNode(document.body);
})();
