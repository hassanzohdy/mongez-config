<div align="center">

# @mongez/config

**A tiny, framework-agnostic application-config tree with first-class dot-notation reads and deep-merge writes.**

[![npm](https://img.shields.io/npm/v/@mongez/config.svg)](https://www.npmjs.com/package/@mongez/config)
[![license](https://img.shields.io/npm/l/@mongez/config.svg)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mongez/config.svg)](https://bundlephobia.com/package/@mongez/config)
[![downloads](https://img.shields.io/npm/dw/@mongez/config.svg)](https://www.npmjs.com/package/@mongez/config)

</div>

---

## Why @mongez/config?

Raw object access (`appConfig.api.url`) couples every call site to your config module's shape — rename a key and the editor's "find references" is your only line of defense. `dotenv` solves a different problem: it parses `.env` files into strings, with no opinion on how your app shapes those values into trees of features, services, locales, and feature flags. `nconf` does layered config but ships a big plugin surface, hierarchical-store ceremony, and a node-only footprint that's heavier than most apps need. `@mongez/config` is the smallest layer in between: a process-wide singleton tree, dot-notation reads with default fallback, and a deep-merge write that lets you compose base + per-environment + per-deploy overrides in three lines.

It sits **above** [`@mongez/dotenv`](https://github.com/hassanzohdy/mongez-dotenv) in the stack — `dotenv` reads `.env` files into typed primitives; `@mongez/config` is where you organize those primitives (and everything else) into the application config your code actually reads.

```ts
import config from "@mongez/config";

config.set({
  api: { url: "https://api.example.com", timeout: 5000 },
  features: { darkMode: true, beta: false },
});

config.get("api.url");                       // "https://api.example.com"
config.get("api.timeout", 30000);            // 5000
config.get("missing.path", "fallback");      // "fallback"
```

---

## Features

| Feature | Description |
|---|---|
| **Three methods, one tree** | `config.set`, `config.get`, `config.list`. That's the whole API. |
| **Dot-notation reads** | `config.get("api.headers.x-app-id")` walks any depth, including numeric array indices. |
| **Deep-merge writes** | Object-form `set` recursively merges partial trees — sibling keys are preserved across calls. |
| **Path-form writes** | `config.set("api.url", "...")` writes one value; intermediate objects (and arrays, for numeric segments) are created on demand. |
| **Default fallback** | `get` returns the default only on missing or `undefined` — `0`, `""`, `false`, and `null` pass through. |
| **Singleton tree** | One shared object across every importer. Boot once, read anywhere. |
| **TypeScript-friendly** | `config.get<T>(path)` lets you narrow at the call site; bring your own `AppConfig` shape. |
| **Atom-pairable** | Seed a [`@mongez/atom`](https://github.com/hassanzohdy/atom) atom from config when you need reactivity on top. |
| **One small dependency** | `@mongez/reinforcements` provides `get` / `set` / `merge`. No runtime peers beyond that. |

---

## Installation

```sh
npm install @mongez/config
```

```sh
yarn add @mongez/config
```

```sh
pnpm add @mongez/config
```

`@mongez/reinforcements` is bundled as a regular dependency — no peer install required.

---

## Quick start

```ts
import config from "@mongez/config";

// 1. Seed the tree once at boot — deep-merges into existing data.
config.set({
  api: {
    url: "https://api.example.com",
    timeout: 5000,
  },
  features: {
    darkMode: true,
    beta: false,
  },
});

// 2. Read anywhere by dotted path.
config.get("api.url");                       // "https://api.example.com"
config.get("api.timeout", 30000);            // 5000
config.get("missing.key", "fallback");       // "fallback"

// 3. Targeted writes via dot-notation paths.
config.set("api.headers.x-app-id", "web");

// 4. Inspect the whole tree.
config.list();                               // { api: {...}, features: {...} }
```

That's the entire happy path. Everything below is depth on the same three methods.

---

## Reading — `config.get`

```ts
config.get(path: string, defaultValue?: any): any
```

Returns the value at `path`, substituting `defaultValue` for missing paths or paths that terminate in `undefined`.

```ts
config.get("api.url");                       // "https://api.example.com"
config.get("api.timeout", 30000);            // 5000 (loaded value wins)
config.get("never.set");                     // null (NOT undefined — see below)
config.get("never.set", "fallback");         // "fallback"
```

### Dot-notation walks any depth

Each segment is a key into the value at the previous step.

```ts
config.set({
  api: {
    url: "https://api.example.com",
    headers: { "x-app-id": "web" },
  },
});

config.get("api.url");                       // "https://api.example.com"
config.get("api.headers.x-app-id");          // "web"
```

### Numeric segments index arrays

```ts
config.set({ servers: ["primary", "secondary", "fallback"] });

config.get("servers.0");                     // "primary"
config.get("servers.2");                     // "fallback"
config.get("servers.5", "n/a");              // "n/a"

// Nested object-in-array shapes also work.
config.set({
  servers: [
    { region: "us-east-1", weight: 10 },
    { region: "eu-west-1", weight: 5 },
  ],
});
config.get("servers.0.region");              // "us-east-1"
```

### Default-substitution rules

`defaultValue` kicks in **only** when the path is missing or terminates in `undefined`. Other falsy values pass through:

| Stored value | `config.get(path, "fallback")` |
|---|---|
| `0` | `0` |
| `""` | `""` |
| `false` | `false` |
| `null` | `null` |
| `undefined` | `"fallback"` |
| *missing path* | `"fallback"` |

```ts
config.set("flag.enabled", false);
config.get("flag.enabled", true);            // false  (NOT true)

config.set("count", 0);
config.get("count", 1);                      // 0
```

> The implicit default for `defaultValue` is `null`, not `undefined`. This keeps `??` chains predictable: `config.get("api.url") ?? "https://default"` works on a never-set key.

---

## Writing — `config.set`

```ts
config.set(tree: Record<string, any>): void          // (1) object form — deep merge
config.set(path: string, value: any): void           // (2) path form — single write
```

Two call shapes, two different behaviors. The shape is detected by inspecting the first argument: a plain object means deep merge; a string is a path write that requires a value.

### Object form — deep merge

```ts
config.set({
  api: { url: "https://api.example.com" },
});

config.set({
  api: { timeout: 5000 },
});

config.list();
// { api: { url: "https://api.example.com", timeout: 5000 } }
```

Plain objects merge recursively. Keys at the same depth from different calls coexist; the same key written twice keeps the later value.

> **Arrays are replaced, not concatenated.** `config.set({ hosts: ["a", "b"] })` followed by `config.set({ hosts: ["c"] })` yields `["c"]`, not `["a", "b", "c"]`. To extend, do `config.set("hosts", [...config.get("hosts", []), "c"])`, or use the path form per-index.

### Path form — single write

```ts
config.set("api.url", "https://api.example.com");
config.set("features.darkMode", true);
config.set("api.headers", { "x-app-id": "web" });
```

The value is written verbatim at the path. If you pass an object, it replaces whatever was at that path (no deep merge — that's what the object form is for).

### Intermediate containers are auto-created

```ts
config.list();                               // {}
config.set("a.b.c.d", 42);
config.list();                               // { a: { b: { c: { d: 42 } } } }
```

When the **next** segment in the path is a numeric string, the container is created as an array, not an object:

```ts
config.set("hosts.0", "primary");
config.set("hosts.1", "secondary");

config.list().hosts;                         // ["primary", "secondary"]
Array.isArray(config.list().hosts);          // true
```

Mixed object/array chains work the same way:

```ts
config.set("servers.0.region", "us-east-1");
config.list();
// { servers: [{ region: "us-east-1" }] }
```

> **Single-argument calls must be a plain object.** `config.set("api.url")` (no value) throws `TypeError` instead of silently corrupting the tree. Use `config.set(path, value)` for a path write, or `config.set({ ... })` for a deep merge.

> **`config.set("path", undefined)` writes `null`, not `undefined` — and definitely not "delete".** The internal signature is `set(key, value = null)`, and JS default parameters substitute for `undefined`. To remove a key, mutate `config.list()` with `unset` from `@mongez/reinforcements`.

---

## Listing — `config.list`

```ts
config.list(): Record<string, any>
```

Returns the entire data object by **live reference**. Useful for debugging at boot, serializing a snapshot, or wholesale replacement.

```ts
console.log(config.list());
// { api: { url: "...", timeout: 5000 }, features: { darkMode: true } }
```

> **The returned object is the live tree.** Mutating it mutates the live config. Clone when you need an independent snapshot:
>
> ```ts
> const snapshot = structuredClone(config.list());
> ```
>
> `structuredClone` handles `Date`, `Map`, `Set`, and typed arrays; `JSON.parse(JSON.stringify(...))` is faster but drops anything non-JSON-serializable.

---

## Typing your config

The shipped `ConfigurationsList` type is `Record<string, any>` — permissive on purpose, so the package doesn't constrain how you shape your tree. For type-safe reads, declare your own shape and use it at the call site.

```ts
// src/config-types.ts
export type AppConfig = {
  api: {
    url: string;
    timeout: number;
    headers?: Record<string, string>;
  };
  features: {
    darkMode: boolean;
    beta: boolean;
  };
  i18n: {
    defaultLocale: "en" | "ar" | "fr";
    languages: Record<string, { name: string; direction: "ltr" | "rtl" }>;
  };
};
```

Type the boot-time `set` against the shape — typos and missing keys are caught at compile time:

```ts
// src/config.ts — boot
import config from "@mongez/config";
import type { AppConfig } from "./config-types";

const appConfig: AppConfig = {
  api: { url: "https://api.example.com", timeout: 5000 },
  features: { darkMode: true, beta: false },
  i18n: {
    defaultLocale: "en",
    languages: {
      en: { name: "English", direction: "ltr" },
      ar: { name: "العربية", direction: "rtl" },
    },
  },
};

config.set(appConfig);
```

Type the read at the call site — `config.get` returns `any` because the tree's shape is unknown to the package:

```ts
const url = config.get<string>("api.url");
const timeout = config.get<number>("api.timeout", 30000);
const flags = config.get<AppConfig["features"]>("features");
```

For real-world apps, a thin typed wrapper is worth the few lines:

```ts
// src/config-helper.ts
import config from "@mongez/config";
import type { AppConfig } from "./config-types";

export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K];
export function getConfig<T>(path: string, defaultValue?: T): T;
export function getConfig(path: string, defaultValue?: any) {
  return config.get(path, defaultValue);
}
```

```ts
import { getConfig } from "./config-helper";

const api = getConfig("api");                // typed as AppConfig["api"]
const timeout = getConfig<number>("api.timeout", 30000);
```

---

## Recipes

### Layer base + environment + per-deploy overrides at boot

Reach for this when your config has tiers — a shared base, per-environment differences (dev vs staging vs prod), and a final layer of overrides driven by env vars or per-deploy settings. Object-form `set` deep-merges, so the order of calls determines precedence — last wins for any given key.

```ts
// src/config/index.ts
import config from "@mongez/config";
import baseConfig from "./base";
import envConfig from "./env";

config.set(baseConfig);                      // shared defaults
config.set(envConfig);                       // per-environment branch

// Single-key overrides at the end — these win over everything above.
if (process.env.API_URL) {
  config.set("api.url", process.env.API_URL);
}
if (process.env.LOG_LEVEL) {
  config.set("logging.level", process.env.LOG_LEVEL);
}
```

```ts
// src/index.ts — boot
import "./config";                            // runs the layered setup above
import config from "@mongez/config";

const apiUrl = config.get("api.url");
const logLevel = config.get("logging.level", "info");
```

### Build a typed config from env vars

Reach for this when most of your app config is driven by environment variables and you want one boot module that pulls them in, coerces them, and types them — so call sites never read `process.env` directly. Pair with `@mongez/dotenv` if you want `.env` file loading and primitive coercion underneath.

```ts
// src/bootstrap.ts
import { loadEnv, env } from "@mongez/dotenv";
import config from "@mongez/config";
import type { AppConfig } from "./config-types";

loadEnv();

const appConfig: AppConfig = {
  api: {
    url: env("API_URL", "http://localhost:3000"),
    timeout: env("API_TIMEOUT", 5000),
  },
  features: {
    darkMode: env("DARK_MODE", false),
    beta: env("NODE_ENV") !== "production",
  },
  i18n: {
    defaultLocale: env("DEFAULT_LOCALE", "en"),
    languages: {
      en: { name: "English", direction: "ltr" },
      ar: { name: "العربية", direction: "rtl" },
    },
  },
};

config.set(appConfig);
```

`@mongez/dotenv`'s `env()` returns the parsed primitive (`number`, `boolean`, `string`), so `API_TIMEOUT=5000` lands in config as the number `5000`, not the string `"5000"`.

### Centralize feature flags with safe defaults

Reach for this when feature flags are sprinkled across your app and you want one helper that returns `false` for unknown flags (so a typo or a never-shipped flag fails closed, not open).

```ts
// src/features.ts
import config from "@mongez/config";

export function isEnabled(feature: string): boolean {
  return Boolean(config.get(`features.${feature}`, false));
}

// Booted somewhere as:
// config.set({ features: { darkMode: true, beta: false } });
```

```ts
import { isEnabled } from "./features";

if (isEnabled("darkMode")) {
  // ...
}
if (isEnabled("brandNewFlag")) {
  // false — never configured, default fallback wins
}
```

The `Boolean(...)` wrapper is useful when flags come from env vars that arrive as strings (`"true"` / `"1"` / `""`) — anything truthy becomes `true`, anything falsy becomes `false`.

### Wrap a config namespace per feature

Reach for this when one feature reads several related config values — instead of repeating `config.get("api.url")`, `config.get("api.timeout")`, `config.get("api.headers")` at every call site, expose a tiny accessor.

```ts
// src/config/api.ts
import config from "@mongez/config";

export function apiConfig() {
  return {
    url: config.get<string>("api.url"),
    timeout: config.get<number>("api.timeout", 5000),
    headers: config.get<Record<string, string>>("api.headers", {}),
  };
}
```

```ts
// usage
import { apiConfig } from "./config/api";

const { url, timeout, headers } = apiConfig();
fetch(url, { signal: AbortSignal.timeout(timeout), headers });
```

Rename the underlying path (`api.url` → `services.api.endpoint`) in one place, and every caller stays unchanged.

### Make selected config values reactive via `@mongez/atom`

`@mongez/config` is intentionally dumb — no subscriptions, no change events. When a config value needs to drive live UI updates (theme, locale, layout density), seed a [`@mongez/atom`](https://github.com/hassanzohdy/atom) atom from config at boot and treat the atom as the runtime source of truth.

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

// Later — write to the atom, not back to config.
themeAtom.update("dark");
```

The rule of thumb: treat `config` as **boot-time / read-only at runtime**, and reactive state as a separate atom layer.

### Dump a boot-time snapshot for debugging

Reach for this when you want a record of the final, post-merge config at boot — handy for diagnosing "why is this value not what I expected" across multiple layered sources.

```ts
import config from "@mongez/config";

if (process.env.NODE_ENV !== "production") {
  // Clone so later mutations don't change the printed snapshot.
  const snapshot = structuredClone(config.list());
  console.log("[config booted]", snapshot);
}
```

In tests, the same pattern doubles as an assertion target: `expect(structuredClone(config.list())).toMatchSnapshot()`.

---

## Behavior notes

- **Singleton.** The default export is a single shared object. Every importer in every module sees the same tree.
- **Deep merge, not replace.** Object-form `set` is recursive — `config.set({ api: { url: "x" } })` keeps `api.timeout` if it was previously set.
- **Path-form is a verbatim write.** `config.set("api", newApi)` replaces the entire `api` subtree — use the object form (`config.set({ api: newApi })`) if you want a merge.
- **Arrays at the same path are replaced.** This is `@mongez/reinforcements`' default `merge` behavior.
- **Keys with literal dots are unreachable by `get`.** `config.set({ "api.example.com": 1 })` stores the key verbatim, but `config.get("api.example.com")` reads it as three nested segments and returns the default. Avoid dots inside keys.
- **No events / no subscriptions.** Layer reactivity on top via [`@mongez/atom`](https://github.com/hassanzohdy/atom).
- **No SSR isolation.** The singleton is process-wide. For per-request stores in SSR, use `@mongez/atom`'s `AtomStore` rather than this package.

---

## Related packages

| Package | Use when you need |
|---|---|
| [`@mongez/dotenv`](https://github.com/hassanzohdy/mongez-dotenv) | The underlying `.env` parser — typed primitive coercion, `${VAR}` interpolation, `NODE_ENV`-aware file selection. Sits **below** this package; feed `env()` values into `config.set` at boot. |
| [`@mongez/atom`](https://github.com/hassanzohdy/atom) | Framework-agnostic reactive state. Drop in when you need subscriptions, derived values, or SSR-safe per-request stores on top of config. |
| [`@mongez/reinforcements`](https://github.com/hassanzohdy/reinforcements) | TypeScript utility belt. Provides the `get` / `set` / `merge` used internally — reach for it directly if you need `unset` or other tree-mutation helpers. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | Tiny event bus, if you want to layer custom change notifications around `config.set` call sites. |

For the full API reference in a single LLM-friendly file, see [`llms-full.txt`](./llms-full.txt). For release history, see [`CHANGELOG.md`](./CHANGELOG.md).

---

## License

MIT
