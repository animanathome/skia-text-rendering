export const getParagraph = (text, canvasKit, style, fontMgr) => {
    const builder = canvasKit.ParagraphBuilder.Make(style, fontMgr);
    builder.addText(text);
    const paragraph = builder.build();
    const layoutWidth = 600;
    paragraph.layout(layoutWidth);

    // getShapedLines doesn't link the use font. This makes it impossible to calculate
    // the bounds ourselves
    const width = paragraph.getMinIntrinsicWidth();
    const height = paragraph.getHeight();

    return {
        paragraph,
        width,
        height
    }
}

export const getArrayMetrics = (array, font, paint) => {
    const arrayMetrics: any[] = [];
    let xOffset = 0;
    for(let i = 0; i < array.length; i++) {
        const text = array[i];
        const metrics = textMetrics(text, font, paint);
        arrayMetrics[i] = {
            ...metrics,
            xOffset
        };
        xOffset += metrics.width + 13;
    }
    return arrayMetrics;
}
export const textMetrics = (text, font, paint) => {
    const glyphIds = font.getGlyphIDs(text);
    const glyphBounds = font.getGlyphBounds(glyphIds, paint);
    const maxHeight = glyphHeights(glyphBounds);
    const glyphWidths = font.getGlyphWidths(glyphIds, paint);
    const totalWidth = glyphWidths.reduce((a, b) => a + b, 0);

    return {
        width: totalWidth,
        height: maxHeight.height,
        top: maxHeight.top
    }
}

export const glyphHeights = (bounds) => {
    let index = 0;
    let minTop = 0;
    let maxBottom = 0;
    for (let i = 0; i < bounds.length / 4; i++) {
        index = i * 4;
        const top = bounds[index + 1];
        const bottom = bounds[index + 3];
        if (minTop > top) minTop = top;
        if (maxBottom < bottom) maxBottom = bottom;
    }
    return {
        top: minTop,
        height: Math.abs(minTop) + maxBottom
    };
}

/**
 * HARDCODED method which converts the project transcript into timeline parameters
 */
export const simplifyTranscript = (TRANSCRIPT, groupId='72f7ad49-c114-cf11-a619-14fa385d020f') => {
    // scene group id
    if (!TRANSCRIPT[groupId]) throw new Error('Invalid group id');

    const root = TRANSCRIPT[groupId];
    const language = root['language'];
    const textDirection = root.editorState.root.direction;
    const paragraph = root.editorState.root.children[0];
    const words = paragraph.children
        .map(word => {
            return {
                text: word.text,
                startTime: word.startTime,
                endTime: word.endTime,
            }
        })
        .filter(word => word.text !== ' ' && word.text !== undefined)
    return {
        language,
        textDirection,
        words,
    }
}

export const loadAudio = async(url): Promise<HTMLAudioElement> => {
    const audio = document.createElement('audio');
    audio.src = '../resources/transcript_audio.m4a';
    audio.defaultMuted = true;
    // audio.muted = true;
    audio.autoplay = true;
    // audio.volume = 0;
    document.body.appendChild(audio);

    return new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => {
            console.log('audio loaded');
            resolve(audio);
        });
    })
}

