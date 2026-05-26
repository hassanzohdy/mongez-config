---
name: mongez-config-listing
description: |
  Reference for `config.list` — what it returns, the live-reference caveat, how to snapshot the tree safely with `structuredClone`, and patterns like debug dumps and wholesale tree replacement.
  TRIGGER when: code calls `config.list` from `@mongez/config`; user asks "how do I get the full config tree", "how do I snapshot/clone the config", or "how do I dump the config for debugging"; import pattern `import config from "@mongez/config"` followed by `config.list()`.
  SKIP: `@mongez/dotenv` handles `.env` parsing, not this package; reading single values — use `mongez-config-reading`; writing values — use `mongez-config-writing`; reactive subscriptions on the tree — use `mongez-atom-*` skills.
---

# Listing — `config.list`

```ts
config.list(): Record<string, any>
```

Returns the entire data object **by reference**. Useful for:

- Debugging at boot (`console.log(config.list())`).
- Serializing for a snapshot.
- Wholesale replacement via `Object.assign`.

## Live reference

The returned object is the same one `set` mutates. Mutating it mutates the live config:

```ts
config.set({ a: 1 });

const tree = config.list();
tree.a = 999;
config.get("a");                             // 999
```

This is fast but easy to misuse. If you want an independent snapshot, clone explicitly:

```ts
const snapshot = structuredClone(config.list());
// or
const snapshot = JSON.parse(JSON.stringify(config.list()));
```

`structuredClone` handles `Date`, `Map`, `Set`, typed arrays, and circular refs; `JSON` round-tripping is faster but drops anything non-JSON-serializable.

## Empty by default

```ts
import config from "@mongez/config";

config.list();                               // {}
```

The config tree starts as a plain empty object on every fresh module load.

## Patterns

### Boot-time debug dump

```ts
if (process.env.DEBUG_CONFIG) {
  console.log("[config]", config.list());
}
```

### Serialize for a CLI tool

```ts
import fs from "node:fs";
import config from "@mongez/config";

config.set(myAppConfig);
fs.writeFileSync("config-snapshot.json", JSON.stringify(config.list(), null, 2));
```

### Replace the entire tree wholesale (escape hatch)

There's no `config.replace(...)` API. If you really need to wipe and reload:

```ts
import config from "@mongez/config";

const data = config.list();
for (const key of Object.keys(data)) {
  delete (data as any)[key];
}
config.set(newConfig);
```

This is rarely the right move — prefer additive `set` calls that overwrite the keys you care about.
