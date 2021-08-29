import Bowser from 'bowser';

const enum PLATFORM {
  DESKTOP,
  MOBILE,
}

const enum ONBOARDING_STATE {
  INSTALLED,
  NOT_INSTALLED,
  REGISTERED,
  REGISTERING,
  RELOADING,
};

const METAMASK_DOWNLOAD_URL = {
  DESKTOP: {
    CHROME:
      'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
    FIREFOX: 'https://addons.mozilla.org/firefox/addon/ether-metamask',
  },
  MOBILE: {
    IOS: 'https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202',
    ANDROID: 'market://details?id=io.metamask',
  },
  DEFAULT: 'https://metamask.io',
};

// sessionStorage key
const REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS';

// forwarder iframe id
const FORWARDER_ID = 'FORWARDER_ID';

export default class Onboarding {
  static FORWARDER_MODE = {
    INJECT: 'INJECT' as const,
    OPEN_TAB: 'OPEN_TAB' as const,
  };

  private readonly forwarderOrigin: string;

  private readonly isPlatformDesktop: boolean;

  private readonly downloadUrl: string;

  private readonly forwarderMode: keyof typeof Onboarding.FORWARDER_MODE;

  private state: ONBOARDING_STATE;

  constructor({
    forwarderOrigin = 'https://fwd.metamask.io',
    forwarderMode = Onboarding.FORWARDER_MODE.INJECT,
  } = {}) {
    this.forwarderOrigin = forwarderOrigin;
    this.forwarderMode = forwarderMode;
    this.state = Onboarding.isMetaMaskInstalled()
      ? ONBOARDING_STATE.INSTALLED
      : ONBOARDING_STATE.NOT_INSTALLED;

    const platformType = this._getPlatformType();
    this.isPlatformDesktop = platformType === PLATFORM.DESKTOP;
    this.downloadUrl = this._getDownloadUrl();

    this._onMessage = this._onMessage.bind(this);
    this._onMessageFromForwarder = this._onMessageFromForwarder.bind(this);
    this._openForwarder = this._openForwarder.bind(this);
    this._openDownloadPage = this._openDownloadPage.bind(this);
    this.startOnboarding = this.startOnboarding.bind(this);
    this.stopOnboarding = this.stopOnboarding.bind(this);

    window.addEventListener('message', this._onMessage);

    if (
      forwarderMode === Onboarding.FORWARDER_MODE.INJECT &&
      sessionStorage.getItem(REGISTRATION_IN_PROGRESS) === 'true'
    ) {
      Onboarding._injectForwarder(this.forwarderOrigin);
    }
  }

  _onMessage(event: MessageEvent) {
    if (event.origin !== this.forwarderOrigin) {
      // Ignoring non-forwarder message
      return undefined;
    }

    if (event.data.type === 'metamask:reload') {
      return this._onMessageFromForwarder(event);
    }

    console.debug(
      `Unknown message from '${event.origin}' with data ${JSON.stringify(
        event.data,
      )}`,
    );
    return undefined;
  }

  _onMessageUnknownStateError(state: never): never {
    throw new Error(`Unknown state: '${state}'`);
  }

  async _onMessageFromForwarder(event: MessageEvent) {
    switch (this.state) {
      case ONBOARDING_STATE.RELOADING:
        console.debug('Ignoring message while reloading');
        break;
      case ONBOARDING_STATE.NOT_INSTALLED:
        console.debug('Reloading now to register with MetaMask');
        this.state = ONBOARDING_STATE.RELOADING;
        location.reload();
        break;

      case ONBOARDING_STATE.INSTALLED:
        console.debug('Registering with MetaMask');
        this.state = ONBOARDING_STATE.REGISTERING;
        await Onboarding._register();
        this.state = ONBOARDING_STATE.REGISTERED;
        (event.source as Window).postMessage(
          { type: 'metamask:registrationCompleted' },
          event.origin,
        );
        this.stopOnboarding();
        break;
      case ONBOARDING_STATE.REGISTERING:
        console.debug('Already registering - ignoring reload message');
        break;
      case ONBOARDING_STATE.REGISTERED:
        console.debug('Already registered - ignoring reload message');
        break;
      default:
        this._onMessageUnknownStateError(this.state);
    }
  }

  /**
   * Starts onboarding by opening the MetaMask download page and the Onboarding forwarder (desktop)
   * Starts onboarding by opening the MetaMask app in Play Store / App Store (mobile)
   */
  startOnboarding() {
    if (this.isPlatformDesktop) {
      sessionStorage.setItem(REGISTRATION_IN_PROGRESS, 'true');
      this._openDownloadPage();
      this._openForwarder();
    } else {
      this._openDownloadPage();
    }
  }

  /**
   * Stops onboarding registration, including removing the injected forwarder (if any)
   *
   * Typically this function is not necessary, but it can be useful for cases where
   * onboarding completes before the forwarder has registered.
   */
  stopOnboarding() {
    if (sessionStorage.getItem(REGISTRATION_IN_PROGRESS) === 'true') {
      if (this.forwarderMode === Onboarding.FORWARDER_MODE.INJECT) {
        console.debug('Removing forwarder');
        Onboarding._removeForwarder();
      }
      sessionStorage.setItem(REGISTRATION_IN_PROGRESS, 'false');
    }
  }

  _openForwarder() {
    if (this.forwarderMode === Onboarding.FORWARDER_MODE.OPEN_TAB) {
      window.open(this.forwarderOrigin, '_blank');
    } else {
      Onboarding._injectForwarder(this.forwarderOrigin);
    }
  }

  _openDownloadPage() {
    window.open(this.downloadUrl, '_blank');
  }

  /**
   * Checks whether the MetaMask extension is installed
   */
  static isMetaMaskInstalled() {
    return Boolean(
      (window as any).ethereum && (window as any).ethereum.isMetaMask,
    );
  }

  static _register() {
    return (window as any).ethereum.request({
      method: 'wallet_registerOnboarding',
    });
  }

  static _injectForwarder(forwarderOrigin: string) {
    const container = document.body;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('height', '0');
    iframe.setAttribute('width', '0');
    iframe.setAttribute('style', 'display: none;');
    iframe.setAttribute('src', forwarderOrigin);
    iframe.setAttribute('id', FORWARDER_ID);
    container.insertBefore(iframe, container.children[0]);
  }

  static _removeForwarder() {
    document.getElementById(FORWARDER_ID)?.remove();
  }

  _getDownloadUrl() {
    const browserInfo = Bowser.parse(window.navigator.userAgent);
    const browserName = browserInfo.browser.name;
    const { DESKTOP, MOBILE, DEFAULT } = METAMASK_DOWNLOAD_URL;

    if (this.isPlatformDesktop) {
      if (browserName === 'Firefox') {
        return DESKTOP.FIREFOX;
      } else if (['Chrome', 'Chromium'].includes(browserName || '')) {
        return DESKTOP.CHROME;
      }

      return DEFAULT;
    }

    const isIOS = browserInfo.platform.vendor === 'Apple';
    if (isIOS) return MOBILE.IOS;
    return MOBILE.ANDROID;
  }

  _getPlatformType() {
    const browserInfo = Bowser.parse(window.navigator.userAgent);
    const isPlatformDesktop = browserInfo.platform.type === 'desktop';

    if (isPlatformDesktop) return PLATFORM.DESKTOP;
    else return PLATFORM.MOBILE;
  }
}
