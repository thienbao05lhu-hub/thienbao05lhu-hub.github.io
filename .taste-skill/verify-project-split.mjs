import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.taste-skill/after-project-split', { recursive: true });
const browser = await Browser.launch();
function check(ok, message) { if (!ok) throw new Error(message); }
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await page.eval(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  for (const width of [1440, 768, 390]) {
    await page.setViewport({ width, height: 950 });
    const mobile = width < 1280;
    const selector = mobile ? '#mobileProjectsMenu' : '#desktopProjectsMenu';
    const rect = await page.eval(({ selector, mobile }) => {
      window.scrollTo(0, 0);
      if (mobile && document.querySelector('#mobileMenu').classList.contains('hidden')) document.querySelector('#mobileMenuBtn').click();
      const r = document.querySelector(`${selector} .projects-nav-link`).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, { selector, mobile });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rect });
    check(await page.eval(selector => document.querySelector(`${selector} .project-menu-wrap`).hidden, selector), 'Hover must not open menu');
    const navigation = await page.eval(selector => {
      document.querySelector(`${selector} .projects-nav-link`).click();
      return { hash: location.hash, closed: document.querySelector(`${selector} .project-menu-wrap`).hidden, top: document.querySelector('#projects').getBoundingClientRect().top };
    }, selector);
    check(navigation.hash === '#projects' && navigation.closed && navigation.top >= 70, 'Project text must navigate without opening');
    await page.eval(({ selector, mobile }) => {
      window.scrollTo(0, 0);
      if (mobile) document.querySelector('#mobileMenuBtn').click();
      document.querySelector(`${selector} .projects-toggle`).click();
    }, { selector, mobile });
    const opened = await page.eval(selector => ({ hidden: document.querySelector(`${selector} .project-menu-wrap`).hidden, expanded: document.querySelector(`${selector} .projects-toggle`).getAttribute('aria-expanded'), links: [...document.querySelectorAll(`${selector} .project-menu a`)].map(a => a.hash), overflow: document.documentElement.scrollWidth > innerWidth }), selector);
    check(!opened.hidden && opened.expanded === 'true' && opened.links.length === 3 && !opened.overflow, 'Arrow must open three category links');
    await page.screenshot({ path: `.taste-skill/after-project-split/menu-${width}.jpg` });
    const selected = await page.eval(selector => {
      document.querySelector(`${selector} a[href="#solidworks-projects"]`).click();
      return { hash: location.hash, closed: document.querySelector(`${selector} .project-menu-wrap`).hidden };
    }, selector);
    check(selected.hash === '#solidworks-projects' && selected.closed, 'Category selection failed');
    console.log(JSON.stringify({ width, navigation, opened, selected }));
  }
  console.log(JSON.stringify({ errors: page.consoleErrors }));
} finally { await browser.close(); }
