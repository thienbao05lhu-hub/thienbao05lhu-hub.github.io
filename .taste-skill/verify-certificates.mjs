import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.taste-skill/after-certificates', { recursive: true });
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  for (const width of [1440, 768, 390]) {
    await page.setViewport({ width, height: 1100 });
    const state = await page.eval(async () => {
      const section = document.getElementById('certificates');
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: section.offsetTop - 100, behavior: 'instant' });
      const images = [...section.querySelectorAll('img')];
      await Promise.all(images.map(image => image.decode()));
      return { images: images.map(image => ({ source: image.getAttribute('src'), width: image.naturalWidth })), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    console.log(JSON.stringify({ width, ...state }));
    await page.screenshot({ path: `.taste-skill/after-certificates/certificates-${width}.jpg` });
  }
} finally { await browser.close(); }
