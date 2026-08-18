import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { useEffect, useRef } from "react";
import { meanVisibility, type Point } from "./angles";
import { scoreGym } from "./gym";
import { scoreYoga } from "./yoga";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type Props = {
  enabled: boolean;
  exerciseKey: string;
  successMetric: string;
  onRep: () => void;
  onHold: (holding: boolean, score: number, cue: string) => void;
  onConfidence: (ok: boolean) => void;
};

export function PoseCamera({ enabled, exerciseKey, successMetric, onRep, onHold, onConfidence }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | undefined;
    let landmarker: PoseLandmarker | undefined;
    let raf = 0;
    let last = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 960, height: 540 } });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const files = await FilesetResolver.forVisionTasks(WASM);
        const options = { runningMode: "VIDEO" as const, numPoses: 1 };
        try {
          landmarker = await PoseLandmarker.createFromOptions(files, {
            ...options,
            baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          });
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(files, {
            ...options,
            baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
          });
        }
        const loop = () => {
          if (stopped) return;
          const now = performance.now();
          if (video.readyState >= 2 && landmarker && now - last > 33) {
            last = now;
            const result = landmarker.detectForVideo(video, now);
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const pose = result.landmarks[0];
                if (pose) {
                  const draw = new DrawingUtils(ctx);
                  const connectors = PoseLandmarker.POSE_CONNECTIONS;
                  draw.drawConnectors(pose, connectors, { color: "#c6f25a", lineWidth: 3 });
                  draw.drawLandmarks(pose, { color: "#ffffff", radius: 3 });
                  const points = pose as Point[];
                  const ok = meanVisibility(points) >= 0.45;
                  onConfidence(ok);
                  if (ok) {
                    if (successMetric === "reps") {
                      const gym = scoreGym(exerciseKey, points);
                      if (gym.rep) onRep();
                      if (gym.cue) onHold(false, gym.formOk ? 80 : 50, gym.cue);
                    } else {
                      const yoga = scoreYoga(exerciseKey === "plank" ? "plank" : exerciseKey, points);
                      onHold(yoga.match, yoga.score, yoga.cue);
                    }
                  }
                } else {
                  onConfidence(false);
                }
              }
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch {
        onConfidence(false);
      }
    }
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      landmarker?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, exerciseKey, successMetric, onRep, onHold, onConfidence]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-black aspect-video">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover -scale-x-100" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover -scale-x-100" />
      {!enabled && (
        <div className="absolute inset-0 grid place-items-center text-mute text-sm">Camera paused — timer is in charge.</div>
      )}
    </div>
  );
}
