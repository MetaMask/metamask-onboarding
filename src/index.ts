import * as Bowser from 'bowser';

export class MetaMaskWindow extends Window {
  ethereum: any;

  constructor () {
    super();
    if (window.ethereum) {
      this.ethereum = window.ethereum;
    }
  }
}

const metaMaskWindow = new MetaMaskWindow();

const ONBOARDING_STATE = {
  INSTALLED: 'INSTALLED',
  NOT_INSTALLED: 'NOT_INSTALLED',
  REGISTERED: 'REGISTERED',
  REGISTERING: 'REGISTERING',
  RELOADING: 'RELOADING',
};

const EXTENSION_DOWNLOAD_URL = {
  CHROME: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
  FIREFOX: 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/',
  DEFAULT: 'https://metamask.io',
};

interface ForwardingModeInterface {
  INJECT: string;
  OPEN_TAB: string;
}
const FORWARDER_MODE: ForwardingModeInterface = {
  INJECT: 'INJECT',
  OPEN_TAB: 'OPEN_TAB',
};


interface OnboardingConstructorForwarderInterface {
  forwarderOrigin: string;
  forwarderMode: string;
}
// sessionStorage key
const REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS';

// forwarder iframe id
const FORWARDER_ID = 'FORWARDER_ID';


export class Onboarding implements OnboardingConstructorForwarderInterface {
  public readonly forwarderOrigin: string;

  public downloadUrl: string;

  public forwarderMode: string;

  public state: string;


  constructor (options?: OnboardingConstructorForwarderInterface) {
    this.forwarderOrigin = options ? options.forwarderOrigin : 'https://fwd.metamask.io';
    this.forwarderMode = options ? options.forwarderMode : FORWARDER_MODE.INJECT;
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

    if (this.forwarderMode === FORWARDER_MODE.INJECT && sessionStorage.getItem(REGISTRATION_IN_PROGRESS)) {
      Onboarding._injectForwarder(this.forwarderOrigin);
    }
  }

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

  async _onMessageFromForwarder (event: MessageEvent) {
    switch (this.state) {
      case ONBOARDING_STATE.RELOADING:
        console.debug('Ignoring message while reloading');
        break;
      case ONBOARDING_STATE.NOT_INSTALLED:
        console.debug('Reloading now to register with MetaMask');
        this.state = ONBOARDING_STATE.RELOADING;
        return location.reload();

      case ONBOARDING_STATE.INSTALLED:
        console.debug('Registering with MetaMask');
        this.state = ONBOARDING_STATE.REGISTERING;
        await Onboarding._register();
        this.state = ONBOARDING_STATE.REGISTERED;
        if (event.source instanceof Window) {
          event.source.postMessage({ type: 'metamask:registrationCompleted' }, event.origin);
        }
        this.stopOnboarding();
        break;
      case ONBOARDING_STATE.REGISTERING:
        console.debug('Already registering - ignoring reload message');
        break;
      case ONBOARDING_STATE.REGISTERED:
        console.debug('Already registered - ignoring reload message');
        break;
      default:
        throw new Error(`Unknown state: '${this.state}'`);
    }
    return undefined;
  }

  /**
   * Starts onboarding by opening the MetaMask download page and the Onboarding forwarder
   */
  startOnboarding () {
    sessionStorage.setItem(REGISTRATION_IN_PROGRESS, 'true');
    this._openDownloadPage();
    this._openForwarder();
  }

  stopOnboarding () {
    if (sessionStorage.getItem(REGISTRATION_IN_PROGRESS)) {
      if (this.forwarderMode === FORWARDER_MODE.INJECT) {
        console.debug('Removing forwarder');
        Onboarding._removeForwarder();
      }
      sessionStorage.setItem(REGISTRATION_IN_PROGRESS, 'false');
    }
  }

  _openForwarder () {
    if (this.forwarderMode === FORWARDER_MODE.OPEN_TAB) {
      window.open(this.forwarderOrigin, '_blank');
    } else {
      Onboarding._injectForwarder(this.forwarderOrigin);
    }
  }

  _openDownloadPage () {
    window.open(this.downloadUrl, '_blank');
  }

  static isMetaMaskInstalled () {
    return Boolean(metaMaskWindow.ethereum && metaMaskWindow.ethereum.isMetaMask);
  }

  static _register () {
    return metaMaskWindow.ethereum.request({
      method: 'wallet_registerOnboarding',
    });
  }

  static _injectForwarder (forwarderOrigin: string) {
    const container = document.body;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('height', '0');
    iframe.setAttribute('width', '0');
    iframe.setAttribute('src', forwarderOrigin);
    iframe.setAttribute('id', FORWARDER_ID);
    container.insertBefore(iframe, container.children[0]);
  }

  static _removeForwarder () {
    const forwarderId = document.getElementById(FORWARDER_ID);
    if (forwarderId) {
      forwarderId.remove();
    }
  }

  static _detectBrowser () {
    const browserInfo = Bowser.parse(window.navigator.userAgent);
    if (browserInfo.browser.name === 'Firefox') {
      return 'FIREFOX';
    } else if (browserInfo.browser.name !== undefined && ['Chrome', 'Chromium'].includes(browserInfo.browser.name)) {
      return 'CHROME';
    }
    return null;
  }
}


export default Onboarding;
