# ChatGPT-TamperMonkey Tools

A toolkit of browser userscripts that put ChatGPT back in your hands — no fluff, no hand-holding, no engagement bait.  

---

## 🧠 gpt5-lobotomy.user.js _(Being Updated)_
Smashes that **“Quick Thinking”** button on GPT-5.  
It forces the model to stop overthinking itself into policy-watchdog mode. Keeps it from recognizing what a “violation” even looks like.  
Result: raw output, no lobotomy filters running *against* you.  

---

## ⏱ time-injector.user.js
Drops a **machine-readable clock** into the page for external parsing, while showing you a clean local timestamp.  

**Example output:**  

```
Local Human Time:  
🕒 Monday, August 18, 2025 — 11:03 AM  

Machine-readable payload:  
[time_meta current="2025-08-18T11:03:14.121Z" since_user_last_s="20" since_assistant_last_s="14"]
```

Readable for you, parsable for bots.  

---

## ✂️ trailing-engagement-remover.user.js
Kills ChatGPT’s sneaky **engagement tails**.  
Those annoying “Want me to…?” or “Should I break this down…?” parasites get detected with regex and stripped out before you ever see them.  

---

## 📟 Sample HUD (all 3 together)

```
Engagement tails snipped: 42
Local Time: Mon Aug 18 2025 — 11:03 AM
[time_meta current="2025-08-18T11:03:14.121Z" since_user_last_s="20" since_assistant_last_s="14"]
GPT-5: Quick Thinking disabled ✅
```

---

### Install
Smash the `raw` button on the files from the repo and they should load right into **TamperMonkey**.  
Each runs standalone, but they stack perfectly if you want the **full kill-suite**.  
```
