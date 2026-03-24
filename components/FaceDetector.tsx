"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";

interface FaceDetectorProps {
    /** Called with 128-dim face descriptor when a face is detected */
    onFaceDetected: (descriptor: number[], imageSrc?: string) => void;
    /** Whether to keep scanning or stop after first detection */
    continuous?: boolean;
    /** Size of the preview */
    size?: number;
}

let modelsLoaded = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceapi: any = null;

/**
 * Auto-detects a face from webcam and returns the 128-dim face descriptor.
 * No manual capture button — fully automatic.
 * Uses dynamic import of @vladmandic/face-api to avoid SSR/TextEncoder crash.
 */
export function FaceDetector({ onFaceDetected, continuous = false, size = 200 }: FaceDetectorProps) {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<"loading" | "scanning" | "detected" | "no-face">("loading");
    const [detected, setDetected] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load face-api module + models once
    useEffect(() => {
        const loadModels = async () => {
            if (modelsLoaded && faceapi) {
                setStatus("scanning");
                return;
            }
            try {
                // Dynamic import to prevent SSR TextEncoder crash
                faceapi = await import("@vladmandic/face-api");
                await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
                await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
                await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
                modelsLoaded = true;
                setStatus("scanning");
            } catch (err) {
                console.error("Failed to load face-api models:", err);
                setStatus("no-face");
            }
        };
        loadModels();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Stop webcam stream on unmount to prevent camera leak
    useEffect(() => {
        return () => {
            const stream = webcamRef.current?.video?.srcObject as MediaStream | null;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const detectFace = useCallback(async () => {
        if (!webcamRef.current?.video || detected || !faceapi) return;

        const video = webcamRef.current.video;
        if (video.readyState !== 4) return;

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                const descriptor = Array.from(detection.descriptor) as number[];
                const imageSrc = webcamRef.current.getScreenshot() || undefined;
                setDetected(true);
                setStatus("detected");
                onFaceDetected(descriptor, imageSrc);

                // Draw box on canvas
                if (canvasRef.current) {
                    const dims = faceapi.matchDimensions(canvasRef.current, { width: size, height: size });
                    const resized = faceapi.resizeResults(detection, dims);
                    faceapi.draw.drawDetections(canvasRef.current, [resized]);
                }

                if (!continuous && intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            } else {
                setStatus("scanning");
            }
        } catch {
            // ignore transient detection errors
        }
    }, [detected, onFaceDetected, continuous, size]);

    // Start scanning loop
    useEffect(() => {
        if (status === "scanning" || (continuous && status === "detected")) {
            intervalRef.current = setInterval(detectFace, 500);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [status, detectFace, continuous]);

    return (
        <div className="flex flex-col items-center space-y-2">
            <div className="relative" style={{ width: size, height: size }}>
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ width: size, height: size, facingMode: "user" }}
                    className="rounded-lg object-cover"
                    style={{ width: size, height: size }}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0"
                    style={{ width: size, height: size }}
                />
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm">
                {status === "loading" && (
                    <span className="text-gray-500 animate-pulse">⏳ Loading face models...</span>
                )}
                {status === "scanning" && (
                    <span className="text-blue-500 animate-pulse">🔍 Scanning for face...</span>
                )}
                {status === "detected" && (
                    <span className="text-green-600 font-medium">✅ Face detected & captured</span>
                )}
                {status === "no-face" && (
                    <span className="text-red-500">❌ Model load failed</span>
                )}
            </div>
        </div>
    );
}
