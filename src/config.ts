import { get, merge, set } from "@mongez/reinforcements";
import { ConfigurationsList } from "./types";

const config = {
  data: {},
  /**
   * Set the given key/value in our configurations list
   */
  set(key: string | Record<string, any>, value: any = null) {
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

    set(this.data, key, value);
  },
  /**
   * Get the value for the given key, otherwise return the given default value
   * P.S data will be grabbed using dot notation
   * i.e name.first
   */
  get(key: keyof ConfigurationsList, defaultValue: any = null) {
    return get(this.data, key, defaultValue);
  },
  /**
   * Get all configurations
   */
  list() {
    return this.data;
  },
};

export default config;
