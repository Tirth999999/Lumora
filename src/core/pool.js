export class Pool {
  constructor(create, reset, max = 200) {
    this.create = create;
    this.reset = reset;
    this.max = max;
    this.free = [];
    this.live = [];
  }

  spawn(init) {
    const obj = this.free.pop() || this.create();
    this.reset(obj, init);
    this.live.push(obj);
    return obj;
  }

  update(dt, fn) {
    const live = this.live;
    let w = 0;
    for (let i = 0; i < live.length; i++) {
      const o = live[i];
      const keep = fn(o, dt);
      if (keep) live[w++] = o;
      else if (this.free.length < this.max) this.free.push(o);
    }
    live.length = w;
  }

  clear() {
    for (const o of this.live) {
      if (this.free.length < this.max) this.free.push(o);
    }
    this.live.length = 0;
  }
}
