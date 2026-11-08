/* Renders icons/icon.svg to the PNG sizes a PWA needs, using headless Edge (or Chrome).
   Usage: node tools/make-icons.js            Writes icons/*.png and icons/icon-maskable.svg */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = path.join(ROOT, 'icons');
const src = fs.readFileSync(path.join(ICONS, 'icon.svg'), 'utf8');

// full-bleed square for iOS (it rounds corners itself) and a maskable version with a safe zone
const square = src.replace('rx="112"', 'rx="0"');
const maskable = square.replace(/(<g stroke="#8fa0ff")/, '<g transform="translate(256 256) scale(.74) translate(-256 -256)">$1').replace('</svg>', '</g>\n</svg>');
fs.writeFileSync(path.join(ICONS, 'icon-square.svg'), square);
fs.writeFileSync(path.join(ICONS, 'icon-maskable.svg'), maskable);

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const exe = browsers.find(b => fs.existsSync(b));
if (!exe) { console.error('No Edge/Chrome found'); process.exit(1); }

const jobs = [
  ['icon.svg', 192, 'icon-192.png'],
  ['icon.svg', 512, 'icon-512.png'],
  ['icon-maskable.svg', 512, 'icon-maskable-512.png'],
  ['icon-maskable.svg', 192, 'icon-maskable-192.png'],
  ['icon-square.svg', 180, 'apple-touch-icon.png'],
];
// a private profile stops the call being handed to an already-running browser window
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'axon-icons-'));
for (const [svg, size, out] of jobs) {
  const url = 'file:///' + path.join(ROOT, 'tools', 'icon-render.html').replace(/\\/g, '/') + `?svg=${svg}&size=${size}`;
  execFileSync(exe, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`, '--default-background-color=00000000', `--window-size=${size},${size}`,
    `--screenshot=${path.join(ICONS, out)}`, url,
  ], { stdio: 'ignore', timeout: 30000 });
  const buf = fs.readFileSync(path.join(ICONS, out));
  console.log(`wrote icons/${out}  ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}  ${(buf.length / 1024).toFixed(1)} KB`);
}
