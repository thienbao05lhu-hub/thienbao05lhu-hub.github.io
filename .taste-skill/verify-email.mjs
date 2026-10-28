import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.taste-skill/after-cover-letter', { recursive: true });
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  for (const width of [1440, 768, 390]) {
    await page.setViewport({ width, height: 1100 });
    const state = await page.eval(async () => {
      const section = document.getElementById('cover-letter');
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: section.offsetTop - 100, behavior: 'instant' });
      const images = [...section.querySelectorAll('img')].filter(image => image.offsetParent !== null);
      await Promise.all(images.map(image => image.decode()));
      return { images: images.map(image => ({ source: image.getAttribute('src'), width: image.naturalWidth })), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    console.log(JSON.stringify({ width, ...state }));
    await page.screenshot({ path: `.taste-skill/after-cover-letter/cover-letter-${width}.jpg` });
  }
  const english = await page.eval(async () => {
    switchLetterTab('en');
    const pane = document.getElementById('contentEn');
    await pane.querySelector('img').decode();
    return { visible: !pane.classList.contains('hidden'), correctRole: pane.innerText.includes('Design Engineer'), correctCompany: pane.innerText.includes('MISUMI Vietnam'), qrWidth: pane.querySelector('img').naturalWidth };
  });
  if (!english.visible || !english.correctRole || !english.correctCompany || !english.qrWidth) throw new Error('English letter verification failed');
  console.log(JSON.stringify({ english, errors: page.consoleErrors }));
} finally { await browser.close(); }
