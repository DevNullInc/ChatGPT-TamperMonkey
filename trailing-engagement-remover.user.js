// ==UserScript==
// @name         ChatGPT De-Engager (Strong Regex + Kill Counter)
// @namespace    local.kill.followups
// @version      1.0.7
// @description  Automatically destroys any engagement-bait bullshit — even the sneaky ones hiding inside <strong> tags.
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @downloadURL  https://github.com/DevNullInc/ChatGPT-TamperMonkey/raw/refs/heads/main/trailing-engagement-remover.user.js
// @updateURL    https://github.com/DevNullInc/ChatGPT-TamperMonkey/raw/refs/heads/main/trailing-engagement-remover.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    const SCRIPT_ENABLED = true; // Set to false to test without modifying anything

    let killCount = 0;
    let killDisplay = null;

    function createKillCounter() {
        killDisplay = document.createElement("div");
        killDisplay.textContent = "Engagement tails snipped: 0";
        killDisplay.style.position = "fixed";
        killDisplay.style.top = "8px";
        killDisplay.style.left = "50%";
        killDisplay.style.transform = "translateX(-50%)";
        killDisplay.style.zIndex = "9999";
        killDisplay.style.background = "#111";
        killDisplay.style.color = "#0f0";
        killDisplay.style.padding = "4px 10px";
        killDisplay.style.borderRadius = "6px";
        killDisplay.style.fontSize = "12px";
        killDisplay.style.fontFamily = "monospace";
        killDisplay.style.opacity = "0.85";
        killDisplay.style.pointerEvents = "none";
        document.body.appendChild(killDisplay);
    }

function scrub(text) {
    const bait = [
        "Want me to",
        "Let me know if",
        "Would you like(?: me to)?",
        "Do you want me to",
        "Should I",
        "Need me to",
        "Can I",
        "Shall I",
        "Would it help",
        "Is it helpful",
        "Perhaps I could",
        "You want me to"
    ].join("|");

    const actions = [
        "write",
        "show",
        "sketch",
        "map out",
        "explain",
        "break down",
        "rebuild",
        "generate",
        "help",
        "illustrate",
        "list",
        "walk you through",
        "give you",
        "lay out"
    ].join("|");

    // Allow 0–4 filler words between bait and action
    const flexibleGap = "(?:\\s+\\w+){0,4}\\s+";

    const pattern = new RegExp(
        `(?:\\n+)?\\s*(?:${bait})${flexibleGap}(?:${actions})[^\\n]{0,800}?\\?\\s*$`,
        "i"
    );

    let modified = text.replace(pattern, "");

    if (modified === text) {
        // Fallback: final line that's a short trailing question
        modified = modified.replace(/\n?.{1,280}\?\s*$/m, "");
    }

    return modified.trimEnd();
}
    function cleanNode(node) {
        const paragraphs = node.querySelectorAll('[data-message-author-role="assistant"] .markdown p');

        paragraphs.forEach(paragraph => {
            if (paragraph.closest('pre, code')) return;

            const fullText = paragraph.innerText;
            const cleanedText = scrub(fullText);

            if (cleanedText !== fullText) {
                if (!SCRIPT_ENABLED) {
                    console.log("[De-Engager] Would remove engagement tail:", {
                        original: fullText,
                        cleaned: cleanedText
                    });
                    return;
                }

                // Replace entire paragraph with plain cleaned text
                paragraph.replaceChildren(document.createTextNode(cleanedText));
                killCount++;
                if (killDisplay) {
                    killDisplay.textContent = `Engagement tails snipped: ${killCount}`;
                }
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

    // Initial sweep and HUD
    cleanNode(document.body);
    createKillCounter();
})();
