// The commit snake: a 52-week commit grid (like the contribution graph, but built from our own repositories'
// commit history) with an animated snake that eats the squares. Self-contained SVG, no third-party service.
import { C, esc, gradientDefs, rng, svgWrap } from "./theme.mjs";

const DAY = 86400;
const sundayOf = (ts) => {
  const d = new Date(ts * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000) - d.getUTCDay() * DAY;
};

/** Commits per day for the last 52 weeks, summed over repositories (GitHub "commit_activity" statistics). */
export async function commitWeeks(repos, headers) {
  const sum = new Map();
  for (const r of repos.slice(0, 30)) {
    let data = null;
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`https://api.github.com/repos/${r.full_name}/stats/commit_activity`, { headers });
      if (res.status === 202) { await new Promise((ok) => setTimeout(ok, 2500)); continue; } // GitHub is still computing it
      if (res.ok) data = await res.json();
      break;
    }
    if (!Array.isArray(data)) continue;
    for (const w of data) {
      const a = sum.get(w.week) || [0, 0, 0, 0, 0, 0, 0];
      w.days.forEach((v, i) => (a[i] += v));
      sum.set(w.week, a);
    }
  }
  return normalize(sum);
}

/** Always exactly 52 weeks ending with this week, zero-filled. */
function normalize(sum) {
  const thisWeek = sundayOf(Math.floor(Date.now() / 1000));
  const weeks = [];
  for (let i = 51; i >= 0; i--) {
    const w = thisWeek - i * 7 * DAY;
    weeks.push({ week: w, days: sum.get(w) || [0, 0, 0, 0, 0, 0, 0] });
  }
  return weeks;
}

/** Fake but plausible history, for previews only. */
export function mockWeeks() {
  const r = rng(77);
  const sum = new Map();
  const thisWeek = sundayOf(Math.floor(Date.now() / 1000));
  for (let i = 51; i >= 0; i--) {
    const busy = r() < 0.78 ? 1 : 0;
    sum.set(thisWeek - i * 7 * DAY, [0, 1, 2, 3, 4, 5, 6].map((d) => (busy && d > 0 && d < 6 && r() < 0.62 ? Math.ceil(r() * r() * 9) : 0)));
  }
  return normalize(sum);
}

export const emptyWeeks = () => normalize(new Map());

