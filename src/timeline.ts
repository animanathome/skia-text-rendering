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
    start = 0;
    end = 100;
    loop = false;
    constructor(options: {start: number, end: number, loop?: boolean}) {
        this.start = options.start;
        this.end = options.end;
        this.loop = options.loop || false;
    }
    value(time) {
        if (time < this.start) {
            return 0
        }
        if (!this.loop && time > this.end) {
            return 1;
        }
        if (this.loop) {
            time = time % (this.end - this.start);
        }
        return (time - this.start) / (this.end - this.start);
    }
}

export const interpolate = (from, to, progress) => {
    return from + (to - from) * progress;
}