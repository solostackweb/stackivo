"use client";

/**
 * SectionLoader — centered brand loader for card / panel interiors.
 *
 * Use when a specific section is fetching data but the surrounding
 * layout is already rendered (e.g., a tab panel, a modal body, a
 * right-rail widget that loads independently).
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { BrandLoader } from "./brand-loader";

interface SectionLoaderProps {
  /** Minimum height of the placeholder area. */
  minHeight?: string;
  className?: string;
}

export function SectionLoader({
  minHeight = "160px",
  className,
}: SectionLoaderProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        className,
      )}
      style={{ minHeight }}
      aria-busy="true"
      aria-live="polite"
    >
      <BrandLoader size="sm" animate />
    </div>
  );
}
