export class Timeline {
    _start: number;
    constructor() {
        this._start = performance.now();
    }
    get currentTime() {
        return performance.now() - this._start;
    }

    reset() {
        this._start = performance.now();
    }
}

export class ProgressTimeline {
    start = 0;
    end = 100;
    loop = false;
    private _prevTime = 0;
    private _onLoopCallback: (() => void) | null;
    constructor(options: {start: number, end: number, loop?: boolean, onLoopCallBack?: (() => any) | null}) {
        this.start = options.start;
        this.end = options.end;
        this.loop = options.loop || false;
        this._onLoopCallback = options.onLoopCallBack || null;
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
            if (time - this._prevTime < 0) {
                if (this._onLoopCallback) this._onLoopCallback();
            }
            this._prevTime = time;
        }
        time = (time - this.start) / (this.end - this.start);
        return time;
    }
}

export const interpolate = (from, to, progress) => {
    return from + (to - from) * progress;
}