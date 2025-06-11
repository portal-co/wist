export declare class WebSocket extends EventTarget {
    #private;
    constructor(url: string | URL);
    postMessage(message: string | ArrayBuffer): void;
    close(...args: any[]): void;
}
