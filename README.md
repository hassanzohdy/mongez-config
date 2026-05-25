# @mongez/config

> A tiny, framework-agnostic configuration tree with first-class dot-notation reads, deep-merge writes, and zero ceremony.

`@mongez/config` is the Mongez family's read-once / read-everywhere config primitive. Drop a tree of values in once at boot — `api.url`, `auth.providers.google.clientId`, `i18n.languages.en.direction` — and read them from anywhere by dotted path with a default fallback for missing keys.

Think Laravel's `config(...)` helper, but a 30-line module with no dependencies beyond `@mongez/reinforcements`.

## Install

```sh
yarn add @mongez/config
# peer: @mongez/reinforcements
```

## A 30-second tour

```ts
import config from "@mongez/config";

// 1. Seed the tree once at boot — deep-merges into the existing data.
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

// 2. Read by dotted path. Missing keys return the default (or undefined).
config.get("api.url");                       // "https://api.example.com"
config.get("api.timeout", 30000);            // 5000
config.get("missing.path", "fallback");      // "fallback"

// 3. Targeted writes — set a single path with dot-notation.
config.set("api.headers.x-app-id", "web");

// 4. Read the full tree.
config.list();                               // { api: {...}, features: {...} }
```

## What's in the box

| Export | Purpose |
|---|---|
| `config` (default) | The singleton config tree with `set` / `get` / `list`. |
| `ConfigurationsList` | The base type — `Record<string, any>`. Extend it for your app. |

That's the entire public API. Three methods. One shared tree.

## API

### `config.set(treeOrPath, value?)`

Two call shapes — they do different things.

```ts
// (1) Object form: deep-merges the partial tree into existing data.
config.set({
  api: { url: "https://api.example.com" },
});

// (2) Path form: writes one value at a dot-notation path.
config.set("api.url", "https://api.example.com");
config.set("features.beta", true);
config.set("api.headers", { "x-app-id": "web" });
```

The object form uses [`@mongez/reinforcements`' `merge`](https://github.com/hassanzohdy/reinforcements) — plain objects merge recursively, arrays at the same path are **replaced** (not concatenated). The path form creates intermediate objects (or arrays, when the next segment is a numeric index) on demand.

### `config.get(path, defaultValue?)`

```ts
config.get("api.url");                       // string | null
config.get("api.timeout", 30000);            // number
config.get("missing", "fallback");           // "fallback"

// Numeric segments index arrays.
config.set({ servers: ["a", "b", "c"] });
config.get("servers.0");                     // "a"
config.get("servers.5", "default");          // "default"
```

The `defaultValue` is returned only when the path is missing or terminates in `undefined`. Other falsy values (`0`, `""`, `false`, `null`) pass through untouched — a config flag set to `false` reads as `false`, not the default.

The default for `defaultValue` is `null` (not `undefined`), to keep ad-hoc `?? "x"` patterns predictable.

### `config.list()`

Returns the underlying data object **by reference**. Useful for debugging, snapshots, or wholesale replacement via `Object.assign`. Treat as read-only — mutating the result mutates the live config.

```ts
console.log(config.list());
// { api: { url: "...", timeout: 5000 }, features: { darkMode: true } }
```

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
};
```

```ts
// src/config.ts — boot
import config from "@mongez/config";
import type { AppConfig } from "./config-types";

const appConfig: AppConfig = {
  api: { url: "https://api.example.com", timeout: 5000 },
  features: { darkMode: true, beta: false },
};

config.set(appConfig);
```

```ts
// anywhere else
import config from "@mongez/config";

const url = config.get("api.url") as string;
const timeout = config.get<number>("api.timeout", 30000);
```

For tighter inference, project teams typically wrap `config.get` in a thin helper that takes typed paths against `AppConfig`.

## Examples

### Seeding from multiple sources

```ts
import config from "@mongez/config";
import baseConfig from "./config/base";
import envConfig from "./config/env";

// Object-form `set` is deep-merge — later calls layer on top of earlier ones.
config.set(baseConfig);
config.set(envConfig);

// Single-key overrides win last.
if (process.env.API_URL) {
  config.set("api.url", process.env.API_URL);
}
```

### Feature flags with a default fallback

```ts
function isEnabled(feature: string): boolean {
  return Boolean(config.get(`features.${feature}`, false));
}

if (isEnabled("darkMode")) {
  // ...
}
```

### Nested writes auto-create the chain

```ts
config.list();                               // {}
config.set("a.b.c.d", 42);
config.list();                               // { a: { b: { c: { d: 42 } } } }
```

### Numeric segments build arrays

```ts
config.set("hosts.0", "primary.example.com");
config.set("hosts.1", "secondary.example.com");
config.list().hosts;                         // ["primary...", "secondary..."]
```

## Behavior notes

- **Singleton.** The default export is a single shared object. All importers see the same tree.
- **Deep merge, not replace.** The object form of `set` deep-merges — `config.set({ api: { url: "x" } })` keeps `api.timeout` if it was previously set.
- **Arrays replace.** A merge over an existing array overwrites it. To extend an array, read it first, then `set("path", [...prev, item])`, or use the path form per index.
- **Dot-notation is segment-based.** Keys that themselves contain literal dots (e.g. `"api.example.com"` used as a key) cannot be addressed — they're split into segments. See "Gotchas" below.

## Gotchas

- **Keys with literal dots are unreachable by `get`.** `config.set({ "api.example.com": 1 })` stores the key verbatim, but `config.get("api.example.com")` reads it as `obj.api.example.com` and returns the default. If you control the keys, avoid dots inside them.
- **`config.list()` returns the live tree.** Mutating the returned object mutates the live config. Clone it (`structuredClone(config.list())`) if you need a snapshot.
- **`config.set("path", undefined)` writes `null`, not `undefined`.** The internal signature is `set(key, value = null)`, and JS default parameters substitute for `undefined` — so passing it explicitly stores `null`. To delete a key, use `@mongez/reinforcements`' `unset` directly on `config.list()`.
- **No events.** This package is intentionally dumb — no subscriptions, no change notifications. If you need reactive config, build it on top of [`@mongez/atom`](https://github.com/hassanzohdy/atom).

## Related packages

| Package | Purpose |
|---|---|
| [`@mongez/atom`](https://github.com/hassanzohdy/atom) | Framework-agnostic state primitive with subscriptions, derived values, SSR isolation. Use for reactive config. |
| [`@mongez/reinforcements`](https://github.com/hassanzohdy/reinforcements) | TypeScript utility belt. Provides `get`, `set`, `merge` under the hood. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | Tiny event bus, if you want to layer change notifications on top. |

## License

MIT
