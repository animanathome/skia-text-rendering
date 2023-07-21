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

class Caption {
    // local transcript for the current chunk of text
    _transcript: Transcript;
    _canvasKit: CanvasKit | null = null;
    _parent: CaptionGenerator;

    _skiaWords: any[] = [];

    constructor(options: {
        transcript: Transcript,
        parent: CaptionGenerator,
    }) {
        this._transcript = options.transcript;
        this._parent = options.parent;
        loadCanvasKit().then((canvasKit) => {
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
        const words = this._transcript.words.map((word) => word.text);
        this._skiaWords = words
            .map(word => {
            const result = getParagraph(word, this.canvasKit, this.parent.normalStyle, this.parent.typefaceProvider, this.parent.normalFont);
            return result;
        });
    }

    draw(canvas: Canvas) {
        if (!this.canvasKit) {
            return;
        }
        canvas.clear(this.canvasKit.TRANSPARENT);

        const padding = {
            left: 3,
            right: 3,
            top: -4,
            bottom: -4,
        }
        let xOffset = padding.left;
        let yOffset = padding.top;
        let xPosition = [xOffset];
        let yPosition = [yOffset];
        this._skiaWords.forEach(({text, paragraph, width, lineHeight}, index) => {
            // console.log('draw', text, xOffset, yOffset)
            canvas.drawParagraph(paragraph, xOffset, yOffset);

            xOffset += width + this.parent.space;
            if (this._skiaWords[index + 1] && xOffset + this._skiaWords[index + 1].width > this.parent.width) {
                xOffset = padding.left;
                yOffset += lineHeight;
            }
            xPosition.push(xOffset);
            yPosition.push(yOffset);
        })

        // Dynamic highlight
        const activeWordIndex = this._transcript.getActiveWordIndex(this.parent.currentTime);
        if (activeWordIndex !== -1 && this._skiaWords[activeWordIndex]) {
            const graphicPaint = new this.canvasKit.Paint();
            graphicPaint.setBlendMode(this.canvasKit.BlendMode.DstOver);
            const color = this.canvasKit.Color(146, 95, 248);
            graphicPaint.setColor(color);
            graphicPaint.setStyle(this.canvasKit.PaintStyle.Fill);

            let x = xPosition[activeWordIndex];
            let y = yPosition[activeWordIndex];
            let {width, lineHeight} = this._skiaWords[activeWordIndex];
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

    destroy() {
        this._skiaWords.forEach(paragraph => {
            paragraph.paragraph.delete();
        })
    }
}

export class CaptionGenerator {
    // global transcript container the entire transcript of the media
    private _transcript: Transcript;
    startTime: number;
    endTime: number;
    chunkDuration : number;
    private _currentTime = -1;

    private _normalStyle: ParagraphStyle;
    private _typefaceProvider: TypefaceFontProvider
    private _normalFont: Font;
    private _width: number;

    private _previousActiveChunk = -1;
    private _activeCaption : Caption | null = null;

    constructor(options: {
        transcript: Transcript,

        normalStyle: ParagraphStyle,
        typefaceFontProvider: TypefaceFontProvider,
        normalFont: Font,
        width?: number,

        startTime?: number,
        endTime?: number,
        chunkDuration?: number
    }) {
        this._transcript = options.transcript;

        this._normalStyle = options.normalStyle;
        this._typefaceProvider = options.typefaceFontProvider;
        this._normalFont = options.normalFont;
        this._width = options.width || 250;

        this.startTime = options.startTime || 0;
        this.endTime = options.endTime || 1000;
        this.chunkDuration = options.chunkDuration || 1000;
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

    public get normalStyle() {
        return this._normalStyle;
    }

    public get typefaceProvider() {
        return this._typefaceProvider;
    }

    public get normalFont() {
        return this._normalFont;
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
        this._currentTime = time;
        const activeChunk = this.getActiveChunk(time);
        if (activeChunk === this._previousActiveChunk) {
            return;
        }
        this._previousActiveChunk = activeChunk;
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