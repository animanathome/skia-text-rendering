import {Transcript} from "./transcript";
import {CanvasKit, Font, ParagraphStyle, TypefaceFontProvider, Canvas} from "canvaskit-wasm";
import {loadCanvasKit} from "./canvasKit";
import {textMetrics} from "./utils";

const getParagraph = (text, canvasKit, style, fontProvider, font) => {
    const builder = canvasKit.ParagraphBuilder.MakeFromFontProvider(style, fontProvider);
    builder.addText(text);
    const paragraph = builder.build();
    // we need to specify width by this number doesn't really matter here. We just want to make sure we're able to
    // draw the text or rather word on one line.
    const layoutWidth = 600;
    paragraph.layout(layoutWidth);

    // get the width of the text
    const width = paragraph.getMaxIntrinsicWidth();

    // get the overall line height
    const lineHeight = paragraph.getHeight();

    // get the top and height of the text
    const {top, height} = textMetrics(text, font, null);
    const {ascent, descent} = font.getMetrics();

    const wheight = Math.abs(ascent) + descent;
    const size = font.getSize();
    const multi = size / wheight;

    return {
        text,
        paragraph,
        top,
        width,
        height,
        lineHeight,
        ascent,
        multi,
    }
}

type Position = {
    x: number,
    y: number,
}

const getNextClosestIndex = (array, index) => {
    for (let i = 0; i < array.length; i++) {
        if (array[i] > index) {
            return i;
        }
    }
    return array.length - 1;
}

class Caption {
    // local transcript for the current chunk of text
    _transcript: Transcript;
    _canvasKit: CanvasKit | null = null;
    _parent: CaptionGenerator;

    // skia normal style word metrics
    _normalWords: any[] = [];
    _normalWordsPos: Position[] = [];
    _normalLineIndices: number[] = [];

    // skia highlight style word metrics
    _highlightWords: any[] = [];

    constructor(options: {
        transcript: Transcript,
        parent: CaptionGenerator,
    }) {
        this._transcript = options.transcript;
        this._parent = options.parent;
        loadCanvasKit()
            .then((canvasKit) => {
                this._canvasKit = canvasKit;
                this.build();
            })
    }

    get parent() {
        return this._parent;
    }

    get canvasKit() {
        return this._canvasKit;
    }

    build() {
        if (!this.canvasKit) {
            console.log('no canvasKit');
            return;
        }

        // normal style
        const words = this._transcript.words.map((word) => word.text);
        this._normalWords = words
            .map((word, index) => getParagraph(word, this.canvasKit, this.parent.normalStyle, this.parent.typefaceProvider, this.parent.normalFont));

        const padding = {
            left: 3,
            right: 3,
            top: -4,
            bottom: -4,
        }
        let xOffset = this.parent.fancyStyle.style === 'highlight' ? padding.left : 0;
        let yOffset = this.parent.fancyStyle.style === 'highlight' ? padding.top : 0;
        let newLine = false;
        this._normalWordsPos.push({x: xOffset, y: yOffset});
        this._normalWords.forEach((word, index) => {
            xOffset += word.width + this.parent.space;
            if (this._normalWords[index + 1] && (xOffset + this._normalWords[index + 1].width) > this.parent.width) {
                xOffset = padding.left;
                yOffset += word.lineHeight;
                newLine = true;
            }
            else {
                newLine = false;
            }
            this._normalWordsPos.push({x: xOffset, y: yOffset});
            if (newLine) this._normalLineIndices.push(index);
        });
        this._normalLineIndices.push(this._normalWords.length - 1);
        console.log('normal line indices', this._normalLineIndices, this._normalLineIndices.map(index => this._normalWordsPos[index].y));

        // highlight style
        if (this.parent.highlightStyle && this.parent.highlightFont) {
            this._highlightWords = words
                .map(word => getParagraph(word, this.canvasKit, this.parent.highlightStyle, this.parent.typefaceProvider, this.parent.highlightFont));
        }
    }

