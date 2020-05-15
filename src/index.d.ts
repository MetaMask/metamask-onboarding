export declare class MetaMaskWindow extends Window {
    ethereum: any;
    constructor();
}
interface OnboardingConstructorForwarderInterface {
    forwarderOrigin: string;
    forwarderMode: string;
}
export declare class Onboarding implements OnboardingConstructorForwarderInterface {
    readonly forwarderOrigin: string;
    downloadUrl: string;
    forwarderMode: string;
    state: string;
    constructor(options?: OnboardingConstructorForwarderInterface);
    _onMessage(event: MessageEvent): Promise<void> | undefined;
    _onMessageFromForwarder(event: any): Promise<void>;
    /**
     * Starts onboarding by opening the MetaMask download page and the Onboarding forwarder
     */
    startOnboarding(): void;
    stopOnboarding(): void;
    _openForwarder(): void;
    _openDownloadPage(): void;
    static isMetaMaskInstalled(): boolean;
    static _register(): any;
    static _injectForwarder(forwarderOrigin: string): void;
    static _removeForwarder(): void;
    static _detectBrowser(): "FIREFOX" | "CHROME" | null;
}
export default Onboarding;
