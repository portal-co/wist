"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerUser = exports.Server = exports.WebSocket = void 0;
const _Uint8Array = globalThis.Uint8Array;
const _ArrayBuffer = globalThis.ArrayBuffer;
const _byteLength = Object.getOwnPropertyDescriptor(_ArrayBuffer.prototype, "byteLength").get;
const _Reflect = { ...Reflect };
const byteLength = (a) => Reflect.apply(_byteLength, a, []);
const set = Uint8Array.prototype.set.call.bind(Uint8Array.prototype.set);
function appendBuffers(buffer1, buffer2) {
    const tmp = new _Uint8Array(byteLength(buffer1) + byteLength(buffer2));
    set(tmp, new _Uint8Array(buffer1), 0);
    set(tmp, new _Uint8Array(buffer2), byteLength(buffer1));
    return tmp.buffer;
}
const _URL = globalThis.URL;
const _fetch = globalThis.fetch;
const _Promise = globalThis.Promise;
const _DataView = globalThis.DataView;
const _sliceProp = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "slice").get;
const _slice = (a, b, c) => Reflect.apply(_sliceProp, a, [b, c]);
const _requestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
const _decoder = new TextDecoder();
const decode = _decoder.decode.bind(_decoder);
// let _dataView: typeof DataView = globalThis.DataView;
const intOps = {
    getUint8: DataView.prototype.getUint8.call.bind(DataView.prototype.getUint8),
    getUint32: DataView.prototype.getUint32.call.bind(DataView.prototype.getUint32),
    setUint8: DataView.prototype.setUint8.call.bind(DataView.prototype.setUint8),
    setUint32: DataView.prototype.setUint32.call.bind(DataView.prototype.setUint32),
};
if ("freeze" in Object)
    Object.freeze(intOps);
