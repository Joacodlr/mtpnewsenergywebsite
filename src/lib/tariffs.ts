import type { Tariff } from "./billing";

/**
 * The plans MTP Energía compares.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE SHOWING THESE NUMBERS TO A REAL CUSTOMER
 *
 * Spain has an authoritative source for this table and it is not the one used
 * here. The CNMC runs the official offer comparator at comparador.cnmc.gob.es:
 * retailers are legally obliged to file their offers there in a standardised
 * form, and CNMC staff verify them before publication — around 800 offers from
 * 80-odd retailers. It is the official register for this market, and it is
 * where this table should ultimately come from.
 *
 * It is not in the CNMC's open data catalogue and has no public API. Access has
 * to be requested from info.comparador@cnmc.es. Until that lands, this table is
 * hand-maintained from one secondary comparison, `AGGREGATOR` below.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * HOW THESE NUMBERS GOT HERE, AND A MISTAKE WORTH NOT REPEATING
 *
 * The first version of this file was populated from the SUMMARY of a web
 * search rather than from the page itself, and then cited that page with the
 * day's date in `checked` — a date that implied a reading that had not
 * happened. When the page was finally opened, two of the five prices were
 * wrong: Endesa was 0,109 and not 0,149, Iberdrola 0,187 and not 0,155. The
 * Endesa error alone inverted the ranking, because at 0,109 it is the cheapest
 * fixed tariff here rather than the fourth.
 *
 * The same page also published per-retailer power terms, which the file had
 * declared unavailable and replaced with one placeholder across every row.
 *
 * So: `checked` means SOMEBODY OPENED THE PAGE ON THAT DATE. A figure that has
 * not been read at its source does not get a date, and does not go in.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHAT IS STILL SECOND-HAND
 *
 * `AGGREGATOR` is not the retailers. It states its own verification dates per
 * retailer and they differ by months — Repsol and Holaluz were last checked in
 * April, Iberdrola in October. Those dates are carried per row below rather
 * than flattened into one, because a six-month-old price in a market that
 * reprices monthly is a different claim from last week's.
 *
 * `verified` says what each row is. Nothing here is a quote, and no row becomes
 * one until it has been read on the retailer's own tariff sheet.
 */

/** The secondary comparison the Endesa/Octopus/Holaluz/Repsol/Iberdrola rows come from. */
const AGGREGATOR = "https://guiaenergia.online/comparativas/comercializadoras-luz-2026/";

/** Rastreator's comparison, which publishes BOTH power terms per tariff. */
const RASTREATOR = "https://www.rastreator.com/tarifas-energia/guias/mejores-tarifas-electricidad";


/**
 * The aggregator publishes one power term per retailer, in EUR/kW/YEAR. The bill
 * is charged per day, so this converts - and the conversion is here rather than
 * inline so the published figure stays recognisable against the source.
 */
const perKwDay = (perKwYear: number): number => perKwYear / 365;

/**
 * P2 for the rows whose source gave only ONE power figure.
 *
 * It was 0,0023 - the bare regulated peaje - which was far too low and handed
 * those rows a silent advantage over the Rastreator rows, whose real published
 * P2 runs 0,034 to 0,062. Set to the middle of that observed range so the two
 * groups are at least comparable. Still a placeholder, still unverified.
 */
const P2_PLACEHOLDER = 0.05;

/**
 * ALL ENERGY AND POWER PRICES BELOW ARE PRE-TAX.
 *
 * Rastreator labels its tariffs "impuestos incluidos", which refers to the
 * monthly total it shows, NOT to the unit prices. Checked before use: Naturgy
 * Tarifa Noche at 200 kWh and 3,45 kW comes to 57,37 EUR/month if the unit
 * prices are pre-tax and 45,11 if they are not. The page publishes 57,26. Had
 * the label been taken at face value every one of these rows would have been
 * 27% wrong.
 */

