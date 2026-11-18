// Builds the hand-designed animated pieces: banner.svg, divider.svg, domains.svg.
// Run with: node scripts/build-art.mjs   (no internet needed). Edit the text below, run it again, commit the result.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, esc, gradientDefs, rng, svgWrap } from "./theme.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, "..", "assets");
fs.mkdirSync(ASSETS, { recursive: true });

// ---------------------------------------------------------------- content you may want to edit
const HEADLINE = ["Anything you can think of", "can be "];
const ACCENT = "built.";
const ROTATING = ["Custom software", "AI agents, RAG and LLM fine-tuning", "ERP and POS systems", "3D websites", "UX-focused applications"];
const DOMAINS = [
  ["01", "Custom software", "Business systems, portals, integrations"],
  ["02", "AI agents and RAG", "Agentic systems, retrieval, guardrails"],
  ["03", "LLM fine-tuning", "Data prep, training, evaluation"],
  ["04", "ERP and POS", "Inventory, accounts, cloud and offline POS"],
  ["05", "3D websites", "WebGL, Three.js, fast on phones"],
  ["06", "UX applications", "Research, prototypes, polished apps"],
];

// ---------------------------------------------------------------- logo lockup (outlined paths from the brand kit)
const lockupFile = path.join(here, "lockup-white.svg");
const lockupInner = fs.readFileSync(lockupFile, "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// ---------------------------------------------------------------- banner
function banner() {
  const W = 1000, H = 320;
  const r = rng(2026);
  const pts = [];
  for (let i = 0; i < 38; i++) {
    const right = i < 28;
    pts.push([right ? 430 + r() * 560 : 20 + r() * 380, 14 + r() * (H - 28), 1.6 + r() * 3.2]);
  }
  let lines = "", dots = "";
  pts.forEach((p, i) => {
    dots += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(p[2] * 3).toFixed(1)}" fill="${C.violet}" opacity="0.08"/>
<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p[2].toFixed(1)}" fill="#D8D0FF"><animate attributeName="opacity" values="0.25;1;0.25" dur="${(3 + r() * 4).toFixed(1)}s" begin="${(r() * 4).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]);
      if (d < 135)
        lines += `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${pts[j][0].toFixed(1)}" y2="${pts[j][1].toFixed(1)}" stroke="#BDB2FF" stroke-width="1"><animate attributeName="stroke-opacity" values="0.06;${(0.5 * (1 - d / 135) + 0.12).toFixed(2)};0.06" dur="${(4 + r() * 5).toFixed(1)}s" begin="${(r() * 5).toFixed(1)}s" repeatCount="indefinite"/></line>`;
    }
  });

  const n = ROTATING.length;
  const rot = ROTATING.map((t, i) => {
    const a = i / n, b = (i + 1) / n, e = 0.025;
    const kt = i === 0 ? `0;${e};${b - e};${b};1` : `0;${a};${a + e};${b - e};${b};1`;
    const vals = i === 0 ? "1;1;1;0;0" : "0;0;1;1;0;0";
    const kt2 = i === n - 1 ? `0;${a};${a + e};1` : kt;
    const vals2 = i === n - 1 ? "0;0;1;1" : vals;
    return `<text x="60" y="262" font-size="21" fill="#C9CEE0" opacity="0"><animate attributeName="opacity" values="${vals2}" keyTimes="${kt2}" dur="${n * 2.6}s" repeatCount="indefinite"/><tspan fill="${C.cyan}">&#8250; </tspan>${esc(t)}</text>`;
  }).join("\n");

  const css = `
.drift{animation:drift 16s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(-26px,16px)}}
.rise{animation:rise .9s cubic-bezier(.16,1,.3,1) both}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.bar{stroke-dasharray:260;animation:bar 2.2s .5s cubic-bezier(.4,0,.2,1) both}
@keyframes bar{from{stroke-dashoffset:260}to{stroke-dashoffset:0}}
.mark{animation:float 7s ease-in-out infinite alternate}
@keyframes float{from{transform:translateY(-6px)}to{transform:translateY(8px)}}`;

  const inner = `
<defs>
  ${gradientDefs("g")}
  <radialGradient id="v" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6C4CFF" stop-opacity="0.65"/><stop offset="1" stop-color="#6C4CFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="c" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#00B5CA" stop-opacity="0.42"/><stop offset="1" stop-color="#00B5CA" stop-opacity="0"/></radialGradient>
  <radialGradient id="o" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FF9E1B" stop-opacity="0.32"/><stop offset="1" stop-color="#FF9E1B" stop-opacity="0"/></radialGradient>
  <clipPath id="clip"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>
<g clip-path="url(#clip)">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <g class="drift">
    <ellipse cx="850" cy="20" rx="420" ry="230" fill="url(#v)"/>
    <ellipse cx="40" cy="330" rx="360" ry="190" fill="url(#c)"/>
    <ellipse cx="980" cy="330" rx="300" ry="170" fill="url(#o)"/>
  </g>
  <g class="mark" opacity="0.07" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <polyline points="640,20 880,160 640,300" stroke-width="34"/>
  </g>
  ${lines}
  ${dots}
  <g transform="translate(60,44) scale(0.255)"><g class="rise" style="animation-delay:.1s">${lockupInner}</g></g>
  <text class="rise" style="animation-delay:.3s" x="60" y="146" font-size="47" font-weight="800" fill="#FFFFFF" letter-spacing="-1">${esc(HEADLINE[0])}</text>
  <text class="rise" style="animation-delay:.45s" x="60" y="200" font-size="47" font-weight="800" fill="#FFFFFF" letter-spacing="-1">${esc(HEADLINE[1])}<tspan fill="url(#g)">${esc(ACCENT)}</tspan></text>
  <line class="bar" x1="60" y1="222" x2="320" y2="222" stroke="url(#g)" stroke-width="4" stroke-linecap="round"/>
  ${rot}
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="rgba(255,255,255,0.12)"/>`;
  return svgWrap(W, H, inner, { title: "MAGIC Software and Solutions: anything you can think of can be built", css });
}

