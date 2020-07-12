# MetaMask Onboarding

This library is used to help onboard new MetaMask users. It allows you to ask the MetaMask extension to redirect users back to your page after onboarding has finished.

This library will register the current page as having initiated onboarding, so that MetaMask knows where to redirect the user after onboarding. Note that the page will be automatically reloaded a single time once a MetaMask installation is detected, in order to facilitate this registration.

## Installation

`@metamask/onboarding` is made available as either a CommonJS module, and ES6 module, or an ES5 bundle.

* ES6 module: `import MetaMaskOnboarding from '@metamask/onboarding'`
* ES5 module: `const MetaMaskOnboarding = require('@metamask/onboarding')`
* ES5 bundle: `dist/metamask-onboarding.bundle.js` (this can be included directly in a page)

## Usage

[See _§ Onboarding Library_ on the MetaMask Docs website for examples.](https://docs.metamask.io/guide/onboarding-library.html)

## API

Assuming `import MetaMaskOnboarding from '@metamask/onboarding'`, the following API is available.

### Static methods

#### `MetaMaskOnboarding.isMetaMaskInstalled()`

Returns `true` if a MetaMask-like provider is detected, or `false` otherwise. Note that we don't provide any guarantee that this is correct, as non-MetaMask wallets can disguise themselves as MetaMask.

### Static properties

#### `MetaMaskOnboarding.FORWARDER_MODE`

A set of constants for each of the available forwarder modes.

| Constant | Description |
| :-- | :-- |
| `INJECT` | Inject a `iframe` to that will refresh until MetaMask has installed |
| `OPEN_TAB` | Open a tab to a new page that will refresh until MetaMask has installed—this is only useful if the client app has disallowed `iframes` |

### Constructor

#### `new MetaMaskOnboarding()`

The constructor accepts an optional options bag with the following:

| Option | Description |
| :-- | :-- |
| `forwarderOrigin` | Override the forwarder URL, useful for testing. **Optional**, defaults to `'https://fwd.metamask.io'`. |
| `forwarderMode` | One of the available forwarder modes. **Optional**, defaults to `MetaMaskOnboarding.FORWARDER_MODE.INJECT`. |

### Instance methods

#### `startOnboarding()`

Starts onboarding by opening the MetaMask download page and waiting for MetaMask to be installed. Once the MetaMask extension installation is detected, a message will be sent to MetaMask to register the current site as the onboarding initiator.

#### `stopOnboarding()`

Stops onboarding registration, including removing the injected `iframe` (if any).

## Release & Publishing

The project follows the same release process as the other libraries in the MetaMask organization:

1. Create a release branch
    - For a typical release, this would be based on `master`
    - To update an older maintained major version, base the release branch on the major version branch (e.g. `1.x`)
2. Update the changelog
3. Update version in package.json file (e.g. `yarn version --minor --no-git-tag-version`)
4. Create a pull request targeting the base branch (e.g. master or 1.x)
5. Code review and QA
6. Once approved, the PR is squashed & merged
7. The commit on the base branch is tagged
8. The tag can be published as needed

## License

This project is available under the [MIT license](./LICENSE).
