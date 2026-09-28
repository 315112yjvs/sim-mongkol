// 改完 index.html 後執行 `node build.mjs`：
// 1. 從 index.html 的 PAIRS / TRIPLES 產生 extension/scoring.js（插件計分資料不必手動同步）
// 2. 依 index.html 用到的字裁切字型成 fonts/*.woff2（需要 pyftsubset：pip install fonttools brotli）
import fs from "fs";
import { execFileSync } from "child_process";

const here = p => new URL(p, import.meta.url);
const html = fs.readFileSync(here("./index.html"), "utf8");
const PAIRS = new Function(html.match(/const PAIRS = \{[\s\S]*?\n\};/)[0] + "; return PAIRS;")();
const TRIPLES = new Function(html.match(/const TRIPLES = \[[\s\S]*?\n\];/)[0] + "; return TRIPLES;")();

// ---------- 1. extension/scoring.js ----------
const pairS = Object.fromEntries(Object.entries(PAIRS).map(([k, v]) => [k, v.s]));
const tripleP = {};
for(const t of TRIPLES) for(const o of t.label.split(" / ")) tripleP[o] = t.p;

const tpl = fs.readFileSync(here("./extension/scoring.js"), "utf8");
const out = tpl
  .replace(/^const PAIR_S = .*$/m, "const PAIR_S = " + JSON.stringify(pairS) + ";")
  .replace(/^const TRIPLE_P = .*$/m, "const TRIPLE_P = " + JSON.stringify(tripleP) + ";");
fs.writeFileSync(here("./extension/scoring.js"), out);
console.log("extension/scoring.js:", Object.keys(pairS).length, "pairs,", Object.keys(tripleP).length, "triple orders");

// ---------- 2. 字型裁切 ----------
const chars = new Set(html);
for(let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
const text = [...chars].filter(c => c.codePointAt(0) >= 0x20).join("");
for(const [src, dst] of [["jf-openhuninn-2.1.ttf", "openhuninn.woff2"], ["ganzaimi.ttf", "ganzaimi.woff2"]]){
  execFileSync("pyftsubset", [
    "fonts/src/" + src, "--text=" + text, "--flavor=woff2",
    "--layout-features=*", "--output-file=fonts/" + dst
  ], { cwd: here("./") });
  console.log("fonts/" + dst + ":", (fs.statSync(here("./fonts/" + dst)).size / 1024).toFixed(0) + " KB");
}
