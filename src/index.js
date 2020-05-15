"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Onboarding = exports.MetaMaskWindow = void 0;
const Bowser = require("bowser");
class MetaMaskWindow extends Window {
    constructor() {
        super();
        //@ts-ignore
        if (window.ethereum) {
            //@ts-ignore
            this.ethereum = window.ethereum;
        }
    }
}
exports.MetaMaskWindow = MetaMaskWindow;
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
const FORWARDER_MODE = {
    INJECT: 'INJECT',
    OPEN_TAB: 'OPEN_TAB',
};
// sessionStorage key
const REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS';
// forwarder iframe id
const FORWARDER_ID = 'FORWARDER_ID';
class Onboarding {
    constructor(options) {
        this.forwarderOrigin = options ? options.forwarderOrigin : 'https://fwd.metamask.io';
        this.forwarderMode = options ? options.forwarderMode : FORWARDER_MODE.INJECT;
        this.state = Onboarding.isMetaMaskInstalled() ?
            ONBOARDING_STATE.INSTALLED :
            ONBOARDING_STATE.NOT_INSTALLED;
        const browser = Onboarding._detectBrowser();
        if (browser) {
            this.downloadUrl = EXTENSION_DOWNLOAD_URL[browser];
        }
        else {
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
    _onMessage(event) {
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
    //TODO: Ask about what type is the 'event' parameter
    _onMessageFromForwarder(event) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    yield Onboarding._register();
                    this.state = ONBOARDING_STATE.REGISTERED;
                    event.source.postMessage({ type: 'metamask:registrationCompleted' }, event.origin);
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
        });
    }
    /**
     * Starts onboarding by opening the MetaMask download page and the Onboarding forwarder
     */
    startOnboarding() {
        sessionStorage.setItem(REGISTRATION_IN_PROGRESS, "true");
        this._openDownloadPage();
        this._openForwarder();
    }
    stopOnboarding() {
        if (sessionStorage.getItem(REGISTRATION_IN_PROGRESS)) {
            if (this.forwarderMode === FORWARDER_MODE.INJECT) {
                console.debug('Removing forwarder');
                Onboarding._removeForwarder();
            }
            sessionStorage.setItem(REGISTRATION_IN_PROGRESS, "false");
        }
    }
    _openForwarder() {
        if (this.forwarderMode === FORWARDER_MODE.OPEN_TAB) {
            window.open(this.forwarderOrigin, '_blank');
        }
        else {
            Onboarding._injectForwarder(this.forwarderOrigin);
        }
    }
    _openDownloadPage() {
        window.open(this.downloadUrl, '_blank');
    }
    static isMetaMaskInstalled() {
        return Boolean(metaMaskWindow.ethereum && metaMaskWindow.ethereum.isMetaMask);
    }
    static _register() {
        return metaMaskWindow.ethereum.request({
            method: 'wallet_registerOnboarding',
        });
    }
    static _injectForwarder(forwarderOrigin) {
        const container = document.body;
        const iframe = document.createElement('iframe');
        iframe.setAttribute('height', "0");
        iframe.setAttribute('width', "0");
        iframe.setAttribute('src', forwarderOrigin);
        iframe.setAttribute('id', FORWARDER_ID);
        container.insertBefore(iframe, container.children[0]);
    }
    static _removeForwarder() {
        const forwarderId = document.getElementById(FORWARDER_ID);
        if (forwarderId) {
            forwarderId.remove();
        }
    }
    static _detectBrowser() {
        const browserInfo = Bowser.parse(window.navigator.userAgent);
        if (browserInfo.browser.name === 'Firefox') {
            return 'FIREFOX';
        }
        else if (browserInfo.browser.name != undefined && ['Chrome', 'Chromium'].includes(browserInfo.browser.name)) {
            return 'CHROME';
        }
        return null;
    }
}
exports.Onboarding = Onboarding;
exports.default = Onboarding;
