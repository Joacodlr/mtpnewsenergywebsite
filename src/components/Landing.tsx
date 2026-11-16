import { BrandBar } from "./BrandBar";
import { visibleQuestions } from "../lib/questions";

/**
 * The opening screen, in MTP's newspaper voice.
 *
 * Laid out like a lead story rather than a product hero: kicker, headline,
 * standfirst, one action. That is the register mtpnoticias.com's readers know,
 * and it suits the subject — the question "am I overpaying?" is closer to an
 * investigation than to a sales pitch.
 *
 * The headline is modest on purpose. The app cannot know a saving before it
 * has asked anything, and a figure promised here that the results page then
 * fails to produce is the fastest way for a comparison to lose credibility.
 */

// Read from the questionnaire itself, so the number on the cover can never
// drift from the number of questions actually asked. Branching questions are
// not counted: the base path is what every reader sees.
const QUESTION_COUNT = visibleQuestions({}).length;

const PROMISES = [
  {
    title: "Te decimos de dónde sale cada precio",
    body: "Cada tarifa lleva su fuente y la fecha en que la consultamos. Puedes ir a comprobarla.",
  },
  {
    title: "No te pedimos datos personales",
    body: "Ni DNI, ni número de cuenta, ni registro. Solo lo necesario para hacer el cálculo.",
  },
  {
    title: "Es una estimación, y lo decimos",
    body: "Calculamos a partir de lo que nos cuentas. Cuando no podemos prometerte un ahorro, te lo decimos en lugar de inventarlo.",
  },
];

const STEPS = [
  {
    title: "Datos de tu vivienda",
    body: "Dónde vives, qué calientas con electricidad y a qué horas estás en casa. Solo lo que mueve de verdad la factura.",
  },
  {
    title: "Estimación de consumo",
    body: "Calculamos tu consumo anual y, sobre todo, a qué horas lo gastas: el reparto entre punta, llano y valle decide qué tarifa conviene.",
  },
  {
    title: "Comparativa y recomendación",
    body: "Tarifas ordenadas por coste anual, con la fecha de cada precio. También el ahorro que puedes pedir hoy sin cambiar de compañía.",
  },
];

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <>
      <BrandBar />

      <main>
        <section className="border-b border-ink/10 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
            <p className="animate-fade-up text-sm font-bold uppercase tracking-[0.18em] text-brand-deep">
              Factura de la luz
            </p>

            <h1
              className="animate-fade-up mt-4 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              ¿Pagas de más por la luz?{" "}
              <span className="text-brand">Compruébalo en dos minutos.</span>
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-ink/75 sm:text-xl"
              style={{ animationDelay: "160ms" }}
            >
              Responde {QUESTION_COUNT} preguntas sobre tu casa y tus horarios. Te decimos qué
              tarifa encaja contigo, cuánto costaría al año y de dónde sale cada precio.
            </p>

            <div
              className="animate-fade-up mt-10 flex flex-wrap items-center gap-5"
              style={{ animationDelay: "240ms" }}
            >
              <button
                type="button"
                onClick={onStart}
                className="rounded bg-brand px-8 py-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
              >
                Analizar mi tarifa
              </button>
              <p className="text-sm text-ink/55">
                Sin registro. No solicitamos DNI ni datos bancarios.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid gap-5 sm:grid-cols-3">
            {PROMISES.map((item) => (
              <div key={item.title} className="border-t-4 border-brand bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold leading-snug text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-ink/10 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
              Cómo funciona
            </h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="text-4xl font-black text-brand">{index + 1}</span>
                  <h3 className="mt-2 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 border-t border-ink/10 pt-8">
              <button
                type="button"
                onClick={onStart}
                className="rounded bg-ink px-8 py-4 text-base font-bold text-white transition hover:bg-brand-deep"
              >
                Empezar ahora
              </button>
              <p className="mt-5 max-w-2xl text-xs leading-relaxed text-ink/45">
                Comparamos con precios publicados de las comercializadoras e indicamos la fecha
                de consulta de cada uno. El resultado es una estimación basada en los datos que
                facilitas, no un presupuesto vinculante. Herramienta para hogares de la
                península y Baleares.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
