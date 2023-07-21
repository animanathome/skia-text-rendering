import Stats from 'stats.js';
import type {FontBlock} from "canvaskit-wasm";
import {
    getArrayMetrics,
    getParagraph, loadAudio,
    simplifyTranscript,
    textMetrics,
} from "./utils";
import {text} from "./text";
import {interpolate, ProgressTimeline, Timeline} from "./timeline";

import {Application, Sprite, Texture} from "pixi.js";

import LOTTIE from '../resources/lottie_anim.json';
import TRANSCRIPT from '../resources/transcript.json';
import {CaptionGenerator} from "./captions";
import {Transcript} from "./transcript";
import {loadCanvasKit} from "./canvasKit";

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


/**
 * Draw text using drawGlyphs method. Does not support any kerning or ligatures.
 */
const drawGlyphs = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSans-Medium.ttf');
    const notoTypeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(notoData);
    const notoFont = new canvasKit.Font(notoTypeFace, 50);

    const notoFontBlock: FontBlock = {
        length: 4,
        typeface: notoTypeFace,
        size: 50,
        fakeBold: false,
        fakeItalic: false,
    }
    // returns a GlyphRun
    const textShapeLines = canvasKit.ParagraphBuilder.ShapeText('test', [notoFontBlock])
    const textRun = textShapeLines[0].runs[0];

    const fontPaint = new canvasKit.Paint();
    fontPaint.setStyle(canvasKit.PaintStyle.Fill);
    fontPaint.setColor(canvasKit.BLACK);
    fontPaint.setAntiAlias(true);

    const draw = (canvas) => {
        surface.requestAnimationFrame(draw);
        canvas.clear(canvasKit.WHITE);

        canvas.drawGlyphs(textRun.glyphs, textRun.positions, 0, 0, notoFont, fontPaint);
    }
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

/**
 * Use drawText method to draw text on canvas. Does not support kerning or ligatures.
 */
const drawText = async() => {
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
    const textBlob = canvasKit.TextBlob.MakeFromText(strArray[0], notoFont);

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
            // canvas.drawTextBlob(textBlob, arrayMetrics[i].xOffset, 100, fontPaint);

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

/**
 * Draw text using drawTextBlob method. Does not support kerning or ligatures.
 */
const drawTextBlob = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoNaskhArabic-Medium.ttf')
    const str = 'البطاطس بنية اللون';

    const notoTypeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(notoData);
    const notoFont = new canvasKit.Font(notoTypeFace, 50);
    const textBlob = canvasKit.TextBlob.MakeFromText(str, notoFont);

    const fontPaint = new canvasKit.Paint();
    fontPaint.setStyle(canvasKit.PaintStyle.Fill);
    fontPaint.setColor(canvasKit.BLACK);
    fontPaint.setAntiAlias(true);

    const draw = (canvas) => {
        surface.requestAnimationFrame(draw);
        canvas.clear(canvasKit.WHITE);

        canvas.drawTextBlob(textBlob, 0, 100, fontPaint);
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

        // draw text
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

const drawDifferentFontSizes = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const notoData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSans-Medium.ttf');
    const notoChineseData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansSC-Medium.otf');
    const notoHebrewData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansHebrew-Medium.ttf');
    const notoText = '诶必西弟衣艾付记爱耻挨宅开饿罗饿母恩呕披酷耳艾斯踢忧维大波留埃克斯歪再得אבגדהוזחטיכלמנסעפצקרשתABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=`~';

    const fontMgr = canvasKit.FontMgr.FromData([notoData, notoChineseData, notoHebrewData]);
    const fontCount = fontMgr.countFamilies();
    const fontFamilyNames : string[] = [];
    for (let i = 0; i < fontCount; i++) {
        fontFamilyNames.push(fontMgr.getFamilyName(i));
    }

    const largeStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: fontFamilyNames,
            fontSize: 48,
        }
    });
    const largeMetrics = getParagraph(notoText, canvasKit, largeStyle, fontMgr);

    const mediumStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: fontFamilyNames,
            fontSize: 32,
        }
    });
    const mediumMetrics = getParagraph(notoText, canvasKit, mediumStyle, fontMgr);

    const smallStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: fontFamilyNames,
            fontSize: 16,
        }
    });
    const smallMetrics = getParagraph(notoText, canvasKit, smallStyle, fontMgr);

    const draw = (canvas) => {
        surface.requestAnimationFrame(draw);
        canvas.clear(canvasKit.WHITE);

        let xOffset = 0;
        let yOffset = 0;
        yOffset += 10;
        canvas.drawParagraph(largeMetrics.paragraph, xOffset, yOffset);
        yOffset += largeMetrics.height;
        canvas.drawParagraph(mediumMetrics.paragraph, xOffset, yOffset);
        yOffset += mediumMetrics.height;
        canvas.drawParagraph(smallMetrics.paragraph, xOffset, yOffset);

    }
    surface.requestAnimationFrame(draw);
}