    draw(canvas: Canvas) {
        if (!this.canvasKit) {
            return;
        }
        canvas.clear(this.canvasKit.TRANSPARENT);

        // NOTE: In the link below we can see that the caption animates in from the top by both changing y and opacity
        // https://www.notion.so/lumen5/Fancy-Captions-73d2c3b362204a699eef1fddd0f5b7eb?pvs=4#cb3b981151c04db5a7838632c5b4aca6
        
        this._normalWords.forEach(({text, paragraph, width, lineHeight}, index) => {
            const {x, y} = this._normalWordsPos[index];
            canvas.drawParagraph(paragraph, x, y);
        })

        // opacity - increase the opacity of the currently and previously spoken word
        // NOTE: here we render the text twice. In another effect we could just toggle the opacity of the text
        if (this.parent.fancyStyle.style === 'opacity') {
            // NOTE: we'll probably want to hang onto the last active word as sometimes there's a break between words
            // which means no word is active, but we still want to highlight all words that were spoken
            if (this.parent.fancyStyle.level === 'word') {
                // highlight all words that have been spoken up to the current time
                const activeWordIndex = this._transcript.getActiveWordIndex(this.parent.currentTime);
                if (activeWordIndex !== -1 && this._highlightWords[activeWordIndex]) {
                    for (let i = 0; i <= activeWordIndex; i++) {
                        const {paragraph} = this._highlightWords[i];
                        canvas.drawParagraph(paragraph, this._normalWordsPos[i].x, this._normalWordsPos[i].y);
                    }
                }
            }
            if (this.parent.fancyStyle.level === 'line') {
                // highlight all lines that have been spoken up to the current time
                const activeWordIndex = this._transcript.getActiveWordIndex(this.parent.currentTime);
                if (activeWordIndex !== -1 && this._highlightWords[activeWordIndex]) {
                    const lineEndIndex = getNextClosestIndex(this._normalLineIndices, activeWordIndex);
                    for (let i = 0; i <= this._normalLineIndices[lineEndIndex]; i++) {
                        const {paragraph} = this._highlightWords[i];
                        canvas.drawParagraph(paragraph, this._normalWordsPos[i].x, this._normalWordsPos[i].y);
                    }
                }
            }
            // highlight everything once we're past the end time but haven't started the next chunk
            if (this.parent.fancyStyle.level === 'object' || this._transcript.getLastWord().endTime < this.parent.currentTime) {
                for (let i = 0; i < this._highlightWords.length; i++) {
                    const {paragraph} = this._highlightWords[i];
                    canvas.drawParagraph(paragraph, this._normalWordsPos[i].x, this._normalWordsPos[i].y);
                }
            }
        }

        // NOTE: we'll probably also want to gradually want to animate the effect. This will require the addition of a
        // either a caption level or word level timeline (either way, we need to be able to map time to word level).

        // highlight - the currently active word
        if (this.parent.fancyStyle.style === 'highlight') {
            const padding = {
                left: 3,
                right: 3,
                top: -4,
                bottom: -4,
            }
            const activeWordIndex = this._transcript.getActiveWordIndex(this.parent.currentTime);
            if (activeWordIndex !== -1 && this._normalWords[activeWordIndex]) {
                const graphicPaint = new this.canvasKit.Paint();
                graphicPaint.setBlendMode(this.canvasKit.BlendMode.DstOver);
                const color = this.canvasKit.Color(146, 95, 248);
                graphicPaint.setColor(color);
                graphicPaint.setStyle(this.canvasKit.PaintStyle.Fill);

                let x = this._normalWordsPos[activeWordIndex].x;
                let y = this._normalWordsPos[activeWordIndex].y;
                let {width, lineHeight} = this._normalWords[activeWordIndex];
                x -= padding.left;
                y -= padding.top;
                width += padding.left + padding.right;
                const height = lineHeight + padding.top + padding.bottom;

                const graphicPath = new this.canvasKit.Path();
                graphicPath.addRect(this.canvasKit.XYWHRect(x, y, width, height));
                canvas.drawPath(graphicPath, graphicPaint);

                graphicPath.delete();
                graphicPaint.delete();
            }
        }
    }

    destroy() {
        this._normalWords.forEach(paragraph => {
            paragraph.paragraph.delete();
        })
    }
}

export type FancyStyle = {
    style: 'opacity' | 'highlight',
    level: 'object' | 'line' | 'word',
    interpolation: 'linear' | 'stepped'
}


// appear
// chunkDuration: 1000
// objectAnimation: [{
//      property: 'opacity',
//      level: 'letter', // animate word from start to end in x
//      interpolation: 'stepped',
//      layout: 'onTheFly',
//      start: '0',
//      end: '1',
// }]

// fade
// chunkDuration: 1000
// objectAnimation: [{
//      property: 'opacity',
//      level: 'letter', // animate word from start to end in x
//      interpolation: 'linear',
//      layout: 'atTheStart',
//      start: 0,
//      end: 1,
// }]

// swipe
// chunkDuration: 1000
// objectAnimation: [{
//      property: 'opacity',
//      level: 'word',
//      interpolation: 'linear',
//      layout: 'atTheStart',
//      start: 0,
//      end: 1,
// },
// {
//      property: 'x',
//      level: 'word',
//      interpolation: 'linear',
//      layout: 'atTheStart',
//      start: 0,
//      end: 100,
// }]

