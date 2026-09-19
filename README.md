# Lumora

Lumora is an original casual puzzle game in a soft **isometric 3D** world. You guide **Nuri**, a small living spark, across extruded platforms. Nuri glides in a chosen direction until a crystal or the rim stops them.

**Win condition:** restore **every floor tile** with Nuri’s energy wake. Later worlds add hazards and helpers (rifts, wells, seals, vanes, foldgates) on top of that cover-all goal. Each lattice shifts its accent color inside the world theme.

## Play locally

```bash
npm install
npm run dev
```

Open the printed local URL. First visit jumps into a short lattice so the glide is learned immediately.

Debug (development only): `?debug`

- F2 grid
- F3 solution
- F4 unlock all
- F5 complete
- F8 step solution

## Production build

```bash
npm run build
npm run preview
```

Upload the `dist/` folder as the HTML5 package. Keep `index.html` at the root of the upload.

## Identity

| Term | Meaning |
| --- | --- |
| Lumora | The sleeping universe of lattices |
| Nuri | The player creature |
| Gleams | Cosmetic currency |
| Anchors | Sleeping energy blossoms to awaken |
| Wells | Pools that charge when Nuri rests on them |
| Rifts | Unstable tears that unravel a run |
| Seals | Closed rings that open after anchors wake |
| Foldgates | Paired shortcuts |
| Drift vanes | Tiles that turn a glide |
| Dayweave | Daily lattice |

## Platform

CrazyGames SDK v3 is loaded from the official CDN and wrapped in `PlatformService`. The game runs fully without the SDK (local mock / missing script).

Ads (midgame) are requested only after a restored lattice, never during the first Emberwake lessons or while Nuri is gliding.

There is no in-game fullscreen control (CrazyGames provides fullscreen).