/**
 * Simple dynamic style example based on the text_1 asset from our sap_2023:media_3 scene design
 */
const drawDynamicStyle = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const lightFontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/72-Light.ttf');
    const boldFontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/72-Bold.ttf');

    // specifying fontWeight doesn't seem to work
    const typefaceFontProvider = canvasKit.TypefaceFontProvider.Make();
    typefaceFontProvider.registerFont(lightFontData, '72-light');
    typefaceFontProvider.registerFont(boldFontData, '72-bold');
    console.log('typefaceFontProvider', typefaceFontProvider);

    const lightStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: ['72-light'],
            fontSize: 50,
        }
    });
    const boldStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: ['72-bold'],
            fontSize: 50,
        }
    });

    // NOTE: we can't re-use the same paragraph builder for multiple paragraphs because the builder clears its internal
    // state when we call reset() and we can't just set the text
    const getParagraph = (text, canvasKit, style, fontProvider) => {
        const builder = canvasKit.ParagraphBuilder.MakeFromFontProvider(style, fontProvider);
        builder.addText(text);
        const paragraph = builder.build();
        const layoutWidth = 600;
        paragraph.layout(layoutWidth);

        const width = paragraph.getMaxIntrinsicWidth();
        const height = paragraph.getHeight();

        return {
            paragraph,
            width,
            height
        }
    }

    const lightArray = [
        'Three steps to',
        'Profitable and',
    ];
    const boldArray = [
        'Sustainable Energy',
        'Management',
    ]

    // NOTE: we're cheating here by drawing individual lines. In production, we'll have to draw words since each word
    // could use a different font style
    const lightMetrics = lightArray.map(str => getParagraph(str, canvasKit, lightStyle, typefaceFontProvider));
    const boldMetrics = boldArray.map(str => getParagraph(str, canvasKit, boldStyle, typefaceFontProvider));

    const maskArray = [0.75, 0.5, 0.25, 0.0].reverse();
    const xPosArray = [0, 10, 20, 30];
    const maskPaint = new canvasKit.Paint();
    maskPaint.setColor(canvasKit.BLACK);
    maskPaint.setStyle(canvasKit.PaintStyle.Fill);

    // let lastCurrent = performance.now();
    // console.log('start', lastCurrent);

    const draw = (canvas) => {
        // surface.requestAnimationFrame(draw);
        canvas.clear(canvasKit.WHITE);

        // draw text
        let xOffset = 0;
        let yOffset = 0;
        lightMetrics.forEach(({paragraph, width, height}, index) => {
            canvas.drawParagraph(paragraph, xOffset + xPosArray[index], yOffset + 10);
            yOffset += height;
        });
        boldMetrics.forEach(({paragraph, width, height}, index) => {
            canvas.drawParagraph(paragraph, xOffset + xPosArray[index + 2], yOffset + 10);
            yOffset += height;
        });

        // draw mask
        yOffset = 0;

        // NOTE: surprised to see that we can't change the color of a paint object after it's been used once.
        maskPaint.setBlendMode(canvasKit.BlendMode.Screen);
        lightMetrics.forEach(({paragraph, width, height}, index) => {
            const maskPath = new canvasKit.Path();
            const color = canvasKit.Color4f(maskArray[index], maskArray[index], maskArray[index]);
            maskPaint.setColor(color);
            maskPath.addRect(canvasKit.XYWHRect(xOffset + xPosArray[index], yOffset + 10, width, height));
            canvas.drawPath(maskPath, maskPaint);
            maskPath.delete();
            yOffset += height;
        });
        boldMetrics.forEach(({paragraph, width, height}, index) => {
            const maskPath = new canvasKit.Path();
            const color = canvasKit.Color4f(maskArray[index + 2], maskArray[index + 2], maskArray[index + 2]);
            maskPaint.setColor(color);
            maskPath.addRect(canvasKit.XYWHRect(xOffset + xPosArray[index + 2], yOffset + 10, width, height));
            canvas.drawPath(maskPath, maskPaint);
            yOffset += height;
            maskPath.delete();
        });

        // const current = performance.now();
        // lastCurrent = current;
    }
    surface.requestAnimationFrame(draw);
}

