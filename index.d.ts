export declare class WebSocket extends EventTarget {
    _url: URL;
    _messages: ArrayBuffer[];
    constructor(url: string | URL);
    _start(): Promise<void>;
    postMessage(message: string | ArrayBuffer): void;
    close(...args: any[]): void;
}