class WebSocket extends EventTarget {
    #url;
    #messages;
    #queueLength;
    #proc;
    #opts;
    #useHeader = false;
    constructor(url, opts = {}) {
        super();
        this.#proc = opts.proc ?? ((a, m) => a);
        this.#opts = { ...opts };
        var u = typeof url === "string" ? new (opts._URL ?? _URL)(url) : url;
        if (u.protocol == "ws:") {
            u.protocol = "http:";
        }
        if (u.protocol == "wss:") {
            u.protocol = "https:";
        }
        u.pathname += ".wist";
        this.#url = u;
        this.#queueLength = opts.queueLength ?? 0;
        this.#messages = [];
        this.#useHeader = opts.useHeader ?? true;
        this.#start();
    }
    async #start() {
        const { _fetch: fetch = _fetch, intOps: _intOps = intOps, _Promise: Promise = _Promise, _ArrayBuffer: ArrayBuffer = _ArrayBuffer, _Uint8Array: Uint8Array = _Uint8Array, _DataView: DataView = _DataView, _slice: slice = _slice, byteLength: _byteLength = byteLength, _requestAnimationFrame: requestAnimationFrame = _requestAnimationFrame, _URL: URL = _URL, } = this.#opts;
        const instance_id = await fetch(this.#url).then((resp) => resp.text());
        const ephemeralURL = new URL(this.#url);
        if (!this.#useHeader) {
            ephemeralURL.searchParams.set("q", instance_id);
        }
        while (1) {
            const mesages = this.#messages;
            if (mesages.length < this.#queueLength) {
                await new Promise(requestAnimationFrame);
                continue;
            }
            this.#messages = [];
            const m2 = mesages.reduce(appendBuffers, new ArrayBuffer(0));
            let response = await _fetch(ephemeralURL, {
                method: "POST",
                body: this.#proc(new Uint8Array(m2), "encrypt"),
                headers: this.#useHeader ? { "X-Instance-Id": instance_id } : {},
            }).then((responseObject) => responseObject.arrayBuffer());
            response = this.#proc(new Uint8Array(response), "decrypt").buffer;
            const responseLength = _byteLength(response);
            const data = new DataView(response);
            let i = 0;
            while (i != responseLength) {
                const packetType = _intOps.getUint8(data, i);
                if (packetType == 0xff) {
                    return;
                }
                const packetLength = _intOps.getUint32(data, i + 1);
                const byteData = slice(response, i + 5, i + 5 + packetLength);
                i += packetLength + 5;
                if (packetType & 1) {
                    this.dispatchEvent(new MessageEvent("message", { data: decode(byteData) }));
                }
                else {
                    this.dispatchEvent(new MessageEvent("message", { data: byteData }));
                }
            }
        }
    }
    postMessage(message) {
        const { _fetch: fetch = _fetch, intOps: _intOps = intOps, _Promise: Promise = _Promise, _ArrayBuffer: ArrayBuffer = _ArrayBuffer, _Uint8Array: Uint8Array = _Uint8Array, _DataView: DataView = _DataView, _slice: slice = _slice, byteLength: _byteLength = byteLength, _requestAnimationFrame: requestAnimationFrame = _requestAnimationFrame, set: _set = set, } = this.#opts;
        const byteData = typeof message == "string"
            ? new TextEncoder().encode(message)
            : new Uint8Array(message);
        const packet = new ArrayBuffer(byteData.byteLength + 5);
        _set(new Uint8Array(packet, 5), byteData, 0);
        const packetData = new DataView(packet);
        _intOps.setUint8(packetData, 0, typeof message == "string" ? 1 : 0);
        _intOps.setUint32(packetData, 1, byteData.byteLength);
        this.#messages[this.#messages.length] = packet;
    }
    close(...args) {
        const { _fetch: fetch = _fetch, intOps: _intOps = intOps, _Promise: Promise = _Promise, _ArrayBuffer: ArrayBuffer = _ArrayBuffer, _Uint8Array: Uint8Array = _Uint8Array, _DataView: DataView = _DataView, _slice: slice = _slice, byteLength: _byteLength = byteLength, _requestAnimationFrame: requestAnimationFrame = _requestAnimationFrame, } = this.#opts;
        this.#messages[this.#messages.length] = new Uint8Array([0xff]).buffer;
    }
}
exports.WebSocket = WebSocket;
const expiry = new WeakMap();
class Server {
    #ids;
    #expiry;
    #proc;
    #init;
    #useHeader = false;
    constructor(expiry, opts = {}) {
        this.#ids = [];
        this.#expiry = expiry;
        this.#proc = opts.proc ?? ((a, m) => a);
        this.#init = opts.init ?? ((a) => { });
        this.#useHeader = opts.useHeader ?? false;
    }
    async handle(r) {
        if (r.method === "GET") {
            let id = 0;
            while (!(this.#ids?.[id]?.expired() ?? true)) {
                id++;
            }
            let s = `${id}}`;
            this.#init((this.#ids[id] = new ServerUser(Date.now() + this.#expiry)));
            return new Response(s);
        }
        // if(r.method === "post"){
        let h = this.#useHeader
            ? r.headers.get("X-Instance-Id")
            : new URL(r.url).searchParams.get("q");
        if (h === null) {
            return new Response(this.#proc(new Uint8Array([0xff]), "encrypt"));
        }
        let user = (this.#ids[h] ??= new ServerUser(Date.now() + this.#expiry));
        let s = user.takeMessages();
        if (s === undefined) {
            return new Response(this.#proc(new Uint8Array([0xff]), "encrypt"));
        }
        user.onBuffer(this.#proc(new Uint8Array(await r.arrayBuffer()), "decrypt").buffer);
        expiry.set(user, Date.now() + this.#expiry);
        // this.#ids[s] = [];
        return new Response(this.#proc(new Uint8Array(s.reduce(appendBuffers, new ArrayBuffer(0))), "encrypt"));
        // }
    }
}
exports.Server = Server;
class ServerUser extends EventTarget {
    #messages;
    // #expiry: number;
    // #queue: ArrayBuffer[];
    constructor(expiry_) {
        super();
        // this.#messages;
        // this.#expiry = expiry;
        expiry.set(this, expiry_);
        // this.#queue = [];
    }
    expired() {
        return expiry.get(this) >= Date.now();
    }
    takeMessages() {
        let m = this.#messages;
        this.#messages = undefined;
        return m;
    }
    postMessage(message) {
        this.#messages ??= [];
        var b = typeof message == "string"
            ? new TextEncoder().encode(message)
            : new Uint8Array(message);
        var c = new _ArrayBuffer(b.byteLength + 5);
        set(new Uint8Array(c, 5), b, 0);
        var d = new _DataView(c);
        intOps.setUint8(d, 0, typeof message == "string" ? 1 : 0);
        intOps.setUint32(d, 1, b.byteLength);
        this.#messages[this.#messages.length] = c;
    }
    onBuffer(a) {
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
                this.dispatchEvent(new MessageEvent("message", { data: decode(b) }));
            }
            else {
                this.dispatchEvent(new MessageEvent("message", { data: b }));
            }
        }
    }
}
exports.ServerUser = ServerUser;
