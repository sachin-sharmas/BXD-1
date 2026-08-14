/* =====================================================================
   The deck engine, as a hook.

   This is the old deck.js: it assembles the running order, mounts nothing
   itself (React does that), scales the 1280x720 stage to the viewport with a
   single transform, and reports which slide is current.

   The generated slides and the two hand-authored ones are assembled here so
   that a page can show its own SELECTION of the deck in its own ORDER. The
   numbers in `order` are 1-based positions in the FULL deck, so they stay
   stable whatever a page does with them -- which is what lets one page drop a
   slide and put another in its place.
   ===================================================================== */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SLIDES } from './slides.js';
import { EXTRA_SLIDES } from './extra.js';

export const STAGE_W = 1280;
export const STAGE_H = 720;

/* slide titles for the nav / menu (in deck order) */
export const BASE_TITLES = [
  'Title',
  'Executive Summary',
  'Where to play: four asset classes prioritised',
  'Where to play: Structured Products deep dive',
  'Business case: revenue streams',
  'Cost case: 90% cost reduction',
  'Business case detail',
  'GTM pipeline (1/2)',
  'GTM pipeline (2/2)',
  'Core pitch',
  'Next steps',
  'Thank you',
  'Backup',
  'Lessons learned',
  'Asset class deep dive',
  'How to win (1/2)',
  'How to win (2/2)',
];

/** The full deck: the generated slides, then the hand-authored re-cuts. */
export function buildDeck(order) {
  const html = SLIDES.concat(EXTRA_SLIDES.map((s) => s.html));
  const titles = BASE_TITLES.concat(EXTRA_SLIDES.map((s) => s.title));
  if (!order || !order.length) return { html, titles };

  const pickHtml = [];
  const pickTitles = [];
  order.forEach((n) => {
    const i = Number(n) - 1;
    if (!(i >= 0 && i < html.length)) return; // out of range: ignore
    pickHtml.push(html[i]);
    pickTitles.push(titles[i]);
  });
  return pickHtml.length ? { html: pickHtml, titles: pickTitles } : { html, titles };
}

/**
 * Scale-to-fit. One transform on the native stage, so every desktop width
 * shows the exact same layout, just larger or smaller.
 *
 * `measure` returns the space a slide may occupy. The two builds differ only
 * in that: the scrolling deck fits the window minus its chrome and caps the
 * scale, the fullscreen build measures the wrap itself (it is sized in svh,
 * which is not window.innerHeight while a mobile browser's UI is retracted)
 * and has no cap.
 */
export function useFit(wrapsRef, measure) {
  const fit = useCallback(() => {
    const wraps = wrapsRef.current.filter(Boolean);
    if (!wraps.length) return;
    const { width, height, cap, sizeWrap } = measure(wraps[0]);
    let scale = Math.min(width / STAGE_W, height / STAGE_H);
    if (cap) scale = Math.min(scale, cap);
    wraps.forEach((w) => {
      if (sizeWrap) {
        w.style.width = Math.round(STAGE_W * scale) + 'px';
        w.style.height = Math.round(STAGE_H * scale) + 'px';
      }
      const stage = w.firstChild;
      if (stage) stage.style.transform = 'scale(' + scale + ')';
    });
  }, [wrapsRef, measure]);

  useLayoutEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  return fit;
}

/**
 * Which slide is being looked at, and the reveal trigger.
 *
 * `.seen` is what starts the entrance: interact.js writes a per-shape
 * `transition-delay` and every one of those delays is measured from the moment
 * this class lands, so it must be added once and never removed by React.
 * A quarter in view, not a sliver -- the sequence should start when the slide
 * is actually being looked at.
 */
export function useSlideObservers(wrapsRef, count) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const wraps = wrapsRef.current.filter(Boolean);
    if (!wraps.length) return undefined;

    const active = new IntersectionObserver(
      (entries) => {
        let best = null;
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
        });
        if (best) setCurrent(wraps.indexOf(best.target));
      },
      { threshold: [0.35, 0.6, 0.85] }
    );

    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          /* interact.js has already assigned per-shape animation delays */
          en.target.firstChild.classList.add('seen');
          reveal.unobserve(en.target);
        });
      },
      { threshold: 0.25 }
    );

    wraps.forEach((w) => {
      active.observe(w);
      reveal.observe(w);
    });
    return () => {
      active.disconnect();
      reveal.disconnect();
    };
  }, [wrapsRef, count]);

  return [current, setCurrent];
}

/** Scroll progress, 0..1. */
export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setP(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    };
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => document.removeEventListener('scroll', onScroll);
  }, []);
  return p;
}

/**
 * Keyboard navigation. A slide may own a text field (the partner search on the
 * hand-authored GTM slide); Space and the arrows belong to whoever is typing,
 * not to the deck.
 */
export function useKeyboardNav(go, count, current, onEscape) {
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        go(current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        go(current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        go(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        go(count - 1);
      } else if (e.key === 'Escape') {
        if (onEscape) onEscape();
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, count, current, onEscape]);
}

export function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

/**
 * Run the interaction layer and wire the hand-authored slides, once, after the
 * slides are in the DOM. Both read the mounted markup and attach behaviour to
 * it, so they cannot run before React has painted -- and must not run twice.
 */
export function useInteractions(ready, initInteract, wireExtra) {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    wireExtra();
    initInteract();
  }, [ready, initInteract, wireExtra]);
}