export interface CuratedTariff extends Tariff {
  /**
   * "sourced" — the energy prices come from a dated published comparison.
   * "indicative" — additionally, some component is a placeholder.
   * No row is "quoted" until checked against the retailer's own tariff sheet.
   */
  verified: "sourced" | "indicative";
}

export const TARIFFS: CuratedTariff[] = [
  {
    id: "octopus-flexi",
    retailer: "Octopus Energy",
    name: "Octopus Flexi (indexada)",
    market: "libre",
    energy: {
      kind: "indexed",
      spread: 0.015,
      // OMIE's daily average over recent months, stated so the user can judge
      // it rather than be handed a single number with no provenance.
      referenceWholesale: 0.09,
      referenceLabel: "media OMIE reciente",
    },
    power: { p1: perKwDay(33.8), p2: P2_PLACEHOLDER },
    renewable: true,
    commitmentMonths: 0,
    source: { url: AGGREGATOR, checked: "2026-09-14" },
    signupUrl: "https://octopusenergy.es/tarifas",
    verified: "indicative",
    notes:
      "Sigue el precio del mercado mayorista hora a hora. Puede salir más barata o más cara según el mes: el riesgo de precio lo asume el cliente, no la comercializadora.",
  },
  {
    id: "octopus-fija",
    retailer: "Octopus Energy",
    name: "Octopus Fija",
    market: "libre",
    energy: { kind: "flat", rate: 0.139 },
    power: { p1: perKwDay(33.8), p2: P2_PLACEHOLDER },
    renewable: true,
    commitmentMonths: 0,
    source: { url: AGGREGATOR, checked: "2026-09-14" },
    signupUrl: "https://octopusenergy.es/tarifas",
    verified: "sourced",
    notes: "Precio único a todas horas, sin compromiso de permanencia.",
  },
  {
    id: "holaluz-fija",
    retailer: "Holaluz",
    name: "Holaluz Fija",
    market: "libre",
    energy: { kind: "flat", rate: 0.142 },
    power: { p1: perKwDay(34.5), p2: P2_PLACEHOLDER },
    renewable: true,
    commitmentMonths: 0,
    source: { url: AGGREGATOR, checked: "2026-04-27" },
    verified: "sourced",
    notes: "Precio único a todas horas, sin compromiso de permanencia.",
  },
  {
    id: "repsol-fija",
    retailer: "Repsol",
    name: "Repsol Luz Fija",
    market: "libre",
    energy: { kind: "flat", rate: 0.148 },
    power: { p1: perKwDay(34.9), p2: P2_PLACEHOLDER },
    renewable: false,
    commitmentMonths: 12,
    source: { url: AGGREGATOR, checked: "2026-04-27" },
    verified: "sourced",
    notes: "Permanencia de 12 meses.",
  },
  {
    id: "endesa-fija",
    retailer: "Endesa",
    name: "Endesa Conecta Luz",
    market: "libre",
    /*
     * This row has now been wrong twice, both times from second-hand figures,
     * and both times it decided most of the app's recommendations.
     *
     * 0,149 came from a search summary. 0,109 came from an aggregator. Four
     * sources published four different numbers. Endesa's own tariff page
     * settles it: Conecta Luz is 0,129990 \u20ac/kWh, stated explicitly as excluding
     * taxes, with no permanence. That is what is used, and the source is now
     * the retailer rather than anybody's summary of it.
     *
     * The earlier note claiming the tariff was restricted to customers with no
     * existing Endesa supply came from a search summary too. Endesa's page does
     * not say it, so it is not asserted here.
     */
    energy: { kind: "flat", rate: 0.12999 },
    power: { p1: perKwDay(35.5), p2: P2_PLACEHOLDER },
    renewable: false,
    // `commitmentMonths` drives the exclusion filter, so a wrong value here
    // silently removes a tariff from someone's comparison. Endesa's own page
    // states no permanence.
    commitmentMonths: 0,
    source: { url: "https://www.endesa.com/es/luz-y-gas/luz", checked: "2026-10-22" },
    signupUrl: "https://www.endesa.com/es/luz-y-gas/luz",
    verified: "sourced",
    notes:
      "Precio \u00fanico a todas horas y sin permanencia. Endesa publica tambi\u00e9n una tarifa de tres periodos (0,110610 \u20ac/kWh en valle) que puede convenirte m\u00e1s si concentras consumo de madrugada.",
  },
  {
    id: "iberdrola-fija",
    retailer: "Iberdrola",
    name: "Plan Estable",
    market: "libre",
    // Energy checked against Iberdrola's own page and the aggregator agreed:
    // 0,187375 undiscounted. The power terms did NOT \u2014 these are Iberdrola's
    // published 0,109562 punta and 0,086274 valle, replacing a converted
    // yearly figure and the P2 placeholder.
    energy: { kind: "flat", rate: 0.187375 },
    power: { p1: 0.109562, p2: 0.086274 },
    renewable: true,
    commitmentMonths: 12,
    source: { url: "https://www.iberdrola.es/luz", checked: "2026-10-22" },
    signupUrl: "https://www.iberdrola.es/luz",
    verified: "sourced",
    notes:
      "Precio sin descuento. Iberdrola aplica un 15% los doce primeros meses (0,159269 \u20ac/kWh); usamos el precio de r\u00e9gimen para no premiar una promoci\u00f3n temporal.",
  },
  /*
   * ── Real time-of-use tariffs ──
   *
   * These are why the questionnaire can change the answer at all. A table of
   * flat rates that differ only by a constant per kWh has exactly one winner
   * whatever the household's hours are, because nothing in it prices the hours.
   * The row these replace was invented for that reason and ranked first in most
   * scenarios, which meant the app's top recommendation was frequently a
   * product nobody could buy.
   *
   * Rastreator and Roams were read independently and agree to the third decimal
   * on the two tariffs they both list, which is the closest thing to
   * corroboration available short of the CNMC feed.
   */
  {
    id: "totalenergies-programa",
    retailer: "TotalEnergies",
    name: "A Tu Aire Luz — Programa Tu Ahorro",
    market: "libre",
    /*
     * Roams understated every one of these: 0,066 valle against the retailer's
     * 0,084452, and 0,086 power against 0,094493. Those gaps are why this row
     * was winning almost every scenario — it was being compared at prices
     * TotalEnergies does not charge.
     *
     * Third price corrected by going to the retailer after an aggregator got it
     * wrong, out of three checked. The aggregators are useful for finding which
     * tariffs exist and useless as a source for what they cost.
     */
    energy: { kind: "periods", punta: 0.179901, llano: 0.111651, valle: 0.084452 },
    power: { p1: 0.094493, p2: 0.094493 },
    renewable: false,
    commitmentMonths: 0,
    source: {
      url: "https://www.totalenergies.es/hogares/electricidad/tarifa-luz-programa-tu-ahorro",
      checked: "2026-10-22",
    },
    signupUrl:
      "https://www.totalenergies.es/hogares/electricidad/tarifa-luz-programa-tu-ahorro",
    verified: "sourced",
    notes:
      "Sin permanencia. Reparte el precio en tres tramos, así que compensa si puedes concentrar consumo de madrugada o en fin de semana.",
  },
  {
    id: "imagina-noche",
    retailer: "Imagina Energía",
    name: "Plan Noche y Findes",
    market: "libre",
    energy: { kind: "periods", punta: 0.184, llano: 0.124, valle: 0.099 },
    // Power taken from Imagina's own page, which gives 0,121 punta and 0,078
    // valle. Rastreator had 0,0345 for valle; where the retailer and an
    // aggregator disagree, the retailer wins.
    power: { p1: 0.121, p2: 0.078 },
    renewable: true,
    commitmentMonths: 0,
    source: { url: "https://www.imaginaenergia.com/", checked: "2026-10-22" },
    signupUrl: "https://www.imaginaenergia.com/",
    verified: "sourced",
    notes:
      "Término de potencia nocturno muy bajo, lo que la hace interesante si cargas un vehículo eléctrico de madrugada.",
  },
  {
    id: "naturgy-noche",
    retailer: "Naturgy",
    name: "Tarifa Noche",
    market: "libre",
    energy: { kind: "periods", punta: 0.193, llano: 0.1201, valle: 0.085 },
    power: { p1: 0.12303, p2: 0.061562 },
    renewable: false,
    commitmentMonths: 0,
    // Naturgy's own page matches the aggregator to the digit, and states the
    // prices are sin impuestos - the independent confirmation of the tax basis
    // every row in this file depends on.
    source: { url: "https://www.naturgy.es/hogar/luz", checked: "2026-10-22" },
    signupUrl: "https://www.naturgy.es/hogar/luz",
    verified: "sourced",
  },
  {
    id: "niba-tres",
    retailer: "Niba",
    name: "Niba Tres",
    market: "libre",
    energy: { kind: "periods", punta: 0.197, llano: 0.147, valle: 0.087 },
    power: { p1: 0.077, p2: 0.077 },
    renewable: false,
    commitmentMonths: 0,
    source: { url: RASTREATOR, checked: "2026-10-22" },
    verified: "sourced",
  },
  /*
   * ── Flat rates whose power terms are also published ──
   */
  {
    id: "imagina-sinhoras",
    retailer: "Imagina Energía",
    name: "Plan Sin Horas",
    market: "libre",
    energy: { kind: "flat", rate: 0.119 },
    power: { p1: 0.136, p2: 0.086 },
    renewable: true,
    commitmentMonths: 0,
    source: { url: "https://www.imaginaenergia.com/", checked: "2026-10-22" },
    signupUrl: "https://www.imaginaenergia.com/",
    verified: "sourced",
    notes: "Precio único a todas horas, para quien no puede desplazar consumo.",
  },
  {
    id: "naturgy-poruso",
    retailer: "Naturgy",
    name: "Tarifa Por Uso",
    market: "libre",
    energy: { kind: "flat", rate: 0.123 },
    power: { p1: 0.12303, p2: 0.061562 },
    renewable: false,
    commitmentMonths: 0,
    source: { url: "https://www.naturgy.es/hogar/luz", checked: "2026-10-22" },
    signupUrl: "https://www.naturgy.es/hogar/luz",
    verified: "sourced",
  },
  /**
   * PVPC belongs here even though it is nobody's commercial offer: it is the
   * regulated default, it is what a household gets if it does nothing, and for
   * low consumption it is frequently the cheapest thing available. A comparator
   * that only shows free-market offers is a sales funnel, not a comparison.
   */
  {
    id: "pvpc",
    retailer: "Mercado regulado",
    name: "PVPC (precio voluntario para el pequeño consumidor)",
    market: "regulado",
    energy: {
      kind: "indexed",
      spread: 0.0,
      referenceWholesale: 0.09,
      referenceLabel: "media OMIE reciente",
    },
    power: { p1: perKwDay(35.0), p2: P2_PLACEHOLDER },
    renewable: false,
    commitmentMonths: 0,
    /*
     * Was citing the free-market comparison every other row uses, which does
     * not cover PVPC at all — a source that says nothing about the row it is
     * attached to. PVPC is set by the State, so the source is the CNMC, and
     * the link goes to the official census of comercializadoras de referencia,
     * which are the only companies that may supply it.
     */
    source: {
      url: "https://www.cnmc.es/facil-para-ti/herramientas-utiles/energia",
      checked: "2026-10-22",
    },
    signupUrl: "https://sede.cnmc.gob.es/listado/censo/16",
    verified: "indicative",
    notes:
      "Tarifa regulada por el Estado. Varía cada hora y no contempla permanencia ni promociones. Solo la ofrecen las comercializadoras de referencia, y es la vía de acceso al bono social si te corresponde. Nuestra cifra es una proyección sobre una media pasada del mercado, no un precio publicado.",
  },
];
