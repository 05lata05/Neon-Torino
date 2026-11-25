// Facade types for the Unreal export: which facade material a building gets, and wall UVs that count floors and
// window bays, so a facade texture (one tile = one window bay × one floor) lines up with the real floors.
//
// Types and materials (one glTF material each, so Unreal can give each its own texture):
// - Facade_Block_*: the 1950s–70s apartment blocks that make most of Santa Rita (ochre, yellow, cream and grey plaster,
//   brick cladding);
// - Facade_Historic_*: older low houses (early 20th-century villini, old farmhouses), Turin yellow and ochre plaster;
// - Facade_Industrial, Facade_Commercial, Facade_Public, Facade_Church, Facade_Garage: by use.
// The use comes from the data (BF in data/torino.json: the OSM building tag, else the Arpa Piemonte use, see
// facade_use in tools/build_map.py), brick from OSM building:material.
//
// Invented details (not from data): OSM has no construction dates here, so the period is guessed: a residential or
// unknown building with at most 3 levels and a pitched roof is historic, any other one a 1950s–70s block; the plaster
// colour is picked from the type's palette by the building's position (stable when the data is refreshed); one window
// bay is about 3 m wide.

export const FACADE_MATERIALS = {
  Facade_Block_Ochre: ['#d9a66e', 0.9],
  Facade_Block_Yellow: ['#e8cf8e', 0.9],
  Facade_Block_Cream: ['#efe2c8', 0.9],
  Facade_Block_Grey: ['#c9c4ba', 0.9],
  Facade_Block_Brick: ['#b9785a', 0.9],
  Facade_Historic_Yellow: ['#e6c26a', 0.9],
  Facade_Historic_Ochre: ['#cf9350', 0.9],
  Facade_Historic_Cream: ['#eadbb8', 0.9],
  Facade_Industrial: ['#a9aaa5', 0.85],
  Facade_Commercial: ['#d6d3cc', 0.8],
  Facade_Public: ['#e2d6bf', 0.9],
  Facade_Church: ['#efe6d2', 0.9],
  Facade_Garage: ['#b3aea4', 0.9],
};
const PALETTE = {
  block: ['Facade_Block_Ochre', 'Facade_Block_Yellow', 'Facade_Block_Cream', 'Facade_Block_Grey', 'Facade_Block_Brick'],
  historic: ['Facade_Historic_Yellow', 'Facade_Historic_Ochre', 'Facade_Historic_Cream'],
};
const BY_USE = { c: 'church', p: 'public', m: 'commercial', i: 'industrial', g: 'garage', h: 'historic' };
export const BAY = 3; // metres

// type of a building: use = its BF character (upper case = brick), kind = B kind (0 generic 1 church 2 stadium
// 3 garage 4 school), pitched = it has a pitched roof
export function facadeType(use, kind, levels, pitched) {
  if (kind === 1) return 'church';
  if (kind === 3) return 'garage';
  if (kind === 2 || kind === 4) return 'public';
  const u = (use || 'u').toLowerCase();
  if (BY_USE[u]) return BY_USE[u];
  return levels <= 3 && pitched ? 'historic' : 'block';
}

// material of a facade type; at = the building's position in map metres (picks the colour)
export function facadeMaterial(type, brick, at) {
  const palette = PALETTE[type];
  if (!palette) return 'Facade_' + type[0].toUpperCase() + type.slice(1);
  if (brick && type === 'block') return 'Facade_Block_Brick';
  const x = Math.round(at[0]),
    y = Math.round(at[1]);
  const hash = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return palette[hash % palette.length];
}

// floor heights of a wall of height h: g = ground floor, f = each floor above (the export's height rule)
export function floorsOf(levels, kind, h) {
  if (levels >= 3 && kind === 0) return { g: 4, f: 3 };
  const f = h / Math.max(1, levels);
  return { g: f, f };
}

// V of a point at height dy above the foot of the wall: 0–1 on the ground floor, then +1 per floor
export const floorV = (dy, floors) => (dy <= floors.g ? dy / floors.g : 1 + (dy - floors.g) / floors.f);

// U length of a wall segment: a whole number of bays, so windows are not cut at the corners
// (segments shorter than half a bay keep their real width)
export const bays = len => (len < BAY / 2 ? len / BAY : Math.round(len / BAY));