const drawDynamicHighlight = async() => {
    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 150;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const fontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');
    // const fontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoSansBengali-Regular.ttf');
    // const fontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/NotoNaskhArabic-Medium.ttf');
    const fontTypeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);
    const typefaceFontProvider = canvasKit.TypefaceFontProvider.Make();
    // we register the font with the name that we'll use in the fontFamilies array
    typefaceFontProvider.registerFont(fontData, 'Poppins-Bold');

    const font = new canvasKit.Font(fontTypeFace, 36);
    const {ascent} = font.getMetrics();

    const textHeightBehavior = canvasKit.TextHeightBehavior.DisableAll;
    const heightMultiplier = 0.5;
    const halfLeading = true;
    const textBaseLine = canvasKit.TextBaseline.Ideographic;

    const style = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.GREEN,
            fontFamilies: ['Poppins-Bold'],
            fontSize: 36,
            heightMultiplier,
            halfLeading,
            textBaseLine,
        },
        textHeightBehavior,
        heightMultiplier,
    });

    const highlightStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.RED,
            fontFamilies: ['Poppins-Bold'],
            fontSize: 36,
            heightMultiplier,
            halfLeading,
            textBaseLine
        },
        textHeightBehavior,
        heightMultiplier,
    });

    const getParagraph = (text, canvasKit, style, fontProvider) => {
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
        // console.log('text:', text, 'top:', top, 'height:', height, 'lineHeight:', lineHeight);

        return {
            paragraph,
            top,
            width,
            height,
            lineHeight,
        }
    }

    const str = 'Animated highlights test. We can highlight everything';
    const strArray = str.split(' ');
    // const str = 'অ্যানিমেটেড হাইলাইট পরীক্ষা. আমরা সবকিছু তুলে ধরতে পারি';
    // const str = 'اختبار الملامح المتحركة. يمكننا تسليط الضوء على كل شيء'
    // const strArray = str.split(' ').reverse();
    const strMetrics = strArray.map(str => getParagraph(str, canvasKit, style, typefaceFontProvider));

    const highlightMetrics = strArray.map(str => getParagraph(str, canvasKit, highlightStyle, typefaceFontProvider));
    const space = 10;
    const lineHeightMultiplier = 0.8;

    const maskPaint = new canvasKit.Paint();
    maskPaint.setColor(canvasKit.BLACK);
    maskPaint.setStyle(canvasKit.PaintStyle.Fill);

    const graphicPaint = new canvasKit.Paint();
    graphicPaint.setColor(canvasKit.BLUE);
    graphicPaint.setStyle(canvasKit.PaintStyle.Fill);

    // Timelines
    const timeline = new Timeline();
    const yProgressTimeline = new ProgressTimeline({start: 0, end: 1000});
    const highlightProgressTimeline = new ProgressTimeline({start: 1000, end: 3000});
    const yPosArray = [-100, 0];

    const draw = (canvas) => {
        // Animation
        const currentTime = timeline.currentTime;
        const maskProgress = highlightProgressTimeline.value(currentTime);
        const yProgress = yProgressTimeline.value(currentTime);
        const yValue = interpolate(yPosArray[0], yPosArray[1], yProgress);

        surface.requestAnimationFrame(draw);
        canvas.clear(canvasKit.TRANSPARENT);

        let xOffset = 10;
        let yOffset = 0;

        // draw normal text
        strMetrics.forEach(({paragraph, top, width, height, lineHeight}, index) => {
            canvas.drawParagraph(paragraph, xOffset, yOffset + yValue);

            xOffset += width + space;
            if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
                xOffset = 10;
                yOffset += lineHeight * lineHeightMultiplier;
            }
        });

        // mask normal text
        xOffset = 10;
        yOffset = 0;
        maskPaint.setBlendMode(canvasKit.BlendMode.DstOut);
        highlightMetrics.forEach(({paragraph, width, top, height, lineHeight}, index) => {
            if (index === 0 || index === 5) {
                const maskPath = new canvasKit.Path();
                const startRectWidth = width * maskProgress;
                maskPath.addRect(canvasKit.XYWHRect(xOffset, yOffset + (Math.abs(ascent) + top), startRectWidth, height));
                canvas.drawPath(maskPath, maskPaint);
                maskPath.delete();
            }

            xOffset += width + space;
            if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
                xOffset = 10;
                yOffset += lineHeight * lineHeightMultiplier;
            }
        });

        const normalText = canvas.saveLayer();

        // ----------------------------------
        // draw highlight graphic
        canvas.clear(canvasKit.TRANSPARENT);

        xOffset = 10;
        yOffset = 0;
        highlightMetrics.forEach(({paragraph, width, top, height, lineHeight}, index) => {
            if (index === 0 || index === 5) {
                const graphicPath = new canvasKit.Path();
                const startRectWidth = width * maskProgress;
                graphicPath.addRect(canvasKit.XYWHRect(xOffset, yOffset + (Math.abs(ascent) + top), startRectWidth, height));
                canvas.drawPath(graphicPath, graphicPaint);
                graphicPath.delete();
            }

            xOffset += width + space;
            if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
                xOffset = 10;
                yOffset += lineHeight * lineHeightMultiplier;
            }
        });

        canvas.saveLayer();

        // ----------------------------------
        canvas.clear(canvasKit.TRANSPARENT);

        // draw highlighted text
        xOffset = 10;
        yOffset = 0;
        highlightMetrics.forEach(({paragraph, width, lineHeight}, index) => {
            if (index === 0 || index === 5) {
                canvas.drawParagraph(paragraph, xOffset, yOffset);
            }

            xOffset += width + space;
            if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
                xOffset = 10;
                yOffset += lineHeight * lineHeightMultiplier;
            }
        });

        // mask highlighted text
        xOffset = 10;
        yOffset = 0;
        maskPaint.setBlendMode(canvasKit.BlendMode.DstOut);
        highlightMetrics.forEach(({paragraph, width, top, height, lineHeight}, index) => {
            if (index === 0 || index === 5) {
                const maskPath = new canvasKit.Path();
                const startRectWidth = width * maskProgress;
                const endRectWidth = width - startRectWidth;
                maskPath.addRect(canvasKit.XYWHRect(xOffset + startRectWidth, yOffset + (Math.abs(ascent) + top), endRectWidth, height));
                canvas.drawPath(maskPath, maskPaint);
                maskPath.delete();
            }

            xOffset += width + space;
            if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
                xOffset = 10;
                yOffset += lineHeight * lineHeightMultiplier;
            }
        });

        canvas.saveLayer();

        // ----------------------------------

        canvas.restoreToCount(normalText);
    }
    surface.requestAnimationFrame(draw);
}

