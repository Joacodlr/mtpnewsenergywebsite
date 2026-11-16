/**
 * Running inside a WordPress page, in an iframe.
 *
 * Opted into with `?embed=1` on the iframe's src rather than detected, so the
 * standalone site keeps behaving exactly as it does — the masthead stays, and
 * nothing is posted to a parent that does not exist.
 *
 * Three things change when embedded:
 *
 *   1. The MTP masthead is hidden. The site around the iframe already has one,
 *      and a second logo half a screen below the first reads as a mistake.
 *   2. The app reports its height to the page, so the iframe can be sized to
 *      its content. A fixed-height iframe cannot work here: the cover is around
 *      1,500 px and the results run past 3,000, so any fixed value leaves either
 *      a large empty band or a scrollbar inside the article.
 *   3. On every change of screen the app asks the page to scroll the iframe's
 *      top into view. Otherwise a reader who scrolled down a long results page
 *      and pressed "nuevo análisis" lands below a cover that is now much shorter.
 *
 * The messages carry nothing but a number and a type, so they are posted to any
 * origin; the WordPress snippet is what checks who sent them.
 */

export const EMBEDDED =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("embed") &&
  window.parent !== window;

const post = (message: Record<string, unknown>) => window.parent.postMessage(message, "*");

export function startEmbed(): void {
  if (!EMBEDDED) return;

  // `html, body, #root { min-height: 100% }` makes the page at least as tall as
  // the iframe showing it. Measured from inside, it then can never report less
  // than the iframe's current height: the frame could grow but never shrink.
  document.documentElement.classList.add("embedded");

  const root = document.getElementById("root");
  if (!root) return;

  let last = 0;
  const report = () => {
    const height = Math.ceil(root.getBoundingClientRect().height);
    if (height !== last) {
      last = height;
      post({ type: "mtp-energia:height", height });
    }
  };

  new ResizeObserver(report).observe(root);
  report();
}

/** Ask the surrounding page to bring the top of the app into view. */
export function scrollHostToTop(): void {
  if (EMBEDDED) post({ type: "mtp-energia:top" });
}
