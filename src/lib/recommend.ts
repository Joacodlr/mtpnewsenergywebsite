import { annualCost, REGULATED, type CostBreakdown, type PeriodKwh } from "./billing";
import { TARIFFS, type CuratedTariff } from "./tariffs";
import type { Profile } from "./profile";
import type { Answers } from "./questions";

/**
 * Ranking the tariffs for one household.
 *
 * The ordering is by money, because that is what was asked for. What this
 * module adds on top is the part a price alone cannot carry: WHY a plan is
 * where it is, and when the cheapest row is not the one to take.
 *
 * Two rules it follows deliberately:
 *
 *   1. A preference the household expressed is applied as a FILTER and the
 *      filtered-out rows are still returned, marked. Hiding a cheaper plan
 *      because it has a 12-month tie-in, without saying so, is how a comparator
 *      turns into a sales funnel — the household should see what their
 *      preference cost them and be free to change their mind.
 *   2. An indexed plan is never presented as beating a fixed one on certainty.
 *      It may be cheaper in the projection and the projection is a guess about
 *      a market, so its saving carries a warning rather than a number alone.
 */

export interface Ranked {
  tariff: CuratedTariff;
  cost: CostBreakdown;
  /**
   * What this plan would cost WITHOUT moving anything, set only when the
   * household said it could move consumption and this plan rewards it. The
   * difference between this and `cost` is what the move is worth here.
   */
  costIfUnshifted: CostBreakdown | null;
  /** Positive means cheaper than the dearest plan shown. */
  savingVsWorst: number;
  /** Set when a stated preference rules this plan out. */
  excludedBy: string | null;
  /**
   * Set when a soft preference moved this plan ahead of a cheaper one, with
   * the reason to show. Null when nothing was reordered.
   */
  preferredBecause: string | null;
  /** Why this plan suits, or does not, in one sentence. */
  verdict: string;
}

/** Move whatever the household said it could move into valle. */
function shifted(use: PeriodKwh, shiftableKwh: number): PeriodKwh {
  // Taken off punta first — that is where the saving is, and it is what someone
  // actually does when they decide to run the washing machine late.
  const fromPunta = Math.min(use.punta, shiftableKwh);
  const fromLlano = Math.min(use.llano, shiftableKwh - fromPunta);

  return {
    punta: use.punta - fromPunta,
    llano: use.llano - fromLlano,
    valle: use.valle + fromPunta + fromLlano,
  };
}

function exclusion(tariff: CuratedTariff, answers: Answers): string | null {
  if (answers.green === "si" && !tariff.renewable) {
    return "No es 100% renovable";
  }
  if (answers.commitment === "no" && tariff.commitmentMonths > 0) {
    return `Requiere ${tariff.commitmentMonths} meses de permanencia`;
  }
  if (answers.risk === "fijo" && tariff.energy.kind === "indexed") {
    return "Está indexada al mercado y has solicitado precio estable";
  }
  return null;
}

function verdictFor(
  tariff: CuratedTariff,
  profile: Profile,
  saving: number,
  answers: Answers,
): string {
  if (tariff.energy.kind === "indexed") {
    return tariff.market === "regulado"
      ? "Tarifa regulada por el Estado. Sin permanencia ni condiciones adicionales, si bien el precio varía cada hora y el importe no se conoce hasta el cierre del periodo."
      : "Suele resultar favorable en promedio, a cambio de asumir íntegramente los meses de precio alto. La estimación parte de una media histórica, no de una previsión.";
  }

  if (tariff.energy.kind === "periods") {
    if (answers.shiftable === "no") {
      return "Premia desplazar consumo a la noche, algo que has indicado que no puedes hacer. Asumirías el recargo de hora punta sin aprovechar la ventaja.";
    }
    return profile.shiftableKwh > 0
      ? "Te conviene porque puedes programar lavadora y lavavajillas: es ahí donde esta tarifa genera el ahorro."
      : "Solo resulta ventajosa si desplazas consumo a la noche o al fin de semana.";
  }

  if (saving > 0) {
    return "Precio único a todas horas. Ofrece previsibilidad y no exige adaptar los hábitos de consumo.";
  }
  return "Precio único a todas horas, aunque existen opciones más económicas para tu perfil.";
}

