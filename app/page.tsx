"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number) => {
    let start = 0, end = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (start + end) / 2;
      const x = 3 * (1 - mid) ** 2 * mid * x1 + 3 * (1 - mid) * mid ** 2 * x2 + mid ** 3;
      if (x < t) start = mid; else end = mid;
    }
    const m = (start + end) / 2;
    return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m ** 2 * y2 + m ** 3;
  };
}

export default function Home() {
  const imageRef = useRef<HTMLImageElement>(null);
  const innerBoxRef = useRef<SVGRectElement>(null);
  const outerBoxRef = useRef<SVGRectElement>(null);
  const boxRef = useRef<SVGImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const innerBox = innerBoxRef.current;
    const outerBox = outerBoxRef.current;
    const image = imageRef.current;
    const box = boxRef.current;
    const overlay = overlayRef.current;
    if (!innerBox || !outerBox || !image || !box || !overlay) return;

    const innerLen = innerBox.getTotalLength();
    const outerLen = outerBox.getTotalLength();

    gsap.set(innerBox, {
      strokeDasharray: innerLen,
      strokeDashoffset: innerLen,
    });
    gsap.set(outerBox, {
      strokeDasharray: outerLen,
      strokeDashoffset: outerLen,
    });

    gsap.set(image, { scale: 1.08 });
    gsap.set(box, { opacity: 0 });
    gsap.set(overlay, { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.3 });
    const duration = 1.2;
    const delay = 0.1;

    tl.to(image, {
      scale: 1,
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

    // 2. Box materializes first
    const fadeDuration = 0.6;
    tl.to(box, {
      opacity: 1,
      duration: fadeDuration,
      ease: "power2.out",
      onComplete: () => {
        innerBox.remove();
        outerBox.remove();
      },
    }, duration);

    // 3. Fade in color overlay to cover image outside the box
    tl.to(overlay, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    }, duration + fadeDuration);


    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-[#C1D4E5] p-8">
      <div className="relative h-full max-h-full aspect-[9/16] rounded-lg shadow-2xl overflow-hidden bg-[#C1D4E5]">
        <Image
          ref={imageRef}
          src="/woman-swimming.jpg"
          alt="Woman swimming"
          fill
          className="object-cover"
          priority
        />

        {/* Color overlay that fades in to cover image outside the box */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "#C1D4E5",
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
          className="absolute inset-0 w-full h-full"
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
