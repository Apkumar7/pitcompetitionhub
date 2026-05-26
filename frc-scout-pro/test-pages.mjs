import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = './screenshots';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { path: '/login',        name: '01-login',        wait: 'text=Sign in' },
  { path: '/signup',       name: '02-signup',       wait: 'text=Create account' },
  { path: '/dashboard',    name: '03-dashboard',    wait: 'text=Dashboard' },
  { path: '/schedule',     name: '04-schedule',     wait: 'text=Match Schedule' },
  { path: '/scout/match',  name: '05-scout-match',  wait: 'text=Match Scouting' },
  { path: '/scout/pit',    name: '06-scout-pit',    wait: 'text=Pit Scouting' },
  { path: '/teams',        name: '07-teams',        wait: 'text=Teams' },
  { path: '/analytics',    name: '08-analytics',    wait: 'text=Analytics' },
  { path: '/alliance',     name: '09-alliance',     wait: 'text=Alliance Selection' },
  { path: '/strategy',     name: '10-strategy',     wait: 'text=Strategy Center' },
  { path: '/notifications',name: '11-notifications',wait: 'text=Notifications' },
  { path: '/settings',     name: '12-settings',     wait: 'text=Settings' },
  { path: '/events',       name: '13-events',       wait: 'text=Events' },
  { path: '/admin',        name: '14-admin',        wait: 'text=Admin' },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const results = [];

for (const { path, name, wait } of PAGES) {
  const pageErrors = [];
  const consoleHandler = msg => { if (msg.type() === 'error') pageErrors.push(msg.text()); };
  page.on('console', consoleHandler);

  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Wait for key text to appear (up to 8s)
    try {
      await page.waitForSelector(`text=${wait.replace('text=','')}`, { timeout: 8000 });
    } catch {}
    await page.waitForTimeout(1500);

    const screenshotPath = `${OUT}/${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const title = await page.title();
    const finalUrl = page.url();
    results.push({ name, path, finalUrl, title, errors: pageErrors.slice(0, 3), screenshot: screenshotPath, ok: true });
  } catch (e) {
    results.push({ name, path, finalUrl: page.url(), title: '', errors: [e.message.substring(0, 200)], screenshot: null, ok: false });
  }

  page.off('console', consoleHandler);
}

await browser.close();

console.log('\n=== PAGE TEST RESULTS ===\n');
for (const r of results) {
  const icon = r.ok ? (r.errors.length === 0 ? '✅' : '⚠️') : '❌';
  console.log(`${icon} ${r.name}  →  ${r.finalUrl}`);
  if (r.errors.length > 0) {
    for (const e of r.errors) console.log(`     ERROR: ${e.substring(0, 150)}`);
  }
}
console.log(`\nScreenshots saved to ./screenshots/`);
