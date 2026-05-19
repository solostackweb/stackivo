import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { createElement as h } from "react";

export const runtime = "edge";

/**
 * Serves the Stackivo brand mark as a rasterised PNG at any requested size.
 *
 * Used by:
 *   - manifest.webmanifest  → /api/pwa-icon/192  and  /api/pwa-icon/512
 *   - <link rel="apple-touch-icon">  → /api/pwa-icon/180
 *   - Favicon fallback  → /api/pwa-icon/32
 *
 * ?maskable=1  adds a 10 % safe-zone inset so the icon looks correct when
 * adaptive / maskable icon masking is applied on Android.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await context.params;
  const size = Math.min(1024, Math.max(16, parseInt(sizeParam, 10) || 512));
  const maskable = req.nextUrl.searchParams.has("maskable");

  // For maskable icons the safe-zone spec recommends ≥ 10 % on each side.
  const scale = maskable ? 0.78 : 1;
  const inner = Math.round(size * scale);

  // Proportions from StackivoMark (stackivo-logo.tsx) viewBox 0 0 512 512:
  //   bar width   = 280 / 512 ≈ 54.7 %
  //   bar height  =  76 / 512 ≈ 14.8 %
  //   bar radius  =  38 / 512 ≈  7.4 %
  //   h-offset    =  40 / 512 ≈  7.8 %  (bar2 x=136 vs bar1 x=96)
  //   gap         =  64 / 512 ≈ 12.5 %  (y=288 minus y=148 minus h=76 = 64)
  //   left pad    =  96 / 512 ≈ 18.75 % (bar1 starts at x=96)
  const barW = Math.round(inner * 0.547);
  const barH = Math.round(inner * 0.148);
  const barR = Math.round(inner * 0.074);
  const offset = Math.round(inner * 0.078);
  const gap = Math.round(inner * 0.125);
  const leftPad = Math.round(inner * 0.1875);

  const tree = h(
    "div",
    {
      style: {
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #6366F1 0%, #4338CA 100%)",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap,
          width: barW + offset + leftPad,
        },
      },
      h("div", {
        style: {
          width: barW,
          height: barH,
          background: "white",
          borderRadius: barR,
          marginLeft: leftPad,
        },
      }),
      h("div", {
        style: {
          width: barW,
          height: barH,
          background: "rgba(255,255,255,0.92)",
          borderRadius: barR,
          marginLeft: leftPad + offset,
        },
      }),
    ),
  );

  return new ImageResponse(tree, { width: size, height: size });
}
