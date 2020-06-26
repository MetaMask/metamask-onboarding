/**
 * A library to initiate the MetaMask onboarding process.
 *
 * @remarks
 * See {@link https://docs.metamask.io/guide/onboarding-library.html|the MetaMask Docs website} for usage information.
 *
 * @packageDocumentation
 */

import * as Bowser from 'bowser';

const ONBOARDING_STATE = {
  INSTALLED: 'INSTALLED' as const,
  NOT_INSTALLED: 'NOT_INSTALLED' as const,
  REGISTERED: 'REGISTERED' as const,
  REGISTERING: 'REGISTERING' as const,
  RELOADING: 'RELOADING' as const,
};

const EXTENSION_DOWNLOAD_URL = {
  CHROME: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
  FIREFOX: 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/',
  DEFAULT: 'https://metamask.io',
};

/**
 * @internal
 */
enum FORWARDER_MODE {
  INJECT = 'INJECT',
  OPEN_TAB = 'OPEN_TAB',
}

// sessionStorage key
const REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS';

// forwarder iframe id
const FORWARDER_ID = 'FORWARDER_ID';

/**
 * @public
 */
export default class Onboarding {

  /**
   * @public
   */
  public static FORWARDER_MODE = FORWARDER_MODE;

  private readonly forwarderOrigin: string;

  private readonly downloadUrl: string;

  private readonly forwarderMode: keyof typeof FORWARDER_MODE;

  private state: keyof typeof ONBOARDING_STATE;

  /**
   * @param forwarderOrigin - the origin to use
   * @param forwarderMode - the forwarder mode from {@link Onboarding.FORWARDER_MODE}
   *
   * @public
   */
  constructor ({ forwarderOrigin = 'https://fwd.metamask.io', forwarderMode = FORWARDER_MODE.INJECT } = {}) {
    this.forwarderOrigin = forwarderOrigin;
    this.forwarderMode = forwarderMode;
    this.state = Onboarding.isMetaMaskInstalled() ?
      ONBOARDING_STATE.INSTALLED :
      ONBOARDING_STATE.NOT_INSTALLED;

    const browser = Onboarding._detectBrowser();
    if (browser) {
      this.downloadUrl = EXTENSION_DOWNLOAD_URL[browser];
    } else {
      this.downloadUrl = EXTENSION_DOWNLOAD_URL.DEFAULT;
    }

    this._onMessage = this._onMessage.bind(this);
    this._onMessageFromForwarder = this._onMessageFromForwarder.bind(this);
    this._openForwarder = this._openForwarder.bind(this);
    this._openDownloadPage = this._openDownloadPage.bind(this);
    this.startOnboarding = this.startOnboarding.bind(this);
    this.stopOnboarding = this.stopOnboarding.bind(this);

    window.addEventListener('message', this._onMessage);

    if (forwarderMode === FORWARDER_MODE.INJECT && sessionStorage.getItem(REGISTRATION_IN_PROGRESS) === 'true') {
      Onboarding._injectForwarder(this.forwarderOrigin);
    }
  }

  /**
   * @internal
   */
  _onMessage (event: MessageEvent) {
    if (event.origin !== this.forwarderOrigin) {
      // Ignoring non-forwarder message
      return undefined;
    }

    if (event.data.type === 'metamask:reload') {
      return this._onMessageFromForwarder(event);
    }

    console.debug(`Unknown message from '${event.origin}' with data ${JSON.stringify(event.data)}`);
    return undefined;
  }

  /**
   * @internal
   */
  async _onMessageFromForwarder (event: MessageEvent) {
    if (this.state === ONBOARDING_STATE.RELOADING) {
      console.debug('Ignoring message while reloading');
    } else if (this.state === ONBOARDING_STATE.NOT_INSTALLED) {
      console.debug('Reloading now to register with MetaMask');
      this.state = ONBOARDING_STATE.RELOADING;
      return location.reload();
    } else if (this.state === ONBOARDING_STATE.INSTALLED) {
      console.debug('Registering with MetaMask');
      this.state = ONBOARDING_STATE.REGISTERING;
      await Onboarding._register();
      this.state = ONBOARDING_STATE.REGISTERED;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      event.source?.postMessage({ type: 'metamask:registrationCompleted' }, event.origin);
      this.stopOnboarding();
    } else if (this.state === ONBOARDING_STATE.REGISTERING) {
      console.debug('Already registering - ignoring reload message');
    } else if (this.state === ONBOARDING_STATE.REGISTERED) {
      console.debug('Already registered - ignoring reload message');
    } else {
      throw new Error(`Unknown state: '${this.state}'`);
    }
    return undefined;
  }

  /**
   * Starts onboarding by opening the MetaMask download page and the Onboarding forwarder
   *
   * @public
   */
  startOnboarding () {
    sessionStorage.setItem(REGISTRATION_IN_PROGRESS, 'true');
    this._openDownloadPage();
    this._openForwarder();
  }

  /**
   * Stops onboarding registration, including removing the injected forwarder (if any)
   *
   * @remarks
   * Typically this function is not necessary, but it can be useful for cases where
   * onboarding completes before the forwarder has registered.
   *
   * @public
   */
  stopOnboarding () {
    if (sessionStorage.getItem(REGISTRATION_IN_PROGRESS) === 'true') {
      if (this.forwarderMode === FORWARDER_MODE.INJECT) {
        console.debug('Removing forwarder');
        Onboarding._removeForwarder();
      }
      sessionStorage.setItem(REGISTRATION_IN_PROGRESS, 'false');
    }
  }

  /**
   * @internal
   */
  _openForwarder () {
    if (this.forwarderMode === FORWARDER_MODE.OPEN_TAB) {
      window.open(this.forwarderOrigin, '_blank');
    } else {
      Onboarding._injectForwarder(this.forwarderOrigin);
    }
  }

  /**
   * @internal
   */
  _openDownloadPage () {
    window.open(this.downloadUrl, '_blank');
  }

  /**
   * Checks whether the MetaMask extension is installed
   *
   * @public
   */
  static isMetaMaskInstalled () {
    return Boolean((window as any).ethereum && (window as any).ethereum.isMetaMask);
  }

  /**
   * @internal
   */
  static _register () {
    return (window as any).ethereum.request({
      method: 'wallet_registerOnboarding',
    });
  }

  /**
   * @internal
   */
  static _injectForwarder (forwarderOrigin: string) {
    const container = document.body;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('height', '0');
    iframe.setAttribute('width', '0');
    iframe.setAttribute('style', 'display: none;');
    iframe.setAttribute('src', forwarderOrigin);
    iframe.setAttribute('id', FORWARDER_ID);
    container.insertBefore(iframe, container.children[0]);
  }

  /**
   * @internal
   */
  static _removeForwarder () {
    document.getElementById(FORWARDER_ID)?.remove();
  }

  /**
   * @internal
   */
  static _detectBrowser () {
    const browserInfo = Bowser.parse(window.navigator.userAgent);
    if (browserInfo.browser.name === 'Firefox') {
      return 'FIREFOX';
    } else if (['Chrome', 'Chromium'].includes(browserInfo.browser.name || '')) {
      return 'CHROME';
    }
    return null;
  }
}
