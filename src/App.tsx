import { useMemo, useState } from "react";
import { Landing } from "./components/Landing";
import { Questionnaire } from "./components/Questionnaire";
import { Results } from "./components/Results";
import { buildProfile } from "./lib/profile";
import { rank } from "./lib/recommend";
import { expandAnswers } from "./lib/expand";
import { visibleQuestions, type Answers } from "./lib/questions";

/**
 * Which screen is showing.
 *
 * Derived from the answers rather than stored as a step counter: the
 * questionnaire is finished exactly when every visible question has an answer,
 * and "visible" depends on the answers themselves. A separate counter would be
 * a second source of truth, and it would disagree the moment someone goes back
 * and changes an answer that opens or closes a follow-up.
 *
 * `started` is the only piece of real state here, because wanting to begin is
 * not something the answers can express.
 */
export function App() {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});

  const done = useMemo(() => {
    const questions = visibleQuestions(answers);
    return questions.length > 0 && questions.every((question) => question.id in answers);
  }, [answers]);

  const answer = (questionId: string, optionId: string) =>
    setAnswers((current) => ({ ...current, [questionId]: optionId }));

  /**
   * Undo the last answer.
   *
   * The last answer is the last VISIBLE question that has one, not the last key
   * added to the object: changing an early answer can strand answers to
   * questions that no longer apply, and walking the visible list backwards is
   * what keeps "back" landing on the question the household actually just saw.
   */
  const back = () =>
    setAnswers((current) => {
      const answered = visibleQuestions(current).filter((question) => question.id in current);
      const last = answered[answered.length - 1];
      if (!last) return current;

      const next = { ...current };
      delete next[last.id];
      return next;
    });

  const restart = () => {
    setAnswers({});
    setStarted(false);
  };

  if (!started) return <Landing onStart={() => setStarted(true)} />;

  if (done) {
    // MTP asks ten questions; the engine reads nineteen. `expand`
    // fills the gap and reports every value it filled rather than read, so the
    // results page can say what was assumed.
    const { full, assumed } = expandAnswers(answers);
    const profile = buildProfile(full);
    return (
      <Results
        profile={profile}
        ranked={rank(profile, full)}
        assumed={assumed}
        onRestart={restart}
      />
    );
  }

  return (
    <Questionnaire answers={answers} onAnswer={answer} onBack={back} onHome={restart} />
  );
}
