---
name: mongez-config-reading
description: |
  Complete reference for `config.get` — dot-notation paths, numeric array indexing, default-substitution rules, and gotchas around falsy values and dots in keys.
---

# Reading — `config.get`

```ts
config.get(path: string, defaultValue?: any): any
```

Returns the value at `path`. Substitutes `defaultValue` for **absent** paths (or a path that terminates in `undefined`). A stored `null` is a present value and is returned as-is — see the gotchas.

## Signatures

```ts
config.get("api.url");                       // -> any (null when missing — the default default)
config.get("api.url", "https://default");    // -> any
const timeout: number = config.get("api.timeout", 30000);
```

`config.get` is not a TypeScript generic — its return type is `any`. Narrow at the call site by annotating the receiving variable, asserting (`config.get("api.url") as string`), or wrapping (see `mongez-config-typing`).

## Dot-notation

Paths are split on `.`. Each segment is a key into the value at the previous step:

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

## Numeric segments index arrays

```ts
config.set({ servers: ["primary", "secondary", "fallback"] });

config.get("servers.0");                     // "primary"
config.get("servers.2");                     // "fallback"
config.get("servers.5", "n/a");              // "n/a"
```

## Default-substitution rules

`defaultValue` is returned ONLY when the path is missing or terminates in `undefined`. Other falsy values pass through:

| Stored value | `get(path, "fallback")` |
|---|---|
| `0` | `0` |
| `""` | `""` |
| `false` | `false` |
| `null` | `null` |
| `undefined` | `"fallback"` |
| *missing path* | `"fallback"` |

```ts
config.set("flag.enabled", false);
config.get("flag.enabled", true);            // false   (NOT true)

config.set("count", 0);
config.get("count", 1);                      // 0

config.set("name", "");
config.get("name", "Anonymous");             // ""
```

If you need "falsy → default" semantics, do it at the call site: `config.get("flag", false) || true`.

## The default for `defaultValue` is `null`

```ts
config.get("never.set");                     // null (NOT undefined)
```

This is helpful for `??` patterns: `const url = config.get("api.url") ?? "https://default"`.

## Gotchas

- **Dots in keys.** If you stored a key with a literal dot (`{"api.example.com": 1}`), `get("api.example.com")` reads `obj.api.example.com` — three segments — and returns the default. Avoid dots inside keys.
- **A stored `null` is a value, and the default does NOT replace it.** `config.set(k, null)` then `config.get(k, "x")` returns `null`. That is deliberate: "configured to nothing" is a different statement from "not configured". If you want the default back, clear the key with `config.unset(k)` or `config.set(k, undefined)` — both remove it (since 1.2.0). Before 1.2.0, `set(k, undefined)` wrote `null` and silently killed the fallback on every later read.
- **Missing intermediate segments.** `config.get("a.b.c", "x")` returns `"x"` if any of `a`, `b`, or `c` is missing — `get` short-circuits the moment it hits a missing key.
