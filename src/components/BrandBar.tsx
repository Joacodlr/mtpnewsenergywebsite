import { EMBEDDED } from "../lib/embed";

/**
 * The MTP masthead, carried through the funnel.
 *
 * A red rule across the top and the logo on white — the way mtpnoticias.com
 * opens every page. Kept small: on the questionnaire and the results it marks
 * whose page this is, it does not compete with the question.
 */
export function BrandBar({ onHome }: { onHome?: () => void }) {
  // Inside mtpnoticias.com the site's own header is already above the iframe.
  if (EMBEDDED) return null;

  const mark = (
    <span className="flex items-center gap-3">
      <img src="/mtp-logo.webp" alt="MTP Noticias" className="h-9 w-auto" />
      <span className="border-l border-ink/15 pl-3 text-sm font-bold uppercase tracking-[0.14em] text-ink">
        Energía
      </span>
    </span>
  );

  return (
    <div className="border-b border-ink/10 bg-white">
      <div className="h-1 bg-brand" aria-hidden />
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        {onHome ? (
          <button
            type="button"
            onClick={onHome}
            className="rounded transition hover:opacity-75"
            aria-label="Volver al inicio"
          >
            {mark}
          </button>
        ) : (
          mark
        )}
      </div>
    </div>
  );
}
