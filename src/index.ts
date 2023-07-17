import type {CanvasKit} from "canvaskit-wasm";
import {Font, Paint, TypefaceFactory, TypefaceFontProvider} from "canvaskit-wasm";
import {getArrayMetrics, getParagraph, textMetrics} from "./utils";
import {text} from "./text";

// TODO: what are the different versions?
const CanvasKitInit = require('canvaskit-wasm/bin/profiling/canvaskit.js')

let canvasKit:CanvasKit | null = null;
const loadCanvasKit = async() => {
    if (canvasKit) {
        return canvasKit;
    }
    await new Promise((resolve, reject) => {
        CanvasKitInit()
            .then((CanvasKit) => {
                canvasKit = CanvasKit;
                resolve(canvasKit);
            })
            .catch(e => {
                reject(e);
            })
    });
    return canvasKit;
}

const loadFont = async(fontUrl) => {
    const buffer = await fetch(fontUrl);
    return await buffer.arrayBuffer();
}

// TODO: get shapes
const drawRomanTextAndSelectObject = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSans-Medium.ttf');
    const notoBengaliData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansBengali-Regular.ttf');
    const notoHebrewData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansHebrew-Medium.ttf');
    const notoChineseData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansSC-Medium.otf');
    const emojiData = await loadFont('https://storage.googleapis.com/skia-cdn/misc/NotoColorEmoji.ttf');
    const str = 'Tge quick brown fox 🦊 ate a zesty hamburger 🍔.\nThe 👩‍👩‍👧‍👧 laughed.';

    const draw = (canvas) => {
        const fontPaint = new canvasKit.Paint();
        fontPaint.setStyle(canvasKit.PaintStyle.Fill);
        fontPaint.setAntiAlias(true);

        const fontMgr = canvasKit.FontMgr.FromData([notoData, notoBengaliData, notoHebrewData, notoChineseData, emojiData]);
        const fontCount = fontMgr.countFamilies();
        const fontFamilyNames : string[] = [];
        for (let i = 0; i < fontCount; i++) {
            fontFamilyNames.push(fontMgr.getFamilyName(i));
        }
        const paraStyle = new canvasKit.ParagraphStyle({
            textStyle: {
                color: canvasKit.BLACK,
                fontFamilies: fontFamilyNames,
                fontSize: 50,
                halfLeading: false,
                heightMultiplier: 1.2,
            },
            textAlign: canvasKit.TextAlign.Left,
            maxLines: 7,
            ellipsis: '...',
        });
        const builder = canvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(str);
        const paragraph = builder.build();
        paragraph.layout(450);
        canvas.drawParagraph(paragraph, 10, 10);

        // none of the different ways of getting the accurate width of the paragraph
        const width = paragraph.getMaxWidth();
        const height = paragraph.getHeight();

        const rectanglePaint = new canvasKit.Paint();
        rectanglePaint.setStyle(canvasKit.PaintStyle.Fill);
        rectanglePaint.setColor(canvasKit.RED);
        rectanglePaint.setAlphaf(0.5);
        rectanglePaint.setAntiAlias(true);

        const path = new canvasKit.Path();
        path.addRect(canvasKit.XYWHRect(10, 10, width, height));
        canvas.drawPath(path, rectanglePaint);
    };
    surface.requestAnimationFrame(draw);
}

const drawBengaliTextAndSelectWord = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';

    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);
    const notoBengaliData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansBengali-Regular.ttf');
    const str = 'এটা বিশ্ব এবং তার নাগরিকদের উপর নির্ভর করে'

    const draw = (canvas) => {
        const fontMgr = canvasKit.FontMgr.FromData([notoBengaliData]);
        const fontCount = fontMgr.countFamilies();
        const fontFamilyNames : string[] = [];
        for (let i = 0; i < fontCount; i++) {
            fontFamilyNames.push(fontMgr.getFamilyName(i));
        }
        const paraStyle = new canvasKit.ParagraphStyle({
            textStyle: {
                color: canvasKit.BLACK,
                fontFamilies: fontFamilyNames,
                fontSize: 50,
                halfLeading: false,
                heightMultiplier: 1.2,
            },
            textAlign: canvasKit.TextAlign.Left,
            maxLines: 7,
            ellipsis: '...',
        });
        const builder = canvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(str);
        const paragraph = builder.build();
        paragraph.layout(450);
        canvas.drawParagraph(paragraph, 0, 0);

        const firstWord = paragraph.getWordBoundary(0);
        const secondWord = paragraph.getWordBoundary(28);
        const selections = [firstWord, secondWord]
        selections.forEach(selection => {
           const range = paragraph.getRectsForRange(selection.start, selection.end, canvasKit.RectHeightStyle.Max, canvasKit.RectWidthStyle.Tight);

            const rectanglePaint = new canvasKit.Paint();
            rectanglePaint.setStyle(canvasKit.PaintStyle.Fill);
            rectanglePaint.setColor(canvasKit.RED);
            rectanglePaint.setAlphaf(0.5);
            rectanglePaint.setAntiAlias(true);

            const path = new canvasKit.Path();
            path.addRect(canvasKit.XYWHRect(...range[0].rect));
            canvas.drawPath(path, rectanglePaint);
        });
    };
    surface.requestAnimationFrame(draw);
}

