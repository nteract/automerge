"use client";

import { useMemo, useState } from "react";

export type QuizQuestion = {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export function Quiz({
  title,
  questions,
}: {
  title: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const score = useMemo(
    () =>
      questions.reduce((total, question, index) => {
        return total + (answers[index] === question.answer ? 1 : 0);
      }, 0),
    [answers, questions],
  );

  return (
    <section className="quizBox">
      <strong>{title}</strong>
      {questions.map((question, index) => (
        <div key={question.prompt}>
          <p>{question.prompt}</p>
          {question.choices.map((choice, choiceIndex) => (
            <button
              className="checkOption"
              data-selected={answers[index] === choiceIndex}
              key={choice}
              onClick={() =>
                setAnswers((current) => ({ ...current, [index]: choiceIndex }))
              }
              type="button"
            >
              <span>{String.fromCharCode(65 + choiceIndex)}</span>
              {choice}
            </button>
          ))}
          {answers[index] !== undefined ? (
            <div className="quizResult">
              {answers[index] === question.answer ? "Correct. " : "Not quite. "}
              {question.explanation}
            </div>
          ) : null}
        </div>
      ))}
      <div className="quizResult">
        Score: {score}/{questions.length} answered: {answered}/{questions.length}
      </div>
    </section>
  );
}
