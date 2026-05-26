---
name: mongez-config-typing
description: |
  TypeScript patterns for `@mongez/config` — using `ConfigurationsList`, declaring a project `AppConfig` shape, typing boot-time `config.set` calls, typing `config.get<T>` at the call site, and building a thin `getConfig` wrapper for stronger inference.
  TRIGGER when: code imports `ConfigurationsList` from `@mongez/config`; code uses `config.get<T>(...)` with a type parameter; user asks "how do I type @mongez/config", "how do I avoid `any` from `config.get`", or "how do I make config type-safe"; user references `AppConfig` or a typed config wrapper.
  SKIP: `@mongez/dotenv` handles `.env` parsing, not this package; runtime read/write behaviour — use `mongez-config-reading`/`mongez-config-writing`; pattern recipes — use `mongez-config-recipes`.
---

# Typing

The shipped `ConfigurationsList` type is permissive on purpose:

```ts
export type ConfigurationsList = Record<string, any>;
```

The package doesn't want to constrain how you shape your tree. For type-safe reads in your project, declare your own shape and use it at the call site.

## Declare an `AppConfig` shape

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
  i18n: {
    defaultLocale: "en" | "ar" | "fr";
    languages: Record<string, { name: string; direction: "ltr" | "rtl" }>;
  };
};
```

## Type the boot-time `set`

```ts
import config from "@mongez/config";
import type { AppConfig } from "./config-types";

const appConfig: AppConfig = {
  api: { url: "https://api.example.com", timeout: 5000 },
  features: { darkMode: true, beta: false },
  i18n: {
    defaultLocale: "en",
    languages: {
      en: { name: "English", direction: "ltr" },
      ar: { name: "العربية", direction: "rtl" },
    },
  },
};

config.set(appConfig);
```

The object literal is checked against `AppConfig` — typos and missing keys are caught at boot.

## Type the read at the call site

`config.get` returns `any` because the tree's shape is unknown to the package. Provide the type at the call site:

```ts
const url = config.get<string>("api.url");
const timeout = config.get<number>("api.timeout", 30000);
const flags = config.get<AppConfig["features"]>("features");
```

## Wrap it for stronger inference

For real-world apps, a thin typed wrapper is worth the 15 lines:

```ts
// src/config-helper.ts
import config from "@mongez/config";
import type { AppConfig } from "./config-types";

// Type-narrow only the small surface you actually use.
export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K];
export function getConfig<T>(path: string, defaultValue?: T): T;
export function getConfig(path: string, defaultValue?: any) {
  return config.get(path, defaultValue);
}
```

Then:

```ts
import { getConfig } from "./config-helper";

const api = getConfig("api");                // typed as AppConfig["api"]
const timeout = getConfig<number>("api.timeout", 30000);
```

Going further (typed dotted paths against `AppConfig`) is possible with the `Path` / `PathValue` helpers in `@mongez/reinforcements`, but is overkill for most projects. Start with the wrapper above and only deepen if it pays off.
