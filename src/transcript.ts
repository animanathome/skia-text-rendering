type TranscriptWord = {
    text: string,
    startTime: number,
    endTime: number,
}

export class Transcript {
    _words: TranscriptWord[];
    _language: string;
    _textDirection: string;
    constructor({words, language, textDirection}) {
        this._words = words;
        this._language = language;
        this._textDirection = textDirection;
    }

    get duration() {
        return this.endTime - this.startTime;
    }

    get words() {
        return this._words;
    }

    get startTime() {
        return this._words[0].startTime;
    }

    get endTime() {
        return this._words[this._words.length - 1].endTime;
    }
    getActiveWordIndex(time) {
        if (time < this.startTime) {
            return -1;
        }
        if (time > this.endTime) {
            return -1;
        }
        return this._words.findIndex(word => word.startTime <= time && word.endTime >= time);
    }

    getWordsForTimeRange(startTime: number, endTime: number) {
        return this._words.filter(word => word.startTime >= startTime && word.endTime <= endTime)
    }
    createTranscriptFromTimeRange(startTime:number, endTime: number) {
        return new Transcript({
            words: this.getWordsForTimeRange(startTime, endTime),
            language: this._language,
            textDirection: this._textDirection
        })
    }
}

