import { JSDOM } from 'jsdom';
import fs from 'fs';
import { SLIDES } from './src/deck/slides.js';

const idx = 7; // "GTM pipeline (1/2)"
const html = SLIDES[idx];

const dom = new JSDOM(`<!doctype html><html><body>
<div id="deck"><div class="slidewrap"><div class="slide anim">${html}</div></div></div>
<div id="tip"></div>
</body></html>`, { pretendToBeVisual: true, url: 'http://localhost/' });

global.window = dom.window;
global.document = dom.window.document;
global.MutationObserver = dom.window.MutationObserver;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));

const mod = await import('./src/deck/interact.js');
mod.initInteract();

const slide = document.querySelector('.slide');
const shapes = [].slice.call(slide.children).filter(el => el.classList && (el.classList.contains('sp') || el.classList.contains('gp') || (el.tagName === 'IMG')));

function num(el, p) { return parseFloat(el.style[p]) || 0; }
function box(el) { return { x: num(el,'left'), y: num(el,'top'), w: num(el,'width'), h: num(el,'height') }; }

const rows = shapes.map(el => {
  const b = box(el);
  const isImg = el.tagName === 'IMG';
  const d = el.style.getPropertyValue('--d');
  return { nm: el.getAttribute('data-nm'), isImg, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), d, cls: el.className, txt: (el.textContent||'').replace(/\s+/g,' ').trim().slice(0,40) };
});

fs.writeFileSync('probe-out.json', JSON.stringify(rows, null, 2));
console.log('total shapes:', shapes.length);
const relevant = rows.filter(r => r.h > 0 && r.h < 260);
console.log('relevant (h 0-260):', relevant.length);
console.log('images with no --d:', relevant.filter(r => r.isImg && !r.d).length);
console.log('text with no --d:', relevant.filter(r => !r.isImg && r.txt && !r.d).length);
console.log(relevant);

// now also inspect the table cells inside the .tbl wrapper -- those are where the
// actual partner rows (logo image cell + name/role text cell) live
const tblEl = shapes.find(el => el.classList.contains('tbl'));
const cells = [].slice.call(tblEl.querySelectorAll('table td'));
console.log('--- table cells:', cells.length, '---');
const cellRows = cells.map(td => ({
  d: td.style.getPropertyValue('--d'),
  cls: td.className,
  hasImg: !!td.querySelector('img'),
  txt: (td.textContent||'').replace(/\s+/g,' ').trim().slice(0,50),
}));
console.log(cellRows.slice(0, 40));
