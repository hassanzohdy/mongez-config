# Changelog — @mongez/config

## [1.2.0] — 2026-08-12

Reported by @Ion (Warlock.js team) on 2026-08-11: `config.set(key, undefined)` stored `null` and silently destroyed the default-value contract of every later `get(key, fallback)`.

### Fixed

- **`config.set(key, undefined)` now unsets the key instead of storing `null`** (`src/config.ts`). The signature was `set(key, value = null)`, and a JS default parameter substitutes for `undefined` — so clearing a key wrote a *present* `null`, and because `null` is a real value, `get(key, fallback)` returned it **instead of the fallback**. The fallback exists precisely to cover "this key has no value", and a cleared key is a key with no value.

  This was not a contrived call. `set(key, undefined)` is what ordinary code produces without anyone deciding to write it — an optional env var (`process.env.X && Number(process.env.X)`), a spread of a partial options object, or a test's cleanup step. And the damage surfaced far from its cause: in the reported case the stored `null` reached Fastify as `bodyLimit`, failing a test in a file that had never touched the key, with no path for a reader from the error back to the `set` that caused it.

  The blast radius was every `config.get(key, fallback)` in a consuming framework — ports, hosts, timeouts, limits, driver names — each silently losing its fallback the moment an application cleared that key.

### Added

- **`config.unset(key)` and its alias `config.remove(key)`** (`src/config.ts`). Accepts a single dotted path or an array of them. Dot notation removes a leaf without disturbing its siblings; removing a branch removes everything beneath it; unsetting a key that was never set is a no-op. Previously there was **no way to remove a key at all**, and the workaround was to mutate the object returned by `config.list()` — which only worked because `list()` happens to return the live tree rather than a copy. That is an implementation detail, not a contract.

### Semantics — `undefined` clears, `null` is a value

The report asked for one of two fixes and explicitly warned against doing both half-way. The choice made here:

| Call | Effect | `get(key, "D")` afterwards |
|---|---|---|
| `set(key, undefined)` | unsets the key | `"D"` |
| `set(key, null)` | stores a real `null` | `null` |

`undefined` means "no value"; `null` means "configured to nothing". Only the caller knows which they meant, so both are preserved rather than collapsed. This also keeps the package consistent with `@mongez/dotenv`, where a deliberately loaded `null` is preserved and distinguishable from an absent key — had `get` been changed to treat `null` as missing, the two packages would contradict each other.

`get`'s own contract is unchanged: the default applies to an **absent** key, and a stored `null` is returned as-is.

### Tests

New `src/__tests__/unset.test.ts` (16 assertions), written **before** the fix and observed failing against 1.1.4 — 13 red, including every row of the reporter's suggested-proof table. Covers: unset restores the default; no `null` left in `list()`; siblings survive a nested unset; the three real-world shapes that produce `undefined`; an explicit `null` is preserved and distinguishable from absent; `unset` by single key, by array, on a branch, and on a missing key; and `remove` as an alias.

One pre-existing test in `config.test.ts` asserted the coercion as if it were intended behaviour (`"config.set(path, undefined) coerces to null via the default parameter"`); it now asserts the corrected contract.

```
47 passed | 0 skipped
```

## [1.1.4] — 2026-05-26

### Added

- **AI kit.** `llms.txt`, `llms-full.txt`, and a `skills/` folder (`README`, `overview`, `reading`, `writing`, `recipes`) for tool-assisted development.
- **Test suite.** Vitest unit tests covering: object-form `set` (deep merge), path-form `set` (dot-notation, intermediate object creation, numeric segments build arrays), `get` (existing paths, missing paths, default fallback, falsy values), `list` (returns live reference), and singleton sharing across importers.
- **CI.** GitHub Actions workflow: Node 18/20/22 on Ubuntu, plus Node 20 on Windows.
- **`vitest.config.ts`** with self-detecting sibling-alias: in the monorepo, `@mongez/reinforcements` resolves to `../reinforcements/src` for live cross-package edits; in a standalone checkout, it falls back to `node_modules` so CI is hermetic.

### Fixed

- **`config.set(string)` with a single argument now throws `TypeError` instead of silently replacing the tree.** Previously, shape detection was `arguments.length === 1`, so calling `config.set("api.url")` flowed into `merge(data, "api.url")` — and the underlying `@mongez/reinforcements` `merge` returns the latest non-plain-object source as-is, clobbering `data` with the string `"api.url"`. Detection is now `typeof key === "object" && key !== null && !Array.isArray(key)`; non-object single-arg calls raise a clear error directing callers to either pass an object (deep merge) or a `(path, value)` pair (path write). **This is a behavioral break — calls that previously silently corrupted state now throw — but the prior behavior was always a bug; it's a desirable break.**

### Documentation

- **README rewrite.** Marketing-style index with tagline, 30-second tour, API reference, examples, behavior notes, gotchas, related packages.
- **`skills/`** folder for AI agents: per-feature reference cards plus cross-feature recipes.

### Dependency bumps

- **`@mongez/reinforcements: ^2.x.x` → `^3.1.0`**. Compatible API for the surfaces this package uses (`get`, `set`, `merge`). The `merge` array strategy default is still `"replace"`, matching prior behavior. See [reinforcements v3 changelog](../reinforcements/CHANGELOG.md) for the full diff.
