/**
 * MTP Energía's questionnaire: ten questions where the full model asks nineteen.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * HOW HALF THE QUESTIONS KEEPS THE SAME ANSWERS
 *
 * The calculation engine (`profile.ts`, `recommend.ts`, `billing.ts`,
 * `tariffs.ts`) is the full nineteen-question model, unmodified, and it reads
 * nineteen answers.
 * This file asks ten, and `expand.ts` turns them into the nineteen. Three
 * techniques do the shortening, in order of preference:
 *
 *   1. MERGE questions that were really one decision asked twice. "Do you have
 *      an EV?" and "when do you charge it?" become one question whose options
 *      carry both answers. Nothing is lost.
 *   2. MERGE questions whose combinations are rare. Heating and hot water
 *      become "what do you heat with electricity?". The combination it cannot
 *      express — electric heating with gas hot water — is uncommon, and is
 *      listed as an assumption on the results page.
 *   3. DROP the questions that move the estimate least and never decided the
 *      winning tariff in testing — cooking, air conditioning, solar, floor —
 *      and fill them with a stated default.
 *
 * What may NOT happen is a default applied silently. Every answer `expand.ts`
 * fills in rather than reads is returned alongside the result and printed on
 * the results page, in plain words, with what the household should do if it
 * does not describe them. A shorter questionnaire is allowed to be less
 * precise; it is not allowed to hide that it is.
 *
 * The questions kept are the ones that decided the recommendation in scenario
 * testing: when the household is home, whether it can shift load,
 * whether there is an EV and when it charges, and the contracted power.
 */

import { PROVINCES } from "./climate";

const PROVINCE_NAMES = PROVINCES.map((province) => province.name).sort((a, b) =>
  a.localeCompare(b, "es"),
);

export interface Option {
  id: string;
  label: string;
  /** The reassuring half-sentence under the label. Also sets expectations. */
  hint?: string;
}

export interface Question {
  id: string;
  prompt: string;
  /** Why this is being asked, shown to the user. Nothing is asked opaquely. */
  because: string;
  /** Tappable cards (the default), a dropdown, or a number typed in. */
  kind?: "options" | "select" | "number";
  options?: Option[];
  /** For `select`. Long lists — the provinces — that cannot be cards. */
  choices?: string[];
  /** For `number`. */
  numeric?: { min: number; max: number; suffix: string; placeholder: string };
  /** Shown only when this returns true. Absent means always shown. */
  showIf?: (answers: Answers) => boolean;
}

export type Answers = Record<string, string>;

