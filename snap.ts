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