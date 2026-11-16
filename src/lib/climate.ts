/**
 * Where the home is, and what that does to the bill.
 *
 * Heating is the largest electrical load in any home that heats electrically,
 * and how much heating a home needs is decided mostly by climate. Modelling a
 * flat in Burgos and a flat in Málaga with the same heating figure — which is
 * what this app did before this file existed — is wrong by more than every
 * other coefficient in the model combined.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHAT THESE BANDS ARE, AND WHAT THEY ARE NOT
 *
 * Spain's building code (CTE DB-HE) assigns every municipality a winter zone
 * (A–E) and a summer zone (1–4), and it does so BY ALTITUDE as well as by
 * province: within one province a mountain village and a coastal town are in
 * different zones. A province-level band therefore cannot be the CTE zone, and
 * calling it one would be a false precision.
 *
 * So these are five severity bands keyed on each PROVINCIAL CAPITAL, used only
 * to scale heating and cooling demand. The UI says so. A household at altitude
 * in a mild province will be underestimated, which is the known cost of asking
 * one question instead of three.
 */

export type ClimateBand = "muy-frio" | "frio" | "templado" | "calido" | "muy-calido";

export interface Province {
  name: string;
  band: ClimateBand;
}

/**
 * The 48 peninsular provinces plus the Balearics.
 *
 * Bands assigned from each capital's winter severity. The groupings are coarse
 * on purpose — the difference between neighbouring bands is a modest multiplier,
 * while the difference between Burgos and Cádiz is nearly threefold, and it is
 * that spread the model needs to capture.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THE CANARY ISLANDS, CEUTA AND MELILLA ARE NOT HERE
 *
 * They are not taxed under IVA — the Canaries pay IGIC and Ceuta and Melilla
 * pay IPSI, at rates set and changed locally — and their electricity systems are
 * genuinely separate from the peninsular grid rather than merely distant from
 * it. Serving them would mean a second tax model and a second set of tariffs,
 * both of which would have been guesses.
 *
 * So the app does not cover them, and says so, rather than returning a
 * confident figure built on the wrong tax. Not serving a market beats serving it
 * wrongly. Adding them back means real IGIC/IPSI rates and real island tariffs,
 * not a flag.
 *
 * The Balearics ARE here: they pay ordinary IVA and have been cable-connected to
 * the peninsula since 2012, so neither reason applies to them.
 */
export const PROVINCES: Province[] = [
  // Meseta norte and the mountain provinces — the cold end of Spain.
  { name: "Ávila", band: "muy-frio" },
  { name: "Burgos", band: "muy-frio" },
  { name: "León", band: "muy-frio" },
  { name: "Palencia", band: "muy-frio" },
  { name: "Segovia", band: "muy-frio" },
  { name: "Soria", band: "muy-frio" },

  { name: "Álava", band: "frio" },
  { name: "Albacete", band: "frio" },
  { name: "Ciudad Real", band: "frio" },
  { name: "Cuenca", band: "frio" },
  { name: "Guadalajara", band: "frio" },
  { name: "Huesca", band: "frio" },
  { name: "La Rioja", band: "frio" },
  { name: "Lleida", band: "frio" },
  { name: "Madrid", band: "frio" },
  { name: "Navarra", band: "frio" },
  { name: "Salamanca", band: "frio" },
  { name: "Teruel", band: "frio" },
  { name: "Valladolid", band: "frio" },
  { name: "Zamora", band: "frio" },
  { name: "Zaragoza", band: "frio" },

  // Atlantic north and the milder interior.
  { name: "A Coruña", band: "templado" },
  { name: "Asturias", band: "templado" },
  { name: "Badajoz", band: "templado" },
  { name: "Barcelona", band: "templado" },
  { name: "Cáceres", band: "templado" },
  { name: "Cantabria", band: "templado" },
  { name: "Girona", band: "templado" },
  { name: "Granada", band: "templado" },
  { name: "Gipuzkoa", band: "templado" },
  { name: "Jaén", band: "templado" },
  { name: "Lugo", band: "templado" },
  { name: "Ourense", band: "templado" },
  { name: "Pontevedra", band: "templado" },
  { name: "Toledo", band: "templado" },
  { name: "Vizcaya", band: "templado" },

  // Mediterranean and the warm south.
  { name: "Alicante", band: "calido" },
  { name: "Baleares", band: "calido" },
  { name: "Castellón", band: "calido" },
  { name: "Córdoba", band: "calido" },
  { name: "Huelva", band: "calido" },
  { name: "Málaga", band: "calido" },
  { name: "Murcia", band: "calido" },
  { name: "Sevilla", band: "calido" },
  { name: "Tarragona", band: "calido" },
  { name: "Valencia", band: "calido" },

  { name: "Almería", band: "muy-calido" },
  { name: "Cádiz", band: "muy-calido" },
];

export function findProvince(name: string | undefined): Province | null {
  if (!name) return null;
  return PROVINCES.find((province) => province.name === name) ?? null;
}

/**
 * Multiplier on heating demand, relative to a temperate baseline of 1.
 *
 * The spread — roughly 0.35 to 1.6 — is the honest shape of Spanish heating:
 * a home in Ávila can use four times the heating of the same home in Cádiz.
 */
export const HEATING_FACTOR: Record<ClimateBand, number> = {
  "muy-frio": 1.6,
  frio: 1.25,
  templado: 1.0,
  calido: 0.6,
  "muy-calido": 0.35,
};

/** Multiplier on air-conditioning demand. Runs the other way, less steeply. */
export const COOLING_FACTOR: Record<ClimateBand, number> = {
  "muy-frio": 0.5,
  frio: 0.9,
  templado: 0.8,
  calido: 1.4,
  "muy-calido": 1.6,
};

export const BAND_LABELS: Record<ClimateBand, string> = {
  "muy-frio": "inviernos muy fríos",
  frio: "inviernos fríos",
  templado: "clima templado",
  calido: "veranos calurosos",
  "muy-calido": "clima cálido todo el año",
};
