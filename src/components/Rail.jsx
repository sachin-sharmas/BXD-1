import { pad } from '../deck/useDeck.js';

/* The dot rail. Each dot names its slide on hover -- a `group` on the dot and
   `group-hover` on the label, which is what the old CSS did with a descendant
   hover rule. The little arrow is the label's ::after. */
export default function Rail({ titles, current, go }) {
  return (
    /* #rail / .rd / .rlabel are the DOM contract the static build had:
       the verification tools and test_interact.py address the rail through
       them. Tailwind still does every bit of the styling. */
    <div id="rail" className="fixed right-[12px] top-1/2 z-[150] flex -translate-y-1/2 flex-col gap-[7px] max-[900px]:hidden">
      {titles.map((t, i) => (
        <div
          key={i}
          onClick={() => go(i)}
          className={
            'rd group relative h-[9px] w-[9px] cursor-pointer rounded-full transition-[background,box-shadow] duration-150 ' +
            'hover:bg-brand-violet hover:shadow-[0_0_0_4px_rgba(100,50,250,.18)] ' +
            (i === current
              ? 'bg-brand-violet shadow-[0_0_0_3px_rgba(100,50,250,.22)]'
              : 'bg-[#c7c7d6]')
          }
        >
          <span
            className="rlabel pointer-events-none invisible absolute right-[20px] top-1/2 max-w-[46vw] -translate-y-1/2
                       overflow-hidden text-ellipsis whitespace-nowrap rounded-[7px] bg-[#1a1a2e] px-[11px] py-[6px]
                       font-ui text-[12.5px] font-semibold leading-[1.2] text-white opacity-0
                       shadow-[0_8px_24px_rgba(0,0,0,.32)] transition-[opacity,translate] duration-150
                       after:absolute after:right-[-4px] after:top-1/2 after:h-[8px] after:w-[8px]
                       after:-translate-y-1/2 after:rotate-45 after:bg-[#1a1a2e] after:content-['']
                       group-hover:visible group-hover:-translate-x-[4px] group-hover:opacity-100"
          >
            <span className="mr-[8px] font-extrabold tabular-nums text-brand-cyan">
              {pad(i + 1)}
            </span>
            {t}
          </span>
        </div>
      ))}
    </div>
  );
}
