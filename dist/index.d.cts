declare const _Uint8Array: typeof Uint8Array;
declare const _ArrayBuffer: typeof ArrayBuffer;
declare const byteLength: (a: ArrayBuffer) => any;
declare const set: any;
declare function appendBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer;
declare const _URL: typeof URL;
declare const _Promise: typeof Promise;
declare const _DataView: typeof DataView;
declare const _slice: (a: ArrayBuffer, b: number, c: number) => any;
declare const _requestAnimationFrame: typeof requestAnimationFrame;
declare const intOps: {
    getUint8: any;
    getUint32: any;
    setUint8: any;
    setUint32: any;
};
export type Opts = {
    _URL?: typeof _URL;
    _fetch?: typeof fetch;
    intOps?: typeof intOps;
    _Promise?: typeof _Promise;
    _ArrayBuffer?: typeof _ArrayBuffer;
    _Uint8Array?: typeof _Uint8Array;
    _DataView?: typeof _DataView;
    _slice?: typeof _slice;
    byteLength?: typeof byteLength;
    _requestAnimationFrame?: typeof _requestAnimationFrame;
    set?: typeof set;
    appendBuffers?: typeof appendBuffers;
};
export type Mode = "encrypt" | "decrypt";
export declare class WebSocket extends EventTarget {
    #private;
    constructor(url: string | URL, opts?: {
        queueLength?: number;
        proc?(a: Uint8Array<ArrayBuffer>, mode: Mode): Uint8Array<ArrayBuffer>;
    } & Opts);
    postMessage(message: string | ArrayBuffer): void;
    close(...args: any[]): void;
}
export declare class Server {
    #private;
    constructor(expiry: number, opts?: {
        proc?(a: Uint8Array<ArrayBuffer>, mode: Mode): Uint8Array<ArrayBuffer>;
        init?(a: ServerUser): any;
    });
    handle(r: Request): Promise<Response>;
}
export declare class ServerUser extends EventTarget {
    #private;
    constructor(expiry_: number);
    expired(): boolean;
    takeMessages(): ArrayBuffer[] | undefined;
    postMessage(message: string | ArrayBuffer): void;
    onBuffer(a: ArrayBuffer): void;
}
export {};
