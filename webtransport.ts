import { Opts } from "./snap";

export class WebSocket extends EventTarget {
  #opts: Opts;
  #wt: WebTransport;
  constructor(wt: WebTransport, url: URL | string, opts: Opts = {}) {
    super();
    this.#wt = wt;
    this.#opts = opts;
  }
}