export const QUESTIONS: Question[] = [
  {
    id: "province",
    prompt: "¿En qué provincia vives?",
    because:
      "Es el dato con mayor impacto en el cálculo: climatizar una vivienda en Burgos puede costar hasta cuatro veces más que la misma vivienda en Cádiz. Cubrimos península y Baleares.",
    kind: "select",
    choices: PROVINCE_NAMES,
  },
  {
    id: "home",
    prompt: "¿Cómo es tu vivienda?",
    because:
      "El tamaño marca el consumo de partida, y una casa unifamiliar pierde mucho más calor que un piso rodeado de vecinos.",
    options: [
      { id: "piso-pequeno", label: "Piso pequeño", hint: "Hasta 70 m²" },
      { id: "piso-mediano", label: "Piso mediano", hint: "Entre 70 y 110 m²" },
      { id: "piso-grande", label: "Piso grande", hint: "Más de 110 m²" },
      { id: "casa", label: "Vivienda unifamiliar", hint: "Chalet, adosado o pareado" },
    ],
  },
  {
    id: "people",
    prompt: "¿Cuántas personas residen en la vivienda?",
    because:
      "A mayor número de residentes, mayor consumo de agua caliente, más ciclos de lavado y más horas de uso.",
    options: [
      { id: "1", label: "Una persona" },
      { id: "2", label: "Dos personas" },
      { id: "3-4", label: "Tres o cuatro personas" },
      { id: "5", label: "Cinco o más personas" },
    ],
  },
  {
    id: "heat",
    prompt: "¿Qué calientas con electricidad?",
    because:
      "Es el factor con más peso en la factura: calefactar con electricidad puede duplicar el consumo de todo el año.",
    options: [
      {
        id: "todo",
        label: "Calefacción y agua caliente",
        hint: "Radiadores o calefactores eléctricos y termo eléctrico",
      },
      { id: "bomba", label: "Bomba de calor", hint: "Para calefacción y agua caliente" },
      { id: "agua", label: "Solo el agua caliente", hint: "Termo eléctrico, sin calefacción eléctrica" },
      { id: "nada", label: "Nada, uso gas o gasóleo", hint: "Para calefacción y agua caliente" },
    ],
  },
  {
    id: "ev",
    prompt: "¿Cargas un vehículo eléctrico en casa?",
    because:
      "Cargarlo equivale a sumar el consumo de una vivienda entera — y la hora a la que lo cargas cambia por completo qué tarifa te conviene.",
    options: [
      { id: "noche", label: "Sí, de madrugada", hint: "Carga programada" },
      { id: "llegada", label: "Sí, al llegar por la tarde" },
      { id: "variable", label: "Sí, sin un horario fijo" },
      { id: "no", label: "No", hint: "O lo cargo fuera de casa" },
    ],
  },
  {
    id: "presence",
    prompt: "¿En qué franjas estáis en casa entre semana?",
    because:
      "De 10 a 14 h y de 18 a 22 h la electricidad es más cara. Coincidir con esas franjas condiciona qué tarifa resulta más conveniente.",
    options: [
      { id: "todo", label: "Todo el día", hint: "Teletrabajo o presencia continua" },
      { id: "mananas-noches", label: "Mañanas y a partir de las 18 h" },
      { id: "noches", label: "Solo por la tarde y la noche", hint: "Fuera del domicilio durante el día" },
      { id: "finde", label: "Principalmente los fines de semana" },
    ],
  },
  {
    id: "shiftable",
    prompt: "¿Puedes programar lavadora y lavavajillas por la noche o en fin de semana?",
    because:
      "Determina si te conviene una tarifa por periodos. Si no puedes desplazar ese consumo, pagar un recargo en hora punta por una flexibilidad que no usarías no tiene sentido.",
    options: [
      { id: "si", label: "Sí, sin inconveniente" },
      { id: "aveces", label: "En ocasiones" },
      { id: "no", label: "No, se utilizan cuando es posible" },
    ],
  },
  {
    id: "power",
    prompt: "¿Qué potencia tienes contratada?",
    because:
      "Figura en tu factura, en kW. Es habitual tener contratada más de la necesaria, y se cobra todos los días del año aunque no consumas.",
    options: [
      { id: "3.45", label: "3,45 kW" },
      { id: "4.6", label: "4,6 kW" },
      { id: "5.75", label: "5,75 kW" },
      { id: "nose", label: "No lo sé", hint: "Realizamos una estimación" },
    ],
  },
  {
    id: "bill",
    prompt: "¿Cuál es tu factura de luz mensual aproximada?",
    because: "Nos permite contrastar nuestra estimación con lo que de verdad pagas.",
    options: [
      { id: "30", label: "Menos de 40 €" },
      { id: "60", label: "Entre 40 y 80 €" },
      { id: "100", label: "Entre 80 y 130 €" },
      { id: "160", label: "Más de 130 €" },
      { id: "nose", label: "No lo sé con exactitud" },
    ],
  },
  {
    id: "priority",
    prompt: "¿Qué es lo que más te importa de tu tarifa?",
    because:
      "Aplicamos tu prioridad a la comparativa. Las tarifas que no la cumplan seguirán visibles, marcadas, para que veas lo que cuesta.",
    options: [
      { id: "precio", label: "El precio más bajo" },
      { id: "estable", label: "Un precio estable", hint: "Sin tarifas que varíen con el mercado" },
      { id: "renovable", label: "Que sea 100% renovable" },
      { id: "libre", label: "Poder cambiarme cuando quiera", hint: "Sin permanencia" },
    ],
  },
];

/** The questionnaire, in order, filtered to what applies to these answers. */
export function visibleQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((question) => !question.showIf || question.showIf(answers));
}
