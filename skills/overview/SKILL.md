---
name: mongez-config-overview
description: |
  @mongez/config — a tiny, framework-agnostic configuration tree. Seed once at boot, read from anywhere by dotted path, with deep-merge writes and TypeScript-typed paths.
---

# @mongez/config — Overview

A tiny configuration tree, the way every framework should ship one. Drop a tree of values in once at boot, then read them by **dotted path** from anywhere in your app. Think Laravel's `config(...)` helper — a 30-line module with one runtime dep. Deliberately minimal — for reactive subscriptions, layer on `@mongez/atom`.

## Highlighted features

<div class="mongez-highlights">

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
  <h3>Dotted-path reads</h3>
  <p><code>config.get("api.url")</code>, <code>config.get("servers.0.host")</code> — TypeScript-typed paths, default fallbacks for missing keys.</p>
</div>

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  <h3>Deep-merge writes</h3>
  <p><code>config.set(partial)</code> deep-merges into the existing tree — feature flags, environment overrides, and bootstrap blocks compose without clobbering.</p>
</div>

<div class="mongez-highlight" data-accent="fire">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
  <h3>Process-wide singleton</h3>
  <p>One tree per process, importable from anywhere. No provider, no React context, no plumbing.</p>
</div>

<div class="mongez-highlight" data-accent="bolt">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  <h3>~30 lines, 1 dep</h3>
  <p>Intentionally tiny. <code>@mongez/reinforcements</code> for path utilities, nothing else. No events, no clone-on-read, no diffing — exactly the right surface for a config bag.</p>
</div>

</div>

## Install

```sh
npm install @mongez/config
# or: yarn add @mongez/config
# or: pnpm add @mongez/config
```

`@mongez/reinforcements` is bundled as a regular dep — no peer install needed.

## Quick peek

```ts
import config from "@mongez/config";

config.set({
  api: { url: "https://api.example.com", timeout: 5000 },
  features: { darkMode: true, beta: false },
});

config.get("api.url");                       // "https://api.example.com"
config.get("api.timeout", 30000);            // 5000  (fallback ignored)
config.get("missing.path", "fallback");      // "fallback"
```

Seed once at boot, read by dotted path with a fallback from anywhere.

`config.set(key, undefined)` **clears** a key so the fallback applies again; `config.set(key, null)` stores a real `null` that beats the fallback. "Configured to nothing" and "not configured" are different statements, and the package keeps both.

## The four methods

| Method | Purpose |
|---|---|
| `config.set(obj)` | **Deep-merge** a partial tree into existing data |
| `config.set(path, value)` | Write one value at a dotted path; creates intermediate containers on demand |
| `config.get(path, default?)` | Read by dotted path, substituting `default` only for an **absent** key |
| `config.unset(key)` / `config.remove(key)` | Remove one key or an array of keys; dot notation leaves siblings intact |
| `config.list()` | Return the entire data object by **live reference** |

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| Reactive config / subscriptions | [`@mongez/atom`](/atom/overview/) | Keep the core config dumb |
| Per-request SSR isolation | [`@mongez/atom`](/atom/overview/) (`AtomStore`) | This is a singleton; not isolation-aware |
| Path utilities (`get`, `set`, `merge`) | [`@mongez/reinforcements`](/reinforcements/overview/) | Used internally |

## Watch-outs

- **No clone on read.** `list()` returns the same object reference every time. Mutating it mutates the live config.
- **No event when values change.** Set, then read. Nothing fires.
- **Deep merge is the only composition rule.** Repeated writes to the same path just overwrite the leaf.

These are deliberate choices to keep the surface minimal. For anything reactive, layer on `@mongez/atom`.

## Where to go next

- **[Reading](../reading/)** — `config.get`, dotted paths, defaults
- **[Writing](../writing/)** — `config.set`, deep-merge semantics
- **[Listing](../listing/)** — `config.list`, live references
- **[Typing](../typing/)** — TypeScript-typed `ConfigurationsList`
- **[Recipes](../recipes/)** — feature flags, environment layering
