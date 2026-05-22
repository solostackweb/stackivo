"use client";

/**
 * BrandLoader — the visual heartbeat of Stackivo.
 *
 * The Stackivo mark (gradient rounded-rect + two white pill bars) animates
 * with a calm, GPU-only breath cycle. No layout thrashing, no expensive
 * paint ops — every moving part uses `transform` and `opacity` exclusively.
 *
 * Sizes:
 *   sm  — 32 px  (inline, button area)
 *   md  — 56 px  (section / card centre)
 *   lg  — 80 px  (page-level)
 *   xl  — 112 px (splash / fullscreen)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type BrandLoaderSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<BrandLoaderSize, { px: number; rx: number; bars: { y: number; h: number; w: number; x: number }[] }> = {
  sm: {
    px: 32,
    rx: 7,
    bars: [
      { x: 6,  y: 9,  w: 20, h: 5 },
      { x: 8,  y: 18, w: 18, h: 5 },
    ],
  },
  md: {
    px: 56,
    rx: 12,
    bars: [
      { x: 10, y: 16, w: 36, h: 9  },
      { x: 13, y: 31, w: 30, h: 9  },
    ],
  },
  lg: {
    px: 80,
    rx: 17,
    bars: [
      { x: 15, y: 23, w: 50, h: 13 },
      { x: 19, y: 44, w: 42, h: 13 },
    ],
  },
  xl: {
    px: 112,
    rx: 24,
    bars: [
      { x: 21, y: 32, w: 70, h: 18 },
      { x: 27, y: 62, w: 58, h: 18 },
    ],
  },
};

interface BrandLoaderProps {
  size?: BrandLoaderSize;
  /** When true, the icon breathes. When false, it renders static (use after load). */
  animate?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function BrandLoader({
  size = "md",
  animate = true,
  className,
  "aria-label": ariaLabel = "Loading…",
}: BrandLoaderProps) {
  const { px, rx, bars } = SIZE[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={cn(
        // Reduced-motion: freeze the animation immediately via CSS
        animate && "motion-safe:animate-brand-breathe",
        "will-change-[opacity,transform]",
        className,
      )}
    >
      <defs>
        <linearGradient id={`sg-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        {/* Subtle inner glow for premium feel */}
        <filter id={`glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={px * 0.04} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background rounded rect */}
      <rect
        width={px}
        height={px}
        rx={rx}
        ry={rx}
        fill={`url(#sg-${size})`}
        filter={`url(#glow-${size})`}
      />

      {/* White pill bars — staggered bar-reveal on mount */}
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          rx={bar.h / 2}
          ry={bar.h / 2}
          fill="#FFFFFF"
          opacity={i === 1 ? 0.92 : 1}
          className={cn(
            animate && "motion-safe:animate-bar-reveal",
          )}
          style={
            animate
              ? { animationDelay: `${i * 120}ms`, animationFillMode: "both" }
              : undefined
          }
        />
      ))}
    </svg>
  );
}
