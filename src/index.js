import Bowser from 'bowser/src/bowser'

/** @enum {string} */
const ONBOARDING_STATE = {
  INSTALLED: 'INSTALLED',
  NOT_INSTALLED: 'NOT_INSTALLED',
  REGISTERED: 'REGISTERED',
  REGISTERING: 'REGISTERING',
  RELOADING: 'RELOADING',
}

/** @enum {string} */
const EXTENSION_DOWNLOAD_URL = {
  CHROME: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
  FIREFOX: 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/',
  DEFAULT: 'https://metamask.io',
}

/** @enum {string} */
const FORWARDER_MODE = {
  INJECT: 'INJECT',
  OPEN_TAB: 'OPEN_TAB',
}

// sessionStorage key
const REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS'

// forwarder iframe id
const FORWARDER_ID = 'FORWARDER_ID'


/**
 * @typedef {Object} OnboardingOptions - Options for configuring onboarding
 * @property {string} [forwarderOrigin] - The origin of the forwarder page
 * @property {string} [forwarderMode] - The method used for opening the forwarder ('TAB' or 'INJECT')
 */

class Onboarding {
  /**
   *
   * @param {OnboardingOptions} [options] - Options for configuring onboarding
   */
  constructor ({ forwarderOrigin = 'https://fwd.metamask.io', forwarderMode = FORWARDER_MODE.INJECT } = {}) {
    this.forwarderOrigin = forwarderOrigin
    this.forwarderMode = forwarderMode
    this.state = Onboarding.isMetaMaskInstalled() ?
      ONBOARDING_STATE.INSTALLED :
      ONBOARDING_STATE.NOT_INSTALLED

    const browser = Onboarding._detectBrowser()
    if (browser) {
      this.downloadUrl = EXTENSION_DOWNLOAD_URL[browser]
    } else {
      this.downloadUrl = EXTENSION_DOWNLOAD_URL['DEFAULT']
    }

    this._onMessage = this._onMessage.bind(this)
    this._onMessageFromForwarder = this._onMessageFromForwarder.bind(this)
    this._openForwarder = this._openForwarder.bind(this)
    this._openDownloadPage = this._openDownloadPage.bind(this)
    this.startOnboarding = this.startOnboarding.bind(this)
    this.stopOnboarding = this.stopOnboarding.bind(this)

    window.addEventListener('message', this._onMessage)

    if (forwarderMode === FORWARDER_MODE.INJECT && sessionStorage.getItem(REGISTRATION_IN_PROGRESS)) {
      Onboarding._injectForwarder(this.forwarderOrigin)
    }
  }

  async _onMessage (event) {
    if (event.origin !== this.forwarderOrigin) {
      // Ignoring non-forwarder message
      return
    }

    if (event.data.type === 'metamask:reload') {
      return this._onMessageFromForwarder(event)
    } else {
      console.debug(`Unknown message from '${event.origin}' with data ${JSON.stringify(event.data)}`)
    }
  }

  async _onMessageFromForwarder (event) {
    if (this.state === ONBOARDING_STATE.RELOADING) {
      console.debug('Ignoring message while reloading')
    } else if (this.state === ONBOARDING_STATE.NOT_INSTALLED) {
      console.debug('Reloading now to register with MetaMask')
      this.state = ONBOARDING_STATE.RELOADING
      return location.reload()
    } else if (this.state === ONBOARDING_STATE.INSTALLED) {
      console.debug('Registering with MetaMask')
      this.state = ONBOARDING_STATE.REGISTERING
      await Onboarding._register()
      this.state = ONBOARDING_STATE.REGISTERED
      event.source.postMessage({ type: 'metamask:registrationCompleted' }, event.origin)
      this.stopOnboarding()
    } else if (this.state === ONBOARDING_STATE.REGISTERING) {
      console.debug('Already registering - ignoring reload message')
    } else if (this.state === ONBOARDING_STATE.REGISTERED) {
      console.debug('Already registered - ignoring reload message')
    } else {
      throw new Error(`Unknown state: '${this.state}'`)
    }
  }

  /**
   * Starts onboarding by opening the MetaMask download page and the Onboarding forwarder
   */
  startOnboarding () {
    sessionStorage.setItem(REGISTRATION_IN_PROGRESS, true)
    this._openDownloadPage()
    this._openForwarder()
  }

  /**
   * Stops onboarding registration, including removing the injected forwarder (if any)
   *
   * Typically this function is not necessary, but it can be useful for cases where
   * onboarding completes before the forwarder has registered.
   */
  stopOnboarding () {
    if (sessionStorage.getItem(REGISTRATION_IN_PROGRESS)) {
      if (this.forwarderMode === FORWARDER_MODE.INJECT) {
        console.debug('Removing forwarder')
        Onboarding._removeForwarder()
      }
      sessionStorage.setItem(REGISTRATION_IN_PROGRESS, false)
    }
  }

  _openForwarder () {
    if (this.forwarderMode === FORWARDER_MODE.OPEN_TAB) {
      window.open(this.forwarderOrigin, '_blank')
    } else {
      Onboarding._injectForwarder(this.forwarderOrigin)
    }
  }

  _openDownloadPage () {
    window.open(this.downloadUrl, '_blank')
  }

  /**
   * Checks whether the MetaMask extension is installed
   *
   * @returns {boolean} - `true` if MetaMask is installed, `false` otherwise.
   */
  static isMetaMaskInstalled () {
    return Boolean(window.ethereum && window.ethereum.isMetaMask)
  }

  static async _register () {
    return window.ethereum.send('wallet_registerOnboarding')
  }

  static _injectForwarder (forwarderOrigin) {
    const container = document.body
    const iframe = document.createElement('iframe')
    iframe.setAttribute('height', 0)
    iframe.setAttribute('width', 0)
    iframe.setAttribute('src', forwarderOrigin)
    iframe.setAttribute('id', FORWARDER_ID)
    container.insertBefore(iframe, container.children[0])
  }

  static _removeForwarder () {
    document.getElementById(FORWARDER_ID).remove()
  }

  static _detectBrowser () {
    const browserInfo = Bowser.parse(window.navigator.userAgent)
    if (browserInfo.browser.name === 'Firefox') {
      return 'FIREFOX'
    } else if (['Chrome', 'Chromium'].includes(browserInfo.browser.name)) {
      return 'CHROME'
    }
    return null
  }
}

export default Onboarding
