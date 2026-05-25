import { afterEach, describe, expect, it } from "vitest";
import config from "../config";

/**
 * The config singleton is module-level state. Reset between every test
 * by emptying the live tree returned by `list()` so each `describe`
 * starts from `{}`.
 */
afterEach(() => {
  const data = config.list() as Record<string, any>;
  for (const key of Object.keys(data)) {
    delete data[key];
  }
});

describe("config.set — object form (deep merge)", () => {
  it("seeds an empty tree", () => {
    config.set({ api: { url: "https://example.com" } });
    expect(config.list()).toEqual({ api: { url: "https://example.com" } });
  });

  it("deep-merges into existing data without dropping sibling keys", () => {
    config.set({ api: { url: "https://example.com" } });
    config.set({ api: { timeout: 5000 } });

    expect(config.list()).toEqual({
      api: { url: "https://example.com", timeout: 5000 },
    });
  });

  it("later writes overwrite the same key", () => {
    config.set({ api: { url: "https://a.com" } });
    config.set({ api: { url: "https://b.com" } });

    expect(config.get("api.url")).toBe("https://b.com");
  });

  it("merges multiple top-level branches", () => {
    config.set({
      api: { url: "https://example.com" },
      features: { darkMode: true },
    });
    config.set({
      i18n: { defaultLocale: "en" },
      features: { beta: false },
    });

    expect(config.list()).toEqual({
      api: { url: "https://example.com" },
      features: { darkMode: true, beta: false },
      i18n: { defaultLocale: "en" },
    });
  });

  it("REPLACES arrays at the same path rather than concatenating", () => {
    config.set({ hosts: ["a", "b"] });
    config.set({ hosts: ["c"] });

    // Documents the underlying @mongez/reinforcements merge behavior:
    // arrays default to "replace", not "concat" or "union".
    expect(config.list().hosts).toEqual(["c"]);
  });

  it("an empty-object merge is a no-op", () => {
    config.set({ a: 1 });
    config.set({});
    expect(config.list()).toEqual({ a: 1 });
  });
});

describe("config.set — path form", () => {
  it("writes a single value at a top-level key", () => {
    config.set("apiUrl", "https://example.com");
    expect(config.list()).toEqual({ apiUrl: "https://example.com" });
  });

  it("writes by dotted path and creates intermediate objects", () => {
    config.set("api.url", "https://example.com");
    expect(config.list()).toEqual({ api: { url: "https://example.com" } });
  });

  it("creates deeply nested chains on demand", () => {
    config.set("a.b.c.d.e", 42);
    expect(config.get("a.b.c.d.e")).toBe(42);
    expect(config.list()).toEqual({ a: { b: { c: { d: { e: 42 } } } } });
  });

  it("preserves sibling keys when writing deeper paths", () => {
    config.set({ api: { url: "https://example.com", timeout: 5000 } });
    config.set("api.headers.x-app-id", "web");

    expect(config.list()).toEqual({
      api: {
        url: "https://example.com",
        timeout: 5000,
        headers: { "x-app-id": "web" },
      },
    });
  });

  it("creates an array container when the next segment is numeric", () => {
    config.set("hosts.0", "primary");
    config.set("hosts.1", "secondary");

    const tree = config.list();
    expect(Array.isArray(tree.hosts)).toBe(true);
    expect(tree.hosts).toEqual(["primary", "secondary"]);
  });

  it("overwrites whole subtrees when assigning an object via the path form", () => {
    config.set({ api: { url: "https://example.com", timeout: 5000 } });
    config.set("api", { url: "https://new.com" });

    // Path-form assignment is a verbatim replacement, NOT a merge.
    expect(config.list()).toEqual({ api: { url: "https://new.com" } });
  });

  it("can write primitives at the leaf", () => {
    config.set("flag.enabled", true);
    config.set("count", 0);
    config.set("name", "");

    expect(config.get("flag.enabled")).toBe(true);
    expect(config.get("count")).toBe(0);
    expect(config.get("name")).toBe("");
  });

  it("config.set(path, undefined) coerces to null via the default parameter", () => {
    // The signature is `set(key, value = null)`. JS default parameters
    // substitute for `undefined`, so passing it explicitly stores `null`.
    config.set("maybe", undefined);
    expect(config.get("maybe", "fallback")).toBeNull();
  });
});

describe("config.get — basic reads", () => {
  it("returns null when the tree is empty and no default is provided", () => {
    expect(config.get("anything")).toBeNull();
  });

  it("reads a top-level key", () => {
    config.set({ name: "Mongez" });
    expect(config.get("name")).toBe("Mongez");
  });

  it("reads a nested path with dot notation", () => {
    config.set({ api: { headers: { "x-app-id": "web" } } });
    expect(config.get("api.headers.x-app-id")).toBe("web");
  });

  it("indexes arrays with numeric segments", () => {
    config.set({ servers: ["primary", "secondary", "fallback"] });
    expect(config.get("servers.0")).toBe("primary");
    expect(config.get("servers.2")).toBe("fallback");
  });

  it("reads through nested object-in-array shapes", () => {
    config.set({
      servers: [
        { region: "us-east-1", weight: 10 },
        { region: "eu-west-1", weight: 5 },
      ],
    });
    expect(config.get("servers.0.region")).toBe("us-east-1");
    expect(config.get("servers.1.weight")).toBe(5);
  });
});

