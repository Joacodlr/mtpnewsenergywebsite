/**
 * What a Spanish domestic electricity bill actually costs, under 2.0TD.
 *
 * Every domestic supply at or below 15 kW has been on the 2.0TD access tariff
 * since 1 June 2021. It is not optional and there is no alternative, so this
 * module models that one structure rather than trying to be general:
 *
 *   - energy is billed in THREE periods (punta, llano, valle) by when it was used;
 *   - power is contracted in TWO (P1 daytime, P2 nights + weekends) and billed
 *     per kW per day whether or not a single watt is drawn.
 *
 * The periods are fixed by regulation, not by the retailer — see `periods.ts`.
 * What a retailer competes on is the price it puts on each one.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THIS PRODUCES AN ESTIMATE, AND THE UI MUST SAY SO
 *
 * Two things here are genuinely uncertain and no amount of care removes them:
 *
 *   1. The consumption split across the three periods is inferred from what the
 *      household says about itself (see `profile.ts`). A real curve would come
 *      from Datadis, the distributors' own hourly data — until that is wired in,
 *      the split is a model of a household, not a measurement of one.
 *   2. Indexed tariffs are priced off a wholesale market that has not happened
 *      yet. Any annual figure for one is a projection from a past average.
 *
 * Fixed tariffs against a known consumption are the only part of this that is
 * arithmetic rather than forecast.
 */

/** Energy used in a year, split by the three regulated periods, in kWh. */
export interface PeriodKwh {
  punta: number;
  llano: number;
  valle: number;
}

/** Power contracted in each of the two regulated periods, in kW. */
export interface PowerKw {
  /** 08:00–24:00 Monday to Friday. */
  p1: number;
  /** 00:00–08:00 plus all weekend and national holidays. */
  p2: number;
}

export function totalKwh(use: PeriodKwh): number {
  return use.punta + use.llano + use.valle;
}

/* ───────────────────────── Regulated charges ───────────────────────── */

/**
 * The parts of the bill no retailer sets, and which therefore cannot be shopped
 * for. They are listed as named constants rather than folded into the maths so
 * that when one changes — and they change by decree, with little notice — the
 * edit is one line and the date below is the only thing that needs rechecking.
 *
 * VERIFY BEFORE RELYING ON THESE. They were correct as researched in October
 * 2026, but both the electricity tax and VAT were repeatedly altered between
 * 2021 and 2024 as crisis measures and then restored, so a stale value here is
 * the most likely way this calculator goes quietly wrong.
 */
export const REGULATED = {
  /** When these values were last checked against the BOE. */
  checked: "2026-10",

  /**
   * Impuesto Especial sobre la Electricidad, applied to energy + power.
   *
   * Cut to 0.5% during the 2021–2024 price crisis and restored afterwards; this
   * is the standard rate, not the crisis one.
   */
  electricityTaxRate: 0.0511269632,

  /** IVA on the whole subtotal, the tax included. Also temporarily cut, also restored. */
  vatRate: 0.21,


  /**
   * Meter rental, €/day. A domestic smart meter is almost always rented from
   * the distributor rather than owned, and this appears on every bill at the
   * same price whoever supplies the energy.
   */
  meterRentalPerDay: 0.0269,
} as const;

/* ───────────────────────── Tariff shapes ───────────────────────── */

/**
 * How a retailer prices energy. Three shapes exist in the Spanish market and
 * they are not interchangeable, because they differ in who carries the risk.
 */
export type EnergyPricing =
  /**
   * A different €/kWh per period. Rewards moving consumption to valle, and is
   * the only shape where "do the laundry at night" changes the bill.
   */
  | { kind: "periods"; punta: number; llano: number; valle: number }
  /**
   * One €/kWh at every hour. Simpler, and strictly better for a household that
   * cannot shift anything — there is no point paying a punta premium for
   * flexibility you do not have.
   */
  | { kind: "flat"; rate: number }
  /**
   * Wholesale price plus a fixed margin. The retailer carries no price risk;
   * the customer does. Cheaper than fixed on average over recent years and
   * capable of being much worse in any given month.
   */
  | {
      kind: "indexed";
      /** The retailer's margin over the market, €/kWh. This part IS fixed. */
      spread: number;
      /**
       * The wholesale average this projection uses, €/kWh, and where it came
       * from. Not a prediction — a stated assumption the UI shows the user.
       */
      referenceWholesale: number;
      referenceLabel: string;
    };

export interface Tariff {
  id: string;
  retailer: string;
  name: string;
  energy: EnergyPricing;
  /** €/kW/day for each power period. */
  power: { p1: number; p2: number };
  /** A standing monthly fee, €/month, on top of energy and power. Usually 0. */
  monthlyFee?: number;
  renewable: boolean;
  /** Months of lock-in. 0 means leave whenever. */
  commitmentMonths: number;
  /** Market type — PVPC is the regulated tariff, everything else is free market. */
  market: "regulado" | "libre";
  /** Where this row's prices came from, and when they were read. */
  source: { url: string; checked: string };
  /**
   * The retailer's own page for THIS product, where someone could actually go
   * and get it.
   *
   * Set only where that page has been opened and confirmed to exist and to
   * describe this tariff. Absent is the honest default: a comparison that sends
   * people to a blog post when they click "ver la tarifa" is wasting the one
   * action they wanted to take, and a guessed URL is worse than none.
   */
  signupUrl?: string;
  notes?: string;
}

