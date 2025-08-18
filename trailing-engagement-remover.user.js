// ==UserScript==
// @name         ChatGPT De-Engager (Strong Regex + Kill Counter)
// @namespace    local.kill.followups
// @version      1.1.2
// @description  Automatically destroys any engagement-bait bullshit — even the sneaky ones hiding inside <strong> tags.
// @author       DevNullInc
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
        if (killDisplay) return; // Avoid duplicate creation

        killDisplay = document.createElement("div");
        killDisplay.textContent = "Engagement tails snipped: 0";
        killDisplay.style.position = "fixed";
        killDisplay.style.top = "8px";
        killDisplay.style.left = "50%";
        killDisplay.style.transform = "translateX(-50%)";
        killDisplay.style.zIndex = "999999"; // Increased z-index for better visibility
        killDisplay.style.background = "#111";
        killDisplay.style.color = "#0f0";
        killDisplay.style.padding = "4px 10px";
        killDisplay.style.borderRadius = "6px";
        killDisplay.style.fontSize = "12px";
        killDisplay.style.fontFamily = "monospace";
        killDisplay.style.opacity = "0.85";
        killDisplay.style.pointerEvents = "none";

        if (document.body) {
            document.body.appendChild(killDisplay);
            console.log("[De-Engager] Kill counter created and appended to body.");
        } else {
            console.warn("[De-Engager] Document body is not available yet.");
        }
    }

    function updateKillCounter() {
        if (killDisplay) {
            killDisplay.textContent = `Engagement tails snipped: ${killCount}`;
            console.log(`[De-Engager] Kill counter updated to: ${killCount}`);
        } else {
            console.warn("[De-Engager] Kill display is not initialized.");
        }
    }

    function scrub(text) {
        const bait = [
            "want me to",
            "let me know if",
            "would you like(?: me to)?",
            "do you want me to",
            "should I",
            "need me to",
            "can I",
            "shall I",
            "would it help",
            "is it helpful",
            "perhaps I could",
            "you want me to"
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
            "lay out",
            "blueprint",
            "weaponize",
            "pre[- ]?process"
        ].join("|");

        const cleanText = String(text || "")
        .replace(/[*_~`]+/g, '')
        .replace(/<\/?strong>|<\/?em>|<\/?b>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();

        const flexibleGap = "(?:\\s+\\w+){0,6}\\s*";
        const pattern = new RegExp(
            `(?:\\n+)?\\s*(?:${bait})${flexibleGap}(?:${actions})[^\\n]{0,1000}?\\?\\s*$`,
            "i"
        );

        let modified = cleanText.replace(pattern, '');
        if (modified === cleanText) {
            modified = cleanText.replace(/\n?.{1,300}\?\s*$/m, "");
        }

        return modified.trimEnd();
    }

    function scrubEngagementTail(pNode) {
        try {
            if (!pNode || !pNode.textContent) return false;
            if (!pNode.dataset?.isLastNode && !pNode.dataset?.isOnlyNode) return false;

            const raw = pNode.innerText || pNode.textContent || "";
            const cleaned = scrub(raw);

            if (cleaned !== raw.trim()) {
                if (SCRIPT_ENABLED) {
                    pNode.remove();
                    return true;
                } else {
                    console.log("[De-Engager] Would remove full <p> node:", { original: raw });
                }
            }
        } catch (e) {
            console.warn("Error in scrubEngagementTail:", e);
        }
        return false;
    }

    function cleanNode(node) {
        const paragraphs = node.querySelectorAll('[data-message-author-role="assistant"] .markdown p');

        paragraphs.forEach(paragraph => {
            if (paragraph.closest('pre, code')) return;

            const killed = scrubEngagementTail(paragraph);
            if (killed) {
                killCount++;
                updateKillCounter();
                return;
            }

            const fullText = paragraph.innerText;
            const cleanedText = scrub(fullText);

            if (cleanedText !== fullText) {
                if (!SCRIPT_ENABLED) {
                    console.log("[De-Engager] Would replace bait:", {
                        original: fullText,
                        cleaned: cleanedText
                    });
                    return;
                }

                paragraph.replaceChildren(document.createTextNode(cleanedText));
                killCount++;
                updateKillCounter();
            }
        });
    }

    // Initialize directly since the script runs at document-idle
    createKillCounter(); // Create the counter immediately
    updateKillCounter(); // Ensure it's updated initially

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        cleanNode(node);
                    }
                });
            }
        });
        console.log("[De-Engager] Mutation observed; checking for new nodes.");
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Perform initial cleanup
    const nodes = document.querySelectorAll('[data-message-author-role="assistant"]');
    nodes.forEach(cleanNode);
    console.log("[De-Engager] Initial cleanup performed.");

})();
