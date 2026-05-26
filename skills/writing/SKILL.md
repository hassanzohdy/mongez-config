---
name: mongez-config-writing
description: |
  Complete reference for `config.set` — the two call shapes (object deep-merge vs path-form per-key write), array replacement behaviour, intermediate container creation, and common pitfalls.
  TRIGGER when: code calls `config.set` from `@mongez/config`; user asks "how do I deep-merge config", "why was my array replaced instead of appended", or "how do I write a nested config value"; import pattern `import config from "@mongez/config"` followed by `config.set(...)`.
  SKIP: `@mongez/dotenv` handles `.env` parsing, not this package; reading values — use `mongez-config-reading`; multi-source boot patterns — use `mongez-config-recipes`; whole-tree replacement / live-reference semantics — use `mongez-config-listing`.
---

# Writing — `config.set`

```ts
config.set(tree: Record<string, any>): void          // (1) object form — deep merge
config.set(path: string, value: any): void           // (2) path form — single write
```

Two call shapes, two different behaviors. The shape is detected by `arguments.length`:
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

## Gotchas

- **One-argument calls must be a plain object.** Shape is detected by `arguments.length === 1`, then the single arg is validated as a plain object — non-object single-arg calls (`config.set("api.url")`, `config.set(42)`, `config.set(null)`, `config.set(["a","b"])`) throw `TypeError`. Use `config.set(path, value)` for path writes, or `config.set({ ... })` for deep merge.
- **Object-form merge keeps existing keys.** This is usually what you want — but if your goal is "replace this whole subtree", use the path form: `config.set("api", newApi)`.
- **`config.set("path", undefined)` writes `null`, not `undefined` — and definitely not "delete".** The internal signature is `set(key, value = null)`, and JS default parameters substitute for `undefined`. See `reading.md` for how this interacts with `get`.
- **Calling `set({})` is a deep-merge of nothing.** It's a no-op; doesn't clear the tree. To reset, mutate the live object from `config.list()` (or, in practice, just don't reset config at runtime).