describe("config.get — default fallback", () => {
  it("returns the default for a missing top-level key", () => {
    expect(config.get("missing", "fallback")).toBe("fallback");
  });

  it("returns the default when an intermediate segment is missing", () => {
    config.set({ api: {} });
    expect(config.get("api.url", "fallback")).toBe("fallback");
  });

  it("returns the default when an array index is out of range", () => {
    config.set({ servers: ["a", "b"] });
    expect(config.get("servers.5", "fallback")).toBe("fallback");
  });

  it("returns null (not undefined) as the implicit default", () => {
    // Important for `??` consumers — the package documents `null` as
    // the implicit fallback so users can rely on it.
    expect(config.get("missing")).toBeNull();
  });

  it("does NOT substitute the default for falsy stored values", () => {
    // Common config-tree bug: treating 0 / "" / false as "missing"
    // and falling through to the default. We rely on
    // @mongez/reinforcements' `get` to distinguish missing-key from
    // falsy-value, so these all pass through.
    config.set("flag.enabled", false);
    config.set("count", 0);
    config.set("name", "");
    config.set("ref", null);

    expect(config.get("flag.enabled", true)).toBe(false);
    expect(config.get("count", 99)).toBe(0);
    expect(config.get("name", "Anonymous")).toBe("");
    expect(config.get("ref", "fallback")).toBeNull();
  });

  it("short-circuits on a non-object intermediate (e.g. reading deeper into a primitive)", () => {
    config.set({ api: "not-an-object" });
    expect(config.get("api.url", "fallback")).toBe("fallback");
  });
});

describe("config.list", () => {
  it("returns the live tree by reference", () => {
    config.set({ a: 1 });
    const tree = config.list() as Record<string, any>;
    tree.a = 999;
    expect(config.get("a")).toBe(999);
  });

  it("includes every set key", () => {
    config.set({ api: { url: "x" }, features: { darkMode: true } });
    expect(config.list()).toEqual({
      api: { url: "x" },
      features: { darkMode: true },
    });
  });
});

describe("singleton behavior", () => {
  it("is the same object across re-imports", async () => {
    // Two import sites observe the same module instance — module cache
    // makes the singleton implicit, but it's the contract the package
    // ships with, so assert it directly.
    const a = (await import("../config")).default;
    const b = (await import("../config")).default;
    expect(a).toBe(b);

    a.set("shared.value", 1);
    expect(b.get("shared.value")).toBe(1);
  });
});

describe("dot-notation edge cases", () => {
  it("keys containing literal dots cannot be addressed via `get` — paths are split on `.`", () => {
    // This is a documented limitation. `set({ "api.example.com": 1 })`
    // stores the key verbatim; `get("api.example.com")` reads it as
    // three nested segments and returns the default. Avoid dots in keys.
    config.set({ "api.example.com": 1 });
    expect(config.get("api.example.com", "fallback")).toBe("fallback");
    expect((config.list() as any)["api.example.com"]).toBe(1);
  });

  it("a later object-form set CAN overwrite a branch created by the path form", () => {
    config.set("api.url", "https://path-form.com");
    config.set({ api: { timeout: 5000 } });

    // Deep merge — both keys coexist.
    expect(config.list()).toEqual({
      api: { url: "https://path-form.com", timeout: 5000 },
    });
  });

  it("numeric segment after an existing non-array creates the array container only when the slot is empty", () => {
    // If `hosts` is already an object, the path-form `set` does NOT
    // promote it to an array — it writes the numeric key as an object
    // property. This documents @mongez/reinforcements `set` behavior.
    config.set({ hosts: { existing: true } });
    config.set("hosts.0", "primary");
    const hosts = config.list().hosts as any;
    expect(Array.isArray(hosts)).toBe(false);
    expect(hosts).toEqual({ existing: true, "0": "primary" });
  });
});

describe("set — invalid single-argument calls", () => {
  it("throws when called with a single non-object argument and leaves the tree intact", () => {
    // src/config.ts — single-arg `set` requires a plain object for
    // deep-merge. A bare string would previously silently clobber the
    // tree via `merge(data, "api.url")`. Calls now throw a TypeError
    // with a clear message, and the tree is left untouched.
    config.set({ api: { url: "https://example.com" } });

    expect(() => config.set("api.url" as any)).toThrow(TypeError);
    expect(() => config.set("api.url" as any)).toThrow(/requires a value/);
    expect(() => config.set(42 as any)).toThrow(TypeError);
    expect(() => config.set(null as any)).toThrow(TypeError);
    expect(() => config.set(["a", "b"] as any)).toThrow(TypeError);

    // Tree is unchanged — none of the failed calls reassigned `data`.
    expect(config.list()).toEqual({
      api: { url: "https://example.com" },
    });
  });
});
