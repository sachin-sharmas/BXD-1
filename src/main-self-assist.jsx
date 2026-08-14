import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SLIDES } from './deck/slides.js';
import { EXTRA_SLIDES } from './deck/extra.js';

/* Self-assist: the SAME deck, with the two dense slides replaced in place
   by their interactive re-cuts. The numbers are 1-based positions in the
   full 19-slide deck (17 generated + 2 hand-authored), so they stay stable
   whatever a page does with them:
     position  8   slide 18  GTM pipeline, partner detail   (was slide 8)
     position 16   slide 19  How to win, value chain        (was 16 + 17)
   16 slides instead of 17. index.html still serves them all. */
const ORDER = [1, 2, 3, 4, 5, 6, 7, 18, 9, 10, 11, 12, 13, 14, 15, 19];

/* Order matters: Tailwind first, then the deck stylesheet, so a rule that
   styles generated markup always outranks Preflight on a tie. */
import './styles/index.css';
import './styles/deck.css';
import './styles/_extra-slides.css';

/* No StrictMode: it double-invokes effects in development, and the interaction
   layer mutates the mounted markup (it inserts a tint plate per unit and binds
   pointer handlers), so running it twice would double everything. */

/* The static build put the deck on `window`, and the repo's verification tools
   (tools/verify.py, tools/test_extra.py) still address it there. Re-exposing it
   keeps that contract -- nothing in the app reads these. */
window.SLIDES = SLIDES;
window.EXTRA_SLIDES = EXTRA_SLIDES;
window.SLIDE_ORDER = ORDER;

createRoot(document.getElementById('root')).render(<App order={ORDER} />);
