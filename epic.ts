import {
  _Reflect,
  _slice,
  _Uint8Array,
  _WeakMap,
  appendBuffers,
  decode,
  encode,
  weakMapOps,
} from "./snap";

export function hook(
  { keystream }: { keystream(a: Uint8Array): Generator<number, void, void> },
  {
    WebSocket: ws = WebSocket,
    EventTarget: et = EventTarget,
  }: { WebSocket?: typeof WebSocket; EventTarget?: typeof EventTarget } = {}
): { WebSocket: typeof WebSocket } {
  let m = new _WeakMap();
  ws.prototype.send = new Proxy(ws.prototype.send, {
    apply(target, thisArg, [val]) {
      const isStr = typeof val === "string";
      const keystream = weakMapOps.get(m, thisArg);
      if (isStr) val = encode(val);
      val = appendBuffers(new _Uint8Array(isStr ? 1 : 0).buffer, val);
      for (
        let i = 0, j = keystream.next();
        i < val.byteLength && !j.done;
        i++
      ) {
        val[i] ^= j.value;
      }
      return _Reflect.apply(target, thisArg, [val]);
    },
  });
  et.prototype.addEventListener = new Proxy(et.prototype.addEventListener, {
    apply(target, thisArg, argArray) {
      if (
        1 in argArray &&
        weakMapOps.get(m, thisArg) &&
        argArray[0] === "message"
      ) {
        const old = argArray[1];
        const x = (ev: MessageEvent) => {
          const keystream = weakMapOps.get(m, thisArg);
          if ("bytelength" in ev.data)
            for (
              let i = 0, j = keystream.next();
              i < ev.data.byteLength && !j.done;
              i++
            ) {
              ev.data[i] ^= j.value;
            }
          if (ev.data[0]) {
            Object.defineProperty(ev, "data", {
              value: decode(_slice(ev.data, 1, ev.data.byteLength)),
              enumerable: false,
              writable: false,
            });
          } else {
            Object.defineProperty(ev, "data", {
              value: _slice(ev.data, 1, ev.data.byteLength),
              enumerable: false,
              writable: false,
            });
          }
          old(ev);
        };
        weakMapOps.set(m, old, x);
        argArray[1] = x;
      }
      return _Reflect.apply(target, thisArg, argArray);
    },
  });
  et.prototype.removeEventListener = new Proxy(
    et.prototype.removeEventListener,
    {
      apply(target, thisArg, argArray) {
        let x;
        if (1 in argArray)
          while ((x = weakMapOps.get(m, argArray[1]))) argArray[1] = x;
        return _Reflect.apply(target, thisArg, argArray);
      },
    }
  );
  ws = new Proxy(ws, {
    construct(target, argArray, newTarget) {
      const x = _Reflect.construct(target, argArray, newTarget);
      weakMapOps.set(m, x, keystream(encode(argArray[0])));
      return x;
    },
  });
  ws.prototype.constructor = ws;
  return { WebSocket: ws };
}
