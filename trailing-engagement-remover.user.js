// ==UserScript==
// @name         ChatGPT De-Engager (Strong Regex + Kill Counter)
// @namespace    local.kill.followups
// @version      1.0.4
// @description  Automatically destroys any engagement-bait bullshit — even the sneaky ones hiding inside <strong> tags.
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
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
        // Strong trailing-paragraph pattern with leading bait phrases
        const pattern = /(?:\n+)?(You want me to|Want me to|Let me know if|Would you like me to|Need me to|Should I|Do you want me to|Can I|Shall I|Would you like)[^\n]{0,1000}\?\s*$/i;

        let modified = text.replace(pattern, "");

        if (modified === text) {
            // Fallback: short trailing one-liner question
            modified = modified.replace(/\n?.{1,300}\?\s*$/m, "");
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