/**
 * In this example we draw a lottie animation on a canvas.
 */
const drawLottie = async() => {
    const stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( stats.dom );

    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
    canvas.id = 'canvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);

    const lottieAsString = JSON.stringify(LOTTIE);
    const skottieAnimation = canvasKit.MakeAnimation(lottieAsString);
    const frameCount = skottieAnimation.duration() * skottieAnimation.fps();

    // console.log('duration', skottieAnimation.duration());
    // console.log('size', skottieAnimation.size());
    // console.log('version', skottieAnimation.version());
    // console.log('frameCount', frameCount);

    const graphicPaint = new canvasKit.Paint();
    graphicPaint.setColor(canvasKit.TRANSPARENT);
    graphicPaint.setStyle(canvasKit.PaintStyle.Fill);

    skottieAnimation.seekFrame(1);

    const timeline = new Timeline();
    const progressTimeline = new ProgressTimeline({
        start: 0, end: skottieAnimation.duration() * 1000, loop: true});
    const draw = (canvas) => {
        stats.begin();

        const currentTime = timeline.currentTime;
        const progress = progressTimeline.value(currentTime);
        const frame = progress * frameCount;

        const graphicPath = new canvasKit.Path();
        graphicPath.addRect(canvasKit.XYWHRect(0, 0, 512, 512));
        canvas.drawPath(graphicPath, graphicPaint);

        skottieAnimation.seekFrame(frame);
        skottieAnimation.render(canvas);

        stats.end();

        surface.requestAnimationFrame(draw);
    }
    surface.requestAnimationFrame(draw);
}

