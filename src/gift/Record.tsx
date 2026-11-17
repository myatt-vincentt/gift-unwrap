// Recording, the Vincentt camera way (camera-ui): one shutter at the bottom
// middle. A tap starts a video, another tap stops it (it also stops by
// itself after a minute). While recording, its ring fills in Arles toward
// the limit and its disc becomes a rounded square, a REC chip with the
// elapsed time sits at the top, and "Tap to stop" shows above the shutter.
// The video has the present's own sounds (the rattle, the rip), never the
// microphone. When it stops the screen flashes white, then the video goes to
// the phone's share sheet (save to Photos, send…) or, on a computer,
// downloads. The Made with Vincentt mark is burned into the video, bottom
// right. The controls are page UI, so they never appear in the video.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { TextureLoader } from "three";
import { useMediaRecorder, useXRQuality } from "@vincentt-xr/sdk";

import { saveToDevice, shareMedia, type CapturedMedia } from "../capture";
import { soundStream } from "./audio";

const SHOT = {
  /** Longest recording (s). */
  limit: 60,
  /** Frame rate, and the bitrate per pixel per frame, within these bounds (bit/s). */
  fps: 30,
  bitsPerPixel: 0.12,
  bitrate: [8_000_000, 25_000_000] as const,
  /** The mark: height (share of the picture's height) and margin. */
  markHeight: 0.05,
  markMargin: 0.025,
};

const MARK_URL = "/images/made-with-vincentt.png";
const ARLES = "#f4d968";
const GLASS = "rgb(35 37 40 / 0.64)";
const EDGE = "1px solid rgb(235 246 253 / 0.18)";
const BLUR = "blur(20px) saturate(1.5)";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const extOf = (type: string) => (type.includes("mp4") ? "mp4" : "webm");

/**
 * The best format this browser can record, sound included: H.264 + AAC MP4
 * first (phones' own; a video-only MP4 type can get sound that photo apps
 * can't play), then WebM.
 */
const bestType = () =>
  [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ].find((t) => window.MediaRecorder?.isTypeSupported?.(t));

/**
 * Records the picture at the best the device can do: the canvas at its full
 * size, a bitrate that scales with it, the best format, and the SDK's
 * adaptive quality held at its top tier while recording (it would otherwise
 * lower the picture's sharpness when the device is busy).
 */
const useBestRecorder = () => {
  const canvas = useThree((s) => s.gl.domElement);
  const quality = useXRQuality();
  // The bitrate for the picture at full quality (the top tier renders at the
  // screen's size × its pixel ratio, up to 3). The recorder reads it when it
  // renders, so it's worked out here.
  const size = useThree((s) => s.size);
  const full =
    size.width *
    size.height *
    Math.min(window.devicePixelRatio || 1, 3) ** 2 *
    SHOT.fps *
    SHOT.bitsPerPixel;
  const recorder = useMediaRecorder({
    mimeType: bestType(),
    bitsPerSecond: Math.round(
      Math.min(SHOT.bitrate[1], Math.max(SHOT.bitrate[0], full)),
    ),
  });
  const done = useRef<((m: CapturedMedia) => void) | null>(null);
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  useEffect(() => {
    const blob = recorder.recordedBlob;
    if (!blob || !done.current) return;
    const resolve = done.current;
    done.current = null;
    const reader = new FileReader();
    reader.onload = () => resolve({ blob, dataUrl: reader.result as string });
    reader.readAsDataURL(blob);
  }, [recorder.recordedBlob]);

  const start = async () => {
    const q = qualityRef.current;
    if (q.tiers.length) {
      q.setTier(0);
      q.lock();
    }
    const stream = canvas.captureStream(SHOT.fps);
    soundStream()
      ?.getAudioTracks()
      .forEach((t) => stream.addTrack(t));
    await recorder.start(stream);
  };

  const stop = () =>
    new Promise<CapturedMedia>((resolve) => {
      done.current = resolve;
      recorder.stop();
      qualityRef.current.unlock();
    });

  return { start, stop, isRecording: recorder.isRecording };
};

/**
 * Save a video the device's own way: the share sheet on a phone or tablet
 * (save to Photos, send…), a download on a computer.
 */
const keep = async (media: CapturedMedia, filename: string) => {
  if (window.matchMedia?.("(pointer: coarse)").matches)
    await shareMedia(media, { filename, title: "Gift Unwrap" });
  else saveToDevice(media, filename);
};
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

/** The mark's own shape (width / height), until its image has loaded. */
const MARK_ASPECT = 570 / 216;

/**
 * The mark in the picture itself, while a video records. Loaded without
 * suspending, so a missing image never holds up the scene.
 */
