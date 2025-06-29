let _Uint8Array: typeof Uint8Array = globalThis.Uint8Array;
let _ArrayBuffer: typeof ArrayBuffer = globalThis.ArrayBuffer;
let _byteLength = Object.getOwnPropertyDescriptor(_ArrayBuffer.prototype, 'byteLength')!.get!;
let _Reflect: typeof Reflect = { ...Reflect };
let byteLength = (a: ArrayBuffer) => Reflect.apply(_byteLength, a, []);
let set = Uint8Array.prototype.set.call.bind(Uint8Array.prototype.set);
function appendBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
    var tmp = new _Uint8Array(byteLength(buffer1) + byteLength(buffer2));
    set(tmp, new _Uint8Array(buffer1), 0);
    set(tmp, new _Uint8Array(buffer2), byteLength(buffer1));
    return tmp.buffer;
};
let _URL: typeof URL = globalThis.URL;
let _fetch: typeof fetch = globalThis.fetch;
let _Promise: typeof Promise = globalThis.Promise;
let _DataView: typeof DataView = globalThis.DataView;
let _sliceProp = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'slice')!.get!;
let _slice = (a: ArrayBuffer, b: number, c: number) => Reflect.apply(_sliceProp, a, [b, c]);
let _requestAnimationFrame: typeof requestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
let _decoder = new TextDecoder();
let decode = _decoder.decode.bind(_decoder);
// let _dataView: typeof DataView = globalThis.DataView;

