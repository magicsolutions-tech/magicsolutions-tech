// Refreshes the live parts of the profile from the public GitHub API:
//   assets/stats.svg      repository, star, fork and follower counts (animated)
//   assets/languages.svg  language mix across public repositories (animated bar)
//   assets/activity.svg   the latest public activity (animated feed)
//   assets/snake.svg      52-week commit grid with an animated snake (scripts/snake.mjs)
//   README.md             the "Latest repositories" list between the REPOS markers
// Runs inside GitHub Actions with the built-in token (see .github/workflows/update-profile.yml). Only public data is read.
// Local preview with fake numbers:  MOCK=1 OUT_DIR=./preview node scripts/generate.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, esc, gradientDefs, relTime, svgWrap } from "./theme.mjs";
import { commitWeeks, emptyWeeks, mockWeeks, snakeSvg } from "./snake.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, "assets");
const OWNER = process.env.OWNER || "magicsolutions-tech";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const MOCK = process.env.MOCK === "1";
fs.mkdirSync(OUT, { recursive: true });

async function gh(url) {
  const res = await fetch(`https://api.github.com${url}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "profile-readme-refresh", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------- data
async function load() {
  if (MOCK) {
    const now = Date.now();
    const ago = (h) => new Date(now - h * 3600e3).toISOString();
    return {
      owner: { followers: 18, created_at: "2026-01-02T00:00:00Z" },
      repos: [
        { name: "magic-cloud-pos", full_name: `${OWNER}/magic-cloud-pos`, html_url: "#", description: "Cloud point-of-sale for multi-branch retail", language: "TypeScript", stargazers_count: 14, forks_count: 3, pushed_at: ago(5), fork: false },
        { name: "retail-station", full_name: `${OWNER}/retail-station`, html_url: "#", description: "Offline-first desktop POS with background sync", language: "TypeScript", stargazers_count: 9, forks_count: 1, pushed_at: ago(30), fork: false },
        { name: "agent-toolkit", full_name: `${OWNER}/agent-toolkit`, html_url: "#", description: "Guard-railed AI agents with human approval", language: "Python", stargazers_count: 21, forks_count: 6, pushed_at: ago(52), fork: false },
        { name: "three-hero", full_name: `${OWNER}/three-hero`, html_url: "#", description: "WebGL neuron hero for fast 3D websites", language: "JavaScript", stargazers_count: 6, forks_count: 0, pushed_at: ago(120), fork: false },
      ],
      langs: { TypeScript: 612000, Python: 240000, JavaScript: 150000, CSS: 52000, HTML: 31000, Shell: 9000 },
      weeks: mockWeeks(),
      events: [
        { type: "PushEvent", repo: { name: `${OWNER}/magic-cloud-pos` }, payload: { size: 4 }, created_at: ago(1) },
        { type: "PullRequestEvent", repo: { name: `${OWNER}/agent-toolkit` }, payload: { action: "closed", number: 42, pull_request: { merged: true } }, created_at: ago(6) },
        { type: "ReleaseEvent", repo: { name: `${OWNER}/retail-station` }, payload: { release: { tag_name: "v1.4.0" } }, created_at: ago(26) },
        { type: "IssuesEvent", repo: { name: `${OWNER}/three-hero` }, payload: { action: "opened", issue: { number: 7 } }, created_at: ago(50) },
        { type: "WatchEvent", repo: { name: `${OWNER}/agent-toolkit` }, payload: {}, created_at: ago(70) },
        { type: "CreateEvent", repo: { name: `${OWNER}/magic-cloud-pos` }, payload: { ref_type: "branch", ref: "feat/offline-sync" }, created_at: ago(96) },
      ],
    };
  }
  if (process.env.EMPTY === "1") return { owner: { followers: 0 }, repos: [], langs: {}, events: [], weeks: emptyWeeks() }; // starting images, before the first live refresh
  const info = await gh(`/users/${OWNER}`);
  const isOrg = info.type === "Organization";
  const repoUrl = isOrg ? `/orgs/${OWNER}/repos?type=public&per_page=100&sort=pushed` : `/users/${OWNER}/repos?type=owner&per_page=100&sort=pushed`;
  const all = await gh(repoUrl);
  // the profile repository itself and forks are not "our work"
  const repos = all.filter((r) => !r.fork && !r.archived && r.name !== OWNER && r.name !== ".github");
  const langs = {};
  for (const r of repos.slice(0, 30)) {
    try {
      const l = await gh(`/repos/${r.full_name}/languages`);
      for (const [k, v] of Object.entries(l)) langs[k] = (langs[k] || 0) + v;
    } catch { /* skip this repo */ }
  }
  let weeks = emptyWeeks();
  try {
    weeks = await commitWeeks(repos, { Accept: "application/vnd.github+json", "User-Agent": "profile-readme-refresh", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) });
  } catch { /* keep the empty grid */ }
  let events = [];
  try {
    events = await gh(isOrg ? `/orgs/${OWNER}/events?per_page=40` : `/users/${OWNER}/events/public?per_page=40`);
  } catch { /* no events */ }
  return { owner: info, repos, langs, events, weeks };
}

// ---------------------------------------------------------------- stats.svg
const nice = (v) => [5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000].find((n) => n > v) || v * 2;
const fmt = (n) => (n >= 10000 ? `${(n / 1000).toFixed(0)}K` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

function statsSvg(d) {
  const W = 1000, H = 150, tw = 232, gap = 24;
  const items = [
    ["Public repositories", d.repos.length, C.violet],
    ["Stars earned", d.repos.reduce((s, r) => s + r.stargazers_count, 0), C.orange],
    ["Forks", d.repos.reduce((s, r) => s + r.forks_count, 0), C.cyan],
    ["Followers", d.owner.followers || 0, C.violet],
  ];
  const css = `
.c{animation:in .8s cubic-bezier(.16,1,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.b{transform-origin:left center;animation:grow 1.6s cubic-bezier(.4,0,.2,1) both}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.n{animation:pop 1s cubic-bezier(.16,1,.3,1) both}
@keyframes pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
.p{animation:pl 2.8s ease-in-out infinite}@keyframes pl{0%,100%{opacity:.5}50%{opacity:1}}`;
  let out = "";
  items.forEach(([label, v, col], i) => {
    const x = i * (tw + gap);
    const frac = v === 0 ? 0.04 : Math.min(1, v / nice(v));
    out += `<g transform="translate(${x} 0)"><g class="c" style="animation-delay:${(i * 0.13).toFixed(2)}s">
  <rect x="0.5" y="0.5" width="${tw - 1}" height="${H - 1}" rx="20" fill="${C.card}" stroke="${C.line}"/>
  <text x="24" y="40" font-size="13" font-weight="600" fill="${C.muted}" letter-spacing="1.5">${esc(label.toUpperCase())}</text>
  <text class="n" style="animation-delay:${(0.3 + i * 0.13).toFixed(2)}s;transform-origin:24px 96px" x="24" y="96" font-size="46" font-weight="800" fill="#FFFFFF">${fmt(v)}</text>
  <rect x="24" y="116" width="${tw - 48}" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>
  <rect class="b" style="animation-delay:${(0.5 + i * 0.13).toFixed(2)}s" x="24" y="116" width="${((tw - 48) * frac).toFixed(1)}" height="6" rx="3" fill="${col}"/>
  <circle class="p" cx="${tw - 28}" cy="34" r="4" fill="${col}"/>
</g></g>`;
  });
  return svgWrap(W, H, out, { title: `${OWNER} on GitHub: ${items.map((x) => `${x[1]} ${x[0].toLowerCase()}`).join(", ")}`, css });
}

// ---------------------------------------------------------------- languages.svg
const LANG_COLORS = { TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26", CSS: "#a56de2", Shell: "#89e051", Dart: "#00B4AB", Kotlin: "#A97BFF", Java: "#b07219", "C#": "#178600", Go: "#00ADD8", Rust: "#dea584", PHP: "#8892bf", Swift: "#F05138", Vue: "#41b883", SCSS: "#c6538c", "C++": "#f34b7d", C: "#9aa0a6" };
const FALLBACK = [C.violet, C.cyan, C.orange, "#7C9CFF", "#FF7AA8", "#6EE7B7"];

function languagesSvg(d) {
  const W = 1000, H = 190;
  const entries = Object.entries(d.langs).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, e) => s + e[1], 0);
  const css = `
.c{animation:in .8s cubic-bezier(.16,1,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.s{transform-origin:left center;animation:grow 1.4s cubic-bezier(.4,0,.2,1) both}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.l{animation:in .7s ease both}
.sh{animation:sh 2.6s ease-in-out infinite}@keyframes sh{0%,100%{opacity:.25}50%{opacity:.8}}`;
  let inner = `<defs>${gradientDefs("g")}</defs>
<g class="c"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${C.card}" stroke="${C.line}"/>
<text x="28" y="40" font-size="13" font-weight="600" fill="${C.muted}" letter-spacing="1.5">LANGUAGES ACROSS OUR PUBLIC CODE</text></g>`;
  if (total === 0) {
    inner += `<rect class="sh" x="28" y="62" width="944" height="16" rx="8" fill="url(#g)"/>
<text x="28" y="118" font-size="17" fill="#FFFFFF" font-weight="600">Public code is on its way.</text>
<text x="28" y="144" font-size="14" fill="${C.muted}">When we open-source a project, its language mix appears here automatically.</text>`;
    return svgWrap(W, H, inner, { title: "Languages: no public code yet", css });
  }
  const top = entries.slice(0, 5);
  const rest = entries.slice(5).reduce((s, e) => s + e[1], 0);
  const rows = rest > 0 ? [...top, ["Other", rest]] : top;
  let x = 28;
  const bw = 944;
  rows.forEach(([name, v], i) => {
    const w = (v / total) * bw;
    const col = LANG_COLORS[name] || FALLBACK[i % FALLBACK.length];
    inner += `<rect class="s" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s" x="${x.toFixed(1)}" y="62" width="${Math.max(2, w - 3).toFixed(1)}" height="16" rx="8" fill="${col}"/>`;
    x += w;
  });
  rows.forEach(([name, v], i) => {
    const col = LANG_COLORS[name] || FALLBACK[i % FALLBACK.length];
    const cx = 28 + (i % 3) * 320, cy = 118 + Math.floor(i / 3) * 34;
    inner += `<g class="l" style="animation-delay:${(0.6 + i * 0.1).toFixed(2)}s"><circle cx="${cx + 6}" cy="${cy - 5}" r="6" fill="${col}"/><text x="${cx + 20}" y="${cy}" font-size="16" font-weight="600" fill="#FFFFFF">${esc(name)}</text><text x="${cx + 280}" y="${cy}" text-anchor="end" font-size="15" fill="${C.muted}">${((v / total) * 100).toFixed(1)}%</text></g>`;
  });
  return svgWrap(W, H, inner, { title: `Language mix: ${rows.map(([n, v]) => `${n} ${((v / total) * 100).toFixed(0)}%`).join(", ")}`, css });
}

// ---------------------------------------------------------------- activity.svg
const short = (full) => String(full).split("/").pop();
function describe(e) {
  const repo = short(e.repo?.name);
  const p = e.payload || {};
  switch (e.type) {
    case "PushEvent": { const n = p.size ?? p.commits?.length ?? 1; return ["↑", C.violet, `Pushed ${n} commit${n === 1 ? "" : "s"} to`, repo]; }
    case "PullRequestEvent":
      if (p.action === "closed" && p.pull_request?.merged) return ["⇄", C.cyan, `Merged pull request #${p.number} in`, repo];
      if (p.action === "opened" || p.action === "reopened") return ["⇄", C.cyan, `Opened pull request #${p.number} in`, repo];
      return null;
    case "IssuesEvent": return p.action === "opened" ? ["!", C.orange, `Opened issue #${p.issue?.number} in`, repo] : p.action === "closed" ? ["✓", C.orange, `Closed issue #${p.issue?.number} in`, repo] : null;
    case "IssueCommentEvent": return p.action === "created" ? ["…", C.muted, `Commented on #${p.issue?.number} in`, repo] : null;
    case "CreateEvent": return p.ref_type === "repository" ? ["+", C.cyan, "Created repository", repo] : p.ref_type === "tag" ? ["+", C.cyan, `Created tag ${p.ref} in`, repo] : ["+", C.cyan, `Created branch ${p.ref} in`, repo];
    case "ReleaseEvent": return ["◆", C.orange, `Published release ${p.release?.tag_name || ""} in`, repo];
    case "WatchEvent": return ["★", C.orange, "New star on", repo];
    case "ForkEvent": return ["⑂", C.violet, "Forked", repo];
    case "PublicEvent": return ["●", C.cyan, "Made public:", repo];
    default: return null;
  }
}

function activitySvg(d) {
  const items = d.events.map((e) => ({ d: describe(e), at: e.created_at })).filter((x) => x.d).slice(0, 6);
  const rowH = 54, W = 1000, H = 76 + Math.max(items.length, 1) * rowH + 8;
  const css = `
.c{animation:in .8s cubic-bezier(.16,1,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.r{animation:slide .7s cubic-bezier(.16,1,.3,1) both}
@keyframes slide{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
.live{animation:pulse 1.8s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}`;
  let inner = `<defs>${gradientDefs("g")}</defs>
<g class="c"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${C.card}" stroke="${C.line}"/>
<circle class="live" style="transform-origin:34px 38px" cx="34" cy="38" r="5" fill="#3DDC97"/>
<text x="52" y="43" font-size="13" font-weight="600" fill="${C.muted}" letter-spacing="1.5">RECENT ACTIVITY</text></g>`;
  if (items.length === 0) {
    inner += `<text x="28" y="${76 + 22}" font-size="17" font-weight="600" fill="#FFFFFF">No public activity yet.</text>
<text x="28" y="${76 + 46}" font-size="14" fill="${C.muted}">New commits, pull requests and releases will appear here automatically.</text>`;
  }
  items.forEach((it, i) => {
    const [icon, col, text, repo] = it.d;
    const y = 76 + i * rowH;
    const tw = 9.2 * text.length; // rough text width so the repo name follows it
    inner += `<g transform="translate(0 ${y})"><g class="r" style="animation-delay:${(0.2 + i * 0.12).toFixed(2)}s">
  <line x1="28" y1="${rowH}" x2="${W - 28}" y2="${rowH}" stroke="rgba(255,255,255,0.06)"/>
  <circle cx="44" cy="${rowH / 2 - 2}" r="15" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-opacity="0.6"/>
  <text x="44" y="${rowH / 2 + 4}" text-anchor="middle" font-size="15" font-weight="700" fill="${col}">${esc(icon)}</text>
  <text x="74" y="${rowH / 2 + 3}" font-size="16" fill="#E8EBF5">${esc(text)} <tspan font-weight="700" fill="${C.cyan}">${esc(repo)}</tspan></text>
  <text x="${W - 28}" y="${rowH / 2 + 3}" text-anchor="end" font-size="13.5" fill="${C.muted}">${esc(relTime(it.at))}</text>
</g></g>`;
  });
  return svgWrap(W, H, inner, { title: "Recent public activity", css });
}

// ---------------------------------------------------------------- README repo list
function repoList(d) {
  if (d.repos.length === 0) return "- Our public repositories will be listed here as soon as we open-source something.";
  return d.repos
    .slice(0, 5)
    .map((r) => `- [**${r.name}**](${r.html_url})${r.description ? `: ${r.description.replace(/\r?\n/g, " ")}` : ""}${r.language ? ` · \`${r.language}\`` : ""} · updated ${relTime(r.pushed_at)}`)
    .join("\n");
}

// ---------------------------------------------------------------- run
const data = await load();
fs.writeFileSync(path.join(OUT, "stats.svg"), statsSvg(data));
fs.writeFileSync(path.join(OUT, "languages.svg"), languagesSvg(data));
fs.writeFileSync(path.join(OUT, "activity.svg"), activitySvg(data));
fs.writeFileSync(path.join(OUT, "snake.svg"), snakeSvg(data.weeks));

const readme = path.join(ROOT, "README.md");
if (!MOCK && fs.existsSync(readme)) {
  const s = fs.readFileSync(readme, "utf8");
  const re = /<!--REPOS:start-->[\s\S]*?<!--REPOS:end-->/;
  if (re.test(s)) fs.writeFileSync(readme, s.replace(re, `<!--REPOS:start-->\n${repoList(data)}\n<!--REPOS:end-->`));
}
console.log(`ok: ${data.repos.length} repos, ${Object.keys(data.langs).length} languages, ${data.events.length} events${MOCK ? " (MOCK data)" : ""}`);
