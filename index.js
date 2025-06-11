let _Uint8Array = globalThis.Uint8Array;
let _ArrayBuffer = globalThis.ArrayBuffer;
let _byteLength = Object.getOwnPropertyDescriptor(_ArrayBuffer.prototype, 'byteLength').get;
let _Reflect = { ...Reflect };
let byteLength = (a) => Reflect.apply(_byteLength, a, []);
let set = Uint8Array.prototype.set.call.bind(Uint8Array.prototype.set);
function appendBuffers(buffer1, buffer2) {
    var tmp = new _Uint8Array(byteLength(buffer1) + byteLength(buffer2));
    set(tmp, new _Uint8Array(buffer1), 0);
    set(tmp, new _Uint8Array(buffer2), byteLength(buffer1));
    return tmp.buffer;
}
;
let _URL = globalThis.URL;
let _fetch = globalThis.fetch;
let _Promise = globalThis.Promise;
let _DataView = globalThis.DataView;
let _sliceProp = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'slice').get;
let _slice = (a, b, c) => Reflect.apply(_sliceProp, a, [b, c]);
let _requestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
let _decoder = new TextDecoder();
let decode = _decoder.decode.bind(_decoder);
// let _dataView: typeof DataView = globalThis.DataView;
let intOps = {
    'getUint8': DataView.prototype.getUint8.call.bind(DataView.prototype.getUint8),
    'getUint32': DataView.prototype.getUint32.call.bind(DataView.prototype.getUint32),
    'setUint8': DataView.prototype.setUint8.call.bind(DataView.prototype.setUint8),
    'setUint32': DataView.prototype.setUint32.call.bind(DataView.prototype.setUint32),
};
export class WebSocket extends EventTarget {
    #url;
    #messages;
    constructor(url) {
        super();
        var u = typeof url === "string" ? new _URL(url) : url;
        if (u.protocol == "ws:") {
            u.protocol = "http:";
        }
        if (u.protocol == "wss:") {
            u.protocol = "https:";
        }
        u.pathname += ".wist";
        this.#url = u;
        this.#messages = [];
        this.#start();
    }
    async #start() {
        let iid = await _fetch(this.#url).then(a => a.text());
        while (1) {
            var m = this.#messages;
            if (!m.length) {
                await new _Promise(_requestAnimationFrame);
                continue;
            }
            this.#messages = [];
            var m2 = m.reduce(appendBuffers, new _ArrayBuffer(0));
            var a = await _fetch(this.#url, {
                method: "POST",
                body: m2,
                headers: {
                    "X-Instance-Id": iid,
                }
            }).then(a => a.arrayBuffer());
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
    postMessage(message) {
        var b = typeof message == "string" ? new TextEncoder().encode(message) : new Uint8Array(message);
        var c = new _ArrayBuffer(b.byteLength + 5);
        set(new Uint8Array(c, 5), b, 0);
        var d = new _DataView(c);
        intOps.setUint8(d, 0, typeof message == "string" ? 1 : 0);
        intOps.setUint32(d, 1, b.byteLength);
        this.#messages[this.#messages.length] = c;
    }
    close(...args) {
        this.#messages[this.#messages.length] = new Uint8Array([0xff]).buffer;
    }
}
