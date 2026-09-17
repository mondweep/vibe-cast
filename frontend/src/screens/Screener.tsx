import React, { useState } from 'react';
import { STOP_BANG_ITEMS, scoreStopBang, type StopBangAnswers } from '@somnus/domain';

const QUESTIONS: Record<keyof StopBangAnswers, string> = {
  snoringLoudly: 'Do you snore loudly — loud enough to be heard through a closed door, or that your partner elbows you for it at night?',
  tiredDuringDay: 'Do you often feel tired, fatigued or sleepy during the daytime?',
  observedApnoea: 'Has anyone observed you stop breathing, or choke or gasp, during your sleep?',
  highBloodPressure: 'Do you have, or are you being treated for, high blood pressure?',
  bmiOver35: 'Is your BMI more than 35 kg/m²?',
  ageOver50: 'Are you older than 50?',
  neckOver40cm: 'Is your neck circumference more than 40 cm (about 16 inches)?',
  maleSex: 'Is your sex, as recorded at birth, male?',
};

/**
 * STOP-BANG onboarding (FR-S1).
 *
 * Presented before the first Night, because the point of the screen is to
 * catch the case where measuring snoring is the wrong response to the
 * problem.
 */
export function Screener({
  onComplete,
}: {
  onComplete: (answers: StopBangAnswers, sleepinessWhileDriving: boolean) => void;
}): JSX.Element {
  const [answers, setAnswers] = useState<Partial<StopBangAnswers>>({});
  const [driving, setDriving] = useState<boolean | undefined>(undefined);

  const result = scoreStopBang(answers);
  const ready = result !== null && driving !== undefined;

  return (
    <div className="screen">
      <h1>A few questions first</h1>
      <p className="lead">
        This is STOP-BANG, a standard screening questionnaire for sleep apnoea
        risk. It takes a minute. It is a screening tool and deliberately
        cautious &mdash; it tells you whether a conversation with a doctor is
        worthwhile, and nothing more than that.
      </p>

      {STOP_BANG_ITEMS.map((item) => (
        <fieldset key={item} className="question">
          <legend>{QUESTIONS[item]}</legend>
          <div className="choices">
            <button
              className={answers[item] === true ? 'chip selected' : 'chip'}
              onClick={() => setAnswers((a) => ({ ...a, [item]: true }))}
            >
              Yes
            </button>
            <button
              className={answers[item] === false ? 'chip selected' : 'chip'}
              onClick={() => setAnswers((a) => ({ ...a, [item]: false }))}
            >
              No
            </button>
          </div>
        </fieldset>
      ))}

      {/* Asked separately from the instrument: RF-4 is graver than tiredness. */}
      <fieldset className="question">
        <legend>Have you ever felt sleepy while driving?</legend>
        <div className="choices">
          <button className={driving === true ? 'chip selected' : 'chip'} onClick={() => setDriving(true)}>
            Yes
          </button>
          <button className={driving === false ? 'chip selected' : 'chip'} onClick={() => setDriving(false)}>
            No
          </button>
        </div>
      </fieldset>

      <button
        className="primary"
        disabled={!ready}
        onClick={() => ready && onComplete(answers as StopBangAnswers, driving)}
      >
        {ready ? 'Continue' : 'Please answer every question'}
      </button>

      {/* I-S1: no band is shown until the screen is complete. */}
      {!ready && Object.keys(answers).length > 0 && (
        <p className="note">
          Your score is only meaningful once every question is answered, so
          nothing is shown until then.
        </p>
      )}
    </div>
  );
}
