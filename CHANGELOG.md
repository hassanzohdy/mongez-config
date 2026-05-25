# Changelog — @mongez/config

## Unreleased

### Added

- **AI kit.** `llms.txt`, `llms-full.txt`, and a `skills/` folder (`README`, `overview`, `reading`, `writing`, `recipes`) for tool-assisted development.
- **Test suite.** Vitest unit tests covering: object-form `set` (deep merge), path-form `set` (dot-notation, intermediate object creation, numeric segments build arrays), `get` (existing paths, missing paths, default fallback, falsy values), `list` (returns live reference), and singleton sharing across importers.
- **CI.** GitHub Actions workflow: Node 18/20/22 on Ubuntu, plus Node 20 on Windows.
- **`vitest.config.ts`** with self-detecting sibling-alias: in the monorepo, `@mongez/reinforcements` resolves to `../reinforcements/src` for live cross-package edits; in a standalone checkout, it falls back to `node_modules` so CI is hermetic.

### Fixed (behavior)

- **`config.set(string)` with a single argument now throws `TypeError` instead of silently replacing the tree.** Previously, shape detection was `arguments.length === 1`, so calling `config.set("api.url")` flowed into `merge(data, "api.url")` — and the underlying `@mongez/reinforcements` `merge` returns the latest non-plain-object source as-is, clobbering `data` with the string `"api.url"`. Detection is now `typeof key === "object" && key !== null && !Array.isArray(key)`; non-object single-arg calls raise a clear error directing callers to either pass an object (deep merge) or a `(path, value)` pair (path write). **This is a behavioral break — calls that previously silently corrupted state now throw — but the prior behavior was always a bug; it's a desirable break.**

### Documentation

- **README rewrite.** Marketing-style index with tagline, 30-second tour, API reference, examples, behavior notes, gotchas, related packages.
- **`skills/`** folder for AI agents: per-feature reference cards plus cross-feature recipes.

### Dependency bumps

- **`@mongez/reinforcements: ^2.x.x` → `^3.1.0`**. Compatible API for the surfaces this package uses (`get`, `set`, `merge`). The `merge` array strategy default is still `"replace"`, matching prior behavior. See [reinforcements v3 changelog](../reinforcements/CHANGELOG.md) for the full diff.

### Notes

- **Public API signatures unchanged.** `config.set` / `config.get` / `config.list` keep their TypeScript signatures. The only behavioral change is the throw on invalid single-arg `set` calls — see Fixed (behavior) above.
