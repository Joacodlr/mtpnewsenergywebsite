import type { PeriodKwh, PowerKw } from "./billing";
import { suggestedPower } from "./billing";
import { BAND_LABELS, COOLING_FACTOR, findProvince, HEATING_FACTOR } from "./climate";
import type { Answers } from "./questions";

/**
 * Answers in, consumption profile out.
 *
 * This is a MODEL OF A HOUSEHOLD, not a measurement of one, and every number
 * below is a coefficient someone chose. They are arranged so that the choosing
 * is visible: each addition is a named constant with the reason next to it,
 * rather than a regression buried in a single magic number.
 *
 * The honest description of its accuracy: it will put a household in the right
 * band and get the SHAPE roughly right, which is enough to rank tariffs — the
 * ranking depends on the split across periods far more than on the total. It
 * will not predict anyone's bill to the euro, and the UI never claims it does.
 *
 * All of it is provisional in the proper sense: Datadis publishes the real
 * hourly curve, and when that is connected this file should be deleted rather
 * than tuned. Tuning a model of something you can measure is wasted effort.
 */

/**
 * Baseline annual kWh before heating, hot water, cooking, car or AC.
 *
 * Split into a fixed part and a per-m² part on purpose. A household's lighting,
 * fridge, router, telly and washing machine barely care how big the flat is —
 * that is the fixed 900 — while the part that does scale with floor area is
 * comparatively small. A pure per-m² model badly underestimates a studio and
 * badly overestimates a large flat, which is the failure mode of most online
 * calculators.
 *
 * Anchored so that a typical 90 m² Spanish flat with gas heating lands near the
 * commonly cited national average of ~3.200 kWh/year once the other loads are
 * added on top.
 */
const BASE_FIXED_KWH = 900;
const BASE_PER_M2 = 8;

/** Default floor area when the household skipped the question. */
const DEFAULT_M2 = 90;

/**
 * How much heat the home loses, relative to a mid-floor flat at 1.
 *
 * This is the part Tuio asks about that turns out to matter here for a
 * completely different reason than it matters to an insurer. A mid-floor flat
 * is insulated on five of its six surfaces by neighbours who are paying to heat
 * them; a top floor has the roof, a ground floor has the slab, and a detached
 * house has everything exposed at once.
 *
 * Applied to heating and cooling only — it has no bearing on the fridge.
 */
const EXPOSURE: Record<string, number> = {
  intermedio: 1.0,
  bajo: 1.2,
  ultimo: 1.3,
  casa: 1.75,
};

/** Each extra person adds hot water, laundry and hours of use. */
const PER_PERSON: Record<string, number> = {
  "1": 0,
  "2": 450,
  "3-4": 900,
  "5": 1400,
};

/**
 * The big forks. These are the reason two identical flats can differ threefold.
 *
 * Resistive electric heating is enormous — it converts every kWh into one kWh of
 * heat. A heat pump moves roughly three to four times the heat per kWh, which is
 * why it is a quarter of the figure rather than a discount on it.
 */
const HEATING: Record<string, number> = {
  electrica: 2600,
  bomba: 900,
  gas: 0,
  ninguna: 0,
};

const WATER: Record<string, number> = {
  electrico: 1100,
  gas: 0,
  solar: 150,
  nose: 400, // Split the difference, and the UI says the estimate is rough.
};

const COOKING: Record<string, number> = { electrica: 400, gas: 0 };

const AC: Record<string, number> = { mucho: 600, poco: 180, no: 0 };

/**
 * A home-charged EV, at roughly 12,000 km/year and 17 kWh/100 km.
 *
 * Deliberately the largest single addition in the file, because it is: it adds
 * about as much as an entire small flat consumes. It is also the most
 * controllable, which is why `ev-when` exists — the same kWh costs wildly
 * different amounts depending on the hour it goes in.
 */
const EV_KWH = 2100;

/** What solar takes off the grid bill. */
const SOLAR: Record<string, number> = { excedentes: -1400, si: -1000, no: 0 };

/**
 * How consumption splits across the three periods, by when the household is in.
 *
 * Shares, summing to 1. The baseline to compare them against is in
 * `periods.ts` — valle is 43% of all HOURS, so any household below that is
 * concentrating its use in the expensive parts of the day.
 *
 * Note that even "out all day" is not heavily valle: the fridge runs regardless,
 * and the evening — when someone out all day does all their cooking, washing and
 * heating — is punta until 22:00.
 */
