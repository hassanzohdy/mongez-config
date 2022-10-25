import { get, merge } from "@mongez/reinforcements";
import type { ConfigList } from "./types";

const config = {
  data: {},

  /**
   * Set the given key/value in our configurations list
   *
   * @param   {string | NormalObject} key
   * @param   {any} value
   * @returns void
   */
  set(key: string | ConfigList, value: any = null) {
    // case one one argument only is passed and is object
    if (arguments.length === 1) {
      this.data = merge(this.data);
    } else {
      Obj.set(this.data, key as string, value);
    }
  },
  /**
   * Get the value for the given key, otherwise return the given default value
   * P.S data will be grabbed using dot notation
   * i.e name.first
   *
   * @param   {string} key
   * @param   {any} defaultValue
   * @returns any
   */
  get(key: string, defaultValue: any = null) {
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
