---
name: mongez-config-recipes
description: |
  Idiomatic `@mongez/config` composition patterns — multi-source layered boot, feature flags via `isEnabled`, env-driven config, reactive config layered on `createAtom` from `@mongez/atom`, per-feature `apiConfig`-style namespaces, and boot-time debug snapshots via `structuredClone`.
  TRIGGER when: code combines `config.set` calls in a boot sequence (base + env + overrides) from `@mongez/config`; user asks "how do I set up multi-environment config", "how do I do feature flags with @mongez/config", or "how do I make config reactive with @mongez/atom"; per-feature wrapper modules around `config.get`.
  SKIP: `@mongez/dotenv` handles `.env` parsing, not this package; single-method reference — use `mongez-config-reading`/`mongez-config-writing`/`mongez-config-listing`; pure `@mongez/atom` reactivity without config seed — use `mongez-atom-*` skills.
---

# Recipes

Idiomatic compositions using `@mongez/config`.

## Multi-source boot

Layer base + env + per-deploy overrides. Object-form `set` deep-merges, so the order of calls determines the precedence (last wins for any given key):

```ts
import config from "@mongez/config";
import baseConfig from "./config/base";
import envConfig from "./config/env";

config.set(baseConfig);
config.set(envConfig);

// Single-key overrides at the end.
if (process.env.API_URL) {
  config.set("api.url", process.env.API_URL);
}
if (process.env.LOG_LEVEL) {
  config.set("logging.level", process.env.LOG_LEVEL);
}
```

## Feature flags with safe defaults

```ts
import config from "@mongez/config";

function isEnabled(feature: string): boolean {
  return Boolean(config.get(`features.${feature}`, false));
}

// Booted somewhere as:
// config.set({ features: { darkMode: true, beta: false } });

if (isEnabled("darkMode")) {
  // ...
}
if (isEnabled("brandNew")) {
  // false — never configured, default kicks in
}
```

The `Boolean(...)` wrapper coerces any truthy value (string, number) to a boolean — useful if your feature flags are sourced from env vars (`"true"` / `"1"` / `""`).

## Default-with-explicit-undefined-trap

```ts
const timeoutMs = config.get("api.timeout", 30000);
fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
```

Works even when `api.timeout` was never set; falls back to `30000`. Note that if you (or some other module) explicitly did `config.set("api.timeout", undefined)`, you'd still get the fallback.

## Env-driven config

```ts
import config from "@mongez/config";

config.set({
  api: {
    url: process.env.API_URL ?? "http://localhost:3000",
    timeout: Number(process.env.API_TIMEOUT ?? 5000),
  },
  features: {
    darkMode: process.env.DARK_MODE === "true",
    beta: process.env.NODE_ENV !== "production",
  },
});
```

## Reactive config (via `@mongez/atom`)

This package doesn't fire events. If you need reactivity, seed an atom from config and subscribe to the atom:

```ts
import config from "@mongez/config";
import { createAtom } from "@mongez/atom";

const themeAtom = createAtom({
  key: "ui.theme",
  default: config.get("features.defaultTheme", "light"),
});

themeAtom.onChange((next) => {
  document.documentElement.dataset.theme = next as string;
});

// Later: write to the atom, not back to config.
themeAtom.update("dark");
```

Treat `config` as **boot-time / read-only at runtime**, and reactive state as separate.

## Per-feature config namespaces

```ts
// src/config/api.ts
import config from "@mongez/config";

export function apiConfig() {
  return {
    url: config.get("api.url") as string,
    timeout: config.get("api.timeout", 5000) as number,
    headers: config.get("api.headers", {}) as Record<string, string>,
  };
}

// usage
import { apiConfig } from "./config/api";
const { url, timeout } = apiConfig();
```

## Snapshot at boot for debugging

```ts
import config from "@mongez/config";

if (process.env.NODE_ENV !== "production") {
  // Clone so later mutations don't change the dump.
  const snapshot = structuredClone(config.list());
  console.log("[config booted]", snapshot);
}
```
