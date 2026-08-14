import { pad } from '../deck/useDeck.js';

/* The sticky navbar: brand, the current slide's name, prev/next and the slide
   menu. All of this is chrome React renders, so all of it is Tailwind. */
export default function Navbar({ titles, current, go, menuOpen, setMenuOpen }) {
  const btn =
    'flex h-[34px] items-center gap-[7px] rounded-[9px] border border-[#e0dced] bg-[#f1f0f7] ' +
    'font-ui text-[13.5px] font-semibold leading-none text-[#4a4a5a] transition-[.14s] ' +
    'hover:border-brand-violet hover:bg-brand-violet hover:text-white';

  return (
    <nav
      className="sticky top-0 z-[200] flex h-[58px] items-center gap-[14px] border-b border-[#e4e4ee]
                 bg-white/95 px-[18px] shadow-[0_2px_12px_rgba(0,0,0,.05)] backdrop-blur-[10px]"
    >
      <img
        className="h-[22px] cursor-pointer"
        src="assets/image2.png"
        alt="Boerse Stuttgart Group"
        title="Back to top"
        onClick={() => go(0)}
      />
      <div className="max-w-[44vw] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold text-[#222]">
        <span className="mr-[7px] font-extrabold tabular-nums text-brand-violet">
          {pad(current + 1)}
        </span>
        {titles[current] || ''}
      </div>
      <div className="flex-1" />

      <button
        className={btn + ' w-[34px] justify-center p-0 text-[16px]'}
        title="Previous slide (↑ / PgUp)"
        onClick={() => go(current - 1)}
      >
        ↑
      </button>
      <button
        className={btn + ' w-[34px] justify-center p-0 text-[16px]'}
        title="Next slide (↓ / PgDn)"
        onClick={() => go(current + 1)}
      >
        ↓
      </button>

      <div className="relative">
        <button
          className={btn + ' px-[13px]'}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
        >
          ☰ Slides
        </button>
        <div
          id="menu"
          className={
            'absolute right-0 top-[44px] z-[250] max-h-[72vh] w-[352px] overflow-y-auto rounded-[12px] ' +
            'border border-[#e4e4ee] bg-white p-[8px] shadow-[0_18px_50px_rgba(0,0,0,.2)] transition-[.16s] ' +
            (menuOpen
              ? 'visible translate-y-0 opacity-100'
              : 'invisible -translate-y-[8px] opacity-0')
          }
        >
          {titles.map((t, i) => (
            <div
              key={i}
              className={
                'mitem flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[11px] py-[8px] hover:bg-[#f2effe] ' +
                (i === current ? 'bg-[#ece6ff]' : '')
              }
              onClick={() => {
                go(i);
                setMenuOpen(false);
              }}
            >
              <div
                className={
                  'flex h-[25px] w-[25px] flex-[0_0_25px] items-center justify-center rounded-[6px] ' +
                  'font-ui text-[12px] font-extrabold leading-none ' +
                  (i === current
                    ? 'bg-brand-violet text-white'
                    : 'bg-[#f0ecff] text-brand-violet')
                }
              >
                {pad(i + 1)}
              </div>
              <div className="text-[13px] leading-[1.25] text-[#333]">{t}</div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
