# Neon Torino architecture (browser game)

> This describes the frozen Three.js browser game. The game is now made with Unreal Engine: see `unreal/README.md`.
> The data part (OpenStreetMap → `tools/` → `data/torino.json`) is shared by both.

## The flow

```
OpenStreetMap ──fetch_osm.py──▶ .osm-cache/*.osm ──build_map.py──▶ data/torino.json ──▶ src/ (ES modules) ──▶ browser
```

1. **Data** (`tools/`): the generator turns OSM data into a compact JSON (integer-encoded polylines).
   The classification rules are documented at the top of `build_map.py`.
2. **Game** (`src/`): ES modules loaded directly by the browser, no build. Three.js 0.160 from the import map.
3. **Landmarks** (`src/landmarks/`): modules that receive a `kit` and the real shapes (`DATA.L`).

## The modules

```
src/
  config.js          balance: cars, rewards, police, traffic, timings, prices (every number to tune)
  main.js            start-up: calls the init()s in order, populates the city, game loop, debug tools
  i18n/              index.js (t(), num(), current language, L key) · strings.js (Italian and English text)
  core/              render.js · util.js · state.js (game state) · update.js · input.js
  world/             map.js (data, grid, road graph) · ground.js · lights.js · city.js · skyline.js · sky.js · weather.js · effects.js
  entities/          vehicles.js · traffic.js · peds.js · police.js · heli.js · trams.js · collisions.js · spawn.js
  gameplay/          player.js · missions.js · garage.js · tokens.js · ramps.js
  render/            models.js · sync.js · camera.js · quality.js
  ui/                hud.js · map.js · perf.js (performance overlay, I key)
  audio/             sfx.js · radio.js
  landmarks/         kit.js · stadium.js · pools.js · centrale-latte.js · sme.js · rignon.js
```

Every file starts with a line saying what it is for.

### Module rules

- **Exported functions** (`export function …`): can be called from any module, at any time.
- **`export let`**: values created at start-up (textures, materials, lists). Other modules only **read** them.
- **`init()`**: the code that builds the world. `main.js` calls the `init()`s in a precise order (the same as the
  old single file): in its `init()` a module may only use things created by earlier `init()`s.
- **Shared state**: every variable that changes during play belongs to **exactly one module**, which declares it
  with `export let` and offers a `set…()` function to change it (e.g. `money` and `setMoney()` in `core/state.js`,
  `rain` and `setRain()` in `world/weather.js`). Other modules read it by importing it and change it **only** through
  the setter: `setMoney(money + 50)`. That way it is always clear who owns what and who changes it.

Circular imports are allowed and harmless: at module level there are only declarations, the real work happens in
the `init()`s and in the game loop.

### Player-facing text (Italian and English)

- Every string the player reads lives in `src/i18n/strings.js` as `'key': { it: '…', en: '…' }` and is shown with
  `t('key', { placeholder: value })`. A value can be an array of alternatives (pick one with `pick(t('key'))`).
- Numbers shown to the player go through `num(n, decimals)` (thousands separators and decimal comma follow the language).
- The **L** key switches language (`toggleLang()`); the choice is saved in `localStorage` (`neontorino_lang`),
  otherwise the browser language decides. Text is translated when drawn, so switching is instant.
- Real Italian names are not translated: shop signs, landmark lettering, street names, radio station names.
- A module with a local variable called `t` imports the function as `t as tr` to avoid shadowing.

### Where to put something new

| I want to add… | Where |
|---|---|
| a new vehicle type | `VEHICLES` in `src/config.js`, its name in `src/i18n/strings.js`, the model in `render/models.js` |
| a mission | `gameplay/missions.js` (in future: data in `data/missions/`) |
| a HUD element | `ui/hud.js` (text in `src/i18n/strings.js`) |
| a famous building | a module in `src/landmarks/` (see README) |
| a new mechanic (e.g. weapons) | a new module in `gameplay/` with its own `init()`, registered in `main.js` |

## Coordinates

| Space | Units | Use |
|---|---|---|
| map metres | 1 m, x towards east, y towards south, fixed origin (`ORIGIN` in `build_map.py`) | `torino.json` |
| world | 5 units = 1 m, shifted by `(clip.x0 - 50, clip.y0 - 50)` | the whole game; in Three.js `x = east`, `z = south`, `y = up` |
| grid | 10-unit cells (2 m) | collisions (`grid`) and camera heights (`hgrid`) |

`toW([x, y])` converts from map metres to world.

## The game loop

`frame()` in `main.js` → `update(dt)` (`core/update.js`) → `syncScene(dt)` (`render/sync.js`) → `updateCamera` and
`updateEnv` (`render/camera.js`) → render → `drawHUD` (`ui/hud.js`) → audio.

Hooks: `envHooks` (functions `dk => …` receiving darkness from 0 to 1) and `kit.onTick` for landmark animations.

## Tests and debugging

`npm test` starts the game in headless Chromium, checks there are no errors, photographs the landmarks and plays
a short game (walking, driving, getting out, map, pause, wanted level, tokens, language switch). `window.__nr` exposes
the state and some commands: `step(seconds)` advances the simulation in fixed steps, `cam = {x,y,z,lx,ly,lz}` a free
camera, `setHour(h)`, `startGame()`, `spawnCar(type)`, `teleport(x, y)`, `perf()`, `setQuality(q)`, `lang`.

**Performance:** the test measures draw calls, triangles and simulation time on PC (high graphics) and on an
emulated phone (low graphics) and fails if the limits written in `tests/smoke.mjs` are exceeded; the values end up
in `tests/out/perf.json`. Without a graphics card fps cannot be measured: check them in the game with the I key.

**Balance:** to change rewards, prices, speeds or difficulty edit only `src/config.js`.

Formatting: `npm run format` (Prettier, configuration in `.prettierrc.json`).
