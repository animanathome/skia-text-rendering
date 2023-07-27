import {drawRectangle, getWords, textMetrics} from "./utils";
import {CanvasKit} from "canvaskit-wasm";
import fetch from "node-fetch"
import fs from "fs";
import LANGUAGES from "./library";
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

const drawTextAndSelectObject = async(languageIndex: number) => {
    if (languageIndex === undefined) {
        throw new Error('languageIndex is undefined');
    }
    const canvasKit = await loadCanvasKit() as any;
    let surface = canvasKit.MakeSurface(600, 60);
    const canvas = surface.getCanvas();

    const languages = Object.keys(LANGUAGES);
    const {family: fontFamily, url: fontUrl, text, locales, direction} = LANGUAGES[languages[languageIndex]];
    const words = getWords(text, locales, direction);

    const fontSize = 36;
    const fontData = await loadFont(fontUrl);
    const typeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);
    const font = new canvasKit.Font(typeFace, fontSize);

    const fontPaint = new canvasKit.Paint();
    fontPaint.setStyle(canvasKit.PaintStyle.Fill);
    fontPaint.setAntiAlias(true);

    const fontMgr = canvasKit.FontMgr.FromData([fontData]);
    const fontCount = fontMgr.countFamilies();
    const fontFamilyNames : string[] = [];
    for (let i = 0; i < fontCount; i++) {
        fontFamilyNames.push(fontMgr.getFamilyName(i));
    }
    const paraStyle = new canvasKit.ParagraphStyle({
        textStyle: {
            color: canvasKit.BLACK,
            fontFamilies: fontFamilyNames,
            fontSize: 36,
            heightMultiplier: 1.0,
            halfLeading: false,
            // https://stackoverflow.com/questions/56910191/what-is-the-difference-between-alphabetic-and-ideographic-in-flutters-textbasel
            textBaseline: canvasKit.TextBaseline.Alphabetic,
        },
    });

    const xPos = 0;
    const yPos = 10;
    let xOffset = xPos;
    const space = fontSize * 0.2;

    let gBaseline = 0;
    let gWidth = 0;
    let mDescent = 0;
    let mAscent = 0;
    words.forEach((word, index) => {
        const builder = canvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(word);
        const paragraph = builder.build();
        paragraph.layout(450);

        canvas.drawParagraph(paragraph, xOffset, yPos);

        const lineMetrics = paragraph.getLineMetrics()[0];
        const baseLine = lineMetrics.baseline;

        const glyphIds = font.getGlyphIDs(word);
        const glyphBounds = font.getGlyphBounds(glyphIds);
        const width = paragraph.getMinIntrinsicWidth();

        let minTop = Infinity;
        let maxBottom = -Infinity;
        for (let i = 0; i < glyphBounds.length / 4; i++) {
            const index = i * 4;
            const top = glyphBounds[index + 1];
            const bottom = glyphBounds[index + 3];
            if (minTop > top) minTop = top;
            if (maxBottom < bottom) maxBottom = bottom;
        }
        minTop = Math.abs(minTop);
        if (mAscent < minTop) mAscent = minTop;
        if (mDescent < maxBottom) mDescent = maxBottom;

        const y = yPos - (minTop - baseLine);
        const height = minTop + maxBottom;

        if (index === 1 ) {
            drawRectangle(canvasKit, canvas, xOffset, y, width, height, 'rgba(255, 0, 0, 0.5)');
        }
        if (index === 2 ) {
            drawRectangle(canvasKit, canvas, xOffset, y, width, height, 'rgba(0, 255, 0, 0.5)');
        }
        if (index === 3 ) {
            drawRectangle(canvasKit, canvas, xOffset, y, width, height, 'rgba(0, 0, 255, 0.5)');
        }

        xOffset += width + space;
        gWidth += width + space;
        gBaseline = baseLine;
    });

    drawRectangle(canvasKit, canvas, xPos, yPos + gBaseline - mAscent, gWidth, 1, 'rgba(255, 0, 0, 0.5)');
    drawRectangle(canvasKit, canvas, xPos, yPos, gWidth, 1, 'rgba(0, 0, 0, 0.5)');
    drawRectangle(canvasKit, canvas, xPos, yPos +gBaseline, gWidth, 1, 'rgba(0, 0, 0, 0.5)');
    drawRectangle(canvasKit, canvas, xPos, yPos +gBaseline + mDescent, gWidth, 1, 'rgba(255, 0, 0, 0.5)');


    surface.flush();

    const img = surface.makeImageSnapshot();
    if (!img) {
        console.error('no snapshot');
        return;
    }
    const pngBytes = img.encodeToBytes();
    if (!pngBytes) {
        console.error('encoding failure');
        return;
    }
    const imageFileName = `./${locales}_${fontFamily}.png`;
    const buffer = Buffer.from(pngBytes)
    fs.writeFileSync(imageFileName, buffer);
}
const drawDynamicHighlight = async() => {
    const canvasKit = await loadCanvasKit() as any;
    let surface = canvasKit.MakeSurface(600, 600);
    const canvas = surface.getCanvas();

    const fontData = await loadFont('https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');
    const fontTypeFace = canvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);
    const typefaceFontProvider = canvasKit.TypefaceFontProvider.Make();
    // we register the font with the name that we'll use in the fontFamilies array
    typefaceFontProvider.registerFont(fontData, 'Poppins-Bold');

    const font = new canvasKit.Font(fontTypeFace, 36);

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
    const strMetrics = strArray.map(str => getParagraph(str, canvasKit, style, typefaceFontProvider));

    const highlightMetrics = strArray.map(str => getParagraph(str, canvasKit, highlightStyle, typefaceFontProvider));
    const space = 10;
    const lineHeightMultiplier = 0.75;

    const maskPaint = new canvasKit.Paint();
    maskPaint.setColor(canvasKit.BLACK);
    maskPaint.setStyle(canvasKit.PaintStyle.Fill);

    const graphicPaint = new canvasKit.Paint();
    graphicPaint.setColor(canvasKit.BLUE);
    graphicPaint.setStyle(canvasKit.PaintStyle.Fill);

    canvas.clear(canvasKit.TRANSPARENT);

    let xOffset = 10;
    let yOffset = 10;

    // draw normal text
    strMetrics.forEach(({paragraph, top, width, height, lineHeight}, index) => {
        canvas.drawParagraph(paragraph, xOffset, yOffset + 10);

        xOffset += width + space;
        if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
            xOffset = 10;
            yOffset += lineHeight * lineHeightMultiplier;
        }
    });

    // mask normal text
    xOffset = 10;
    yOffset = 10;
    maskPaint.setBlendMode(canvasKit.BlendMode.DstOut);
    highlightMetrics.forEach(({paragraph, width, top, height, lineHeight}, index) => {
        if (index === 0 || index === 5) {
            const maskPath = new canvasKit.Path();
            const startRectWidth = width * 0.6;
            maskPath.addRect(canvasKit.XYWHRect(xOffset, yOffset - top - 8, startRectWidth, height));
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
    yOffset = 10;
    highlightMetrics.forEach(({paragraph, width, top, height, lineHeight}, index) => {
        if (index === 0 || index === 5) {
            const graphicPath = new canvasKit.Path();
            const startRectWidth = width * 0.6;
            graphicPath.addRect(canvasKit.XYWHRect(xOffset, yOffset - top - 8, startRectWidth, height));
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
    yOffset = 10;
    highlightMetrics.forEach(({paragraph, width, lineHeight}, index) => {
        if (index === 0 || index === 5) {
            canvas.drawParagraph(paragraph, xOffset, yOffset + 10);
        }

        xOffset += width + space;
        if (strMetrics[index + 1] && xOffset + strMetrics[index + 1].width > 600) {
            xOffset = 10;
            yOffset += lineHeight * lineHeightMultiplier;
        }
    });

    // mask highlighted text
    xOffset = 10;
    yOffset = 10;
    maskPaint.setBlendMode(canvasKit.BlendMode.DstOut);
    highlightMetrics.forEach(({paragraph, width, top, height, lineHeight}, index) => {
        if (index === 0 || index === 5) {
            const maskPath = new canvasKit.Path();
            const startRectWidth = width * 0.6;
            const endRectWidth = width - startRectWidth;
            maskPath.addRect(canvasKit.XYWHRect(xOffset + startRectWidth, yOffset - top - 8, endRectWidth, height));
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

    surface.flush();

    const img = surface.makeImageSnapshot();
    if (!img) {
        console.error('no snapshot');
        return;
    }
    const pngBytes = img.encodeToBytes();
    if (!pngBytes) {
        console.error('encoding failure');
        return;
    }
    const buffer = Buffer.from(pngBytes)
    fs.writeFileSync("./animated_highlight.png", buffer);
}

drawTextAndSelectObject(0);
drawTextAndSelectObject(1);
drawTextAndSelectObject(2);
drawTextAndSelectObject(3);
drawTextAndSelectObject(4);
drawDynamicHighlight();