// Language of the player-facing text: Italian or English. Starts from the saved choice or the browser language,
// changes with the L key and is remembered in localStorage.
import { STRINGS } from './strings.js';

const KEY = 'neontorino_lang';
export const LANGS = ['it', 'en'];

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (e) {
    /* storage not available: fall back to the browser language */
  }
  return (navigator.language || 'it').toLowerCase().startsWith('it') ? 'it' : 'en';
}

export let lang = initialLang();

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch (e) {
    /* not saved, the choice lasts for this session only */
  }
}

export function toggleLang() {
  setLang(lang === 'it' ? 'en' : 'it');
}

// Text for a key in the current language. Arrays (lists of alternatives) are returned as they are;
// {name} placeholders are filled from vars.
export function t(key, vars) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const v = entry[lang] ?? entry.it;
  if (Array.isArray(v) || !vars) return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// Numbers formatted for the current language (thousands separator, decimal comma in Italian).
export function num(n, decimals) {
  const opts = decimals === undefined ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return n.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', opts);
}
