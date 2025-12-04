export const _Uint8Array: typeof Uint8Array = globalThis.Uint8Array;
export const _ArrayBuffer: typeof ArrayBuffer = globalThis.ArrayBuffer;
export const _byteLength = Object.getOwnPropertyDescriptor(
  _ArrayBuffer.prototype,
  "byteLength"
)!.get!;
export const _Reflect: typeof Reflect = { ...Reflect };
export const byteLength = (a: ArrayBuffer) => Reflect.apply(_byteLength, a, []);
export const set = Uint8Array.prototype.set.call.bind(Uint8Array.prototype.set);
export function appendBuffers(
  buffer1: ArrayBuffer,
  buffer2: ArrayBuffer
): ArrayBuffer {
  const tmp = new _Uint8Array(byteLength(buffer1) + byteLength(buffer2));
  set(tmp, new _Uint8Array(buffer1), 0);
  set(tmp, new _Uint8Array(buffer2), byteLength(buffer1));
  return tmp.buffer;
}
export const _URL: typeof URL = globalThis.URL;
export const _fetch: typeof fetch = globalThis.fetch;
export const _Promise: typeof Promise = globalThis.Promise;
export const _DataView: typeof DataView = globalThis.DataView;
export const _WeakMap: typeof WeakMap = globalThis.WeakMap;
export const weakMapOps = {
  get: _WeakMap.prototype.get.call.bind(_WeakMap.prototype.get),
  set: _WeakMap.prototype.set.call.bind(_WeakMap.prototype.set),
};
export const _sliceProp = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  "slice"
)!.get!;
export const _slice = (a: ArrayBuffer, b: number, c: number) =>
  Reflect.apply(_sliceProp, a, [b, c]);
export const _requestAnimationFrame: typeof requestAnimationFrame =
  globalThis.requestAnimationFrame.bind(globalThis);
export const _decoder = new TextDecoder();
export const decode = _decoder.decode.bind(_decoder);
export const _encoder = new TextEncoder();
export const encode = _encoder.encode.bind(_encoder);
// let _dataView: typeof DataView = globalThis.DataView;

export const intOps = {
  getUint8: DataView.prototype.getUint8.call.bind(DataView.prototype.getUint8),
  getUint32: DataView.prototype.getUint32.call.bind(
    DataView.prototype.getUint32
  ),
  setUint8: DataView.prototype.setUint8.call.bind(DataView.prototype.setUint8),
  setUint32: DataView.prototype.setUint32.call.bind(
    DataView.prototype.setUint32
  ),
};
if ("freeze" in Object) Object.freeze(intOps);
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
