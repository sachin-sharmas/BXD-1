import { forwardRef } from 'react';

/* One mounted slide.

   The body is generated markup from src/deck/slides.js -- absolutely
   positioned shapes carrying inline geometry read out of the OOXML -- so it is
   set as HTML rather than rebuilt as components. That is what keeps this build
   pixel-identical to the source deck: every position, size and font size is the
   one PowerPoint stored, not one a component re-derived.

   The class names matter and are not decorative:
     .slidewrap  extra.js finds a hand-authored slide's page number through it
     .slide      the stylesheet hangs the primitives and the whole interaction
                 layer off it, and interact.js collects slides by it
     .anim       the entrance; deck adds .seen to it when the slide is reached
   The wrapper's FIRST child must be the stage -- the scaler and the reveal
   observer both take firstChild.
*/
const Stage = forwardRef(function Stage({ html, index, total }, ref) {
  return (
    <div
      ref={ref}
      className="slidewrap group relative overflow-hidden rounded-[4px] bg-white
                 shadow-[0_10px_30px_rgba(30,20,60,.15)] scroll-mt-[74px]"
    >
      <div className="slide anim" dangerouslySetInnerHTML={{ __html: html }} />
      <div
        className="pointer-events-none absolute left-[10px] top-[8px] z-30 rounded-[20px]
                   bg-[rgba(100,50,250,.9)] px-[9px] py-[4px] font-ui text-[11px] font-bold leading-none
                   text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        {index + 1} / {total}
      </div>
    </div>
  );
});

export default Stage;
