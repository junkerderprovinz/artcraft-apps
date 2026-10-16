/**
 * Generates the README banners (theme-adaptive pair, 1600x500):
 *   artcraft-apps-banner.svg / .png      : white bg, dark name, grey claim
 *   artcraft-apps-banner-dark.svg / .png : GitHub-dark #0d1117, light name, lighter grey claim
 * The README serves the pair via <picture> (prefers-color-scheme).
 *
 * The ArtCraft mark is a trademark that its licence keeps out of other
 * projects' logos, so the banner shows the thirteen app icons instead, which
 * are MIT OR Apache-2.0 like the apps. They sit in one row under the name and
 * the claim and are embedded unchanged in both themes, since each is a tile
 * that reads on a light and a dark ground. Name in Open Sans (OFL), claim in
 * Lato (OFL) grey, both rendered to vector paths (opentype.js) so the SVG
 * needs no font.
 *
 * Deps: `npm i -g @resvg/resvg-js opentype.js`. Fonts (OFL) are fetched at
 * runtime to the OS temp dir and never committed. Run:
 *   node .github/assets/gen-banner.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const gRoot = execSync("npm root -g").toString().trim();
const opentype = require(`${gRoot}/opentype.js`);
const { Resvg } = require(`${gRoot}/@resvg/resvg-js`);
const __dir = dirname(fileURLToPath(import.meta.url));

const NAME = "ArtCraft Apps";
const CLAIM = "Thirteen studios, one server.";
const W = 1600, H = 500;
const nameSize = 112, claimSize = 42, lineGap = 6;
const ICON = 100, ICON_GAP = 10, ICON_Y = 330;
const THEMES = [
  { suffix: "",      bg: "#ffffff", name: "#1f2328", claim: "#5a5d5e" },
  { suffix: "-dark", bg: "#0d1117", name: "#e6edf3", claim: "#9aa4ad" },
];

const apps = JSON.parse(readFileSync(join(__dir, "..", "..", "apps.json"), "utf8")).map((a) => a.app);

// Fonts (OFL): Open Sans for the wordmark, Lato for the claim, fetched and never committed.
// Verify Content-Length so a truncated download can't silently break glyph outlines
// (a short file still parses, but the tail glyphs render broken).
async function font(url, file) {
  const p = join(tmpdir(), file);
  if (!existsSync(p) || readFileSync(p).length < 50000) {
    for (let attempt = 1; ; attempt++) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`font fetch ${r.status}: ${url}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const len = Number(r.headers.get("content-length") || 0);
      if (len && buf.length !== len) {
        if (attempt >= 3) throw new Error(`font truncated ${buf.length}/${len}: ${url}`);
        continue;
      }
      writeFileSync(p, buf);
      break;
    }
  }
  const b = readFileSync(p);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const openSans = await font("https://github.com/google/fonts/raw/main/ofl/opensans/OpenSans%5Bwdth,wght%5D.ttf", "stellarium-OpenSans.ttf");
const lato = await font("https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf", "stellarium-Lato-Regular.ttf");

// Name and claim centred above the icon row.
const em = (f, s) => s / f.unitsPerEm;
const nameAsc = openSans.ascender * em(openSans, nameSize);
const nameDesc = -openSans.descender * em(openSans, nameSize);
const claimAsc = lato.ascender * em(lato, claimSize);
const claimDesc = -lato.descender * em(lato, claimSize);
const blockH = nameAsc + nameDesc + lineGap + claimAsc + claimDesc;
const top = (ICON_Y - blockH) / 2 + 10;
const nameBaseline = top + nameAsc;
const claimBaseline = nameBaseline + nameDesc + lineGap + claimAsc;
const centred = (f, text, size) => Math.round((W - f.getAdvanceWidth(text, size)) / 2);
// Render text as one <path> per glyph, not a single merged path: resvg's tessellator
// can silently abort a merged multi-subpath path partway through for certain
// glyph/coordinate combinations, and per-glyph paths sidestep that.
const glyphD = (font, text, x, baseline, size) =>
  font.getPaths(text, x, baseline, size).map((p) => p.toPathData(2)).filter(Boolean);
const nameD = glyphD(openSans, NAME, centred(openSans, NAME, nameSize), nameBaseline, nameSize);
const claimD = glyphD(lato, CLAIM, centred(lato, CLAIM, claimSize), claimBaseline, claimSize);
const paths = (ds, fill) => ds.map((d) => `<path d="${d}" fill="${fill}"/>`).join("");

const rowW = apps.length * ICON + (apps.length - 1) * ICON_GAP;
const icons = apps.map((app, i) => {
  const href = "data:image/png;base64," + readFileSync(join(__dir, "icons", `${app}.png`)).toString("base64");
  const x = (W - rowW) / 2 + i * (ICON + ICON_GAP);
  return `<image x="${x}" y="${ICON_Y}" width="${ICON}" height="${ICON}" href="${href}"/>`;
}).join("\n  ");

for (const t of THEMES) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${NAME}">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  ${paths(nameD, t.name)}
  ${paths(claimD, t.claim)}
  ${icons}
</svg>
`;
  writeFileSync(join(__dir, `artcraft-apps-banner${t.suffix}.svg`), svg);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W }, background: t.bg }).render().asPng();
  writeFileSync(join(__dir, `artcraft-apps-banner${t.suffix}.png`), png);
  console.log(`wrote artcraft-apps-banner${t.suffix}.svg + .png`);
}
console.log(`claim: "${CLAIM}"`);
