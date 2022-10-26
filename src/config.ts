import { get, merge, set } from "@mongez/reinforcements";

const config = {
  data: {},
  /**
   * Set the given key/value in our configurations list
   */
  set(key: string | Record<string, any>, value: any = null) {
    // case one one argument only is passed and is object
    if (arguments.length === 1) {
      this.data = merge(this.data, key);
    } else {
      set(this.data, key, value);
    }
  },
  /**
   * Get the value for the given key, otherwise return the given default value
   * P.S data will be grabbed using dot notation
   * i.e name.first
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
