# MetaMask Onboarding

This library is used to help onboard new MetaMask users. It allows you to ask the MetaMask extension to redirect users back to your page after onboarding has finished.

This library will register the current page as having initiated onboarding, so that MetaMask knows where to redirect the user after onboarding. Note that the page will be automatically reloaded a single time once a MetaMask installation is detected, in order to facilitate this registration.

## Installation

`@metamask/onboarding` is made available as either a CommonJS module, and ES6 module, or an ES5 bundle.

* ES6 module: `import MetaMaskOnboarding from '@metamask/onboarding'`
* ES5 module: `const MetaMaskOnboarding = require('@metamask/onboarding')`
* ES5 bundle: `dist/metamask-onboarding.bundle.js` (this can be included directly in a page)

## Usage

Minimal example:
```
const onboarding = new MetaMaskOnboarding()
onboarding.startOnboarding()
```

Here is an example of an onboarding button that uses this library:

```
<!DOCTYPE html>
<html lang="en-CA">
  <head>
    <title>MetaMask Onboarding Example</title>
    <meta charset="UTF-8">
  </head>
  <body>
    <h1>Sample Dapp</h1>
    <button id="onboard">Loading...</button>
    <script src="./metamask-onboarding.bundle.js"></script>
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        const onboarding = new MetaMaskOnboarding()
        const onboardButton = document.getElementById('onboard')
        let accounts

        const updateButton = () => {
          if (!MetaMaskOnboarding.isMetaMaskInstalled()) {
            onboardButton.innerText = 'Click here to install MetaMask!'
            onboardButton.onclick = () => {
              onboardButton.innerText = 'Onboarding in progress'
              onboardButton.disabled = true
              onboarding.startOnboarding()
            }
          } else if (accounts && accounts.length > 0) {
            onboardButton.innerText = 'Connected'
            onboardButton.disabled = true
            onboarding.stopOnboarding()
          } else {
            onboardButton.innerText = 'Connect'
            onboardButton.onclick = async () => {
              await window.ethereum.request({
                method: 'eth_requestAccounts'
              })
            }
          }
        }

        updateButton()
        if (MetaMaskOnboarding.isMetaMaskInstalled()) {
          window.ethereum.on('accountsChanged', (newAccounts) => {
            accounts = newAccounts
            updateButton()
          })
        }
      })
    </script>
  </body>
</html>
```

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
