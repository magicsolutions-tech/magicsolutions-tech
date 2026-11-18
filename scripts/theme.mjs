// Shared look for every generated SVG: the MAGIC theme (dark glow, violet / cyan / orange).
// GitHub shows README images in a sandbox: no scripts, no web fonts, no external files. Everything here is
// self-contained SVG with CSS / SMIL animation, which GitHub does play.

export const C = {
  bg: "#05060A",
  card: "#0C0E16",
  line: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "#AEB4C8",
  violet: "#9A88FF",
  cyan: "#2FD0E4",
  orange: "#FFB347",
};

export const FONT = "'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function relTime(iso, now = Date.now()) {
  const s = Math.max(1, Math.round((now - new Date(iso).getTime()) / 1000));
  const t = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [n, sec] of t) if (s >= sec) { const v = Math.floor(s / sec); return `${v} ${n}${v > 1 ? "s" : ""} ago`; }
  return "just now";
}

/** Deterministic random numbers so a rebuilt image only changes when the data does. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gradientDefs = (id = "g") => `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.violet}"/><stop offset="0.55" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.orange}"/>
  </linearGradient>`;

export const svgWrap = (w, h, inner, { title = "", css = "" } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" font-family="${FONT}">
<title>${esc(title)}</title>
<style>${css}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}</style>
${inner}
</svg>
`;