const drawMaskedText = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSans-Medium.ttf');
    const emojiData = await loadFont('https://storage.googleapis.com/skia-cdn/misc/NotoColorEmoji.ttf');
    const str = 'The brown fox 🦊';
    const draw = (canvas) => {
        const fontMgr = canvasKit.FontMgr.FromData([notoData, emojiData]);
        const fontCount = fontMgr.countFamilies();
        const fontFamilyNames : string[] = [];
        for (let i = 0; i < fontCount; i++) {
            fontFamilyNames.push(fontMgr.getFamilyName(i));
        }
        const paraStyle = new canvasKit.ParagraphStyle({
            textStyle: {
                color: canvasKit.BLACK,
                fontFamilies: fontFamilyNames,
                fontSize: 50,
                halfLeading: false,
                heightMultiplier: 1.2,
            },
            textAlign: canvasKit.TextAlign.Left,
            maxLines: 7,
            ellipsis: '...',
        });
        const builder = canvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(str);
        const paragraph = builder.build();
        paragraph.layout(450);
        canvas.drawParagraph(paragraph, 0, 0);

        // Rect range isn't accurate. It includes both brown and fox.
        const brownBoundary = paragraph.getWordBoundary(4);
        console.log('brownBoundary', brownBoundary);
        const brownRect = paragraph.getRectsForRange(brownBoundary.start, brownBoundary.end, canvasKit.RectHeightStyle.Max, canvasKit.RectWidthStyle.Max);
        console.log('brownRect', brownRect);

        const rectanglePaint = new canvasKit.Paint();
        rectanglePaint.setStyle(canvasKit.PaintStyle.Fill);
        rectanglePaint.setAntiAlias(true);
        rectanglePaint.setBlendMode(canvasKit.BlendMode.DstOut);

        const path = new canvasKit.Path();
        path.addRect(canvasKit.XYWHRect(100, 5, 150, 50));
        canvas.drawPath(path, rectanglePaint);
    };
    surface.requestAnimationFrame(draw);
};

const drawAnimatedText = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const gray = canvasKit.Color(128, 128, 128, 1);
    const red = canvasKit.Color(255, 0, 0, 1.0);

    // const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansBengali-Regular.ttf');

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoNaskhArabic-Medium.ttf')
    const strArray = 'البطاطس بنية اللون'.split(' ');

    const notoTypeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(notoData);
    const notoFont = new canvasKit.Font(notoTypeFace, 50);

    const fontPaint = new canvasKit.Paint();
    fontPaint.setStyle(canvasKit.PaintStyle.Fill);
    fontPaint.setColor(canvasKit.BLACK);
    fontPaint.setAntiAlias(true);

    const arrayMetrics = getArrayMetrics(strArray, notoFont, fontPaint);

    const graphicPaint = new canvasKit.Paint();
    graphicPaint.setColor(red);
    graphicPaint.setStyle(canvasKit.PaintStyle.Fill);

    const maskPaint = new canvasKit.Paint();
    maskPaint.setStyle(canvasKit.PaintStyle.Fill);

    const maskArray = [1.0, 0.75, 0.5, 0.25, 0.0];

    // https://skia.org/docs/user/api/skblendmode_overview/
    // what does setEmbeddedBitmaps mean?
    // what does setSubpixel mean?
    const draw = (canvas) => {
        console.log('drawing')

        const graphicPath = new canvasKit.Path();
        graphicPath.addRect(canvasKit.XYWHRect(arrayMetrics[1].xOffset, 100 + arrayMetrics[1].top, arrayMetrics[1].width, arrayMetrics[1].height));
        canvas.drawPath(graphicPath, graphicPaint);

        canvas.saveLayer(graphicPaint);

        for(let i = 0; i < strArray.length; i++) {
            fontPaint.setBlendMode(canvasKit.BlendMode.SrcOver);

            // does not support kerning
            // does not support different reading direction (LTR vs RTL)
            canvas.drawText(strArray[i], arrayMetrics[i].xOffset, 100, fontPaint, notoFont);

            maskPaint.setBlendMode(canvasKit.BlendMode.Modulate);

            maskPaint.setAlphaf(maskArray[i]);
            const path = new canvasKit.Path();
            path.addRect(canvasKit.XYWHRect(arrayMetrics[i].xOffset, 100 + arrayMetrics[i].top, arrayMetrics[i].width, arrayMetrics[i].height));
            canvas.drawPath(path, maskPaint);
        }

        canvas.restore();
    };
    surface.requestAnimationFrame(draw);
}