let intOps = {
    'getUint8': DataView.prototype.getUint8.call.bind(DataView.prototype.getUint8),
    'getUint32': DataView.prototype.getUint32.call.bind(DataView.prototype.getUint32),
    'setUint8': DataView.prototype.setUint8.call.bind(DataView.prototype.setUint8),
    'setUint32': DataView.prototype.setUint32.call.bind(DataView.prototype.setUint32),
};
export type Mode = 'encrypt' | 'decrypt'
export class WebSocket extends EventTarget {
    #url: URL;
    #messages: ArrayBuffer[];
    #queueLength: number;
    #proc: (a: Uint8Array<ArrayBuffer>, mode: Mode) => Uint8Array<ArrayBuffer>;
    constructor(url: string | URL, opts: { queueLength?: number, proc?(a: Uint8Array<ArrayBuffer>, mode: Mode): Uint8Array<ArrayBuffer> } = {}) {
        super();
        this.#proc = opts.proc ?? ((a, m) => a);
        var u: URL = typeof url === "string" ? new _URL(url) : url;
        if (u.protocol == "ws:") {
            u.protocol = "http:"
        }
        if (u.protocol == "wss:") {
            u.protocol = "https:"
        }
        u.pathname += ".wist";
        this.#url = u;
        this.#queueLength = opts.queueLength ?? 0;
        this.#messages = [];
        this.#start();
    }
    async #start() {
        let iid = await _fetch(this.#url).then(a => a.text());
        while (1) {
            var m = this.#messages;
            if (m.length < this.#queueLength) {
                await new _Promise(_requestAnimationFrame);
                continue;
            }
            this.#messages = [];
            var m2 = m.reduce(appendBuffers, new _ArrayBuffer(0));
            var a = await _fetch(this.#url, {
                method: "POST",
                body: this.#proc(new _Uint8Array(m2), 'encrypt'),
                headers: {
                    "X-Instance-Id": iid,
                }
            }).then(a => a.arrayBuffer());
            a = this.#proc(new _Uint8Array(a), 'decrypt').buffer;
            var len2 = byteLength(a);
            var d = new _DataView(a);
            var i = 0;
            while (i != len2) {
                var ty = intOps.getUint8(d, i);
                if (ty == 0xff) {
                    return;
                }
                var len = intOps.getUint32(d, i + 1);
                var b = _slice(a, i + 5, i + 5 + len);
                i += len + 5;
                if (ty & 1) {
                    this.dispatchEvent(new MessageEvent("message", { data: decode(b) }))
                } else {
                    this.dispatchEvent(new MessageEvent("message", { data: b }))
                }
            }
        }
    }
    postMessage(message: string | ArrayBuffer) {
        var b = typeof message == "string" ? new TextEncoder().encode(message) : new Uint8Array(message);
        var c = new _ArrayBuffer(b.byteLength + 5);
        set(new Uint8Array(c, 5), b, 0);
        var d = new _DataView(c);
        intOps.setUint8(d, 0, typeof message == "string" ? 1 : 0);
        intOps.setUint32(d, 1, b.byteLength);
        this.#messages[this.#messages.length] = c;
    }
    close(...args: any[]) {
        this.#messages[this.#messages.length] = new Uint8Array([0xff]).buffer;
    }
}
const expiry: WeakMap<ServerUser, number> = new WeakMap();
export class Server {
    #ids: (ServerUser | undefined)[]
    #expiry: number;
    #proc: (a: Uint8Array<ArrayBuffer>, mode: Mode) => Uint8Array<ArrayBuffer>;
    #init: (a: ServerUser) => void;
    constructor(expiry: number, opts: { proc?(a: Uint8Array<ArrayBuffer>, mode: Mode): Uint8Array<ArrayBuffer>, init?(a: ServerUser) } = {}) {
        this.#ids = [];
        this.#expiry = expiry;
        this.#proc = opts.proc ?? ((a, m) => a);
        this.#init = opts.init ?? (a => { });
    }
    async handle(r: Request): Promise<Response> {
        if (r.method === "GET") {
            let id = 0;
            while (!(this.#ids?.[id]?.expired() ?? true)) {
                id++;
            }
            let s = `${id}}`;
            this.#init(this.#ids[id] = new ServerUser(Date.now() + this.#expiry));
            return new Response(s)
        }
        // if(r.method === "post"){
        let h = r.headers.get("X-Instance-Id");
        if (h === null) {
            return new Response(this.#proc(new Uint8Array([0xff]), 'encrypt'))
        }
        let user = (this.#ids[h] ??= new ServerUser(Date.now() + this.#expiry));
        let s = user.takeMessages();
        if (s === undefined) {
            return new Response(this.#proc(new Uint8Array([0xff]), 'encrypt'))
        }
        user.onBuffer(this.#proc(new Uint8Array(await r.arrayBuffer()), 'decrypt').buffer);
        expiry.set(user, Date.now() + this.#expiry);
        // this.#ids[s] = [];
        return new Response(this.#proc(new Uint8Array(s.reduce(appendBuffers, new ArrayBuffer(0))), 'encrypt'))
        // }
    }
}
export class ServerUser extends EventTarget {
    #messages: ArrayBuffer[] | undefined;
    // #expiry: number;
    // #queue: ArrayBuffer[];
    constructor(expiry_: number) {
        super();
        // this.#messages;
        // this.#expiry = expiry;
        expiry.set(this, expiry_);
        // this.#queue = [];
    }
    expired(): boolean {
        return expiry.get(this)! >= Date.now();
    }
    takeMessages(): ArrayBuffer[] | undefined {
        let m = this.#messages;
        this.#messages = undefined;
        return m;
    }
    postMessage(message: string | ArrayBuffer) {
        this.#messages ??= [];
        var b = typeof message == "string" ? new TextEncoder().encode(message) : new Uint8Array(message);
        var c = new _ArrayBuffer(b.byteLength + 5);
        set(new Uint8Array(c, 5), b, 0);
        var d = new _DataView(c);
        intOps.setUint8(d, 0, typeof message == "string" ? 1 : 0);
        intOps.setUint32(d, 1, b.byteLength);
        this.#messages[this.#messages.length] = c;
    }
    onBuffer(a: ArrayBuffer) {
        var len2 = byteLength(a);
        var d = new _DataView(a);
        var i = 0;
        while (i != len2) {
            var ty = intOps.getUint8(d, i);
            if (ty == 0xff) {
                return;
            }
            var len = intOps.getUint32(d, i + 1);
            var b = _slice(a, i + 5, i + 5 + len);
            i += len + 5;
            if (ty & 1) {
                this.dispatchEvent(new MessageEvent("message", { data: decode(b) }))
            } else {
                this.dispatchEvent(new MessageEvent("message", { data: b }))
            }
        }
    }
}