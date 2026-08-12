import { get, merge, set, unset } from "@mongez/reinforcements";
import { ConfigurationsList } from "./types";

const config = {
  data: {},
  /**
   * Set the given key/value in our configurations list.
   *
   * Value semantics — the two cases are deliberately different:
   *
   * - `set(key, undefined)` **unsets** the key. A later `get(key, fallback)`
   *   returns the fallback again. `undefined` means "no value", and the whole
   *   point of `get`'s default is to cover a key with no value.
   * - `set(key, null)` stores a real `null`, and `get(key, fallback)` returns
   *   that `null`. "Configured to nothing" is a different statement from "not
   *   configured", and only the caller knows which one they meant.
   *
   * Before 1.2.0 `undefined` was silently coerced to `null` on write (an
   * `= null` default parameter fires for `undefined`), so a cleared key became
   * a present `null` and every later `get(key, fallback)` returned it instead
   * of the fallback. The damage showed up far from the cause — a stored `null`
   * reaching a consumer that demanded a number.
   */
  set(key: string | Record<string, any>, value?: any) {
    // Single-argument call: must be a plain object for deep-merge.
    // Detecting via `arguments.length === 1` alone is unsafe — a bare
    // string like `config.set("api.url")` would otherwise flow into
    // `merge(data, "api.url")` and clobber the tree (because the
    // underlying merge returns the latest non-plain-object source as-is).
    if (arguments.length === 1) {
      if (typeof key === "object" && key !== null && !Array.isArray(key)) {
        this.data = merge(this.data, key);
        return;
      }

      throw new TypeError(
        "config.set() requires a value when called with a string key. " +
          "Pass an object for deep-merge, or call set(path, value) for a path write.",
      );
    }

    // An explicitly-passed `undefined` clears the key. Guarded on a string
    // key so `set(someObject, undefined)` keeps its previous meaning rather
    // than being reinterpreted as a removal.
    if (value === undefined && typeof key === "string") {
      this.unset(key);
      return;
    }

    set(this.data, key, value);
  },
  /**
   * Get the value for the given key, otherwise return the given default value
   * P.S data will be grabbed using dot notation
   * i.e name.first
   *
   * The default applies when the key is **absent**. A stored `null` is a
   * present value and is returned as-is — use `unset(key)` (or
   * `set(key, undefined)`) when you want the default back.
   */
  get(key: keyof ConfigurationsList, defaultValue: any = null) {
    return get(this.data, key, defaultValue);
  },
  /**
   * Remove one or more keys from the configurations list.
   *
   * Dot notation removes a leaf without touching its siblings, and removing a
   * branch removes everything under it. Unsetting a key that was never set is
   * a no-op.
   *
   * This exists so callers never have to reach into `list()` and `delete` a
   * property by hand — that only worked because `list()` happens to return the
   * live object, which is an implementation detail and not a contract.
   */
  unset(key: string | string[]) {
    unset(this.data, Array.isArray(key) ? key : [key]);
  },
  /**
   * Alias of {@link config.unset}.
   */
  remove(key: string | string[]) {
    this.unset(key);
  },
  /**
   * Get all configurations
   */
  list() {
    return this.data;
  },
};

export default config;