/**
 * In this example we will draw a lottie animation on a canvas and ask pixi to draw it.
 * We do this to figure out how we could use skia within pixi.
 */
const drawSkiaInPixi = async() => {
    const stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( stats.dom );

    const app = new Application({
        backgroundColor: 0xffffff,
        antialias: true,
        autoStart: true,
        width: 256,
        height: 256,
    });
    (app.view as HTMLCanvasElement).id = 'pixiCanvas';
    document.body.appendChild((app as any).view);

    const canvasKit = await loadCanvasKit() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    document.body.appendChild(canvas);
    canvas.id = 'skiaCanvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);
    // document.body.removeChild(canvas);
    console.log('surface', surface);

    // build skia lottie layer
    const lottieAsString = JSON.stringify(LOTTIE);
    const skottieAnimation = canvasKit.MakeAnimation(lottieAsString);
    const frameCount = skottieAnimation.duration() * skottieAnimation.fps();

    const graphicPaint = new canvasKit.Paint();
    graphicPaint.setColor(canvasKit.TRANSPARENT);
    graphicPaint.setStyle(canvasKit.PaintStyle.Fill);

    // create timeline
    const timeline = new Timeline();
    const progressTimeline = new ProgressTimeline({
        start: 0,
        end: skottieAnimation.duration() * 1000,
        loop: true
    });

    const skiaCanvas = surface.getCanvas();

    // skia drawing method
    const skiaDraw = () => {
        const currentTime = timeline.currentTime;
        const progress = progressTimeline.value(currentTime);
        const frame = progress * frameCount;

        const graphicPath = new canvasKit.Path();
        graphicPath.addRect(canvasKit.XYWHRect(0, 0, 256, 256));
        skiaCanvas.drawPath(graphicPath, graphicPaint);

        skottieAnimation.seekFrame(frame);
        skottieAnimation.render(skiaCanvas);
    }

    // build pixi scene
    const pixiTexture = Texture.from(canvas);
    const pixiSprite = new Sprite(pixiTexture);
    app.stage.addChild(pixiSprite);

    const pixiDraw = () => {
        stats.begin();

        pixiTexture.update();

        surface.requestAnimationFrame(skiaDraw);

        stats.end();
    }
    app.ticker.add(pixiDraw);
}


