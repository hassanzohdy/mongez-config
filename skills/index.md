---
description: "Process-wide, framework-agnostic configuration tree with dotted-path reads, deep-merge boot-time writes, targeted updates and removals, and defaults that preserve false, 0, empty strings, and null. Use for: assembling settings from base, environment, and deploy layers; reading nested settings anywhere; feature flags. Not this package → .env loading, coercion, interpolation: @mongez/dotenv; reactive state or SSR request isolation: @mongez/atom; path and merge utilities: @mongez/reinforcements."
---

# @mongez/config

`@mongez/config` is a small singleton configuration tree: boot it with plain-object layers, then read and update settings by dotted path.

## The 80% path

1. Read [overview](overview/) for the package model and its singleton boundary.
2. At bootstrap, combine defaults, environment settings, and deploy overrides using [writing](writing/).
3. Read values with safe fallbacks through [reading](reading/); falsy configured values remain intact.
4. Copy layered boot, feature-flag, environment, and namespace patterns from [recipes](recipes/).

## Other topics

- [listing](listing/) explains the live object returned by `config.list()` and safe snapshots.
- [typing](typing/) shows how to supply an application config shape and typed access wrapper.
