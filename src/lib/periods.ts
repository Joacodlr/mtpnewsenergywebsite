/**
 * The 2.0TD timetable, as set by regulation.
 *
 * This is the same for every household and every retailer in Spain — it is the
 * access tariff, not a commercial offer. A retailer can charge what it likes
 * for a punta kWh but cannot decide which hours are punta.
 *
 * Kept as data rather than prose because the questionnaire reasons over it: a
 * household that is out until 19:00 is home for the whole second punta block,
 * which is the single fact that decides whether a period-priced tariff can beat
 * a flat one for them.
 */

export type Period = "punta" | "llano" | "valle";

export const PERIOD_LABELS: Record<Period, string> = {
  punta: "Punta",
  llano: "Llano",
  valle: "Valle",
};

export const PERIOD_DESCRIPTIONS: Record<Period, string> = {
  punta: "Las horas más caras. De 10 a 14 h y de 18 a 22 h, de lunes a viernes.",
  llano: "Precio intermedio. De 8 a 10 h, de 14 a 18 h y de 22 a 24 h, de lunes a viernes.",
  valle: "Las horas más baratas. De 00 a 8 h entre semana, y todo el fin de semana y festivos.",
};

/**
 * Which period an hour falls into on a working day.
 *
 * Weekends and national holidays are valle from end to end, which is why the
 * weekday/weekend distinction matters more than the hour for anyone who is only
 * home at weekends.
 */
export function weekdayPeriod(hour: number): Period {
  if ((hour >= 10 && hour < 14) || (hour >= 18 && hour < 22)) return "punta";
  if (hour >= 0 && hour < 8) return "valle";
  return "llano";
}

/**
 * Share of the hours in a year that fall in each period.
 *
 * Useful as a sanity check on any consumption split: a household that genuinely
 * used power evenly around the clock would land close to these shares, so a
 * profile far from them should be explained by something the household said,
 * not by an accident in the model.
 *
 * Roughly: weekends and holidays are ~30% of days and are entirely valle, which
 * is why valle dominates even for people who are never up at night.
 */
export const HOUR_SHARE: Record<Period, number> = {
  punta: 0.238,
  llano: 0.333,
  valle: 0.429,
};
