"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Home() {
  const imageRef = useRef<HTMLImageElement>(null);
  const innerBoxRef = useRef<SVGRectElement>(null);
  const outerBoxRef = useRef<SVGRectElement>(null);
  const boxRef = useRef<SVGImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [isExportMode, setIsExportMode] = useState(false);
  const [imageSrc, setImageSrc] = useState("/woman-swimming.jpg");
  const [bgColor, setBgColor] = useState("#C1D4E5");
  const [objectPos, setObjectPos] = useState({ x: 50, y: 50 });
  const [imageScale, setImageScale] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLog, setExportLog] = useState<string[]>([]);

  const imageScaleRef = useRef(imageScale);
  imageScaleRef.current = imageScale;

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  useEffect(() => {
    const isExport = new URLSearchParams(window.location.search).has("export");
    setIsExportMode(isExport);

    // In export mode, apply injected settings from Puppeteer
    if (isExport && (window as unknown as Record<string, unknown>).__exportSettings) {
      const s = (window as unknown as Record<string, unknown>).__exportSettings as {
        bgColor?: string;
        objectPos?: { x: number; y: number };
        imageScale?: number;
        imageSrc?: string;
      };
      if (s.bgColor) setBgColor(s.bgColor);
      if (s.objectPos) setObjectPos(s.objectPos);
      if (s.imageScale) {
        setImageScale(s.imageScale);
        imageScaleRef.current = s.imageScale;
      }
      if (s.imageSrc) setImageSrc(s.imageSrc);
    }
  }, []);

  const buildTimeline = useCallback(() => {
    if (tlRef.current) tlRef.current.kill();

    const innerBox = innerBoxRef.current;
    const outerBox = outerBoxRef.current;
    const image = imageRef.current;
    const box = boxRef.current;
    const overlay = overlayRef.current;
    if (!innerBox || !outerBox || !image || !box || !overlay) return null;

    const innerLen = innerBox.getTotalLength();
    const outerLen = outerBox.getTotalLength();

    // Reset all elements
    gsap.set([innerBox, outerBox], { visibility: "visible" });
    gsap.set(innerBox, { strokeDasharray: innerLen, strokeDashoffset: innerLen });
    gsap.set(outerBox, { strokeDasharray: outerLen, strokeDashoffset: outerLen });
    const baseScale = imageScaleRef.current / 100;
    gsap.set(image, { scale: 1.08 * baseScale });
    gsap.set(box, { opacity: 0 });
    gsap.set(overlay, { opacity: 0 });

    const isExport = new URLSearchParams(window.location.search).has("export");
    const tl = gsap.timeline({ delay: 0.3, paused: isExport });
    const duration = 1.2;
    const delay = 0.1;

    tl.to(image, {
      scale: 1 * baseScale,
      duration: duration + 0.6,
      ease: "power1.out",
    }, 0);

    tl.to(innerBox, {
      strokeDashoffset: 0,
      duration: duration,
      ease: "power3.inOut",
    }, 0);

    tl.to(outerBox, {
      strokeDashoffset: 0,
      duration: duration - delay,
      ease: "power3.inOut",
    }, delay);

    const fadeDuration = 0.6;
    tl.to(box, {
      opacity: 1,
      duration: fadeDuration,
      ease: "power2.out",
      onComplete: () => {
        gsap.set([innerBox, outerBox], { visibility: "hidden" });
      },
    }, duration);

    tl.to(overlay, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    }, duration + fadeDuration);

    tlRef.current = tl;

    if (isExport) {
      (window as unknown as Record<string, unknown>).__timeline = tl;
    }

    return tl;
  }, []);

  useEffect(() => {
    const tl = buildTimeline();
    return () => { if (tl) tl.kill(); };
  }, [buildTimeline]);

  const replay = () => {
    buildTimeline();
  };

  const exportVideo = async () => {
    if (typeof VideoEncoder === "undefined") {
      alert("Dein Browser unterstützt kein Video-Encoding. Bitte Chrome oder Safari verwenden.");
      return;
    }

    const storyEl = storyRef.current;
    if (!storyEl) return;

    setIsExporting(true);
    setExportLog(["Export gestartet..."]);

    const WIDTH = 1080;
    const HEIGHT = 1920;
    const FPS = 30;
    const HOLD_FRAMES = 15;

    try {
      // Build a fresh paused timeline
      const tl = buildTimeline();
      if (!tl) throw new Error("Timeline konnte nicht erstellt werden");
      tl.pause();

      const totalDuration = tl.totalDuration();
      const totalFrames = Math.ceil(totalDuration * FPS) + HOLD_FRAMES;

      setExportLog((prev) => [
        ...prev,
        `Animation: ${totalDuration.toFixed(2)}s | ${totalFrames} Frames @ ${FPS}fps`,
      ]);

      // Setup mp4 muxer + video encoder
      const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
      const { toCanvas } = await import("html-to-image");

      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: { codec: "avc", width: WIDTH, height: HEIGHT },
        fastStart: "in-memory",
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("Encoder error:", e),
      });

      encoder.configure({
        codec: "avc1.640033",
        width: WIDTH,
        height: HEIGHT,
        bitrate: 8_000_000,
        framerate: FPS,
      });

      // Determine scale factor from displayed size to 1080x1920
      const rect = storyEl.getBoundingClientRect();
      const pixelRatio = WIDTH / rect.width;

      setExportLog((prev) => [...prev, "Frames werden aufgenommen..."]);

      for (let i = 0; i < totalFrames; i++) {
        const time = Math.min(i / FPS, totalDuration);
        tl.totalTime(time);

        // Wait for render
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));

        const canvas = await toCanvas(storyEl, {
          canvasWidth: WIDTH,
          canvasHeight: HEIGHT,
          pixelRatio,
        });

        const frame = new VideoFrame(canvas, {
          timestamp: i * (1_000_000 / FPS),
          duration: 1_000_000 / FPS,
        });

        encoder.encode(frame, { keyFrame: i % 30 === 0 });
        frame.close();

        if (i % 5 === 0) {
          setExportLog((prev) => {
            const msg = `Frame ${i + 1}/${totalFrames} (${Math.round(((i + 1) / totalFrames) * 100)}%)`;
            if (prev.length > 0 && prev[prev.length - 1].startsWith("Frame ")) {
              return [...prev.slice(0, -1), msg];
            }
            return [...prev, msg];
          });
          // Yield to UI so progress updates render
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setExportLog((prev) => [...prev, "Video wird encodiert..."]);
      await encoder.flush();
      encoder.close();
      muxer.finalize();

      // Download
      const blob = new Blob([target.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "story.mp4";
      a.click();
      URL.revokeObjectURL(url);

      setExportLog((prev) => [...prev, "Fertig!"]);

      // Replay animation normally
      buildTimeline();
    } catch (err) {
      setExportLog((prev) => [
        ...prev,
        `Fehler: ${err instanceof Error ? err.message : "Unbekannt"}`,
      ]);
    }
    setIsExporting(false);
  };

  // --- Drag to reposition image ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isExportMode) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: objectPos.x, posY: objectPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !storyRef.current) return;
    const rect = storyRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    setObjectPos({
      x: Math.max(0, Math.min(100, dragStart.current.posX - dx)),
      y: Math.max(0, Math.min(100, dragStart.current.posY - dy)),
    });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // --- File upload ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setObjectPos({ x: 50, y: 50 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`flex items-center justify-center h-screen ${isExportMode ? "" : "gap-6 p-8"}`}
      style={{ background: bgColor }}
    >
      {/* Toolbar */}
      {!isExportMode && (
        <div className="flex flex-col gap-3 bg-white/90 backdrop-blur rounded-xl p-4 shadow-lg w-56">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Bild wählen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Farbe</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            <span>Zoom {imageScale}%</span>
            <input
              type="range"
              min={100}
              max={200}
              value={imageScale}
              onChange={(e) => setImageScale(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
          </label>

          <button
            onClick={replay}
            className="px-4 py-2 bg-gray-100 text-gray-900 text-sm rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Replay
          </button>

          <button
            onClick={exportVideo}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "Exportiert..." : "Export MP4"}
          </button>

          {exportLog.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg bg-gray-900 p-2 text-xs text-green-400 font-mono leading-relaxed">
              {exportLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Story container */}
      <div
        ref={storyRef}
        className={`relative h-full max-h-full aspect-[9/16] overflow-hidden ${isExportMode ? "" : "rounded-lg cursor-grab active:cursor-grabbing"}`}
        style={{ background: bgColor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Story image"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            objectPosition: `${objectPos.x}% ${objectPos.y}%`,
            transform: `scale(${imageScale / 100})`,
          }}
        />

        {/* Color overlay that fades in to cover image outside the box */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: bgColor,
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
              ${(173 / 1080) * 100}% ${(593 / 1920) * 100}%,
              ${(173 / 1080) * 100}% ${(1326 / 1920) * 100}%,
              ${(906 / 1080) * 100}% ${(1326 / 1920) * 100}%,
              ${(906 / 1080) * 100}% ${(593 / 1920) * 100}%,
              ${(173 / 1080) * 100}% ${(593 / 1920) * 100}%
            )`,
          }}
        />

        {/* SVG overlay for line-drawing animation */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1080 1920"
          fill="none"
        >
          <rect
            ref={innerBoxRef}
            x="173"
            y="593"
            width="733"
            height="733"
            rx="6"
            stroke="white"
            strokeWidth="4"
          />
          <rect
            ref={outerBoxRef}
            x="71.5"
            y="491.5"
            width="937"
            height="937"
            rx="6"
            stroke="white"
            strokeWidth="4"
          />
          {/* Box frame materializes on top of the drawn lines */}
          <image
            ref={boxRef}
            href="/w42-box.png"
            x={71 - 937 * 0.0619}
            y={491 - 937 * 0.0619}
            width={937 + 937 * 0.0619 + 937 * 0.0053}
            height={937 + 937 * 0.0619 + 937 * 0.0053}
          />
        </svg>
      </div>
    </div>
  );
}
