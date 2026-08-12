---
name: mongez-config-recipes
description: |
  Idiomatic `@mongez/config` composition patterns — multi-source layered boot, feature flags via `isEnabled`, env-driven config, reactive config layered on `createAtom` from `@mongez/atom`, per-feature `apiConfig`-style namespaces, and boot-time debug snapshots via `structuredClone`.
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

## Defaults survive a cleared key

```ts
const timeoutMs = config.get("api.timeout", 30000);
fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
```

Works whether `api.timeout` was never set or was explicitly cleared with `config.set("api.timeout", undefined)` / `config.unset("api.timeout")` — both leave the key absent, so the fallback applies.

The one case that does **not** fall back is an explicit `config.set("api.timeout", null)`: that stores a real `null`, and `get` returns it. If a `null` can reach a consumer that demands a number, either clear the key instead of nulling it, or guard with `??` at the call site.

> Before 1.2.0 this was a genuine trap: `set(key, undefined)` stored `null`, so a cleared key silently returned `null` instead of your default — and the resulting failure surfaced far from the `set` that caused it.

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
