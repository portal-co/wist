export type Mode = 'encrypt' | 'decrypt';
export declare class WebSocket extends EventTarget {
    #private;
    constructor(url: string | URL, opts?: {
        queueLength?: number;
        proc?(a: Uint8Array<ArrayBuffer>, mode: Mode): Uint8Array<ArrayBuffer>;
    });
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
