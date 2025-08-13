// ==UserScript==
// @name         ChatGPT Time Context Injector (Hybrid ISO + Human View + Bubble-Preserving Swap)
// @namespace    net.user.tamper.timectx
// @version      2.4.0
// @description  Injects ISO time metadata for AI, shows human-readable format in chat via post-render swap, preserving user bubble alignment.
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_ENABLED = true;
    const DEFAULT_PREPEND = true;
    const DEFAULT_MIN_GAP_MS = 0;

    const KEY_ENABLED = 'tm_timectx_enabled';
    const KEY_PREPEND = 'tm_timectx_prepend';
    const KEY_MIN_GAP = 'tm_timectx_min_gap_ms';

    const getEnabled = () => GM_getValue(KEY_ENABLED, DEFAULT_ENABLED);
    const setEnabled = (v) => GM_setValue(KEY_ENABLED, !!v);
    const getPrepend = () => GM_getValue(KEY_PREPEND, DEFAULT_PREPEND);
    const setPrepend = (v) => GM_setValue(KEY_PREPEND, !!v);
    const getMinGap = () => GM_getValue(KEY_MIN_GAP, DEFAULT_MIN_GAP_MS);
    const setMinGap = (ms) => GM_setValue(KEY_MIN_GAP, Math.max(0, Number(ms) || 0));

    let lastUserMessageAt = null;
    let lastAssistantMessageAt = null;

    const isVisible = el => !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;

    function findEditor() {
        const candidates = Array.from(document.querySelectorAll('.ProseMirror,[contenteditable="true"]')).filter(isVisible);
        return candidates.find(el => el.closest('form')) || candidates[0] || null;
    }

    function findSendButton() {
        return document.querySelector('form button[aria-label*="Send" i], form button[data-testid="send-button"]');
    }

    function setComposerTextSafe(text) {
        const editor = findEditor();
        if (!editor) return false;
        editor.focus();
        document.execCommand('selectAll', false, null);
        const ok = document.execCommand('insertText', false, text);
        if (!ok) {
            editor.textContent = '';
            editor.appendChild(document.createTextNode(text));
            editor.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        }
        return true;
    }

    function getComposerTextSafe() {
        const ed = findEditor();
        return ed ? (ed.innerText || '') : '';
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function formatLocalDateTime(d) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
        const offsetMin = -d.getTimezoneOffset();
        const sign = offsetMin >= 0 ? '+' : '-';
        const abs = Math.abs(offsetMin);
        const hh = pad(Math.floor(abs / 60));
        const mm = pad(abs % 60);
        const offsetStr = `UTC${sign}${hh}:${mm}`;
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        return `${date} ${time} (${tz}, ${offsetStr})`;
    }

    function formatISO(d) {
        return d.toISOString();
    }

    function formatDurationSec(ms) {
        if (ms == null) return 'unknown';
        return Math.max(0, Math.floor(ms / 1000)); // seconds only for ISO
    }

    function formatDurationHuman(ms) {
        if (ms == null) return 'unknown';
        const s = Math.max(0, Math.floor(ms / 1000));
        const days = Math.floor(s / 86400);
        const hrs = Math.floor((s % 86400) / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        const parts = [];
        if (days) parts.push(days + 'd');
        if (hrs) parts.push(hrs + 'h');
        if (mins) parts.push(mins + 'm');
        parts.push(secs + 's');
        return parts.join(' ');
    }

    function buildTimeContexts() {
        const now = new Date();
        const sinceMyLast = lastUserMessageAt ? (now - lastUserMessageAt) : null;
        const sinceYourLast = lastAssistantMessageAt ? (now - lastAssistantMessageAt) : null;

        const isoBlock =
              `[time_meta current="${formatISO(now)}" since_user_last_s="${formatDurationSec(sinceMyLast)}" since_assistant_last_s="${formatDurationSec(sinceYourLast)}"]`;

        const humanBlock =
              `⏱️ Time context — Now: ${formatLocalDateTime(now)}. ` +
              `Since my last message: ${formatDurationHuman(sinceMyLast)}. ` +
              `Since your last reply: ${formatDurationHuman(sinceYourLast)}.`;

        return { isoBlock, humanBlock };
    }

    function injectTimeContext() {
        if (!getEnabled()) return;
        const current = getComposerTextSafe();
        if (!current.trim()) return;

        const minGap = getMinGap();
        const nowTs = Date.now();
        if (minGap > 0 && lastUserMessageAt && (nowTs - lastUserMessageAt) < minGap) {
            lastUserMessageAt = nowTs;
            return;
        }

        const { isoBlock } = buildTimeContexts();
        const toSend = getPrepend() ? `${isoBlock}\n\n${current}` : `${current}\n\n${isoBlock}`;
        setComposerTextSafe(toSend);

        lastUserMessageAt = nowTs;
    }

    function attachHandlers() {
        const btn = findSendButton();
        if (btn && !btn.dataset.timectxAttached) {
            btn.addEventListener('mousedown', injectTimeContext, true);
            btn.dataset.timectxAttached = '1';
            console.log('[TimeCtx] Hooked send button');
        }
        const ed = findEditor();
        if (ed && !ed.dataset.timectxAttached) {
            ed.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.isComposing) {
                    injectTimeContext();
                }
            }, true);
            ed.dataset.timectxAttached = '1';
            console.log('[TimeCtx] Hooked editor Enter key');
        }
        injectToggleButton();
    }

    function injectToggleButton() {
        if (document.querySelector('.tm-timectx-toggle')) return;
        const sendBtn = findSendButton();
        if (!sendBtn) return;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tm-timectx-toggle';
        toggle.textContent = getEnabled() ? '⏱ TimeCtx ON' : '⏱ TimeCtx OFF';
        Object.assign(toggle.style, {
            marginRight: '6px',
            padding: '4px 6px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #666',
            background: getEnabled() ? '#0b5cff' : '#666',
            color: '#fff',
            cursor: 'pointer'
        });
        toggle.addEventListener('click', () => {
            setEnabled(!getEnabled());
            toggle.textContent = getEnabled() ? '⏱ TimeCtx ON' : '⏱ TimeCtx OFF';
            toggle.style.background = getEnabled() ? '#0b5cff' : '#666';
        });
        sendBtn.parentElement.insertBefore(toggle, sendBtn);
    }

    // Bubble-preserving post-render swap with styling
    const userSelectors = [
        '[data-message-author-role="user"]',
        '[data-testid="user-message"]',
        'article.user',
        'div.user'
    ];

    const msgObserver = new MutationObserver((records) => {
        for (const rec of records) {
            for (const n of rec.addedNodes) {
                if (!(n instanceof Element)) continue;
                if (userSelectors.some(sel => n.matches(sel) || n.querySelector(sel))) {
                    const contentNode = n.querySelector('.whitespace-pre-wrap');
                    if (contentNode && contentNode.textContent.trim().startsWith('[time_meta')) {
                        const { humanBlock } = buildTimeContexts();
                        contentNode.innerHTML = contentNode.textContent.replace(
                            /^\[time_meta[^\]]*\]/,
                            `<span class="tm-timectx-human">${humanBlock}</span>`
                    );
                }
            }
        }
    }
});
    msgObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Style for human-readable time context
    const style = document.createElement('style');
    style.textContent = `
.tm-timectx-human {
    font-weight: 600;
    color: #4fa3ff;
}
`;
    document.head.appendChild(style);

    msgObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Track assistant replies
    const assistantSelectors = [
        '[data-message-author-role="assistant"]',
        '[data-testid="assistant-message"]',
        'article.assistant',
        'div.assistant'
    ];
    new MutationObserver(records => {
        for (const rec of records) {
            for (const n of rec.addedNodes) {
                if (n instanceof Element && (assistantSelectors.some(sel => n.matches(sel)) || assistantSelectors.some(sel => n.querySelector(sel)))) {
                    lastAssistantMessageAt = Date.now();
                }
            }
        }
    }).observe(document.documentElement, { childList: true, subtree: true });

    setInterval(attachHandlers, 1000);
})();
