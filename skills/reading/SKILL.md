---
name: mongez-config-reading
description: Complete reference for config.get — dot-notation paths, array indexing, default-substitution rules, and gotchas around falsy values and dots in keys.
when_to_use: User calls config.get, user asks how to read a value from the config tree, user asks about default values or fallback behaviour, user is confused why a falsy value (false/0/"") is not returning their default, user asks about dot-notation or numeric segment indexing.
---

# Reading — `config.get`

```ts
config.get(path: string, defaultValue?: any): any
```

Returns the value at `path`. Substitutes `defaultValue` for missing paths or paths that terminate in `undefined`.

## Signatures

```ts
config.get("api.url");                       // -> string | null (default default)
config.get("api.url", "https://default");    // -> string
config.get<number>("api.timeout", 30000);    // -> number (caller-typed)
```

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
- **`config.set("path", undefined)` looks like delete but isn't — it writes `null`.** JS default parameters substitute for `undefined`, and the internal signature is `set(key, value = null)`. `get("path", "x")` returns `null` (which is *not* undefined, so the default does not kick in). To actually remove a key, use `unset` from `@mongez/reinforcements` against `config.list()`.
- **Missing intermediate segments.** `config.get("a.b.c", "x")` returns `"x"` if any of `a`, `b`, or `c` is missing — `get` short-circuits the moment it hits a missing key.
