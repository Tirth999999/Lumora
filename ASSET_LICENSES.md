# Asset licenses

All gameplay art, UI, particles, trails, creature rendering, palettes, and audio in Lumora are original to this project and generated at runtime (Canvas + Web Audio). No third-party image, sound, or music files are bundled.

## Runtime libraries

| Asset | Source | License | Use |
| --- | --- | --- | --- |
| Vite (dev/build) | https://vitejs.dev | MIT | Bundler only, not shipped as a game asset |
| CrazyGames SDK v3 | https://sdk.crazygames.com/crazygames-sdk-v3.js | CrazyGames platform license | Optional platform integration, loaded from CDN at runtime |

## Fonts

| Asset | Source | License | Use |
| --- | --- | --- | --- |
| Sora | Google Fonts | OFL 1.1 | UI body |
| Fraunces | Google Fonts | OFL 1.1 | Titles / logo |

Loaded via Google Fonts CDN at runtime. No font files are bundled in the package.

## Audio

Movement tones, collisions, activations, completion phrases, and the ambient pad are synthesized in `src/audio/AudioService.js` with the Web Audio API. No sampled music or SFX packs are used.
