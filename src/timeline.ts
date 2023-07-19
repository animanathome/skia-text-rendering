export class Timeline {
    _start: number;
    constructor() {
        this._start = performance.now();
    }
    get currentTime() {
        return performance.now() - this._start;
    }
}

export class ProgressTimeline {
    start = 0
    end = 100
    constructor(options: {start: number, end: number}) {
        this.start = options.start;
        this.end = options.end;
    }
    value(time) {
        if (time < this.start) {
            return 0
        }
        if (time > this.end) {
            return 1;
        }
        return (time - this.start) / (this.end - this.start);
    }
}

export const interpolate = (from, to, progress) => {
    return from + (to - from) * progress;
}