/* ───────────────────────── The calculation ───────────────────────── */

export interface CostBreakdown {
  /** Cost of the kWh themselves, before tax. */
  energy: number;
  /** Cost of having the connection at all, before tax. Paid even at zero use. */
  power: number;
  monthlyFees: number;
  meterRental: number;
  electricityTax: number;
  vat: number;
  /** What lands on the bills over a year, everything included. */
  total: number;
}

const DAYS_PER_YEAR = 365;


/**
 * The regulated part of the ENERGY price — peajes de acceso plus cargos.
 *
 * Every kWh carries these whoever supplies it, and they differ by period. They
 * matter here for a reason that is easy to miss and badly distorts a comparison
 * when missed: a fixed tariff's advertised €/kWh ALREADY includes them, while a
 * wholesale reference price does not. Adding wholesale and spread alone and
 * comparing the result against an advertised fixed price is comparing a price
 * net of regulated charges against one gross of them — which made indexed
 * tariffs and PVPC look unbeatable, and they are not.
 *
 * APPROXIMATE AND UNVERIFIED, like the power terms. Right order, not quoted.
 */
export const REGULATED_ENERGY_CHARGES: PeriodKwh = {
  punta: 0.1,
  llano: 0.045,
  valle: 0.009,
};

/**
 * How wholesale prices themselves vary across the day, relative to the daily
 * average.
 *
 * Wholesale is not flat: demand peaks in the same hours the regulated timetable
 * calls punta, which is exactly why those hours are called punta. Modelling an
 * indexed tariff at one average price erased that, and with it the whole point
 * of asking when a household is at home or when it charges its car — a shape
 * can only matter if something prices the shape.
 */
const WHOLESALE_SHAPE: PeriodKwh = { punta: 1.25, llano: 1.0, valle: 0.8 };

/** What one kWh costs in a given period under this tariff, before tax. */
function energyRate(pricing: EnergyPricing, period: keyof PeriodKwh): number {
  switch (pricing.kind) {
    case "periods":
      return pricing[period];
    case "flat":
      return pricing.rate;
    case "indexed":
      return (
        pricing.referenceWholesale * WHOLESALE_SHAPE[period] +
        REGULATED_ENERGY_CHARGES[period] +
        pricing.spread
      );
  }
}

/**
 * A year on this tariff, at this consumption, with this contracted power.
 *
 * Order matters and is set by regulation: the electricity tax applies to energy
 * plus power but NOT to meter rental, and VAT then applies to everything
 * including the tax. Getting that nesting wrong is a ~1% error that looks
 * plausible enough to survive review, which is why it is spelled out here.
 */
export function annualCost(
  tariff: Tariff,
  use: PeriodKwh,
  power: PowerKw,
): CostBreakdown {
  const energy =
    use.punta * energyRate(tariff.energy, "punta") +
    use.llano * energyRate(tariff.energy, "llano") +
    use.valle * energyRate(tariff.energy, "valle");

  const powerCost =
    power.p1 * tariff.power.p1 * DAYS_PER_YEAR +
    power.p2 * tariff.power.p2 * DAYS_PER_YEAR;

  const monthlyFees = (tariff.monthlyFee ?? 0) * 12;
  const meterRental = REGULATED.meterRentalPerDay * DAYS_PER_YEAR;

  const electricityTax = (energy + powerCost) * REGULATED.electricityTaxRate;

  const beforeVat = energy + powerCost + monthlyFees + meterRental + electricityTax;
  const vat = beforeVat * REGULATED.vatRate;

  return {
    energy,
    power: powerCost,
    monthlyFees,
    meterRental,
    electricityTax,
    vat,
    total: beforeVat + vat,
  };
}

/**
 * The cheapest power a household can contract without tripping the breaker.
 *
 * Over-contracted power is the most common avoidable cost on a Spanish bill and
 * the one nobody looks at: it is charged per day, forever, whether or not it is
 * ever used. Someone paying for 5.75 kW who never draws more than 3.3 kW is
 * simply donating the difference.
 *
 * Returned as a suggestion and never applied automatically — getting this wrong
 * means the lights go out when the oven and the kettle coincide, so the number
 * is shown to the household to decide on, with the warning attached.
 */
export function suggestedPower(peakDrawKw: number): number {
  // The commercially available steps below 15 kW. A supply can only be
  // contracted at one of these, so rounding to "3.4 kW" would be advice nobody
  // can act on.
  const STEPS = [1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 8.05, 9.2, 10.35, 11.5, 14.49];

  // A 15% margin over the modelled peak, because the model is an estimate and
  // the failure mode is asymmetric: too much power wastes a few euros a month,
  // too little cuts the supply mid-dinner.
  const target = peakDrawKw * 1.15;

  return STEPS.find((step) => step >= target) ?? STEPS[STEPS.length - 1];
}
