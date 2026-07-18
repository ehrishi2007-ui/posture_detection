import { useEffect, useRef, useState } from "react";
import { statusForPosture } from "../utils.js";

const CAPTURE_INTERVAL_MS = 700;

/**
 * Owns the camera stream and the frame-capture loop. Sends one JPEG blob
 * to onFrame() roughly every CAPTURE_INTERVAL_MS while `active` is true.
 * The parent (App) decides what to do with each reading.
 */
export default function WebcamPanel({ active, onFrame, currentPosture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [permissionError, setPermissionError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Acquire the camera once on mount, release it on unmount.
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (err) {
        setPermissionError(
          err.name === "NotAllowedError"
            ? "Camera access was denied. Allow camera access in your browser settings and reload."
            : `Could not access the camera: ${err.message}`
        );
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture loop — only runs while `active` is true and the camera is ready.
  useEffect(() => {
    if (!active || !cameraReady) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    const id = setInterval(() => {
      if (!video.videoWidth) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) onFrame(blob);
      }, "image/jpeg", 0.85);
    }, CAPTURE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, cameraReady, onFrame]);

  const status = statusForPosture(currentPosture);

  return (
    <div>
      <div className={`webcam-frame status-${status}`}>
        {permissionError ? (
          <div className="webcam-permission">{permissionError}</div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="webcam-overlay">
              <span className="status-pill">
                <span className={`status-dot dot-${status}`} />
                {currentPosture || (cameraReady ? "Waiting for session start…" : "Loading camera…")}
              </span>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
