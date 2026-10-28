import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

mkdirSync('.taste-skill/after-mastercam', { recursive: true });

const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  const videos = await page.eval(async () => {
    const results = [];
    for (const video of document.querySelectorAll('.motor-project video')) {
      await video.play();
      video.muted = false;
      await new Promise(resolve => setTimeout(resolve, 400));
      video.pause();
      results.push({ src: video.getAttribute('aria-label'), muted: video.muted, audioTracks: video.audioTracks?.length ?? null, audioDecodedBytes: video.webkitAudioDecodedByteCount, duration: video.duration, currentTime: video.currentTime, width: video.videoWidth, height: video.videoHeight, error: video.error?.message || null });
    }
    return results;
  });
  console.log(JSON.stringify(videos));
  for (const width of [1440, 768, 390]) {
    await page.setViewport({ width, height: width === 390 ? 1100 : 900 });
    const layout = await page.eval(() => {
      const section = document.querySelector('#mastercam-projects-title');
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 100, behavior: 'instant' });
      return { overflow: document.documentElement.scrollWidth > innerWidth, columns: getComputedStyle(document.querySelector('.motor-project-videos')).gridTemplateColumns };
    });
    console.log(JSON.stringify({width, ...layout}));
    await page.screenshot({ path: `.taste-skill/after-mastercam/project-${width}.jpg` });
  }
} finally {
  await browser.close();
}
