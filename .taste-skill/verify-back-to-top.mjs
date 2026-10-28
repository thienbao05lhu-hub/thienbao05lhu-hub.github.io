import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.taste-skill/after-back-to-top', { recursive: true });
const browser = await Browser.launch();
function check(value, message) { if (!value) throw new Error(message); }
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 900 });
    const result = await page.eval(async () => {
      const button = document.getElementById('backToTop');
      const settle = async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); };
      window.scrollTo({ top: 0, behavior: 'instant' });
      await settle();
      const hiddenAtTop = button.hidden;
      window.scrollTo({ top: 1400, behavior: 'instant' });
      await settle();
      const r = button.getBoundingClientRect();
      return { hiddenAtTop, visibleAfterScroll: !button.hidden, fits: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, width: r.width, height: r.height };
    });
    check(result.hiddenAtTop && result.visibleAfterScroll && result.fits && result.width >= 44, 'Button visibility or geometry failed');
    await page.screenshot({ path: `.taste-skill/after-back-to-top/button-${width}.jpg` });
    const bottomResult = await page.eval(async () => {
      const button = document.getElementById('goToBottom');
      const r = button.getBoundingClientRect();
      const left = r.left;
      button.click();
      const end = performance.now() + 5000;
      while (document.documentElement.scrollHeight - innerHeight - scrollY > 2 && performance.now() < end) await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return { left, remaining: document.documentElement.scrollHeight - innerHeight - scrollY, hidden: button.hidden, focusedFooter: document.activeElement === document.querySelector('footer') };
    });
    check(bottomResult.left >= 0 && bottomResult.left <= 24 && bottomResult.remaining <= 2 && bottomResult.hidden && bottomResult.focusedFooter, 'Go-to-bottom action failed');
    console.log(JSON.stringify({ viewport: width, bottomResult }));
    const clickResult = await page.eval(async () => {
      document.getElementById('backToTop').click();
      const end = performance.now() + 5000;
      while (window.scrollY > 1 && performance.now() < end) await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return { top: scrollY, hidden: document.getElementById('backToTop').hidden, focusedHeading: document.activeElement === document.querySelector('h1') };
    });
    check(clickResult.top <= 1 && clickResult.hidden && clickResult.focusedHeading, 'Back-to-top action failed');
    console.log(JSON.stringify({ width, ...result, ...clickResult }));
  }
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const reduced = await page.eval(async () => {
    window.scrollTo({ top: 1000, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    document.getElementById('backToTop').click();
    return scrollY;
  });
  check(reduced === 0, 'Reduced motion must return immediately');
  console.log('PASS: desktop, phone, visibility, click, focus and reduced motion.');
  console.log(JSON.stringify(page.consoleErrors));
} finally { await browser.close(); }
