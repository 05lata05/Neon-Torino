// Qualità grafica automatica e manuale.
import { t } from '../i18n/index.js';
import { state } from '../core/state.js';
import { H, W, renderer, scene } from '../core/render.js';
import { toast } from '../world/effects.js';
import { sun } from '../world/lights.js';

// stato di proprietà di questo modulo: gli altri moduli lo leggono e lo cambiano con le funzioni set…()
export let perfDone;
export function setPerfDone(v) {
  perfDone = v;
}

export let quality, perfAcc, perfN;

export function setQuality(q) {
  quality = q;
  renderer.setPixelRatio(q ? Math.min(window.devicePixelRatio || 1, 1.5) : 1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = !!q;
  sun.castShadow = !!q;
  scene.traverse(o => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) m.needsUpdate = true;
  });
}
export function perfCheck(raw) {
  if (perfDone || state !== 'play' || raw > 0.5) return;
  perfAcc += raw;
  perfN++;
  if (perfAcc > 5) {
    perfDone = true;
    const fps = perfN / perfAcc;
    if (fps < 40 && quality === 1) {
      setQuality(0);
      toast(t('msg.gfxAuto'), 4);
    }
  }
}

export function init() {
  // ---------------- qualità grafica ----------------
  quality = 1;
  perfAcc = 0;
  perfN = 0;
  perfDone = false;
}
