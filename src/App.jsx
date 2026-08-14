/* =====================================================================
   BXD 1 — the deck as PowerPoint has it, scrolling like a web page.

   The home page shows the 17 generated slides and nothing else. The two
   hand-authored re-cuts (18 GTM pipeline detail, 19 How to win) are still
   built and still live in src/deck/extra.js -- they are simply not listed
   here. Change ORDER to show them; the numbers are 1-based positions in the
   full 19-slide deck.
   ===================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Rail from './components/Rail.jsx';
import Stage from './components/Stage.jsx';
import { initInteract } from './deck/interact.js';
import { wireExtra } from './deck/extra.js';
import {
  buildDeck,
  useFit,
  useInteractions,
  useKeyboardNav,
  useScrollProgress,
  useSlideObservers,
} from './deck/useDeck.js';

export default function App({ order }) {
  const { html, titles } = useMemo(() => buildDeck(order), [order]);
  const wrapsRef = useRef([]);
  const [current, setCurrent] = useSlideObservers(wrapsRef, html.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  const progress = useScrollProgress();

  /* the scrolling build fits the window minus its chrome, and does not scale
     past 1.6 -- a very wide screen should not blow the design up */
  const measure = useCallback(
    () => ({
      width: Math.max(320, window.innerWidth - 40),
      height: window.innerHeight - 92,
      cap: 1.6,
      sizeWrap: true,
    }),
    []
  );
  useFit(wrapsRef, measure);

  const go = useCallback(
    (i) => {
      const n = Math.max(0, Math.min(html.length - 1, i));
      const w = wrapsRef.current[n];
      if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [html.length]
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useKeyboardNav(go, html.length, current, closeMenu);
  useInteractions(mounted, initInteract, wireExtra);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const t = setTimeout(() => setHintGone(true), 4200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onClick = () => setMenuOpen(false);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <div
        className="fixed left-0 top-0 z-[300] h-[3px] bg-gradient-to-r from-brand-violet to-brand-magenta
                   transition-[width] duration-[80ms] ease-linear"
        style={{ width: progress * 100 + '%' }}
      />

      <Navbar
        titles={titles}
        current={current}
        go={go}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      <Rail titles={titles} current={current} go={go} />

      <main id="deck" className="flex flex-col items-center gap-[26px] pb-[56px] pt-[18px]">
        {html.map((h, i) => (
          <Stage
            key={i}
            html={h}
            index={i}
            total={html.length}
            ref={(el) => {
              wrapsRef.current[i] = el;
            }}
          />
        ))}
      </main>

      {/* interact.js drives this by id: it sets the text and the position and
          toggles `show`, so it stays a plain element with stylesheet rules */}
      <div id="tip" />

      <div
        id="hint"
        className={
          'pointer-events-none fixed bottom-[16px] left-1/2 z-[160] -translate-x-1/2 rounded-[20px] ' +
          'bg-[rgba(26,26,46,.86)] px-[13px] py-[7px] text-[12.5px] text-white transition-opacity duration-[400ms] ' +
          (hintGone ? 'opacity-0' : 'opacity-100')
        }
      >
        Scroll or use ↑ ↓ · hover logos · click table groups to fold
      </div>
    </>
  );
}
