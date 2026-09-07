"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUp, ImagePlus, RotateCcw, Download, Sun, Moon, X } from "lucide-react";

type Pos = { x: number; y: number };
type ActiveImage = 1 | 2;

// Inner box window in the 1080x1920 story space
const STORY = { w: 1080, h: 1920 };
const WINDOW = { x: 185.5, y: 603.5, w: 709, h: 713 };
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export default function Home() {
  const imageRef = useRef<HTMLImageElement>(null);
  const image2WrapRef = useRef<HTMLDivElement>(null);
  const image2InnerRef = useRef<HTMLDivElement>(null);
  const innerBoxRef = useRef<SVGRectElement>(null);
  const outerBoxRef = useRef<SVGRectElement>(null);
  const boxRef = useRef<SVGImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [isExportMode, setIsExportMode] = useState(false);
  const [imageSrc, setImageSrc] = useState("/woman-swimming.jpg");
  const [image2Src, setImage2Src] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#C1D4E5");
  const [bgColorDraft, setBgColorDraft] = useState("#C1D4E5");
  const [objectPos, setObjectPos] = useState<Pos>({ x: 50, y: 50 });
  const [objectPos2, setObjectPos2] = useState<Pos>({ x: 50, y: 50 });
  const [imageScale, setImageScale] = useState(100);
  const [imageScale2, setImageScale2] = useState(100);
  const [activeImage, setActiveImage] = useState<ActiveImage>(1);
  const [boxVariant, setBoxVariant] = useState<"hell" | "black">("hell");
  const [isExporting, setIsExporting] = useState(false);
  const [exportLog, setExportLog] = useState<string[]>([]);

  const boxAsset = boxVariant === "hell" ? "/box-top-view-hell.png" : "/box-top-view-black.png";
  const strokeColor = boxVariant === "hell" ? "white" : "#1a1a1a";

  const imageScaleRef = useRef(imageScale);
  imageScaleRef.current = imageScale;
  const imageScale2Ref = useRef(imageScale2);
  imageScale2Ref.current = imageScale2;

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  useEffect(() => {
    const isExport = new URLSearchParams(window.location.search).has("export");
    setIsExportMode(isExport);

    // In export mode, apply injected settings from Puppeteer
    if (isExport && (window as unknown as Record<string, unknown>).__exportSettings) {
      const s = (window as unknown as Record<string, unknown>).__exportSettings as {
        bgColor?: string;
        objectPos?: Pos;
        imageScale?: number;
        imageSrc?: string;
        image2Src?: string | null;
        objectPos2?: Pos;
        imageScale2?: number;
      };
      if (s.bgColor) { setBgColor(s.bgColor); setBgColorDraft(s.bgColor); }
      if (s.objectPos) setObjectPos(s.objectPos);
      if (s.imageScale) {
        setImageScale(s.imageScale);
        imageScaleRef.current = s.imageScale;
      }
      if (s.imageSrc) setImageSrc(s.imageSrc);
      if (s.image2Src) setImage2Src(s.image2Src);
      if (s.objectPos2) setObjectPos2(s.objectPos2);
      if (s.imageScale2) {
        setImageScale2(s.imageScale2);
        imageScale2Ref.current = s.imageScale2;
      }
    }
  }, []);

  const buildTimeline = useCallback(() => {
    if (tlRef.current) tlRef.current.kill();

    const innerBox = innerBoxRef.current;
    const outerBox = outerBoxRef.current;
    const image = imageRef.current;
    const image2Wrap = image2WrapRef.current;
    const image2Inner = image2InnerRef.current;
    const box = boxRef.current;
    const overlay = overlayRef.current;
    if (!innerBox || !outerBox || !image || !box || !overlay) return null;

    const innerLen = innerBox.getTotalLength();
    const outerLen = outerBox.getTotalLength();

    // Reset all elements
    gsap.set([innerBox, outerBox], { visibility: "visible", opacity: 0 });
    gsap.set(innerBox, { strokeDasharray: innerLen, strokeDashoffset: innerLen + 2 });
    gsap.set(outerBox, { strokeDasharray: outerLen, strokeDashoffset: outerLen + 2 });
    const baseScale = imageScaleRef.current / 100;
    gsap.set(image, { scale: 1.08 * baseScale, opacity: 1 });
    if (image2Wrap && image2Inner) {
      gsap.set(image2Wrap, { opacity: 0 });
      gsap.set(image2Inner, { scale: 1.06 });
    }
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

    tl.to([innerBox, outerBox], {
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
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

    const overlayDuration = 0.8;
    tl.to(overlay, {
      opacity: 1,
      duration: overlayDuration,
      ease: "power2.out",
    }, duration + fadeDuration);

    if (image2Wrap && image2Inner) {
      // Dissolve into the second image in lockstep with the colour overlay
      const crossfade = overlayDuration;
      const start = duration + fadeDuration;

      // Incoming eases out, outgoing eases in: their opacities always sum to >= 1,
      // so the background never bleeds through mid-dissolve.
      tl.to(image2Wrap, {
        opacity: 1,
        duration: crossfade,
        ease: "power2.out",
      }, start);

      tl.to(image, {
        opacity: 0,
        duration: crossfade,
        ease: "power2.in",
      }, start);

      // Slow settle on the incoming image, gentle push on the outgoing one
      tl.to(image2Inner, {
        scale: 1,
        duration: crossfade + 1.2,
        ease: "power2.out",
      }, start);

      tl.to(image, {
        scale: 1.04 * baseScale,
        duration: crossfade,
        ease: "power1.inOut",
      }, start);
    }

    // Hold final frame for 3 seconds so the video doesn't end abruptly
    tl.to({}, { duration: 3 });

    tlRef.current = tl;
    // Exposed for the Puppeteer export and for scrubbing during development
    (window as unknown as Record<string, unknown>).__timeline = tl;

    return tl;
  }, []);

  useEffect(() => {
    const tl = buildTimeline();
    // While editing the second image, show the final frame so it can be framed inside the box
    if (tl && activeImage === 2) tl.progress(1).pause();
    return () => { if (tl) tl.kill(); };
  }, [buildTimeline, image2Src, activeImage]);

  const replay = () => {
    setActiveImage(1);
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
      setActiveImage(1);
      buildTimeline();
    } catch (err) {
      setExportLog((prev) => [
        ...prev,
        `Fehler: ${err instanceof Error ? err.message : "Unbekannt"}`,
      ]);
    }
    setIsExporting(false);
  };

  // --- Drag to reposition the active image ---
  const activePos = activeImage === 2 ? objectPos2 : objectPos;
  const setActivePos = activeImage === 2 ? setObjectPos2 : setObjectPos;
  const activeScale = activeImage === 2 ? imageScale2 : imageScale;
  const setActiveScale = activeImage === 2 ? setImageScale2 : setImageScale;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isExportMode) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: activePos.x, posY: activePos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !storyRef.current) return;
    const rect = storyRef.current.getBoundingClientRect();
    // Image 2 lives inside the box window, so measure the drag against that
    const refW = activeImage === 2 ? rect.width * (WINDOW.w / STORY.w) : rect.width;
    const refH = activeImage === 2 ? rect.height * (WINDOW.h / STORY.h) : rect.height;
    const dx = ((e.clientX - dragStart.current.x) / refW) * 100;
    const dy = ((e.clientY - dragStart.current.y) / refH) * 100;
    setActivePos({
      x: Math.max(-50, Math.min(150, dragStart.current.posX - dx)),
      y: Math.max(-50, Math.min(150, dragStart.current.posY - dy)),
    });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // --- File upload ---
  const readFile = (file: File, onLoad: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => onLoad(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (src) => {
      setImageSrc(src);
      setObjectPos({ x: 50, y: 50 });
      setActiveImage(1);
    });
    e.target.value = "";
  };

  const handleFile2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (src) => {
      setImage2Src(src);
      setObjectPos2({ x: 50, y: 50 });
      setImageScale2(100);
      setActiveImage(2);
    });
    e.target.value = "";
  };

  const removeImage2 = () => {
    setImage2Src(null);
    setActiveImage(1);
  };

  return (
    <div
      className={`flex items-center justify-center h-screen ${isExportMode ? "" : "gap-6 p-8"}`}
      style={{ background: bgColor }}
    >
      {/* Toolbar */}
      {!isExportMode && (
        <Card className="w-72 shrink-0">
          <CardHeader>
            <CardTitle>Story</CardTitle>
            <CardDescription>Bild, Box und Hintergrund anpassen.</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInput2Ref}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile2Change}
            />

            {/* Image */}
            <div className="grid gap-2">
              <Label htmlFor="image-upload">Bild</Label>
              <Button
                id="image-upload"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-start"
              >
                <ImageUp data-icon="inline-start" />
                Bild wählen
              </Button>
            </div>

            {/* Second image (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="image2-upload">Zweites Bild</Label>
              {image2Src ? (
                <div className="flex items-center gap-2 rounded-lg border border-input p-1.5 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image2Src}
                    alt=""
                    className="size-9 shrink-0 rounded-md object-cover"
                  />
                  <Button
                    id="image2-upload"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInput2Ref.current?.click()}
                    className="flex-1 justify-start"
                  >
                    Ersetzen
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={removeImage2}
                    aria-label="Zweites Bild entfernen"
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <Button
                  id="image2-upload"
                  variant="outline"
                  onClick={() => fileInput2Ref.current?.click()}
                  className="w-full justify-start"
                >
                  <ImagePlus data-icon="inline-start" />
                  Bild hinzufügen
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Optional. Wird nach dem Mood eingeblendet und beendet die Story.
              </p>
            </div>

            {/* Box variant */}
            <div className="grid gap-2">
              <Label>Box</Label>
              <ToggleGroup
                value={[boxVariant]}
                onValueChange={(v) => { if (v.length) setBoxVariant(v[v.length - 1] as "hell" | "black"); }}
                variant="outline"
                spacing={0}
                className="w-full"
              >
                <ToggleGroupItem value="hell" className="flex-1">
                  <Sun data-icon="inline-start" />
                  Hell
                </ToggleGroupItem>
                <ToggleGroupItem value="black" className="flex-1">
                  <Moon data-icon="inline-start" />
                  Schwarz
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Background color */}
            <div className="grid gap-2">
              <Label htmlFor="bg-color">Hintergrund</Label>
              <div className="flex items-center gap-2">
                <label
                  className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
                  style={{ background: bgColor }}
                  aria-label="Farbe wählen"
                >
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); setBgColorDraft(e.target.value); }}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </label>
                <Input
                  id="bg-color"
                  value={bgColorDraft.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setBgColorDraft(v);
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) setBgColor(v);
                  }}
                  onBlur={() => setBgColorDraft(bgColor)}
                  maxLength={7}
                  spellCheck={false}
                  className="font-mono uppercase"
                />
              </div>
            </div>

            {/* Position & zoom */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="zoom">Zoom</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {activeScale}%
                </span>
              </div>
              {image2Src && (
                <ToggleGroup
                  value={[String(activeImage)]}
                  onValueChange={(v) => { if (v.length) setActiveImage(Number(v[v.length - 1]) as ActiveImage); }}
                  variant="outline"
                  size="sm"
                  spacing={0}
                  className="w-full"
                >
                  <ToggleGroupItem value="1" className="flex-1">Bild 1</ToggleGroupItem>
                  <ToggleGroupItem value="2" className="flex-1">Bild 2</ToggleGroupItem>
                </ToggleGroup>
              )}
              <Slider
                id="zoom"
                min={50}
                max={200}
                marks={[100]}
                value={[activeScale]}
                onValueChange={(v) => {
                  const n = Array.isArray(v) ? v[0] : v;
                  // Snap gently to the original size
                  setActiveScale(Math.abs(n - 100) <= 2 ? 100 : n);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Die Markierung zeigt die Originalgröße. Zum Positionieren das Bild in der Vorschau ziehen.
              </p>
            </div>

            {/* Export log */}
            {exportLog.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg bg-muted p-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
                {exportLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="gap-2">
            <Button variant="outline" onClick={replay} className="flex-1">
              <RotateCcw data-icon="inline-start" />
              Replay
            </Button>
            <Button
              onClick={exportVideo}
              disabled={isExporting}
              className="flex-1"
            >
              <Download data-icon="inline-start" />
              {isExporting ? "Exportiert…" : "Export"}
            </Button>
          </CardFooter>
        </Card>
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

        {/* Optional second image: fitted inside the box window, never cropped at 100% */}
        {image2Src && (
          <div
            ref={image2WrapRef}
            className="absolute overflow-hidden"
            style={{
              left: pct(WINDOW.x, STORY.w),
              top: pct(WINDOW.y, STORY.h),
              width: pct(WINDOW.w, STORY.w),
              height: pct(WINDOW.h, STORY.h),
              opacity: 0,
            }}
          >
            <div ref={image2InnerRef} className="size-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image2Src}
                alt="Second story image"
                draggable={false}
                className="size-full object-contain select-none"
                style={{
                  transform: `translate(${50 - objectPos2.x}%, ${50 - objectPos2.y}%) scale(${imageScale2 / 100})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Color overlay that fades in to cover image outside the box */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: bgColor,
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
              ${(185.5 / 1080) * 100}% ${(603.5 / 1920) * 100}%,
              ${(185.5 / 1080) * 100}% ${(1316.5 / 1920) * 100}%,
              ${(894.5 / 1080) * 100}% ${(1316.5 / 1920) * 100}%,
              ${(894.5 / 1080) * 100}% ${(603.5 / 1920) * 100}%,
              ${(185.5 / 1080) * 100}% ${(603.5 / 1920) * 100}%
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
            x="185.5"
            y="603.5"
            width="709"
            height="713"
            rx="18"
            stroke={strokeColor}
            strokeWidth="3"
          />
          <rect
            ref={outerBoxRef}
            x="71.5"
            y="491.5"
            width="937"
            height="937"
            rx="6"
            stroke={strokeColor}
            strokeWidth="4"
          />
          <image
            ref={boxRef}
            href={boxAsset}
            x={71.5}
            y={487.5}
            width={1049}
            height={1044}
            preserveAspectRatio="none"
          />
        </svg>
      </div>
    </div>
  );
}
