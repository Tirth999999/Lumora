export class AnalyticsService {
  constructor() {
    this.events = [];
  }

  track(name, props = {}) {
    const evt = { name, props, t: Date.now() };
    this.events.push(evt);
    if (this.events.length > 200) this.events.shift();
  }
}
