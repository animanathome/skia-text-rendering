import {textMetrics} from "./utils";
import {CanvasKit} from "canvaskit-wasm";
import fetch from "node-fetch"
import fs from "fs";
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

drawDynamicHighlight();