const transcriptToAnimation = async() => {
    const stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    document.body.appendChild( stats.dom );

    const click = document.createElement('div');
    click.innerText = 'click on screen to play';
    click.style.position = 'absolute';
    click.style.top = '10px';
    click.style.left = '384px';
    document.body.appendChild(click);

    //  ----------------------------------------------------------
    // PIXI setup
    const app = new Application({
        backgroundColor: 0xffffff,
        antialias: true,
        autoStart: false,
        width: 512 * 16/9,
        height: 512,
    });
    (app.view as HTMLCanvasElement).id = 'pixiCanvas';
    // document.body.appendChild((app as any).view);

    const audio = await loadAudio('../resources/transcript_audio.m4a');

    const videoSprite = Sprite.from('../resources/container_ship_720.mp4');
    videoSprite.tint = 0xD6D6D6;
    (videoSprite.texture.baseTexture.resource as any).source.muted = true;
    (videoSprite.texture.baseTexture.resource as any).source.loop = true;
    app.stage.addChild(videoSprite);

    //  ----------------------------------------------------------
    // SKIA setup
    const canvasKit = await loadCanvasKit() as any;

    // load and register font
    const fontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');
    const fontTypeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);
    const typefaceFontProvider = canvasKit.TypefaceFontProvider.Make();
    typefaceFontProvider.registerFont(fontData, 'Poppins-Bold');
    const font = new canvasKit.Font(fontTypeFace, 48);

    // create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    document.body.appendChild(canvas);
    canvas.id = 'skiaCanvas';
    const surface = canvasKit.MakeWebGLCanvasSurface(canvas.id);
    document.body.removeChild(canvas);
    const skiaCanvas = surface.getCanvas();

    // create caption generator
    const transcript = new Transcript({...simplifyTranscript(TRANSCRIPT)});
    const normalStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.WHITE,
            fontFamilies: ['Poppins-Bold'],
            fontSize: 42,
        }
    });
    const captions = new CaptionGenerator({
        transcript,
        normalStyle,
        typefaceFontProvider,
        normalFont: font,
        startTime: 0,
        endTime: transcript.endTime,
        chunkDuration: 2600,
        width: 350,
    });
    const pixiTexture = Texture.from(canvas);
    const pixiSprite = new Sprite(pixiTexture);
    pixiSprite.x = 50;
    pixiSprite.y = 150;
    app.stage.addChild(pixiSprite);

    // create a looping timeline
    const timeline = new Timeline();
    const progressTimeline = new ProgressTimeline({
        start: 0,
        end: transcript.duration,
        loop: true,
        onLoopCallBack: () => {
            // restart audio when our timeline loops
            audio.currentTime = 0.0;
        }
    });

    //  ----------------------------------------------------------
    // create drawing methods
    const skiaDraw = () => {
        captions.draw(skiaCanvas);
    }

    const pixiDraw = () => {
        stats.begin();

        const currentTime = timeline.currentTime;
        const progress = progressTimeline.value(currentTime);
        const time = progress * progressTimeline.end;

        captions.currentTime = time;

        surface.requestAnimationFrame(skiaDraw);
        pixiTexture.update();
        stats.end();
    }

    //  ----------------------------------------------------------
    // start playback on click
    document.addEventListener('click', () => {
        app.ticker.add(pixiDraw);
        app.ticker.start();

        click.style.display = 'none';

        if (audio.paused) {
            audio.loop = true;
            audio.play();
            timeline.reset();
        }
        document.body.appendChild((app as any).view);
    })
    audio.pause();
}

// drawGradient()
// drawRomanTextAndSelectObject();
// drawBengaliTextAndSelectWord();
// drawMaskedText();
// drawText();
// drawTextBlob();
// drawGlyphs();
// drawParagraphV2();
// drawDifferentFontSizes();
// drawDynamicStyle();
// drawDynamicHighlight();
// drawLottie()
// drawSkiaInPixi();

transcriptToAnimation();