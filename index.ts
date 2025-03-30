function appendBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
};
export class WebSocket extends EventTarget {
    _url: URL;
    _messages: ArrayBuffer[];
    constructor(url: string | URL) {
        super();
        var u: URL = typeof url === "string" ? new URL(url) : url;
        if (u.protocol == "ws:") {
            u.protocol = "http:"
        }
        if (u.protocol == "wss:") {
            u.protocol = "https:"
        }
        u.pathname += ".wist";
        this._url = u;
        this._messages = [];
        this._start();
    }
    async _start() {
        let iid = await fetch(this._url).then(a => a.text());
        while (1) {
            var m = this._messages;
            if(!m.length){
                await new Promise(requestAnimationFrame);
                continue;
            }
            this._messages = [];
            var m2 = m.reduce(appendBuffers,new ArrayBuffer(0));
            var a = await fetch(this._url,{
                method: "POST",
                body: m2,
                headers: {
                    "X-Instance-Id": iid,
                }
            }).then(a => a.arrayBuffer());
            var d = new DataView(a);
            var i = 0;
            while(i != a.byteLength){
                var ty = d.getUint8(i);
                var len = d.getUint32(i + 1);
                var b = a.slice(i + 5,i + 5 + len);
                i += len + 5;
                if(ty & 1){
                    this.dispatchEvent(new MessageEvent("message",{data: new TextDecoder().decode(b)}))
                }else{
                    this.dispatchEvent(new MessageEvent("message",{data: b}))
                }
            }
        }
    }
    postMessage(message: string | ArrayBuffer) {
        var b = typeof message == "string" ? new TextEncoder().encode(message) : new Uint8Array(message);
        var c = new ArrayBuffer(b.byteLength + 5);
        new Uint8Array(c, 5).set(b, 0);
        var d = new DataView(c);
        d.setUint8(0, typeof message == "string" ? 1 : 0);
        d.setUint32(1, b.byteLength);
        this._messages.push(c);
    }
}