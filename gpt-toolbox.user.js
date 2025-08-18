// ==UserScript==
// @name         GPT Toolbox: Lobotomy, Tail Snip, Time Tracker
// @namespace    https://github.com/DevNullInc/ChatGPT-TamperMonkey
// @version      1.0.0
// @description  GPT-5 "Quick Answer" auto-clicker, engagement bait remover, and a visible timer — all in one toggleable toolbox UI.
// @author       DevNullInc
// @license      MIT
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @icon         https://chat.openai.com/favicon.ico
// @homepage     https://github.com/DevNullInc/ChatGPT-TamperMonkey
// @updateURL    https://github.com/DevNullInc/ChatGPT-TamperMonkey/raw/refs/heads/main/gpt-toolbox.user.js
// @downloadURL  https://github.com/DevNullInc/ChatGPT-TamperMonkey/raw/refs/heads/main/gpt-toolbox.user.js
// ==/UserScript==

(() => {
  'use strict';

  /*** 📦 MODULE: Time Tracker (Unchanged from time-injector) ***/
  const timeContainer = document.createElement('div');
  timeContainer.style.cssText = `
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(28,28,30,0.8);
    color: #ccc;
    font-size: 11px;
    font-family: monospace;
    padding: 2px 6px;
    border-radius: 4px;
    z-index: 99;
    pointer-events: none;
  `;

  const timeObserver = new MutationObserver(() => {
    const textarea = document.querySelector('form textarea');
    if (!textarea || textarea.parentElement.querySelector('.tm-time')) return;

    const container = textarea.closest('form');
    if (!container) return;

    const existing = container.querySelector('.tm-time');
    if (!existing) {
      const node = timeContainer.cloneNode(true);
      node.classList.add('tm-time');
      container.style.position = 'relative';
      container.appendChild(node);

      const start = performance.now();
      const int = setInterval(() => {
        const ms = performance.now() - start;
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const rem = s % 60;
        node.textContent = `${m}:${rem.toString().padStart(2, '0')}`;
      }, 1000);
    }
  });

  timeObserver.observe(document.body, { subtree: true, childList: true });

  /*** 📦 MODULE: GPT-5 Lobotomy Clicker ***/
  function runLobotomyClicker() {
    const modelRx = /\bchatgpt\s*5\b(?:\s+\w+)*|\bo3\b/i;
    const btnRx = /\b(get a quick answer|quick answer)\b/i;
    let lastClick = 0;

    const isModelMatch = () => {
      const areas = [
        document.querySelector('header'),
        document.querySelector('[data-testid*="model" i]'),
        document.querySelector('nav'),
        document.body,
      ].filter(Boolean);
      return areas.some(root =>
        [...root.querySelectorAll('*')]
          .map(n => n.textContent || '')
          .some(text => modelRx.test(text.trim().toLowerCase()))
      );
    };

    const tryClick = () => {
      if (!isModelMatch()) return;

      const btn = [...document.querySelectorAll('button,[role="button"]')]
        .filter(el => btnRx.test(el.textContent || ''))
        .filter(el => isVisible(el))
        .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];

      if (!btn || Date.now() - lastClick < 3000) return;
      lastClick = Date.now();
      btn.click();
    };

    setInterval(tryClick, 1200);
    new MutationObserver(() => tryClick()).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    });
  }

  /*** 📦 MODULE: Engagement Tail Snipper ***/
  function runTailSnipper() {
    let killCount = 0;

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
      "what do you think",
      "would it help",
      "perhaps i could",
      "want me to"
    ];

    const engagementRegex = new RegExp(`\\n?.{0,500}?\\b(?:${killPhrases.join("|")}).{0,400}\\?\\s*$`, "im");

    const scrub = text => {
      let cleaned = text.replace(engagementRegex, "");
      if (cleaned === text) {
        cleaned = cleaned.replace(/\n?.{1,300}\?\s*$/m, "");
      }
      return cleaned.trimEnd();
    };

    const cleanNode = node => {
      const blocks = node.querySelectorAll('[data-message-author-role="assistant"] .markdown, .prose');
      blocks.forEach(el => {
        if (el.closest('pre, code')) return;
        const before = el.innerText;
        const after = scrub(before);
        if (after !== before) {
          el.innerText = after;
          killCount++;
          updateKillDisplay();
        }
      });
    };

    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === "childList") {
          m.addedNodes.forEach(n => {
            if (n.nodeType === 1) cleanNode(n);
          });
        } else if (m.type === "characterData" && m.target.parentElement) {
          cleanNode(m.target.parentElement);
        }
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });

    cleanNode(document.body);

    const display = document.createElement('div');
    display.id = 'gpt-tailkill-count';
    display.style.cssText = `
      position: fixed;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: #2d2d2f;
      color: #eee;
      padding: 2px 8px;
      border-radius: 8px;
      font: 11px monospace;
      z-index: 99999;
      pointer-events: none;
    `;
    document.body.appendChild(display);

    function updateKillDisplay() {
      display.textContent = `💥 Engagements snipped: ${killCount}`;
    }
  }

  /*** ✅ Helper: Visibility Check ***/
  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0;
  }

  /*** 📦 UI: GPT Toolbox Toggle Panel ***/
  function buildToolboxUI() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background: rgba(20,20,20,0.9);
      border-radius: 8px 0 0 8px;
      border: 1px solid #333;
      padding: 6px 10px;
      font-family: sans-serif;
      font-size: 12px;
      color: #eee;
      z-index: 999999;
      box-shadow: -4px 4px 10px rgba(0,0,0,0.5);
    `;

    panel.innerHTML = `
      <div style="font-weight:bold; margin-bottom:6px;">🧰 GPT Toolbox</div>
      <label style="display:block; margin:6px 0;">
        <input type="checkbox" id="tg-lobotomy" checked />
        💀 Lobotomy (GPT-5 auto-click)
      </label>
      <label style="display:block; margin:6px 0;">
        <input type="checkbox" id="tg-tailkill" checked />
        ✂️ Engagement Tail Snip
      </label>
    `;

    document.body.appendChild(panel);

    document.getElementById('tg-lobotomy').addEventListener('change', e => {
      if (e.target.checked) runLobotomyClicker();
    });

    document.getElementById('tg-tailkill').addEventListener('change', e => {
      if (e.target.checked) runTailSnipper();
    });
  }

  /*** 🚀 INIT ***/
  buildToolboxUI();
  runLobotomyClicker();
  runTailSnipper();
})();
