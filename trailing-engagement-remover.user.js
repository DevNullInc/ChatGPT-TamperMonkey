// ==UserScript==
// @name         ChatGPT De-Engager (Strong Regex Edition)
// @namespace    local.kill.followups
// @description  Automatically destroys any engagement-bait bullshit.
// @version      1.0.3
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
        // Kill trailing multi-line engagement paragraph ending in a question mark
        const multilineTail = /(?:\n{2,}|\n?)(You want me to|Want me to|Let me know if|Would you like me to|Need me to|Should I|Do you want me to|Can I|Shall I|Would you like).*?\?\s*$/ims;

        let modified = text.replace(multilineTail, "");

        // Fallback: short trailing one-liner question
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
