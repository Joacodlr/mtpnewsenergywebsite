import type { Answers } from "./questions";

/**
 * MTP's ten answers in, the nineteen the engine reads out.
 *
 * This is the only file that differs in how the household is modelled. The
 * engine downstream is the full nineteen-question model, untouched, so any
 * answer set this produces is computed exactly as the full questionnaire would
 * compute it — as truthful by construction, and only as imprecise as the
 * defaults below.
 *
 * Every value filled in rather than read is reported in `assumed`, and the
 * results page prints all of them. That list is the price of asking half the
 * questions, and the household is entitled to see it.
 */

export interface Assumption {
  /** The engine answer the assumption fills, for tests and the audit. */
  key: string;
  /** What we assumed and what to do if it is wrong, in the household's terms. */
  text: string;
}

export interface Expanded {
  /** The full answer set, in the keys `profile.ts` and `recommend.ts` read. */
  full: Answers;
  /** What was filled in rather than asked, in the order it matters most. */
  assumed: Assumption[];
}

/**
 * Size and exposure from one question.
 *
 * The size is the representative point of the band the household chose: the
 * engine needs a number, and the honest one is a typical member of the range,
 * not its edge. Floor is not asked; a flat is taken as mid-floor, the most
 * common case and the one that needs least heating.
 */
const HOME: Record<string, { dwelling: string; size: string; floor?: string; label: string }> = {
  "piso-pequeno": { dwelling: "piso", size: "60", floor: "intermedio", label: "piso pequeño" },
  "piso-mediano": { dwelling: "piso", size: "90", floor: "intermedio", label: "piso mediano" },
  "piso-grande": { dwelling: "piso", size: "130", floor: "intermedio", label: "piso grande" },
  casa: { dwelling: "casa", size: "150", label: "vivienda unifamiliar" },
};

/** Heating and hot water from one question. */
const HEAT: Record<string, { heating: string; water: string }> = {
  todo: { heating: "electrica", water: "electrico" },
  // The engine's "solar" water option is labelled "solar térmica o bomba de
  // calor": the efficient case, which is what a heat-pump home has.
  bomba: { heating: "bomba", water: "solar" },
  agua: { heating: "ninguna", water: "electrico" },
  nada: { heating: "gas", water: "gas" },
};

/** The EV and when it charges, from one question. */
const EV: Record<string, { ev: string; evWhen?: string }> = {
  noche: { ev: "casa", evWhen: "noche" },
  llegada: { ev: "casa", evWhen: "llegada" },
  variable: { ev: "casa", evWhen: "indiferente" },
  no: { ev: "no" },
};

/**
 * One priority instead of three preferences.
 *
 * The full model asks risk, renewable and permanence separately and lets them combine.
 * MTP asks which one matters most, and applies only that one — so a household
 * that picks "renovable" is not also filtered for permanence. That is reported
 * as an assumption, because it is one.
 */
const PRIORITY: Record<string, { risk: string; green: string; commitment: string }> = {
  precio: { risk: "igual", green: "no", commitment: "si" },
  estable: { risk: "fijo", green: "no", commitment: "si" },
  renovable: { risk: "igual", green: "si", commitment: "si" },
  libre: { risk: "igual", green: "no", commitment: "no" },
};

/** Answered by nobody, filled for everybody — and therefore always reported. */
const DEFAULTS = {
  cooking: "electrica",
  ac: "poco",
  solar: "no",
} as const;

export function expandAnswers(answers: Answers): Expanded {
  const assumed: Assumption[] = [];

  const home = HOME[answers.home];
  const heat = HEAT[answers.heat];
  const ev = EV[answers.ev];
  const priority = PRIORITY[answers.priority];

  const full: Answers = {
    // Asked as-is in both apps.
    province: answers.province,
    people: answers.people,
    presence: answers.presence,
    shiftable: answers.shiftable,
    power: answers.power,
    bill: answers.bill,

    ...DEFAULTS,
  };

  if (home) {
    full.dwelling = home.dwelling;
    full.size = home.size;
    if (home.floor) full.floor = home.floor;

    assumed.push({
      key: "size",
      text: `Para un ${home.label} hemos tomado ${home.size} m² como superficie de referencia.`,
    });
    if (home.floor) {
      assumed.push({
        key: "floor",
        text: "Hemos supuesto una planta intermedia. En un ático o una planta baja la demanda de calefacción es algo mayor.",
      });
    }
  }

  if (heat) {
    full.heating = heat.heating;
    full.water = heat.water;
  }

  if (ev) {
    full.ev = ev.ev;
    if (ev.evWhen) full["ev-when"] = ev.evWhen;
  }

  if (priority) {
    full.risk = priority.risk;
    full.green = priority.green;
    full.commitment = priority.commitment;

    assumed.push({
      key: "priority",
      text: "Aplicamos solo la prioridad que elegiste. Si además te importa la permanencia, la energía renovable o la estabilidad del precio, revisa esas columnas en cada tarifa.",
    });
  }

  assumed.push(
    {
      key: "cooking",
      text: "Hemos supuesto cocina eléctrica (inducción o vitrocerámica). Si cocinas con gas, tu consumo real es algo menor.",
    },
    {
      key: "ac",
      text: "Hemos supuesto un uso puntual del aire acondicionado en verano.",
    },
    {
      key: "solar",
      text: "Hemos supuesto que no tienes placas solares. Si las tienes, tu factura real será menor de lo que estimamos.",
    },
  );

  return { full, assumed };
}
