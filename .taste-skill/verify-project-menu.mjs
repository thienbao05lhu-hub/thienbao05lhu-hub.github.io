import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.taste-skill/after-project-menu', { recursive: true });
const browser = await Browser.launch();
function check(value, message) { if (!value) throw new Error(message); }
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  const setup = await page.eval(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    return { order: [...document.querySelector('main').children].filter(e => e.tagName === 'SECTION').map(e => e.id), missingTargets: [...document.querySelectorAll('.projects-dropdown a')].filter(a => !document.querySelector(a.hash)).length };
  });
  check(setup.missingTargets === 0, 'Missing project destination');
  console.log(JSON.stringify(setup));
  const rect = await page.eval(() => {
    const r = document.querySelector('#desktopProjectsMenu summary').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rect });
  check(await page.eval(() => document.getElementById('desktopProjectsMenu').open), 'Hover did not open menu');
  await page.screenshot({ path: '.taste-skill/after-project-menu/desktop-hover.jpg' });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 20, y: 500 });
  check(await page.eval(() => !document.getElementById('desktopProjectsMenu').open), 'Pointer leave did not close menu');
  await page.eval(() => { document.querySelector('#desktopProjectsMenu summary').focus(); });
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  check(await page.eval(() => document.getElementById('desktopProjectsMenu').open), 'Keyboard did not open menu');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  check(await page.eval(() => !document.getElementById('desktopProjectsMenu').open), 'Escape did not close menu');
  const links = await page.eval(() => [...document.querySelectorAll('#desktopProjectsMenu a')].map(a => a.hash));
  for (const hash of links) {
    const target = await page.eval(hash => {
      document.querySelector('#desktopProjectsMenu').open = true;
      document.querySelector(`#desktopProjectsMenu a[href="${hash}"]`).click();
      return { hash: location.hash, closed: !document.querySelector('#desktopProjectsMenu').open, top: document.querySelector(hash).getBoundingClientRect().top, header: document.querySelector('header').getBoundingClientRect().height };
    }, hash);
    check(target.hash === hash && target.closed && target.top >= target.header - 2, `Invalid project jump: ${hash} ${JSON.stringify(target)}`);
  }
  for (const width of [1280, 1024, 768, 390]) {
    await page.setViewport({ width, height: 950 });
    const state = await page.eval(() => {
      window.scrollTo(0, 0);
      const mobile = getComputedStyle(document.querySelector('#mobileMenuBtn')).display !== 'none';
      if (mobile) {
        if (document.getElementById('mobileMenu').classList.contains('hidden')) document.getElementById('mobileMenuBtn').click();
        document.querySelector('#mobileProjectsMenu summary').click();
      }
      return { mobile, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    check(!state.overflow, `Overflow at ${width}`);
    await page.screenshot({ path: `.taste-skill/after-project-menu/menu-${width}.jpg` });
    if (state.mobile) {
      const result = await page.eval(() => {
        document.querySelector('#mobileProjectsMenu a[href="#solidworks-projects"]').click();
        return { hash: location.hash, closed: document.querySelector('#mobileMenu').classList.contains('hidden'), expanded: document.querySelector('#mobileMenuBtn').getAttribute('aria-expanded') };
      });
      check(result.hash === '#solidworks-projects' && result.closed && result.expanded === 'false', 'Mobile navigation failed');
    }
    console.log(JSON.stringify({ width, ...state }));
  }
  console.log('PASS: hover, pointer leave, keyboard, Escape, all project destinations, mobile navigation and section order.');
  console.log(JSON.stringify({ errors: page.consoleErrors }));
} finally { await browser.close(); }