const PRESENCE_SPLIT: Record<string, PeriodKwh> = {
  todo: { punta: 0.34, llano: 0.36, valle: 0.3 },
  "mananas-noches": { punta: 0.32, llano: 0.3, valle: 0.38 },
  noches: { punta: 0.28, llano: 0.26, valle: 0.46 },
  finde: { punta: 0.18, llano: 0.22, valle: 0.6 },
};

const DEFAULT_SPLIT: PeriodKwh = { punta: 0.3, llano: 0.32, valle: 0.38 };

export interface Profile {
  /** Annual consumption split across the regulated periods, kWh. */
  use: PeriodKwh;
  annualKwh: number;
  /** What we would contract, if asked. */
  suggestedPower: PowerKw;
  /** What they contract today, as stated or as assumed. */
  currentPower: PowerKw;
  /** True when the household told us, rather than us guessing. */
  powerKnown: boolean;
  /** How much of the year's use could move to a cheaper period if they wanted. */
  shiftableKwh: number;
  /** Plain-language notes the results screen shows as findings. */
  findings: string[];
  /** Floor area actually used, after clamping. */
  areaM2: number;
  /**
   * What the household says it pays today, as the RANGE it chose, in euros a
   * year. Null when it did not say.
   *
   * The nearest thing this app has to knowing the current tariff. It never asks
   * which retailer someone is with, because the answer would not be usable —
   * the same retailer sells a dozen tariffs at different prices, and almost
   * nobody can name which of them they signed. The bill is the one number a
   * household can actually report.
   *
   * Kept as a RANGE, not a midpoint. "Entre 40 y 80 €" spans 480 to 960 € a
   * year; collapsing it to 720 and then comparing with a tolerance narrower
   * than the band itself manufactures differences out of the bucketing. An
   * estimate landing anywhere inside the band agrees with what the household
   * said, and the only honest thing to report is that it agrees.
   */
  statedSpendRange: { min: number; max: number } | null;
}

function lookup(table: Record<string, number>, key: string | undefined): number {
  if (!key) return 0;
  return table[key] ?? 0;
}

/** A typed floor area, kept inside believable bounds. */
function clampArea(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_M2;
  return Math.min(600, Math.max(20, value));
}

/**
 * How heating and cooling scale with floor area.
 *
 * Sub-linear, and deliberately so: a flat twice the size does not need twice
 * the heating, because the surface through which heat escapes grows more slowly
 * than the volume behind it. Taking the ratio to the power of 0.8 is the usual
 * rule of thumb for that, and it keeps large homes from being modelled as
 * absurd.
 */
function areaScale(m2: number): number {
  return (m2 / DEFAULT_M2) ** 0.8;
}