export function rank(profile: Profile, answers: Answers): Ranked[] {
  const shiftedUse = shifted(profile.use, profile.shiftableKwh);

  const rows = TARIFFS.map((tariff) => {
    /*
     * Which plans care WHEN a kWh is used.
     *
     * Period-priced ones obviously do. Indexed ones do too, because wholesale
     * prices rise in the same hours the timetable calls punta — an indexed
     * tariff is a period tariff whose periods are hourly. A flat rate is the
     * only shape where the clock is genuinely irrelevant.
     */
    const rewardsShifting =
      tariff.energy.kind === "periods" || tariff.energy.kind === "indexed";
    const canShift = rewardsShifting && profile.shiftableKwh > 0;

    /*
     * Rank on what the household would ACTUALLY pay on this plan.
     *
     * Someone who told us they can run the washing machine at night, and who
     * then moves to a tariff that pays them to, will move it — so pricing that
     * plan on their current habits judges it on a behaviour choosing it would
     * change. Before this, `shiftable` altered nothing in the ranking at all,
     * which made it a question the app asked and then ignored.
     *
     * Only ever applied to plans that reward the move, and only when the
     * household said it could make it. "En ocasiones" counts for half, which is
     * handled upstream in `shiftableKwh`.
     */
    const cost = annualCost(tariff, canShift ? shiftedUse : profile.use, profile.currentPower);

    // Kept so the card can show what the move is worth on this plan, rather
    // than silently folding it into one number.
    const costIfUnshifted = canShift
      ? annualCost(tariff, profile.use, profile.currentPower)
      : null;

    return { tariff, cost, costIfUnshifted };
  });

  const dearest = Math.max(...rows.map((row) => row.cost.total));

  const ranked = rows
    .map(({ tariff, cost, costIfUnshifted }) => {
      const savingVsWorst = dearest - cost.total;
      return {
        tariff,
        cost,
        costIfUnshifted,
        savingVsWorst,
        excludedBy: exclusion(tariff, answers),
        preferredBecause: null as string | null,
        verdict: verdictFor(tariff, profile, savingVsWorst, answers),
      };
    })
    .sort((a, b) => {
      // Excluded plans fall below the ones that match, but stay visible so the
      // household can see the price of their own preference.
      if (Boolean(a.excludedBy) !== Boolean(b.excludedBy)) {
        return a.excludedBy ? 1 : -1;
      }
      return a.cost.total - b.cost.total;
    });

  return applySoftPreferences(ranked, answers);
}

/**
 * How much dearer a plan may be and still be promoted over a cheaper one on
 * the strength of a stated preference.
 *
 * Small on purpose. Someone who said they would rather have renewable energy
 * "si no supone un sobrecoste" has told us their limit in the answer itself:
 * they want it when it is near-free, not at any price. A wider band would be
 * this app deciding how much somebody else's principles are worth to them.
 */
const PREFERENCE_TOLERANCE = 0.05;

/**
 * Preferences that shape the ORDER rather than cutting the list.
 *
 * Before this, `green: "mejor"` and `risk: "mercado"` were collected and never
 * read — the two softest answers in the questionnaire, and the two most likely
 * to describe how someone actually feels. Only the absolute versions did
 * anything, and all they did was delete rows.
 *
 * The result was a comparison where a household could say it preferred
 * renewable energy, be shown a fossil tariff first because it was three euros
 * cheaper, and never be told that a renewable one had been that close.
 *
 * So a soft preference promotes a plan only within `PREFERENCE_TOLERANCE` of
 * the cheapest, and when it does, the reason is recorded and shown. A
 * reordering the household cannot see is indistinguishable from a worse
 * comparison.
 */
function applySoftPreferences(ranked: Ranked[], answers: Answers): Ranked[] {
  const eligible = ranked.filter((row) => !row.excludedBy);
  const excluded = ranked.filter((row) => row.excludedBy);
  if (eligible.length === 0) return ranked;

  const cheapest = eligible[0].cost.total;
  const ceiling = cheapest * (1 + PREFERENCE_TOLERANCE);

  const matches = (row: Ranked): string | null => {
    if (answers.green === "mejor" && row.tariff.renewable) {
      return "Es 100% renovable y dijiste que lo prefieres si no supone un sobrecoste.";
    }
    if (answers.risk === "mercado" && row.tariff.energy.kind === "indexed") {
      return "Sigue al mercado, que es lo que pediste, y está dentro de tu mejor precio.";
    }
    return null;
  };

  // Only rows inside the band can be promoted; the rest keep their price order
  // untouched. A preference never outranks a materially cheaper plan.
  const inBand = eligible.filter((row) => row.cost.total <= ceiling);
  const outOfBand = eligible.filter((row) => row.cost.total > ceiling);

  const preferred: Ranked[] = [];
  const rest: Ranked[] = [];
  for (const row of inBand) {
    const reason = matches(row);
    if (reason) {
      // Only worth saying when the promotion actually moved it: being first
      // anyway needs no explanation.
      preferred.push({
        ...row,
        preferredBecause: row === inBand[0] ? null : reason,
      });
    } else {
      rest.push(row);
    }
  }

  return [...preferred, ...rest, ...outOfBand, ...excluded];
}

/**
 * What this household would save by only changing its contracted power.
 *
 * Separated from the tariff ranking on purpose: it is the one saving available
 * without switching anything, and burying it inside a list of offers would bury
 * the most useful thing the app has to say to someone who is happy where they are.
 */
export function powerSaving(profile: Profile): number | null {
  if (!profile.powerKnown) return null;

  const excessKw = profile.currentPower.p1 - profile.suggestedPower.p1;
  if (excessKw <= 0.01) return null;

  // Priced on the same unverified power term the rest of the comparison uses,
  // then grossed up for tax, so it is comparable with the figures beside it.
  const cheapest = TARIFFS[0];
  const perKwYear = cheapest.power.p1 * 365;

  return (
    excessKw * perKwYear * (1 + REGULATED.electricityTaxRate) * (1 + REGULATED.vatRate)
  );
}