const drawParagraphV2 = async() => {
    await new Promise((resolve, reject) => {
       setTimeout(() => resolve('done'), 1000);
    });
    console.log('done')

    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    // const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoNaskhArabic-Medium.ttf')
    // const strArray = 'البطاطس بنية اللون'.split(' ').reverse();

    // const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansBengali-Regular.ttf');
    // const strArray = 'বাদামী আলু'.split(' ')

    // const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansHebrew-Medium.ttf');
    // const strArray = 'תפוחי אדמה חומים'.split(' ').reverse();

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSans-Medium.ttf');
    const strArray = text.split(' ')
    // const strArray = 'Potatoes are brown, a common knowledge for many'.split(' ')
    console.log('word count', strArray.length);

    const fontMgr = canvasKit.FontMgr.FromData([notoData]);
    const fontCount = fontMgr.countFamilies();
    const fontFamilyNames : string[] = [];
    for (let i = 0; i < fontCount; i++) {
        fontFamilyNames.push(fontMgr.getFamilyName(i));
    }

    const titleStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: fontFamilyNames,
            fontSize: 36,
            halfLeading: false,
            heightMultiplier: 1.0,
        },
        textAlign: canvasKit.TextAlign.Left,
        textDirection: canvasKit.TextDirection.Left,
    });

    const textStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: fontFamilyNames,
            fontSize: 14,
            halfLeading: false,
            heightMultiplier: 1.0,
        },
        textAlign: canvasKit.TextAlign.Left,
        textDirection: canvasKit.TextDirection.Left,
    });

    const title = 'Potatoes are brown'
    const titleMetrics = getParagraph(title, canvasKit, titleStyle, fontMgr);
    const textArrayMetrics = strArray.map((str) => getParagraph(str, canvasKit, textStyle, fontMgr));

    const maskPaint = new canvasKit.Paint();
    maskPaint.setColor(canvasKit.Color(255, 0, 0, 0.5));
    maskPaint.setStyle(canvasKit.PaintStyle.Fill);
    const space = 4;

    const maskArray = Array.from({length: strArray.length}, () => Math.random());

    const draw = (canvas) => {
        surface.requestAnimationFrame(draw);
        canvas.clear(canvasKit.WHITE);

        let xOffset = 0;
        let yOffset = 0;

        canvas.drawParagraph(titleMetrics.paragraph, 0, 10);
        yOffset += titleMetrics.height;

        maskPaint.setBlendMode(canvasKit.BlendMode.DstIn);
        textArrayMetrics.forEach(({paragraph, width, height}, index) => {
            // draw word
            canvas.drawParagraph(paragraph, xOffset, yOffset + 10);

            // draw mask
            maskPaint.setAlphaf(maskArray[index]);
            const path = new canvasKit.Path();
            path.addRect(canvasKit.XYWHRect(xOffset, yOffset + 10, width, height));
            canvas.drawPath(path, maskPaint);
            path.delete();

            // new line
            xOffset += width + space;
            if (textArrayMetrics[index + 1] && xOffset + textArrayMetrics[index + 1].width > 600) {
                xOffset = 0;
                yOffset += height + space;
            }
        });
    }
    surface.requestAnimationFrame(draw);
}

// drawGradient()
// drawRomanTextAndSelectObject();
// drawBengaliTextAndSelectWord();
// drawMaskedText();
// drawAnimatedText();
drawParagraphV2();
