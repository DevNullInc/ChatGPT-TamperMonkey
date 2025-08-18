// ==UserScript==
// @name         ChatGPT Quick Answer Auto-Clicker (GPT-5 Thinking) + Minimize UI
// @namespace    https://tampermonkey.local
// @version      1.0.6
// @description  Automatically clicks "Get a quick answer" on ChatGPT when using GPT-5 Thinking (with a UI toggle + model check + minimize panel button).
// @author       DevNullInc
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @downloadURL  https://github.com/DevNullInc/ChatGPT-TamperMonkey/raw/refs/heads/main/gpt5-lobotomy.user.js
// @updateURL    https://github.com/DevNullInc/ChatGPT-TamperMonkey/raw/refs/heads/main/gpt5-lobotomy.user.js
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(() => {
    'use strict';

    const LS_KEY = 'tmqa_cfg_v1';
    const DEFAULT_CFG = {
        enabled: true,
        requireModelText: true,
        modelTextRegex: '(\\bchatgpt\\s*5\\b(?:\\s+\\w+)*|\\bo3\\b)',
        quickAnswerTextRegex: '(\\bGet a quick answer\\b|\\bQuick answer\\b)',
        clickDebounceMs: 3000,
        maxClicksPerSession: 1000,
        debug: true
    };

    const cfg = loadCfg();
    const log = (...a) => cfg.debug && console.log('[QuickAnswer TM]', ...a);
    const now = () => Date.now();
    let clicks = 0;
    let lastClickAt = 0;
    let lastModelHit = '';

    makePanel();

    const observer = new MutationObserver(() => { tryClick(); });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-disabled', 'disabled']
    });

    setInterval(tryClick, 1200);
    tryClick();

    function tryClick() {
        if (!cfg.enabled) return;
        if (cfg.requireModelText && !isModelMatch()) return;

        const btn = findBestQuickAnswerButton();
        if (!btn) return;

        const t = now();
        if (t - lastClickAt < cfg.clickDebounceMs) return;
        if (clicks >= cfg.maxClicksPerSession) return;

        click(btn);
    }

    function click(el) {
        try {
            el.dataset.tmqaClickedAt = String(now());
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            clicks++;
            lastClickAt = now();
            updatePanel();
            log('Clicked:', el);
        } catch (e) {
            console.error('[QuickAnswer TM] Click failed:', e);
        }
    }

    function findBestQuickAnswerButton() {
        const textRx = new RegExp(cfg.quickAnswerTextRegex, 'i');
        const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter(isVisible)
        .filter(notDisabled)
        .filter(el => {
            const t = fullButtonText(el);
            const a = (el.getAttribute('aria-label') || '').trim();
            const title = (el.getAttribute('title') || '').trim();
            return textRx.test(t) || textRx.test(a) || textRx.test(title);
        })
        .filter(el => {
            const clickedAt = Number(el.dataset.tmqaClickedAt || 0);
            return !clickedAt || (now() - clickedAt > 15000);
        });

        if (!candidates.length) return null;

        const scored = candidates.map(el => {
            const r = el.getBoundingClientRect();
            const area = Math.max(1, r.width * r.height);
            const zi = getComputedStyle(el).zIndex;
            const z = Number.isFinite(+zi) ? +zi : 0;
            return { el, score: area + z * 1000 };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].el;
    }

    function isModelMatch() {
        const rx = new RegExp(cfg.modelTextRegex, 'i');
        const roots = [
            document.querySelector('header'),
            document.querySelector('nav'),
            document.querySelector('[data-testid*="model" i]'),
            document.querySelector('[aria-label*="model" i]'),
            document.querySelector('[id*="model" i]'),
            document.querySelector('main'),
            document.body
        ].filter(Boolean);

        lastModelHit = '';
        for (const root of roots) {
            for (const n of textyNodes(root, 3000)) {
                const t = normText(n.textContent);
                if (t && rx.test(t)) {
                    lastModelHit = t;
                    return true;
                }
            }
            const labeled = root.querySelectorAll('button,[role="button"],[aria-label],[title]');
            for (const el of labeled) {
                const t = normText(
                    (el.getAttribute('aria-label') || '') + ' ' +
                    (el.getAttribute('title') || '') + ' ' +
                    (el.textContent || '')
                );
                if (t && rx.test(t)) {
                    lastModelHit = t;
                    return true;
                }
            }
        }
        return false;
    }

    function fullButtonText(el) {
        let t = (el.innerText || el.textContent || '').trim();
        if (!t) t = el.getAttribute('aria-label') || '';
        return normText(t);
    }

    function isVisible(el) {
        if (!el || !(el instanceof Element)) return false;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
            rect.top < (window.innerHeight || 99999) &&
            rect.left < (window.innerWidth || 99999);
    }

    function notDisabled(el) {
        return !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
    }

    function normText(s) {
        return String(s || '')
            .replace(/[\u00A0\u2007\u202F]/g, ' ')
            .replace(/[\u2010-\u2015]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function textyNodes(root, max = 5000) {
        const out = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const t = node.textContent && node.textContent.trim();
                if (!t) return NodeFilter.FILTER_SKIP;
                if (/^\s*$/.test(t)) return NodeFilter.FILTER_SKIP;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let i = 0;
        while (walker.nextNode() && i < max) {
            out.push(walker.currentNode);
            i++;
        }
        return out;
    }

    function loadCfg() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return { ...DEFAULT_CFG };
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_CFG, ...parsed };
        } catch {
            return { ...DEFAULT_CFG };
        }
    }

    function saveCfg() {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.warn('[QuickAnswer TM] Failed to save settings:', e);
        }
    }

    function makePanel() {
        const style = document.createElement('style');
        style.textContent = `
      .tmqa-panel {
        position: fixed; right: 12px; bottom: 12px; z-index: 999999;
        background: rgba(28,28,30,0.92); color: #fff; border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px; padding: 8px 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        font: 12px/1.35 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        backdrop-filter: blur(6px);
        max-width: 240px;
      }
      .tmqa-panel * { box-sizing: border-box; }
      .tmqa-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .tmqa-min-btn {
        background: none; color: #fff; border: none; font-size: 14px;
        cursor: pointer; width: 20px; height: 20px; line-height: 18px;
        border-radius: 4px;
      }
      .tmqa-min-btn:hover { background: rgba(255,255,255,0.15); }
      .tmqa-panel.collapsed .tmqa-body { display: none; }
      .tmqa-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
      .tmqa-title { font-weight: 600; }
      .tmqa-badge { padding: 2px 6px; border-radius: 6px; font-size: 11px; background: #2d2d2f; }
      .tmqa-switch { cursor: pointer; user-select: none; }
      .tmqa-btn {
        cursor: pointer; padding: 5px 8px; border-radius: 8px; background: #3a3a3c; border: 1px solid #4a4a4c;
      }
      .tmqa-btn:hover { background: #4a4a4c; }
      .tmqa-muted { opacity: 0.8; }
    `;
        document.documentElement.appendChild(style);

        const panel = document.createElement('div');
        panel.className = 'tmqa-panel';
        panel.innerHTML = `
      <div class="tmqa-header">
        <span class="tmqa-title">GPT LOBOTOMY CLICKER</span>
        <button class="tmqa-min-btn" title="Minimize/Expand">–</button>
      </div>
      <div class="tmqa-body">
        <div class="tmqa-row">
          <label class="tmqa-switch">
            <input type="checkbox" id="tmqa-enabled" ${cfg.enabled ? 'checked' : ''}/>
            Enabled
          </label>
          <span class="tmqa-badge" id="tmqa-clicks">0 clicks</span>
        </div>
        <div class="tmqa-row">
          <label class="tmqa-switch">
            <input type="checkbox" id="tmqa-require" ${cfg.requireModelText ? 'checked' : ''}/>
            Only if model is <span class="tmqa-badge">GPT5 Think or o3</span>
          </label>
        </div>
        <div class="tmqa-row tmqa-muted">
          <span>Hotkey:</span> <span class="tmqa-badge">Ctrl + Alt + Q</span>
        </div>
        <div class="tmqa-row">
          <button class="tmqa-btn" id="tmqa-click-now">Click now</button>
          <button class="tmqa-btn" id="tmqa-test-model">Test model match</button>
        </div>
      </div>
    `;
        document.body.appendChild(panel);

        // Minimize button toggle
        const minBtn = panel.querySelector('.tmqa-min-btn');
        minBtn.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            minBtn.textContent = panel.classList.contains('collapsed') ? '+' : '–';
        });

        panel.querySelector('#tmqa-enabled').addEventListener('change', (e) => {
            cfg.enabled = e.target.checked;
            saveCfg();
            updatePanel();
            if (cfg.enabled) tryClick();
        });

        panel.querySelector('#tmqa-require').addEventListener('change', (e) => {
            cfg.requireModelText = e.target.checked;
            saveCfg();
            updatePanel();
        });

        panel.querySelector('#tmqa-click-now').addEventListener('click', () => {
            const btn = findBestQuickAnswerButton();
            if (btn) click(btn);
            else alert('No "Get a quick answer" button found right now.');
        });

        panel.querySelector('#tmqa-test-model').addEventListener('click', () => {
            const ok = isModelMatch();
            alert(ok
                  ? 'Model match: YES\n\nFound text:\n' + (lastModelHit || '(no snippet)')
                  : 'Model match: NO (not detected)');
        });

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'q') {
                cfg.enabled = !cfg.enabled;
                saveCfg();
                updatePanel();
                if (cfg.enabled) tryClick();
            }
        });

        updatePanel();
    }

    function updatePanel() {
        const clicksEl = document.getElementById('tmqa-clicks');
        if (clicksEl) clicksEl.textContent = `${clicks} click${clicks === 1 ? '' : 's'}`;
    }
})();
