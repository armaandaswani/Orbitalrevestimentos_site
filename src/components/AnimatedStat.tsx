"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  className?: string;
}

export default function AnimatedStat({ value, className = "" }: Props) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  // Extract numeric part and suffix (e.g. "3,48m²" → num=3.48, suffix="m²")
  const match = value.match(/^([0-9][0-9,.]*)(.*)$/);
  const numStr = match?.[1] ?? "";
  const suffix = match?.[2] ?? "";
  const num = parseFloat(numStr.replace(",", "."));
  const decimalPlaces = numStr.includes(",") ? (numStr.split(",")[1]?.length ?? 0) : 0;

  useEffect(() => {
    const el = ref.current;
    if (!el || isNaN(num) || !match) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1600;
          const start = performance.now();

          const step = (ts: number) => {
            const p = Math.min((ts - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const current = ease * num;
            const formatted = current.toFixed(decimalPlaces).replace(".", ",");
            setDisplay(formatted + suffix);
            if (p < 1) requestAnimationFrame(step);
          };

          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [num, suffix, decimalPlaces, match]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