const VideoMark = ({ show }: { show: boolean }) => {
  const texture = useMemo(() => new TextureLoader().load(MARK_URL), []);
  const size = useThree((s) => s.size);
  const box = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    // NDC: height 2 = the picture's height.
    const h = SHOT.markHeight * 2;
    const w = (h * MARK_ASPECT) / aspect;
    const m = SHOT.markMargin * 2;
    return [1 - m / aspect - w / 2, -1 + m + h / 2, w, h];
  }, [size]);
  const uniforms = useMemo(
    () => ({ map: { value: texture }, box: { value: box } }),
    [texture, box],
  );
  return (
    <mesh visible={show} frustumCulled={false} renderOrder={1002}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={
          /* glsl */ `
          uniform vec4 box;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(box.xy + position.xy * box.zw, -1.0, 1.0);
          }
        `
        }
        fragmentShader={
          /* glsl */ `
          uniform sampler2D map;
          varying vec2 vUv;
          void main() { gl_FragColor = texture2D(map, vUv); }
        `
        }
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const pill = {
  background: GLASS,
  border: EDGE,
  backdropFilter: BLUR,
  WebkitBackdropFilter: BLUR,
  borderRadius: 999,
  color: "#fff",
} as const;

export const Record = () => {
  const { start, stop, isRecording } = useBestRecorder();
  const [flash, setFlash] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recStart = useRef(0);
  const recording = useRef(false);

  const finish = async () => {
    if (!recording.current) return;
    recording.current = false;
    const video = await stop();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 360);
    await keep(video, `gift-unwrap-${stamp()}.${extOf(video.blob.type)}`);
  };

  // The elapsed time for the chip and the ring; the limit stops it.
  useFrame(() => {
    if (!recording.current) return;
    const s = (performance.now() - recStart.current) / 1000;
    if (Math.floor(s * 4) !== Math.floor(elapsed * 4)) setElapsed(s);
    if (s >= SHOT.limit) finish();
  });

  const onTap = () => {
    if (recording.current) {
      finish();
      return;
    }
    recording.current = true;
    recStart.current = performance.now();
    setElapsed(0);
    start();
  };

  const progress = Math.min(1, elapsed / SHOT.limit) * 100;
  const time = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

  return (
    <>
      <VideoMark show={isRecording} />
      <Html fullscreen zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
        {/* The white flash when a video is saved. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fff",
            opacity: flash ? 0.85 : 0,
            transition: `opacity ${flash ? 60 : 300}ms ${EASE}`,
          }}
        />
        {/* REC chip, top middle. */}
        <div
          style={{
            ...pill,
            position: "absolute",
            top: "calc(env(safe-area-inset-top) + 12px)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            font: "600 15px/1 system-ui, sans-serif",
            fontVariantNumeric: "tabular-nums",
            opacity: isRecording ? 1 : 0,
            transition: `opacity 160ms ${EASE}`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: ARLES,
            }}
          />
          REC {time}
        </div>
        {/* "Tap to stop", above the shutter, only while recording. */}
        <div
          style={{
            ...pill,
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom) + 112px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 14px",
            font: "500 14px/1.2 system-ui, sans-serif",
            whiteSpace: "nowrap",
            opacity: isRecording ? 1 : 0,
            transition: `opacity 160ms ${EASE}`,
          }}
        >
          Tap to stop
        </div>
        {/* The shutter: tap to record, tap again to stop. */}
        <button
          type="button"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          onClick={onTap}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom) + 24px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 76,
            height: 76,
            padding: 0,
            borderRadius: 38,
            border: "none",
            background: GLASS,
            backdropFilter: BLUR,
            WebkitBackdropFilter: BLUR,
            pointerEvents: "auto",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
            cursor: "pointer",
          }}
        >
          {/* Ring: white, or the recording's progress in Arles. */}
          <span
            style={{
              position: "absolute",
              inset: 5,
              borderRadius: "50%",
              border: isRecording ? "none" : "3px solid #fff",
              background: isRecording
                ? `conic-gradient(${ARLES} 0 ${progress}%, rgb(255 255 255 / 0.35) 0)`
                : "none",
              mask: isRecording
                ? "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))"
                : "none",
              WebkitMask: isRecording
                ? "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))"
                : "none",
            }}
          />
          {/* Disc: a circle, or a rounded square while recording. */}
          <span
            style={{
              position: "absolute",
              inset: isRecording ? 26 : 13,
              borderRadius: isRecording ? 7 : "50%",
              background: ARLES,
              transition: `inset 200ms ${EASE}, border-radius 200ms ${EASE}`,
            }}
          />
        </button>
      </Html>
    </>
  );
};