// karaoke (highlight active word)
// chunkDuration: 1000
// colorGraphics: [{
//      property: 'opacity',
//      level: 'word',
//      interpolation: 'stepped',
//      layout: 'atTheStart',
//      start: 0,
//      end: 1,
// }]


// not relevant dynamic styling properties
// delay?
// percentage offset
// zigZagPerLine
// zigZagPerLineStart
// shouldOffsetPropertyValue
// mirrorPercentageOffset
// startMulti
// end Multi

export class CaptionGenerator {
    // global transcript container the entire transcript of the media
    private _transcript: Transcript;
    startTime: number;
    endTime: number;
    chunkDuration : number;
    private _currentTime = -1;

    private _typefaceProvider: TypefaceFontProvider
    private _normalStyle: ParagraphStyle;
    private _highlightStyle: ParagraphStyle | null = null;
    private _normalFont: Font;
    private _highlightFont: Font | null = null;
    private _width: number;

    private _previousActiveChunk = -1;
    private _activeCaption : Caption | null = null;

    fancyStyle: FancyStyle;

    constructor(options: {
        transcript: Transcript,

        typefaceFontProvider: TypefaceFontProvider,
        normalStyle: ParagraphStyle,
        normalFont: Font,
        highlightStyle?: ParagraphStyle,
        highlightFont?: Font,

        width?: number,

        startTime?: number,
        endTime?: number,
        chunkDuration?: number

        fancyStyle: FancyStyle,
    }) {
        this._transcript = options.transcript;

        this._typefaceProvider = options.typefaceFontProvider;
        this._normalStyle = options.normalStyle;
        this._normalFont = options.normalFont;
        this._highlightStyle = options.highlightStyle || null;
        this._highlightFont = options.highlightFont || null;

        this._width = options.width || 250;

        this.startTime = options.startTime || 0;
        this.endTime = options.endTime || 1000;
        this.chunkDuration = options.chunkDuration || 1000;

        this.fancyStyle = options.fancyStyle;
    }

    get space() {
        const fontSize = this._normalStyle.textStyle?.fontSize;
        if (!fontSize) {
            return 0;
        }
        return fontSize * 0.2;
    }

    get width() {
        return this._width;
    }

    public get transcript() {
        return this._transcript;
    }

    public get typefaceProvider() {
        return this._typefaceProvider;
    }

    public get normalStyle() {
        return this._normalStyle;
    }

    public get normalFont() {
        return this._normalFont;
    }

    public get highlightStyle() {
        return this._highlightStyle;
    }

    public get highlightFont() {
        return this._highlightFont;
    }

    get chunkCount() {
        return Math.ceil(this.duration / this.chunkDuration);
    }

    getActiveChunk(time) {
        if (time < this.startTime) {
            return 0;
        }
        if (time > this.endTime) {
            return this.chunkCount;
        }
        return Math.floor(time / this.chunkDuration);
    }

    getChunkTimeRange(index: number) {
        const chunckDuration = this.chunkDuration;
        const startTime = index * chunckDuration;
        const endTime = startTime + chunckDuration;
        return {
            startTime,
            endTime
        }
    }
    getWordsForTimeRange(startTime: number, endTime: number) {
        return this.transcript.getWordsForTimeRange(startTime, endTime);
    }

    getActiveWordIndex() {
        return this.transcript.getActiveWordIndex(this.currentTime);
    }

    get duration() {
        return this.endTime - this.startTime;
    }

    get currentTime() {
        return this._currentTime;
    }
    set currentTime(time) {
        // nothing to do if we're not within the time range
        if (this.startTime > time || this.endTime < time) {
            return;
        }

        this._currentTime = time;
        const activeChunk = this.getActiveChunk(time);
        if (activeChunk === this._previousActiveChunk) {
            return;
        }
        this._previousActiveChunk = activeChunk;

        // NOTE: we don't take bounds into account here. We just get all the words within the given chunk duration
        // if we want to take bounds into account, we'll have to rework this quite a bit as we'll first want to layout
        // out all the words first, so we know their width and height to chunk bounds.
        const {startTime, endTime} = this.getChunkTimeRange(activeChunk);
        const transcript = this.transcript.createTranscriptFromTimeRange(startTime, endTime)

        if (this._activeCaption) {
            this._activeCaption.destroy();
        }
        this._activeCaption = new Caption({
            transcript,
            parent: this
        });
    }

    public  get activeCaption() {
        return this._activeCaption;
    }

    draw(canvas) {
        if (!this.activeCaption) {
            return;
        }
        this.activeCaption.draw(canvas);
    }
}