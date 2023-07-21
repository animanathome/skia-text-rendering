import {CanvasKit} from "canvaskit-wasm";

const CanvasKitInit = require('canvaskit-wasm/bin/profiling/canvaskit.js')

let canvasKit:CanvasKit | null = null;
export const loadCanvasKit = async() => {
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