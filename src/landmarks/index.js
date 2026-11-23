// Landmark registry. To add one: create a module exporting `default function build(kit, L)`,
// add its OSM shapes to tools/build_map.py (LANDMARKS) and import it here.
import { makeKit } from './kit.js';
import stadium from './stadio.js';
import pools from './piscine.js';
import centraleLatte from './centrale-latte.js';
import sme from './sme.js';
import rignon from './rignon.js';

const MODULES = { stadium, pools, centraleLatte, sme, rignon };

export function initLandmarks(ctx) {
  const kit = makeKit(ctx),
    L = ctx.DATA.L || {},
    errors = [];
  for (const [name, build] of Object.entries(MODULES)) {
    try {
      build(kit, L);
    } catch (err) {
      errors.push(name);
      console.error('landmark', name, err);
    }
  }
  ctx.envHooks.push(dk => kit.onEnv(dk));
  return {
    kit,
    errors,
    tick: (dt, t) => {
      for (const f of kit.ticks) f(dt, t);
    },
    // the game does not plant random trees inside areas already handled by a landmark
    ownsTrees: (x, z) => kit.noRandomTrees.some(r => kit.pointIn([x, z], r)),
    list: Object.keys(L),
  };
}
