# Neon Torino roadmap

Automatic work: ON

> Every night a Claude session does the first unchecked box and, if the GitHub test is green, merges it into `main`
> by itself (rules in `docs/AUTOMATION.md`). Boxes marked `(needs review)` stay in a pull request that you approve.
> Boxes marked `(manual)` are skipped. To stop it write `PAUSED` instead of `ON` above.

How to use it: each work session takes **the first free box** of the current milestone (a box with an open pull
request is taken), claims it with a draft pull request, works on a dedicated branch (`feature/<name>`), passes
`npm test` and ticks the box here. Details in `CONTRIBUTING.md`.
A finished milestone = a playable version with something new to try.

Legend: `[x]` done · `[ ]` to do · `(~N sessions)` rough estimate · `(manual)` done in a session with the owner · `(needs review)` changes how the game looks: the owner does the merge

## Vision

**Neon Torino is a GTA-style crime open world set in the real Turin.** You drive a lot, escape the police, discover
the city's landmarks and build a small empire of businesses starting from Santa Rita. It runs in the browser, on PC
and phone, and is shared with a link.

Pillars, in order of importance:
1. **Recognisable Turin**: every zone follows the realism standard (`docs/REALISM.md`).
2. **Driving and chases**: the heart of the fun.
3. **Money and empire**: buying and growing businesses in the district.
4. **GTA-style crime**: police, gangs, weapons, with Turin irony. The story is light, tied to the businesses.
5. **Play anywhere**: on friends' phones too.

---

## M0 · Project base — done
- [x] Santa Rita city from OpenStreetMap data (roads, buildings, parks, trams 4 and 10)
- [x] Driving, traffic, pedestrians, police with helicopter, 4 mission types, garage, radio, weather, day and night
- [x] Real landmarks: Stadio Olimpico Grande Torino, Torre Maratona, Braciere, Inalpi Arena, pools, Centrale del Latte, Economia (SME), Parco Rignon and Villa Amoretti
- [x] Map generator from OSM (`tools/build_map.py`) and GitHub repository

## M1 · Foundations — done
Goal: being able to grow the game without breaking it.
- [x] Split `src/main.js` into modules by topic (`core`, `world`, `entities`, `gameplay`, `render`, `ui`, `audio`)
- [x] Test with simulated play (walking, driving, getting out, map, pause, wanted level)
- [x] Automatic test on GitHub on every push (GitHub Actions + Playwright) (~1)
- [x] Remove the shared `G` object: every variable has an owner module with `export let` and a `set…()` function
- [x] Balance constants (cars, rewards, police, traffic, timings, prices) in `src/config.js`
- [x] Performance measurement in the test (draw calls, triangles, simulation time) on PC and emulated phone, with limits; in-game fps overlay (I key)
- [x] Code, comments and docs in English; game text in Italian and English (L key switches language)

## M2 · Believable Santa Rita — in progress
Goal: anyone who knows Santa Rita recognises it. Everything according to `docs/REALISM.md`.
- [x] Data sources: real heights from Arpa Piemonte "Edifici 3D 2017" (eaves height from the City of Turin); Overture rejected (few heights in Italy); terrain model postponed to M7 for Superga
- [x] Real building heights in the generator: buildings without data down from 625 to 94
- [x] Light and atmosphere 1/3: realistic sky (gradient dome with sun glow, night light pollution) and horizon haze that the fog blends into (needs review) (~1)
- [ ] Light and atmosphere 2/3: high and low graphics levels, ambient occlusion on high (needs review) (~1)
- [ ] Light and atmosphere 3/3: reflective wet asphalt when it rains (needs review) (~1)
- [ ] Materials with CC0 photographic textures (plaster, asphalt, sidewalks, porphyry, stone) and `docs/CREDITS.md` (needs review) (~1)
- [ ] Santa Rita buildings: façades by type and period (1950s–70s apartment blocks, continuous raised balconies, roller shutters, real colours) (needs review) (~2)
- [ ] Santuario di Santa Rita da Cascia and its square with the market (needs review) (~1)
- [ ] Real signs of the OSM shops and venues (about 390) on the ground floor, in their position (needs review) (~1)
- [ ] Street furniture: the 666 real trees, GTT stops, bins, newsstands, street name plates, parked cars (needs review) (~2)
- [ ] Before/after pictures of 5 spots in the district in the README (~1)

## M3 · Driving and chases
Goal: driving around Santa Rita must be fun on its own.
- [ ] More believable car physics: weight, load transfer, controllable drifts, suspension (~2)
- [ ] Visible damage: dents, broken glass, smoke, wheels coming off (~1)
- [ ] Motorbikes and new vehicles, including typical Turin ones (vans, vintage city cars, GTT buses to steal) (~1–2)
- [ ] Smarter police: roadblocks, encirclements, cars ramming at 4–5 stars (~1–2)
- [ ] Street races with fixed routes and records to beat (~1)
- [ ] Rewarded stunts: jumps, long drifts, near misses (~1)

## M4 · Play anywhere
Goal: send the link to friends and let them play, from the phone too.
- [ ] Touch controls: virtual stick, buttons for handbrake, nitro, get in/out (~1–2)
- [ ] Interface that adapts to the phone screen (HUD, map, menus): today in portrait the text goes off screen, see `tests/out/perf-phone-street.png` (~1)
- [ ] Graphics that adjust themselves to the performance (~1)
- [ ] Start menu with options (audio, graphics, controls, language) and reliable saving (~1)
- [ ] Public link updated with every version and instructions for friends (manual) (~1)

## M5 · Money and empire
Goal: a reason to make money and a district to conquer.
- [ ] Economy: income, expenses, prices balanced in `src/config.js` (~1)
- [ ] Businesses to buy (invented): bar, garage, car wash, newsstand; they earn every game day (~2)
- [ ] Each business brings 2–3 missions from its "boss" (the game's light story) (~2)
- [ ] Workshop: tuning cars (engine, brakes, tyres, colours, neon) (~1)
- [ ] Home in Santa Rita with saving and a personal garage (~1)

## M6 · GTA-style crime
Goal: the criminal side.
- [ ] Player health and armour, bar in the HUD (~1)
- [ ] Punches and auto-aim on the nearest target (~1)
- [ ] Weapons (pistol, then others) with ammo and a gun shop (~2)
- [ ] Death → hospital, arrest → police station, losing money or weapons (~1)
- [ ] Police on foot getting out of their cars and chasing (~1)
- [ ] Rival gangs fighting over zones and attacking your businesses; racket (~2)

## M7 · Iconic Turin
Goal: the map grows along the boulevards towards the city's landmarks. **Every zone passes the `docs/REALISM.md` checklist.**
- [ ] Borgo Filadelfia and Stadio Filadelfia (needs review) (~1–2)
- [ ] Lingotto, with the track on the roof of the former factory (needs review) (~2)
- [ ] Porta Nuova and the centre up to piazza Castello and the Mole (needs review) (~3)
- [ ] The Po and the Murazzi, with the bridges (needs review) (~2)
- [ ] Superga and the hill, with real terrain (needs review) (~2)
- [ ] Secrets and collectibles in every zone (~1)
- [ ] Loading the city in pieces (and possibly moving to Vite) when the map gets big (~1)

---

## Ideas on hold (not yet in a milestone)
- Radio with hosts and neighbourhood news
- Sunday matches at the stadium, with crowds and traffic
- Neighbourhood market in piazza Santa Rita with animated stalls
- Drivable GTT trams