export function buildProfile(answers: Answers): Profile {
  const findings: string[] = [];

  const province = findProvince(answers.province);
  const band = province?.band ?? "templado";

  const m2 = clampArea(Number(answers.size));

  // How exposed the home is. A house is a house whatever floor question was
  // skipped; a flat takes its floor position, defaulting to the mid-floor case.
  const exposure =
    answers.dwelling === "casa" ? EXPOSURE.casa : (EXPOSURE[answers.floor] ?? 1.0);

  /*
   * Climate and exposure multiply the loads that are about keeping the place at
   * a liveable temperature, and nothing else. Scaling the whole bill by climate
   * would mean the model thought people in Burgos ran their fridge harder.
   */
  const heating =
    lookup(HEATING, answers.heating) * HEATING_FACTOR[band] * exposure * areaScale(m2);
  const cooling = lookup(AC, answers.ac) * COOLING_FACTOR[band] * exposure * areaScale(m2);

  const base =
    BASE_FIXED_KWH +
    BASE_PER_M2 * m2 +
    lookup(PER_PERSON, answers.people) +
    heating +
    lookup(WATER, answers.water) +
    lookup(COOKING, answers.cooking) +
    cooling;

  if (province) {
    findings.push(
      `Hemos ajustado el cálculo a ${province.name} (${BAND_LABELS[band]}). La demanda de climatización varía considerablemente según la zona.`,
    );
  }


  if (answers.floor === "ultimo" && answers.heating !== "gas") {
    findings.push(
      "En una última planta, la cubierta es la principal vía de pérdida de calor. Si en algún momento valoras una reforma, aislarla es la actuación con mayor repercusión en la factura.",
    );
  }

  const evKwh = answers.ev === "casa" ? EV_KWH : 0;
  const solar = lookup(SOLAR, answers.solar);

  // Never model a household into negative consumption: a big solar install on a
  // small flat would otherwise produce a nonsense bill. Floor it and say so.
  const annualKwh = Math.max(600, base + evKwh + solar);

  if (answers.heating === "electrica") {
    findings.push(
      "Tu calefacción es eléctrica, por lo que el invierno concentra buena parte de tu gasto anual. El periodo valle y la potencia contratada tienen en tu caso más relevancia de lo habitual.",
    );
  }
  if (answers.solar === "si") {
    findings.push(
      "Dispones de instalación fotovoltaica sin compensación de excedentes. Contratar esa compensación suele tener un impacto mayor que cambiar de tarifa.",
    );
  }

  /* ── Where in the day it lands ── */

  const split = PRESENCE_SPLIT[answers.presence] ?? DEFAULT_SPLIT;

  const use: PeriodKwh = {
    punta: (annualKwh - evKwh) * split.punta,
    llano: (annualKwh - evKwh) * split.llano,
    valle: (annualKwh - evKwh) * split.valle,
  };

  // The car is placed separately rather than smeared through the split, because
  // it is the one load whose timing the household actually controls and states.
  if (evKwh > 0) {
    if (answers["ev-when"] === "noche") {
      use.valle += evKwh;
      findings.push("Cargas el vehículo de madrugada, que es la franja más económica. En este aspecto no hay margen de mejora.");
    } else if (answers["ev-when"] === "llegada") {
      use.punta += evKwh;
      findings.push(
        "Cargas el vehículo al llegar al domicilio, en plena hora punta. Programar la carga a partir de medianoche es la medida de mayor ahorro disponible sin cambiar de comercializadora.",
      );
    } else {
      use.llano += evKwh * 0.5;
      use.punta += evKwh * 0.5;
      findings.push(
        "La carga del vehículo no sigue un horario definido. Un programador horario suele amortizarse en pocas semanas.",
      );
    }
  }

  /* ── What could move ── */

  // Laundry and dishwasher are roughly a tenth of a household's year. That is
  // the realistic ceiling on "do it at night" — worth having, and not the
  // transformation the marketing of period tariffs implies.
  const SHIFTABLE_SHARE = 0.1;
  const shiftFactor =
    answers.shiftable === "si" ? 1 : answers.shiftable === "aveces" ? 0.5 : 0;
  const shiftableKwh = annualKwh * SHIFTABLE_SHARE * shiftFactor;

  /* ── What they say they pay today ── */

  // Keyed by the option id, which is the band's own midpoint. The bounds are
  // the labels the household actually read, converted to a year.
  const BILL_BANDS: Record<string, { min: number; max: number }> = {
    "30": { min: 0, max: 40 * 12 },
    "60": { min: 40 * 12, max: 80 * 12 },
    "100": { min: 80 * 12, max: 130 * 12 },
    "160": { min: 130 * 12, max: Number.POSITIVE_INFINITY },
  };
  const statedSpendRange = answers.bill ? (BILL_BANDS[answers.bill] ?? null) : null;

  /* ── Power ── */

  // A rough simultaneous draw: the base load of the house plus whichever big
  // appliances plausibly overlap. Electric heating and an oven at once is the
  // moment a breaker trips, and it is what the contracted power has to cover.
  let peakKw = 2.2;
  if (answers.cooking === "electrica") peakKw += 1.2;
  if (answers.heating === "electrica") peakKw += 1.5;
  if (answers.heating === "bomba" || answers.ac === "mucho") peakKw += 0.9;
  if (answers.water === "electrico") peakKw += 0.6;
  if (answers.dwelling === "casa") peakKw += 0.8;
  // A big home runs more at once regardless of what it runs.
  if (m2 > 140) peakKw += 0.6;

  const recommended = suggestedPower(peakKw);
  const stated = answers.power && answers.power !== "nose" ? Number(answers.power) : null;

  const currentPower: PowerKw = {
    p1: stated ?? recommended,
    p2: stated ?? recommended,
  };

  // Deliberately NOT pushed as a finding: the results screen already gives
  // over-contracted power its own panel, with the figure and the warning. Saying
  // it twice on one screen, in slightly different words, reads as a bug.

  // The EV is the exception to lowering power: it draws continuously for hours,
  // and it does it at night, which is precisely the period where power is cheap
  // and can be contracted higher than the daytime one.
  const suggested: PowerKw =
    evKwh > 0
      ? { p1: recommended, p2: Math.max(recommended, suggestedPower(peakKw + 3.7)) }
      : { p1: recommended, p2: recommended };

  return {
    use,
    annualKwh,
    suggestedPower: suggested,
    currentPower,
    powerKnown: stated !== null,
    shiftableKwh,
    findings,
    areaM2: m2,
    statedSpendRange,
  };
}
