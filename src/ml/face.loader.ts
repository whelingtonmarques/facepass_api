import '@tensorflow/tfjs-node'
import * as faceapi from "face-api.js";
import * as canvas from "canvas";
import path from "path";

const { Canvas, Image, ImageData } = canvas;

// Ambiente face-api.js para usar canvas em Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

/// Carrega os modelos do face-api.js a partir do diretório "models"
export async function loadModels(): Promise<void> {
    console.time('loadModels');
    const modelPath = path.join(__dirname, "../models");

    // Carrega os modelos necessários para detecção e reconhecimento facial
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    // Carrega o modelo de pontos faciais para obter as landmarks
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    // Carrega o modelo de reconhecimento facial para obter os descritores faciais
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    console.timeEnd('loadModels');
    console.log("Face-api.js models loaded successfully.");
}

export { faceapi, canvas };