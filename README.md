# Mongez Config

A simple configuration package for settling data in a centered place for better code quality.

## Why?

Well, the main purpose of this package is to provide a way to handle data between your project files and other outer packages, this can be useful when a package provides a configuration list, Check other `Mongez` packages for more illustrations.

## Installation

`yarn add @mongez/config`

Or

`npm i @mongez/config`

## Usage

The package has only three main functionalities: Setting configurations list `config.set`, getting a configuration value `config.get` and listing entire configurations `config.list`.

## Setting configurations list

A configuration list is just an object with variant data that is manipulated by you to adjustify your configurations based on your project needs.

Create a `src/config.js` or `src/config.ts` (**it's recommended to always use typescript in your project :)**) and add the following code:

```ts
import config from '@mongez/config';

config.set({
    api: {
        url: 'https:site-name.com',
        apiKey: 'api-key',
    },
    languages: {
        en: {
            name: 'English',
            direction: 'ltr',
        }
    }
});
```

We may also set a single config value.

```ts
import config from '@mongez/config';

config.set('api.url', 'https://site-name.com/api');
```

That's it, now we're ready to get our configurations data from anywhere in our app.

## Getting configuration value

```js
// src /some-api-manager.js
import config from '@mongez/config';

const apiSetup = new Api({
    baseUrl: config.get('api.url'),
    apiKey: config.get('api.apiKey'),
});
```

As you can see, just calling `config.get` with a dot notation syntax will get the api data that can be used directly.

If the key is not defined in the configuration, pass the second argument to `config.get` as a default value to be returned instead.

```js
import config from '@mongez/config';

console.log(config.get('some.nested.undefined.key', '000')); // 000
```

## Getting the entire configurations list

```js

import config from '@mongez/config';

console.log(config.list()); // {configurationsList as object}
```

## Best practicing with typescript

Always define the configurations list with a type or an interface to determine the flow of the configurations.

```ts
// src/config.ts
import config from '@mongez/config';

import { AppConfigurations } from './types';

const configurationsList: AppConfigurations = {
    api: {
        url: 'https:site-name.com',
        apiKey: 'api-key',
    },
    languages: {
        en: {
            name: 'English',
            direction: 'ltr',
        }
    }
}

config.set(configurationsList);
```

```ts
// src/types.ts

export type AppConfigurations = {
    /**
     * Api configurations list
     */ 
    api?: {
        /**
         * Base url
         */
        url: string;
        /**
         * Api Key
         */ 
        apiKey: string;
    };
    /**
     * Languages List
     */ 
    languages?: {
        /**
         * Locale code name
         */ 
        [localeCode: string]: {
            /**
             * Language name
             */ 
            name: string;
            /**
             * Language direction
             */ 
            direction: 'ltr' | 'rtl';
        };
    };
}
```