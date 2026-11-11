// Records each slide of tan_nguyen_soc.html to its own 1920×1080 H.264 MP4 in ../assets/videos/soc-NN-<slug>.mp4.
//
// Needs: ffmpeg on PATH, the `playwright` npm package plus its Chromium (`npx playwright install chromium`) (point PW_DIR at the folder whose
// node_modules has it), and the site served at BASE (default http://127.0.0.1:9000, i.e. `python3 -m http.server 9000`
// from the repo root). Usage:
//   PW_DIR=/path/with/node_modules node php2shell_webinar/record_soc_deck.mjs [slideNumbers...]
//
// Every slide in the deck is a UV.stepper: one beat per click. The recorder restarts the slide's animation, holds each beat
// for BEATS[id][k] seconds (the deck's own animation length for that beat, from its u(k, delay, dur) calls) plus HOLD
// for reading, then presses → for the next beat. It never presses past the last beat, so the deck never changes slide.
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(process.env.PW_DIR ? join(process.env.PW_DIR, 'x.js') : import.meta.url);
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'videos');
const BASE = process.env.BASE || 'http://127.0.0.1:9000';
const URL = `${BASE}/php2shell_webinar/tan_nguyen_soc.html`;
const HOLD = 1.5, MIN_BEAT = 3.5, TAIL = 1.5, FPS = 30;

// animation seconds per beat, read from each slide's u(k, delay, dur) calls (1.0 = no explicit timing found)
const BEATS = {
  'tt-slide': [3.6], 'we-slide': [2.0, 1.0, 1.0], 'ag-slide': [1.0], 'sc-slide': [2.0, 2.1, 3.1, 1.6],
  'jb-slide': [1.65, 1.65, 2.3], 'ic-slide': [1.6, 1.6, 1.0], 'pb-slide': Array(8).fill(1.75),
  'fb-slide': [1.0, 1.0, 1.0, 1.0, 1.1], 'fq-slide': [3.5, 1.3, 1.3, 1.7, 1.8], 'xb-slide': Array(5).fill(2.0),
  'mn-slide': [2.2, 1.9, 1.6], 'ov-slide': [1.0, 1.4, 1.0, 1.41, 1.3, 1.0], 'dv-slide': [3.4],
  'cb-slide': Array(5).fill(1.0), 'tf-slide': [2.3, 1.5, 1.0], 'mi-slide': [2.1, 1.5, 1.7, 1.1, 1.0],
  'bb-slide': [1.0, 1.0, 1.0, 1.0, 2.6], 'bv-slide': [1.5, 1.3, 1.5, 1.1, 1.0], 'fx2-slide': [2.8],
  'ph-slide': [2.3, 2.1, 1.0, 1.0, 4.0, 2.2, 3.3, 1.0],
};

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Playwright's own Chromium (`npx playwright install chromium`), not Google Chrome: company-managed Chrome disallows
// DevTools remote debugging and exits ~5 s after launch.
// CHROMIUM = path to a Chromium binary, if Playwright's own install can't be used (e.g. its unpack step is blocked).
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const page = await ctx.newPage();
page.on('crash', () => console.error('page crashed'));
page.on('pageerror', e => console.error('page error:', e.message));
mkdirSync(OUT, { recursive: true });

await page.goto(URL, { waitUntil: 'networkidle' });
const slides = await page.$$eval('section.slide', ss => ss.map(s => ({ id: s.id, nav: s.dataset.nav, steps: (s.deckSteps || [1]).length })));
const only = process.argv.slice(2).map(Number).filter(Boolean);

for (const [i, s] of slides.entries()) {
  const n = i + 1;
  if (only.length && !only.includes(n)) continue;
  const beats = BEATS[s.id] || [];
  const holds = Array.from({ length: s.steps }, (_, k) =>
    Math.max((beats[k] ?? 1.0) + HOLD, MIN_BEAT) + (k === s.steps - 1 ? TAIL : 0));

  await page.goto(`${URL}#${n}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });              // hash-only goto doesn't reload; make sure #n is the slide shown
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);

  const dir = mkdtempSync(join(tmpdir(), `soc-${n}-`));
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const f = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await sleep(150);

  // restart the slide from beat 1 now that fonts are in and capture is running
  await page.evaluate(id => { const sec = document.getElementById(id);
    sec.dispatchEvent(new CustomEvent('leave')); sec.dispatchEvent(new CustomEvent('enter', { detail: { back: false } })); }, s.id);
  const t0 = Date.now() / 1000;
  for (let k = 0; k < s.steps; k++) {
    await sleep(holds[k] * 1000);
    if (k < s.steps - 1) await page.keyboard.press('ArrowRight');
  }
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await sleep(200);
  await cdp.detach();

  // resample to a constant frame rate: output frame j (at t0 + j/FPS) is the newest captured frame at or before that
  // moment. (ffmpeg's concat demuxer can't be fed per-frame durations here: it stretches sub-frame durations, so clips
  // with sparse capture came out seconds too long.)
  const seq = join(dir, 'seq'); mkdirSync(seq);
  const total = Math.round((tEnd - t0) * FPS);
  let c = 0;
  for (let j = 0; j < total; j++) {
    const at = t0 + j / FPS;
    while (c + 1 < frames.length && frames[c + 1].t <= at) c++;
    linkSync(frames[c].f, join(seq, `${String(j).padStart(5, '0')}.jpg`));
  }

  const out = join(OUT, `soc-${String(n).padStart(2, '0')}-${slug(s.nav)}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(seq, '%05d.jpg'),
    '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow',
    '-movflags', '+faststart', '-an', out]);
  if (process.env.KEEP) console.log("kept", dir); else rmSync(dir, { recursive: true, force: true });
  console.log(`${n}\t${s.id}\t${s.steps} beats\t${(tEnd - t0).toFixed(1)}s\t${frames.length} captured\t${out.split('/').pop()}`);
}

await browser.close();
