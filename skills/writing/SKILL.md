---
name: mongez-config-writing
description: |
  Complete reference for `config.set` and `config.unset` — the two `set` call shapes (object deep-merge vs path-form per-key write), array replacement behaviour, intermediate container creation, how `undefined` clears a key while `null` is stored as a real value, removing keys with `unset` / `remove`, and common pitfalls.
---

# Writing — `config.set` / `config.unset`

```ts
config.set(tree: Record<string, any>): void          // (1) object form — deep merge
config.set(path: string, value: any): void           // (2) path form — single write
config.unset(key: string | string[]): void           // (3) remove key(s)
config.remove(key: string | string[]): void          //     alias of unset
```

Two `set` call shapes, two different behaviors. The shape is detected by `arguments.length`:
- One argument → object form (deep merge).
- Two arguments → path form (per-key write).

## Object form — deep merge

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

Plain objects merge recursively. Keys at the same depth from different calls coexist; same keys are overwritten with the later value.

### Arrays are replaced, not concatenated

```ts
config.set({ hosts: ["a", "b"] });
config.set({ hosts: ["c"] });

config.list().hosts;                         // ["c"]    (NOT ["a", "b", "c"])
```

To extend an array, read-modify-write:

```ts
const prev = config.get("hosts", []);
config.set("hosts", [...prev, "c"]);
```

Or use the path form per-index:

```ts
config.set("hosts.2", "c");
```

### Class instances, Dates, Maps, Sets — taken from the latest source

Object-form merge only recurses into plain objects. A `Date`, `RegExp`, `Map`, `Set`, typed array, or any class instance at the same key is taken from the later call as-is. This is `@mongez/reinforcements`' `merge` behavior — see its docs for the full list of "leaf" types.

## Path form — single write

```ts
config.set("api.url", "https://api.example.com");
config.set("features.darkMode", true);
config.set("api.headers", { "x-app-id": "web" });
```

The value at the path is written verbatim. If you pass an object, it replaces whatever was at that path (no deep merge).

### Intermediate containers are created on demand

```ts
config.list();                               // {}
config.set("a.b.c.d", 42);
config.list();                               // { a: { b: { c: { d: 42 } } } }
```

### Numeric next-segment builds an array

If the next segment in the path is a numeric string, the container is created as an array, not an object:

```ts
config.set("hosts.0", "primary");
config.set("hosts.1", "secondary");

config.list().hosts;                         // ["primary", "secondary"]
Array.isArray(config.list().hosts);          // true
```

This is determined per-segment by inspecting the **next** segment, so mixed object/array chains work:

```ts
config.set("servers.0.region", "us-east-1");
config.list();
// { servers: [{ region: "us-east-1" }] }
```

### Empty / invalid paths

```ts
config.set("", "x");                         // no-op
```

## `undefined` clears, `null` is a value

The two are deliberately different, and the difference is the whole point:

| Call | Effect | `get(key, "D")` afterwards |
|---|---|---|
| `config.set(key, undefined)` | **unsets** the key | `"D"` |
| `config.set(key, null)` | stores a real `null` | `null` |

`undefined` means "no value", and `get`'s default exists precisely to cover a key with no value. `null` means "configured to nothing" — a different statement, and only the caller knows which one they meant, so both are preserved.

```ts
config.set("http.bodyLimit", 999);
config.get("http.bodyLimit", 4096);          // 999

config.set("http.bodyLimit", undefined);
config.get("http.bodyLimit", 4096);          // 4096 — the key is gone
config.list();                               // {} — no null left behind

config.set("feature.flag", null);
config.get("feature.flag", "on");            // null — deliberate, not missing
```

This matters because `set(key, undefined)` is what ordinary code produces without anyone deciding to write it:

```ts
config.set("http.limit", process.env.LIMIT && Number(process.env.LIMIT));
config.set("http", { ...defaults, ...userOptions });
afterEach(() => config.set("http.bodyLimit", undefined));
```

> **Changed in 1.2.0.** Before then, `undefined` was coerced to `null` on write — the signature was `set(key, value = null)`, and JS default parameters substitute for `undefined`. The stored `null` was a *present* value, so every later `config.get(key, fallback)` returned it **instead of the fallback**, silently disabling the default-value contract. The failure surfaced far from its cause: a cleared key reaching a consumer that demanded a number.

## Removing — `config.unset` / `config.remove`

```ts
config.unset(key: string | string[]): void
config.remove(key: string | string[]): void   // alias
```

Removes one or more keys. Dot notation removes a leaf without touching its siblings; removing a branch removes everything beneath it; unsetting a key that was never set is a no-op.

```ts
config.set("api.url", "https://example.com");
config.set("api.timeout", 5000);

config.unset("api.timeout");
config.get("api.url");                       // "https://example.com" — sibling intact
config.get("api.timeout", 3000);             // 3000

config.unset("api");                         // removes the whole branch
config.unset(["cache.ttl", "cache.driver"]); // several at once
```

`config.set(key, undefined)` and `config.unset(key)` do the same thing — use whichever reads better at the call site. `unset` is clearer as an intent; `set(key, undefined)` is what falls out of ordinary data flow.

> Added in 1.2.0. Before that there was **no way to remove a key**, and the workaround was mutating the object returned by `config.list()` — which only worked because `list()` happens to return the live tree rather than a copy. That is an implementation detail, not a contract; don't build on it.

## Gotchas

- **One-argument calls must be a plain object.** Shape is detected by `arguments.length === 1`, then the single arg is validated as a plain object — non-object single-arg calls (`config.set("api.url")`, `config.set(42)`, `config.set(null)`, `config.set(["a","b"])`) throw `TypeError`. Use `config.set(path, value)` for path writes, or `config.set({ ... })` for deep merge.
- **Object-form merge keeps existing keys.** This is usually what you want — but if your goal is "replace this whole subtree", use the path form: `config.set("api", newApi)`.
- **`config.set("path", undefined)` deletes the key** (since 1.2.0). If you meant to store an absence-of-value that survives a `get` default, write `null` explicitly. See `../reading/` for how both interact with `get`.
- **Calling `set({})` is a deep-merge of nothing.** It's a no-op; it doesn't clear the tree. To drop specific keys use `config.unset(...)`; there is deliberately no "clear everything" method, because resetting a process-wide config tree at runtime is almost always a bug.
- **`unset` on a string key only.** `config.set(someObject, undefined)` is not a removal — the `undefined`-clears rule is guarded on a string key so the object-form call keeps its meaning.
