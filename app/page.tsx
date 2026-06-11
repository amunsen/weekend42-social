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

  useEffect(() => {
    const innerBox = innerBoxRef.current;
    const outerBox = outerBoxRef.current;
    const image = imageRef.current;
    const box = boxRef.current;
    if (!innerBox || !outerBox || !image || !box) return;

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

    gsap.set(image, { scale: 1.08, clipPath: "inset(0% 0% 0% 0% round 0px)", willChange: "clip-path, transform" });
    gsap.set(box, { opacity: 0 });

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

    // 3. Then crop + shrink after box is fully visible
    const cropStart = duration + fadeDuration;
    const cropDuration = 0.8;

    tl.to(image, {
      clipPath: `inset(${(593 / 1920) * 100}% ${(174 / 1080) * 100}% ${(594 / 1920) * 100}% ${(173 / 1080) * 100}% round 6px)`,
      duration: cropDuration,
      ease: cubicBezier(0.33, 1, 0.68, 1),
    }, cropStart);

    tl.to(box, {
      scale: 841 / 937,
      svgOrigin: "539.5 959.5",
      duration: cropDuration,
      ease: cubicBezier(0.16, 1, 0.3, 1),
    }, cropStart);

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