function statsOf(weeks) {
  const today = Math.floor(Date.now() / 1000);
  const flat = [];
  weeks.forEach((w) => w.days.forEach((v, i) => { const ts = w.week + i * DAY; if (ts <= today) flat.push({ ts, v }); }));
  const total = flat.reduce((s, x) => s + x.v, 0);
  const best = flat.reduce((b, x) => (x.v > b.v ? x : b), { v: 0, ts: 0 });
  let longest = 0, run = 0;
  for (const x of flat) { run = x.v > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let cur = 0, i = flat.length - 1;
  if (i >= 0 && flat[i].v === 0) i--; // today can still be empty
  for (; i >= 0 && flat[i].v > 0; i--) cur++;
  const activeDays = flat.filter((x) => x.v > 0).length;
  return { total, best, longest, cur, activeDays };
}

export function snakeSvg(weeks) {
  const W = 1000, P = 18, S = 14.5, X0 = 32, Y0 = 82, COLS = 52, ROWS = 7;
  const st = statsOf(weeks);
  const nz = weeks.flatMap((w) => w.days).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (f) => nz[Math.min(nz.length - 1, Math.floor(nz.length * f))] || 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (v) => (v === 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
  const COLORS = ["#161A26", "#4B3BB5", "#7C6BFF", "#2FD0E4", "#FFB347"];

  // path through every cell, column by column, entering from the left and leaving to the right
  const cx = (c) => X0 + c * P + S / 2, cy = (r) => Y0 + r * P + S / 2;
  let d = `M${(cx(0) - 90).toFixed(1)} ${cy(0).toFixed(1)}H${cx(0).toFixed(1)}`;
  let dist = 90;
  const eat = [];
  for (let c = 0; c < COLS; c++) {
    const down = c % 2 === 0;
    for (let k = 0; k < ROWS; k++) eat.push({ c, r: down ? k : ROWS - 1 - k, at: dist + k * P });
    d += `V${cy(down ? ROWS - 1 : 0).toFixed(1)}`;
    dist += (ROWS - 1) * P;
    if (c < COLS - 1) { d += `H${cx(c + 1).toFixed(1)}`; dist += P; }
  }
  d += `H${(cx(COLS - 1) + 90).toFixed(1)}`;
  const total = dist + 90;
  const SPEED = 230;
  const dur = +(total / SPEED).toFixed(1);

  const cells = eat
    .map(({ c, r, at }) => {
      const v = weeks[c].days[r];
      const lv = level(v);
      const x = (X0 + c * P).toFixed(1), y = (Y0 + r * P).toFixed(1);
      if (lv === 0) return `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="3.5" fill="${COLORS[0]}"/>`;
      const a = at / total;
      return `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="3.5" fill="${COLORS[lv]}"><animate attributeName="opacity" values="1;1;0.1;0.1;1" keyTimes="0;${a.toFixed(4)};${(a + 0.004).toFixed(4)};0.985;1" dur="${dur}s" repeatCount="indefinite"/></rect>`;
    })
    .join("\n");

  const BODY = 11, GAP = 13 / SPEED;
  let snake = "";
  for (let i = BODY - 1; i >= 0; i--) {
    const head = i === 0;
    const rad = head ? 8.5 : Math.max(3.6, 7.4 - i * 0.38);
    const fill = head ? "#E9FBFF" : `url(#sn${i % 3})`;
    snake += `<g opacity="0"><set attributeName="opacity" to="1" begin="${(i * GAP).toFixed(3)}s" fill="freeze"/><animateMotion dur="${dur}s" begin="${(i * GAP).toFixed(3)}s" repeatCount="indefinite" path="${d}"/>
<circle r="${rad.toFixed(1)}" fill="${fill}" ${head ? `stroke="${C.cyan}" stroke-width="2.5"` : ""}/>${head ? `<circle cx="3" cy="-3" r="1.8" fill="#05060A"/><circle cx="3" cy="3" r="1.8" fill="#05060A"/>` : ""}</g>\n`;
  }

  const fmtDate = (ts) => new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const stats = [
    ["Commits, last 12 months", String(st.total), C.violet],
    ["Busiest day", st.best.v ? `${st.best.v} commits` : "None yet", C.cyan, st.best.v ? fmtDate(st.best.ts) : ""],
    ["Current streak", `${st.cur} day${st.cur === 1 ? "" : "s"}`, C.orange],
    ["Longest streak", `${st.longest} day${st.longest === 1 ? "" : "s"}`, C.violet],
  ];
  const H = 304;
  let statTxt = "";
  stats.forEach(([label, val, col, sub], i) => {
    const x = 32 + i * 236;
    statTxt += `<g><text x="${x}" y="${Y0 + ROWS * P + 38}" font-size="12" font-weight="600" fill="${C.muted}" letter-spacing="1.4">${esc(label.toUpperCase())}</text>
<text x="${x}" y="${Y0 + ROWS * P + 68}" font-size="26" font-weight="800" fill="#FFFFFF">${esc(val)}</text>
<rect x="${x}" y="${Y0 + ROWS * P + 76}" width="34" height="3" rx="1.5" fill="${col}"/>${sub ? `<text x="${x + 44}" y="${Y0 + ROWS * P + 80}" font-size="12" fill="${C.muted}">${esc(sub)}</text>` : ""}</g>\n`;
  });

  const legend = COLORS.map((c, i) => `<rect x="${812 + i * 18}" y="28" width="13" height="13" rx="3.5" fill="${c}"/>`).join("");
  const css = `
.c{animation:in .8s cubic-bezier(.16,1,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.live{animation:pulse 1.8s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}`;

  const inner = `<defs>${gradientDefs("g")}
<linearGradient id="sn0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2FD0E4"/><stop offset="1" stop-color="#7C6BFF"/></linearGradient>
<linearGradient id="sn1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C6BFF"/><stop offset="1" stop-color="#2FD0E4"/></linearGradient>
<linearGradient id="sn2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2FD0E4"/><stop offset="1" stop-color="#FFB347"/></linearGradient>
<clipPath id="card"><rect width="${W}" height="${H}" rx="20"/></clipPath></defs>
<g class="c" clip-path="url(#card)">
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${C.card}" stroke="${C.line}"/>
<circle class="live" style="transform-origin:42px 36px" cx="42" cy="36" r="5" fill="#3DDC97"/>
<text x="60" y="41" font-size="13" font-weight="600" fill="${C.muted}" letter-spacing="1.5">COMMIT ACTIVITY &#183; LAST 12 MONTHS</text>
<text x="770" y="39" text-anchor="end" font-size="12" fill="${C.muted}">Less</text>${legend}<text x="908" y="39" font-size="12" fill="${C.muted}">More</text>
${cells}
${snake}
${statTxt}
${st.total === 0 ? `<text x="${W - 32}" y="${Y0 - 14}" text-anchor="end" font-size="12.5" fill="${C.muted}">Every commit we push lights up a square.</text>` : ""}
</g>`;
  return svgWrap(W, H, inner, { title: `Commit activity over the last 12 months: ${st.total} commits, current streak ${st.cur} days, longest streak ${st.longest} days`, css });
}
