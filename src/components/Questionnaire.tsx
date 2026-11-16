import { useMemo, useState } from "react";
import { visibleQuestions, type Answers, type Question } from "../lib/questions";
import { BrandBar } from "./BrandBar";

/**
 * One question at a time.
 *
 * The visible list is recomputed from the answers on every render, which is what
 * makes the branching work: answering "no tengo coche eléctrico" removes the
 * follow-up from the list, and because the position is derived from how many
 * questions have been answered rather than stored, the flow simply continues at
 * the right place. Nothing has to remember that a question was skipped.
 *
 * The consequence to watch: going back and changing an early answer can change
 * which questions exist after it. That is correct — the alternative is carrying
 * answers to questions the household no longer qualifies for — and it is why the
 * progress count can move when you go back.
 */
export function Questionnaire({
  answers,
  onAnswer,
  onBack,
  onHome,
}: {
  answers: Answers;
  onAnswer: (questionId: string, optionId: string) => void;
  onBack: () => void;
  onHome: () => void;
}) {
  const questions = useMemo(() => visibleQuestions(answers), [answers]);

  const index = questions.findIndex((question) => !(question.id in answers));
  const question = index === -1 ? null : questions[index];

  if (!question) return null;

  const step = index + 1;

  return (
    <>
      <BrandBar onHome={onHome} />
      <main className="mx-auto flex w-full max-w-2xl flex-col px-6 py-10">
      <header>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span>
            Pregunta {step} de {questions.length}
          </span>
          {step > 1 && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full px-3 py-1 transition hover:bg-white hover:text-ink"
            >
              ← Anterior
            </button>
          )}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${(index / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div key={question.id} className="animate-fade-up mt-12 flex-1">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {question.prompt}
        </h1>

        {/* Every question says why it is being asked. A funnel that interrogates
            without explaining is one people abandon at the question they find
            nosy — and here the reasons are genuinely interesting, because they
            are where the money is. */}
        <p className="mt-4 rounded-xl bg-white/70 p-4 text-sm leading-relaxed text-slate-500 ring-1 ring-black/5">
          {question.because}
        </p>

        {question.kind === "select" && (
          <SelectAnswer question={question} onAnswer={onAnswer} />
        )}

        {question.kind === "number" && (
          <NumberAnswer question={question} onAnswer={onAnswer} />
        )}

        <div className="mt-8 flex flex-col gap-3">
          {(question.options ?? []).map((option, position) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onAnswer(question.id, option.id)}
              className="animate-fade-up group flex items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
              style={{ animationDelay: `${position * 55}ms` }}
            >
              <span className="flex-1">
                <span className="block font-semibold">{option.label}</span>
                {option.hint && (
                  <span className="mt-0.5 block text-sm text-slate-500">{option.hint}</span>
                )}
              </span>
              <span
                className="size-5 shrink-0 rounded-full ring-2 ring-ink/15 transition group-hover:bg-brand group-hover:ring-brand"
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
      </main>
    </>
  );
}

/**
 * A long list that cannot be cards.
 *
 * Fifty-two provinces will not fit the one-tap pattern the rest of the
 * questionnaire uses, and a search box for a list everybody can scan is more
 * work, not less. A native select is also the control that behaves best on a
 * phone, where this will mostly be answered.
 */
function SelectAnswer({
  question,
  onAnswer,
}: {
  question: Question;
  onAnswer: (questionId: string, value: string) => void;
}) {
  return (
    <div className="mt-8">
      <select
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) onAnswer(question.id, event.target.value);
        }}
        className="w-full rounded-2xl bg-white p-5 text-base font-semibold shadow-sm ring-1 ring-black/5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
      >
        <option value="" disabled>
          Selecciona una opción
        </option>
        {(question.choices ?? []).map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * A number typed in.
 *
 * Submitted on Enter or on the button, never on each keystroke: advancing the
 * questionnaire the moment someone types "8" on the way to "88" would be
 * actively hostile. Empty is allowed through — the model has a documented
 * default and says it is using one, which beats blocking someone who genuinely
 * does not know.
 */
function NumberAnswer({
  question,
  onAnswer,
}: {
  question: Question;
  onAnswer: (questionId: string, value: string) => void;
}) {
  const [value, setValue] = useState("");
  const numeric = question.numeric;

  const submit = () => onAnswer(question.id, value.trim());

  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-brand">
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          min={numeric?.min}
          max={numeric?.max}
          placeholder={numeric?.placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-slate-300"
        />
        <span className="shrink-0 text-lg font-semibold text-slate-400">{numeric?.suffix}</span>
      </div>

      <button
        type="submit"
        className="mt-5 w-full rounded-2xl bg-ink px-8 py-4 font-semibold text-white transition hover:bg-brand-deep"
      >
        Siguiente
      </button>

      <button
        type="button"
        onClick={() => onAnswer(question.id, "")}
        className="mt-3 w-full rounded-full py-2 text-sm font-medium text-slate-400 transition hover:text-ink"
      >
        No lo sé, prefiero que lo estiméis
      </button>
    </form>
  );
}
