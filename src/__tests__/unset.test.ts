import { afterEach, describe, expect, it } from "vitest";
import config from "../config";

/**
 * Coverage for the 2026-08-11 report: `set(key, undefined)` stored `null` and
 * destroyed every later `get(key, fallback)`.
 *
 * The damaging half was the read, not the write. `get`'s `defaultValue` exists
 * precisely to cover "this key has no value" — and a key that was just cleared
 * is a key with no value. Because the write coerced `undefined` to `null`, and
 * `null` is a present value, the fallback silently stopped applying. The
 * failure then surfaced far from its cause: in the reported case a stored
 * `null` reached Fastify as `bodyLimit`, failing a test that had never touched
 * the key.
 *
 * Chosen semantics (the report asked for one of two, not a half-measure):
 *
 *   set(key, undefined) → UNSETS the key. `get(key, fallback)` returns fallback.
 *   set(key, null)      → stores a real `null`. `get(key, fallback)` returns null.
 *
 * `null` stays a first-class value rather than a synonym for "missing", which
 * keeps this package consistent with `@mongez/dotenv`, where a deliberately
 * loaded `null` is preserved and distinguishable from an absent key.
 */
afterEach(() => {
  const data = config.list() as Record<string, any>;
  for (const key of Object.keys(data)) {
    delete data[key];
  }
});

describe("set(key, undefined) — unsets rather than storing null", () => {
  it("restores the default for a previously-set key", () => {
    expect(config.get("http.bodyLimit", "DEFAULT")).toBe("DEFAULT");

    config.set("http.bodyLimit", 999);
    expect(config.get("http.bodyLimit", "DEFAULT")).toBe(999);

    config.set("http.bodyLimit", undefined);
    expect(config.get("http.bodyLimit", "DEFAULT")).toBe("DEFAULT");
  });

  it("removes the key from list() instead of leaving a null behind", () => {
    config.set("http.bodyLimit", 999);
    config.set("http.bodyLimit", undefined);

    // The reported symptom was list() showing {"http":{"bodyLimit":null}}.
    expect(config.list()).not.toHaveProperty("http.bodyLimit");
  });

  it("is safe on a key that was never set", () => {
    expect(() => config.set("never.set", undefined)).not.toThrow();
    expect(config.get("never.set", "DEFAULT")).toBe("DEFAULT");
  });

  it("does not disturb sibling keys", () => {
    config.set("a.b", 1);
    config.set("a.c", 2);

    config.set("a.b", undefined);

    expect(config.get("a.c")).toBe(2);
    expect(config.get("a.b", "DEFAULT")).toBe("DEFAULT");
  });

  it("covers the shapes ordinary code produces", () => {
    // None of these are contrived — each is how `undefined` arrives in
    // practice without anyone deciding to write it.
    delete process.env.HTTP_BODY_LIMIT_TEST;
    config.set("http.limit", 100);
    config.set(
      "http.limit",
      process.env.HTTP_BODY_LIMIT_TEST && Number(process.env.HTTP_BODY_LIMIT_TEST),
    );
    expect(config.get("http.limit", 4096)).toBe(4096);

    const defaults = { retries: 3 };
    const userOptions: { retries?: number } = {};
    config.set("client.retries", { ...defaults, ...userOptions }.retries);
    expect(config.get("client.retries", 3)).toBe(3);
  });
});

describe("set(key, null) — an explicit null is a real value", () => {
  it("is preserved and wins over the default", () => {
    config.set("feature.flag", null);

    // Deliberate, not accidental: `null` means "configured to nothing",
    // which is different from "not configured".
    expect(config.get("feature.flag", "DEFAULT")).toBeNull();
  });

  it("is distinguishable from an unset key", () => {
    config.set("explicit", null);

    expect(config.get("explicit", "DEFAULT")).toBeNull();
    expect(config.get("absent", "DEFAULT")).toBe("DEFAULT");
    expect(config.list()).toHaveProperty("explicit", null);
  });

  it("can itself be cleared with undefined", () => {
    config.set("explicit", null);
    config.set("explicit", undefined);

    expect(config.get("explicit", "DEFAULT")).toBe("DEFAULT");
  });
});

describe("unset(key) / remove(key)", () => {
  it("removes the key and restores the default", () => {
    config.set("a.b", 1);

    config.unset("a.b");

    expect(config.get("a.b", "DEFAULT")).toBe("DEFAULT");
    expect(config.list()).not.toHaveProperty("a.b");
  });

  it("removes a whole branch", () => {
    config.set("api.url", "https://example.com");
    config.set("api.timeout", 5000);

    config.unset("api");

    expect(config.list()).not.toHaveProperty("api");
    expect(config.get("api.url", "DEFAULT")).toBe("DEFAULT");
  });

  it("does not destroy siblings when removing a nested key", () => {
    config.set("a.b", 1);
    config.set("a.c", 2);

    config.unset("a.b");

    expect(config.get("a.c")).toBe(2);
  });

  it("accepts several keys at once", () => {
    config.set("a", 1);
    config.set("b", 2);
    config.set("c", 3);

    config.unset(["a", "b"]);

    expect(config.get("a", "D")).toBe("D");
    expect(config.get("b", "D")).toBe("D");
    expect(config.get("c")).toBe(3);
  });

  it("is a no-op on a key that does not exist", () => {
    expect(() => config.unset("nope.not.here")).not.toThrow();
    expect(config.list()).toEqual({});
  });

  it("remove() is an alias for unset()", () => {
    config.set("a.b", 1);

    config.remove("a.b");

    expect(config.get("a.b", "DEFAULT")).toBe("DEFAULT");
  });

  it("removes the need to reach into list() and delete by hand", () => {
    // The reported workaround depended on list() returning the live object
    // rather than a copy — an implementation detail callers should not rely on.
    config.set("http.bodyLimit", 999);

    config.unset("http.bodyLimit");

    expect(config.get("http.bodyLimit", 4096)).toBe(4096);
  });
});
