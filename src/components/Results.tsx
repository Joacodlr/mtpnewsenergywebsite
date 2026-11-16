import { euros, number, perKwh } from "../lib/format";
import { REGULATED } from "../lib/billing";
import { PERIOD_DESCRIPTIONS } from "../lib/periods";
import type { Profile } from "../lib/profile";
import { powerSaving, type Ranked } from "../lib/recommend";
import { BrandBar } from "./BrandBar";
import type { Assumption } from "../lib/expand";

/**
 * The answer.
 *
 * Ordered by what the household can act on, which is not the same as ordered by
 * size: the contracted-power finding comes first when it exists, because it is
 * money available without switching supplier, signing anything or waiting. The
 * tariff ranking follows, and the assumptions sit at the bottom where they can
 * be checked rather than hidden.
 */
export function Results({
  profile,
  ranked,
  assumed,
  onRestart,
}: {
  profile: Profile;
  ranked: Ranked[];
  /** What the shorter questionnaire filled in rather than asked. */
  assumed: Assumption[];
  onRestart: () => void;
}) {
  const eligible = ranked.filter((row) => !row.excludedBy);
  const excluded = ranked.filter((row) => row.excludedBy);
  const power = powerSaving(profile);

  /*
   * No plan survives the stated preferences.
   *
   * It cannot happen with the table as it stands — the strictest combination
   * still leaves four — but the table changes and the previous fallback was to
   * recommend `ranked[0]`, which is an EXCLUDED plan. That would have presented
   * a tariff as the recommendation while the same screen explained why it had
   * been ruled out. Saying there is nothing is the only honest answer.
   */
  if (eligible.length === 0) {
    return (
      <>
        <BrandBar onHome={onRestart} />
        <main className="mx-auto w-full max-w-2xl px-6 py-20 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ninguna tarifa cumple todo lo que nos has pedido
          </h1>
          <p className="mt-4 leading-relaxed text-slate-500">
            Con las condiciones que has marcado no nos queda ninguna opción que ofrecerte.
            Prueba a relajar alguna — la permanencia suele ser la que más cierra la lista —
            y volvemos a comparar.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="mt-8 rounded-full bg-ink px-8 py-4 text-sm font-bold text-white transition hover:bg-brand-deep"
          >
            Cambiar mis respuestas
          </button>
        </main>
      </>
    );
  }

  const best = eligible[0];

  return (
    <>
      <BrandBar onHome={onRestart} />
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="animate-fade-up text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">
          Resultado del análisis
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Consumo estimado: {number(profile.annualKwh)} kWh al año
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-500">
          Según tu perfil, la opción más adecuada es{" "}
          <strong className="text-ink">{best.tariff.name}</strong>, de {best.tariff.retailer}.
        </p>

        {/* The one comparison the household can actually check against its own
            experience. Without it the page gives an annual figure with nothing
            to measure it by, and "1.186 €" means nothing to someone who thinks
            in monthly bills. */}
        {profile.statedSpendRange && (
          <BillComparison band={profile.statedSpendRange} best={best.cost.total} />
        )}
      </header>

      {/* Before any tariff: the saving that needs no supplier at all. */}
      {power !== null && (
        <section className="animate-fade-up mt-10 rounded-3xl bg-ink p-7 text-white">
          {/* "Sin cambiar de comercializadora" presupposed we knew which one
              that was, and the questionnaire never asks. The claim that matters
              is the true one: this works with whoever you are already with. */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Puedes pedirlo hoy, sea cual sea tu compañía
          </p>
          <p className="mt-3 text-2xl font-bold">
            Reducir la potencia supondría unos {euros(power)} al año
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Tienes contratados {profile.currentPower.p1.toString().replace(".", ",")} kW y
            serían suficientes {profile.suggestedPower.p1.toString().replace(".", ",")} kW. La
            modificación se solicita a tu comercializadora y se factura a diario, con
            independencia del consumo.
          </p>
          <p className="mt-3 text-xs text-white/50">
            Antes de reducirla, comprueba que cubre el funcionamiento simultáneo de tus
            equipos: una potencia insuficiente provoca cortes de suministro.
          </p>
        </section>
      )}

      {profile.findings.length > 0 && (
        <section className="animate-fade-up mt-6 space-y-3">
          {profile.findings.map((finding) => (
            <p
              key={finding}
              className="rounded-2xl bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-sm ring-1 ring-black/5"
            >
              {finding}
            </p>
          ))}
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Tarifas ordenadas por coste anual estimado
        </h2>
        <div className="mt-5 space-y-4">
          {eligible.map((row, position) => (
            <PlanRow key={row.tariff.id} row={row} rank={position} />
          ))}
        </div>
      </section>

      {excluded.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Descartadas según tus preferencias
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Las mantenemos visibles para que puedas valorar el coste de cada preferencia. Si
            la modificas, vuelven a incluirse en la comparativa.
          </p>
          <div className="mt-5 space-y-4">
            {excluded.map((row) => (
              <PlanRow key={row.tariff.id} row={row} rank={-1} />
            ))}
          </div>
        </section>
      )}

      <Assumptions profile={profile} assumed={assumed} />

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full px-6 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-ink"
        >
          Realizar un nuevo análisis
        </button>
      </div>
      </main>
    </>
  );
}

/**
 * Our estimate against the band the household said it pays.
 *
 * Compared against the BAND, never a midpoint. "Entre 40 y 80 €" is 480 to 960
 * a year, and an estimate of 814 sits comfortably inside it — the first version
 * collapsed that band to 720 and then called a 94 € gap "material", which was a
 * difference invented entirely by the bucketing.
 *
 * So the only saving claimed is one large enough to clear the whole band. Any
 * estimate inside it agrees with what the household told us, and saying so is
 * more useful than a precise number built from two rough ones.
 */
function BillComparison({
  band,
  best,
}: {
  band: { min: number; max: number };
  best: number;
}) {
  const open = !Number.isFinite(band.max);
  const label = open
    ? `más de ${euros(band.min)}`
    : `entre ${euros(band.min)} y ${euros(band.max)}`;

  const below = best < band.min;
  const above = best > band.max;

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-white p-5 text-sm leading-relaxed text-slate-600 ring-1 ring-black/5">
      Por lo que nos has dicho, pagas <strong className="text-ink">{label}</strong> al año.{" "}
      {below ? (
        <>
          La opción recomendada saldría por{" "}
          <strong className="text-brand-deep">{euros(best)}</strong>, por debajo de esa
          horquilla. Es una orientación, no una oferta: el ahorro real depende de la tarifa
          que tengas ahora, que no te hemos preguntado.
        </>
      ) : above ? (
        <>
          Nuestra estimación ({euros(best)}) queda por encima de esa horquilla. Suele
          significar que tienes una tarifa mejor que la media, o que consumes menos de lo
          que deducimos de tus respuestas.
        </>
      ) : (
        <>
          Nuestra estimación para la opción recomendada, {euros(best)}, cae dentro de esa
          horquilla, así que no podemos prometerte un ahorro cambiando de tarifa. Lo que sí
          conviene revisar es la potencia contratada.
        </>
      )}
    </div>
  );
}

function PlanRow({ row, rank }: { row: Ranked; rank: number }) {
  const { tariff, cost, costIfUnshifted } = row;
  const excluded = rank === -1;

  return (
    <article
      className={`animate-fade-up rounded-3xl bg-white p-6 shadow-sm ring-1 transition ${
        rank === 0 ? "ring-2 ring-brand" : "ring-black/5"
      } ${excluded ? "opacity-60" : ""}`}
      style={{ animationDelay: `${Math.max(0, rank) * 60}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {rank === 0 && (
            <span className="inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-deep">
              Opción recomendada
            </span>
          )}
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {tariff.retailer}
          </p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight">{tariff.name}</h3>
        </div>

        <div className="text-right">
          <p className="text-2xl font-extrabold tracking-tight">{euros(cost.total)}</p>
          <p className="text-xs text-slate-500">al año, IVA incluido</p>
          <p className="mt-1 text-xs text-slate-500">≈ {euros(cost.total / 12)} al mes</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{row.verdict}</p>

      {/* A reorder the household cannot see is indistinguishable from a worse
          comparison, so when a preference moved a plan above a cheaper one we
          say which preference and leave the prices visible. */}
      {row.preferredBecause && (
        <p className="mt-3 rounded-xl bg-brand/10 p-3 text-sm text-brand-deep">
          La hemos puesto por delante de alguna más barata: {row.preferredBecause}
        </p>
      )}

      {/* The price shown already assumes the move, because the household told
          us it could make it. Naming what it is worth keeps that visible
          instead of folding it silently into the headline figure. */}
      {costIfUnshifted && (
        <p className="mt-3 rounded-xl bg-brand/10 p-3 text-sm text-brand-deep">
          Importe calculado programando lavadora y lavavajillas en horas valle. Sin
          desplazar ese consumo serían {euros(costIfUnshifted.total)} al año, es decir{" "}
          {euros(costIfUnshifted.total - cost.total)} más.
        </p>
      )}

      {row.excludedBy && (
        <p className="mt-3 text-sm font-medium text-slate-500">Descartada: {row.excludedBy.toLowerCase()}.</p>
      )}

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <div>
          <dt className="inline font-semibold">Energía: </dt>
          <dd className="inline">
            {tariff.energy.kind === "flat"
              ? perKwh(tariff.energy.rate)
              : tariff.energy.kind === "periods"
                ? `${perKwh(tariff.energy.punta)} punta · ${perKwh(tariff.energy.valle)} valle`
                : `mercado + ${perKwh(tariff.energy.spread)}`}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">Permanencia: </dt>
          <dd className="inline">
            {tariff.commitmentMonths === 0 ? "ninguna" : `${tariff.commitmentMonths} meses`}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">Renovable: </dt>
          <dd className="inline">{tariff.renewable ? "sí" : "no certificada"}</dd>
        </div>
        {/* The date is per row, not per table: the source re-checks each
            retailer on its own schedule, and some of these are months apart. A
            single "actualizado hoy" would have flattened that away. */}
        <div>
          <dt className="inline font-semibold">Precio consultado: </dt>
          <dd className="inline">{tariff.source.checked}</dd>
        </div>
        {tariff.verified === "indicative" && (
          <div className="font-semibold text-slate-400">Precio orientativo</div>
        )}
      </dl>

      {tariff.notes && <p className="mt-3 text-xs leading-relaxed text-slate-400">{tariff.notes}</p>}

      {/*
       * Two links, and the distinction between them is the point.
       *
       * The primary one goes to the retailer's own page for this product —
       * where someone can actually act — and exists only where that page has
       * been opened and confirmed. The secondary one goes to where the PRICE
       * was read, which is often a comparison article, and is labelled as such.
       *
       * Neither says "Contratar". We have no commercial relationship with any
       * of these retailers and a button implying one would be the most
       * misleading thing on the page.
       */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-4">
        {tariff.signupUrl ? (
          <a
            href={tariff.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-deep"
          >
            Ver la tarifa en {tariff.retailer}
            <span aria-hidden>↗</span>
          </a>
        ) : (
          <span className="text-xs text-slate-400">
            No tenemos enlace confirmado de {tariff.retailer} para esta tarifa.
          </span>
        )}

        <a
          href={tariff.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4 transition hover:text-ink"
        >
          De dónde sale el precio
          <span aria-hidden>↗</span>
        </a>
      </div>
    </article>
  );
}

/**
 * Everything the number above depends on, written down.
 *
 * This section is the point of the product rather than a disclaimer attached to
 * it. A comparator that will not show its workings is asking to be trusted on
 * the strength of its design, and the households most likely to be overpaying
 * are exactly the ones who have been burnt by that before.
 */
function Assumptions({ profile, assumed }: { profile: Profile; assumed: Assumption[] }) {
  return (
    <section className="mt-14 rounded-3xl bg-white/60 p-7 ring-1 ring-black/5">
      <h2 className="text-sm font-extrabold tracking-tight">Criterios y supuestos aplicados</h2>

      {/*
        What the ten-question version filled in rather than asked. Listed first
        and in full, because it is the one thing this page knows that the
        household does not: which parts of the answer are a default, and what
        to do if a default does not describe them.
      */}
      <div className="mt-4 border-l-4 border-brand-amber bg-white p-4">
        <p className="text-sm font-bold text-ink">Lo que hemos supuesto para no preguntarte</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/70">
          {assumed.map((item) => (
            <li key={item.key}>{item.text}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-500">
        <p>
          Distribución estimada de tu consumo:{" "}
          <strong className="text-ink">{number(profile.use.punta)} kWh</strong> en punta,{" "}
          <strong className="text-ink">{number(profile.use.llano)} kWh</strong> en llano y{" "}
          <strong className="text-ink">{number(profile.use.valle)} kWh</strong> en valle.
        </p>
        <p className="text-xs">{PERIOD_DESCRIPTIONS.punta}</p>
        <p className="text-xs">{PERIOD_DESCRIPTIONS.valle}</p>
      </div>

      <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        <li>
          El consumo es una <strong>estimación</strong> basada en tus respuestas, no una
          medición. Tu distribuidora publica la curva horaria real en Datadis; una vez
          integrada, estas preguntas dejarán de ser necesarias.
        </li>
        <li>
          Partimos de <strong>{number(profile.areaM2)} m²</strong>. El clima se aplica por
          provincia, tomando como referencia su capital. En municipios de montaña dentro de
          provincias templadas, la demanda de calefacción quedará infraestimada.
        </li>
        <li>
          Impuesto eléctrico {(REGULATED.electricityTaxRate * 100).toFixed(2).replace(".", ",")}%,
          IVA {REGULATED.vatRate * 100}% y alquiler de contador{" "}
          {REGULATED.meterRentalPerDay.toFixed(4).replace(".", ",")} €/día. Comprobado en{" "}
          {REGULATED.checked}.
        </li>
        <li>
          Las tarifas indexadas y el PVPC se estiman a partir de una media histórica del
          mercado mayorista. <strong>No constituye una previsión</strong>: el precio final
          dependerá de la evolución del mercado.
        </li>
        <li>
          Los términos de potencia (€/kW y día) están pendientes de verificación con cada
          comercializadora, por lo que la comparación entre ellas es orientativa.
        </li>
        <li>
          La etiqueta <strong>100% renovable</strong> y los meses de permanencia proceden de
          lo que publican las comparativas, <strong>no los hemos verificado</strong> contra
          las condiciones contractuales ni contra certificados de garantía de origen.
          Compruébalos antes de contratar.
        </li>
      </ul>
    </section>
  );
}
