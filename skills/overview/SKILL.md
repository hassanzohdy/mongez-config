---
name: mongez-config-overview
description: |
  High-level orientation to the @mongez/config package — what it is, its mental model, the three core methods (`config.set`, `config.get`, `config.list`), and its intentional scope boundaries.
  TRIGGER when: code imports default `config` or type `ConfigurationsList` from `@mongez/config`; user asks "what is @mongez/config", "how do I get started with @mongez/config", or "how does the config singleton work"; import pattern `import config from "@mongez/config"`.
  SKIP: `@mongez/dotenv` handles `.env` parsing, not this package; reactive config / subscriptions belong to `mongez-atom-*` skills; per-feature reading/writing/typing details — defer to `mongez-config-reading`, `mongez-config-writing`, `mongez-config-listing`, `mongez-config-typing`, `mongez-config-recipes`.
---

# Overview

`@mongez/config` is a tiny, framework-agnostic configuration tree. You drop a tree of values in once at boot, then read them by dotted path from anywhere in your app. Think Laravel's `config(...)` helper — a 30-line module with no dependencies beyond `@mongez/reinforcements`.

The package is intentionally minimal. If you need subscriptions or derived values on top of a config tree, build them with [`@mongez/atom`](https://github.com/hassanzohdy/atom).

## Install

```sh
# npm
npm install @mongez/config

# yarn
yarn add @mongez/config

# pnpm
pnpm add @mongez/config
```

`@mongez/reinforcements` is bundled as a regular dep — no peer install needed.

## Quick example

Seed the tree once at boot, read by dotted path with a fallback from anywhere:

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

## Import pattern

```ts
import config from "@mongez/config";
import type { ConfigurationsList } from "@mongez/config";
```

That's it. One default export, one type. The default export is a process-wide singleton — every importer sees the same tree.

## Mental model

| Concept | Type | Mental model |
|---|---|---|
| Config tree | `Record<string, any>` | A plain JS object, internally referred to as `data`. |
| Path | `string` | Dot-separated key segments: `"api.url"`, `"servers.0.host"`. |
| Default | any | A fallback value returned by `get` when the path is missing. |

## The three methods

| Method | Purpose |
|---|---|
| `config.set(obj)` | **Deep-merge** a partial tree into existing data. |
| `config.set(path, value)` | Write one value at a dotted path. Creates intermediate containers on demand. |
| `config.get(path, default?)` | Read by dotted path, substituting `default` for missing or `undefined` results. |
| `config.list()` | Return the entire data object by **live reference**. |

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| Reactive config / subscriptions | `@mongez/atom` | Keep the core config dumb |
| Per-request SSR isolation | `@mongez/atom` (`AtomStore`) | This is a singleton; not isolation-aware |
| Path utilities (`get`, `set`, `merge`) | `@mongez/reinforcements` | Used internally |
| Event bus | `@mongez/events` | Not needed by config; available separately |

## What makes it small (and what to watch out for)

- **No clone on read.** `list()` returns the same object reference every time. Mutating it mutates the live config.
- **No event when values change.** Set, then read. Nothing fires.
- **No diffing.** Deep merge is the only composition rule. Repeated writes to the same path just overwrite the leaf.

These are deliberate choices to keep the surface minimal. For anything reactive, layer on `@mongez/atom`.