// ---------------------------------------------------------------- divider
function divider() {
  const W = 1000, H = 16;
  const css = `.dot{animation:run 5s ease-in-out infinite alternate}@keyframes run{from{transform:translateX(0)}to{transform:translateX(940px)}}`;
  const inner = `<defs>${gradientDefs("g")}<radialGradient id="d" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect x="0" y="7" width="${W}" height="2" rx="1" fill="url(#g)" opacity="0.55"/>
<g class="dot"><circle cx="30" cy="8" r="8" fill="url(#d)"/></g>`;
  return svgWrap(W, H, inner, { title: "divider", css });
}

// ---------------------------------------------------------------- domains (what we build)
function domains() {
  const W = 1000, tw = 316, th = 96, gap = 26, H = th * 2 + gap + 8;
  const css = `
.t{animation:in .8s cubic-bezier(.16,1,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.f{animation:fl 6s ease-in-out infinite alternate}
@keyframes fl{from{transform:translateY(0)}to{transform:translateY(-4px)}}
.sh{animation:sh 4.5s ease-in-out infinite}
@keyframes sh{0%,100%{opacity:.35}50%{opacity:1}}`;
  let tiles = "";
  DOMAINS.forEach(([no, title, sub], i) => {
    const x = (i % 3) * (tw + 26), y = Math.floor(i / 3) * (th + gap) + 4;
    const col = [C.violet, C.cyan, C.orange][i % 3];
    tiles += `<g transform="translate(${x} ${y})"><g class="t" style="animation-delay:${(i * 0.12).toFixed(2)}s"><g class="f" style="animation-duration:${(5 + (i % 3)).toFixed(0)}s;animation-delay:${(i * 0.4).toFixed(1)}s">
  <rect width="${tw}" height="${th}" rx="18" fill="${C.card}" stroke="${C.line}"/>
  <rect x="0" y="22" width="4" height="52" rx="2" fill="${col}" class="sh" style="animation-delay:${(i * 0.5).toFixed(1)}s"/>
  <text x="26" y="36" font-size="13" font-weight="700" fill="${col}" letter-spacing="3">${no}</text>
  <text x="26" y="62" font-size="22" font-weight="700" fill="#FFFFFF">${esc(title)}</text>
  <text x="26" y="82" font-size="13.5" fill="${C.muted}">${esc(sub)}</text>
</g></g></g>`;
  });
  return svgWrap(W, H, `<defs>${gradientDefs("g")}</defs>${tiles}`, { title: "What MAGIC builds: custom software, AI agents, LLM fine-tuning, ERP and POS, 3D websites, UX applications", css });
}

fs.writeFileSync(path.join(ASSETS, "banner.svg"), banner());
fs.writeFileSync(path.join(ASSETS, "divider.svg"), divider());
fs.writeFileSync(path.join(ASSETS, "domains.svg"), domains());
console.log("wrote banner.svg, divider.svg, domains.svg");
