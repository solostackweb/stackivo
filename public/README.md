# `public/` — static assets & PWA

Files served verbatim from the site root.

## PWA assets

| File | Purpose |
| --- | --- |
| `manifest.webmanifest` | App manifest. Wired into `<head>` via `app/layout.tsx`. |
| `icon.svg` | Primary brand icon (any purpose). |
| `icon-maskable.svg` | Maskable variant — keeps glyph inside the safe zone for circle/squircle masks on Android. |
| `apple-touch-icon.svg` | iOS home-screen icon. |
| `offline.html` | Static fallback page served by the service worker when navigation fails. |
| `sw.js` | Service worker. Conservative caching — never caches `/api/*` or `/auth/*`. Bump `CACHE_VERSION` whenever you change it. |

## Generating PNG icons (optional but recommended for stricter Lighthouse audits)

Modern Chrome, Edge, and Firefox accept SVG icons in the manifest, so the
defaults above will install on those platforms. For maximum compatibility
with older Android launchers and iOS Safari "Add to Home Screen", export the
following PNG sizes from `icon.svg` and add them to the manifest:

```
/icons/icon-192.png        (192×192, purpose: any)
/icons/icon-512.png        (512×512, purpose: any)
/icons/icon-maskable-192.png (192×192, purpose: maskable)
/icons/icon-maskable-512.png (512×512, purpose: maskable)
/apple-touch-icon.png      (180×180)
```

A one-time generation pipeline (e.g. `pwa-asset-generator`, ImageMagick, or a
design tool export) is enough — these assets are immutable per brand version.

## Cache-busting the service worker

After modifying `sw.js`, increment `CACHE_VERSION` (e.g. `stackivo-v1` →
`stackivo-v2`). The `activate` handler will purge stale caches on rollout.
