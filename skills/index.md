---
description: "Process-wide, framework-agnostic configuration tree with dotted-path reads, deep-merge boot-time writes, targeted updates and removals, and default fallbacks that preserve false, 0, empty strings, and null. Use for: assembling application settings from base, environment, and deploy layers; reading nested settings anywhere; feature flags; and inspecting the current tree. 80% path: start with overview, seed layers with writing, read values and defaults with reading, then use recipes for common bootstrap patterns. Not this package → .env file loading, coercion, and interpolation: @mongez/dotenv; reactive state or SSR request isolation: @mongez/atom; reusable path and merge utilities: @mongez/reinforcements."
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
