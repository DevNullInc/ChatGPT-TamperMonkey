// ==UserScript==
// @name         ChatGPT De-Engager (Strong Regex + Kill Counter)
// @namespace    local.kill.followups
// @version      1.2.0
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
    const SCRIPT_ENABLED = true;
    let killCount = 0;
    let killDisplay = null;

    function createKillCounter() {
        if (killDisplay) return;
        killDisplay = document.createElement("div");
        killDisplay.textContent = "Engagement tails snipped: 0";
        Object.assign(killDisplay.style, {
            position: "fixed",
            top: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "999999",
            background: "#111",
            color: "#0f0",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontFamily: "monospace",
            opacity: "0.85",
            pointerEvents: "none"
        });
        document.body?.appendChild(killDisplay);
    }

    function updateKillCounter() {
        if (killDisplay) {
            killDisplay.textContent = `Engagement tails snipped: ${killCount}`;
        }
    }

    // 🔧 Flatten text BEFORE passing to regex
    function flattenText(input) {
        return String(input || "")
            .replace(/[*_~`]+/g, '') // Markdown
            .replace(/<\/?(strong|em|b|i|u|span)[^>]*>/gi, '') // HTML tags
            .replace(/[“”"']/g, '"') // Smart quotes
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Invisible junk
            .replace(/\b(give|offer|provide)\b/gi, "give you")
            .replace(/\b(draw|illustrate|sketch)\b/gi, "illustrate")
            .replace(/\b(demonstrate|showcase|show)\b/gi, "show")
            .replace(/\b(build|construct|assemble|map out)\b/gi, "build")
            .replace(/\s+/g, ' ')
            .trim();
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

        const cleanText = flattenText(text); // 🧼 Normalize input first
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
        const length = raw.trim().length;

        const hasHTMLBait = /<em>|<strong>|<b>/i.test(pNode.innerHTML);
        const endsWithQ = /\?\s*$/.test(raw);
        const isShort = length <= 350;

        const cleaned = scrub(raw);

        if (
            cleaned !== raw.trim() || 
            (SCRIPT_ENABLED && endsWithQ && isShort) || 
            (SCRIPT_ENABLED && hasHTMLBait && endsWithQ)
        ) {
            if (SCRIPT_ENABLED) {
                pNode.remove();
                return true;
            } else {
                console.log("[De-Engager] Would remove <p> due to bait:", {
                    original: raw,
                    cleaned
                });
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

    // 🚀 Init
    createKillCounter();
    updateKillCounter();

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(n => {
                if (n.nodeType === 1) cleanNode(n);
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial sweep
    document.querySelectorAll('[data-message-author-role="assistant"]').forEach(cleanNode);
})();
