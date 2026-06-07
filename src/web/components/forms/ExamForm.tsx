import React, { useState, useEffect } from 'react';
import { Exam, ExamQuestion } from '@/types';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

interface ExamFormProps {
  exam: Exam;
  onSubmit: (answers: Record<string, number>, score: number) => Promise<void>;
  isSubmitting?: boolean;
}

export function ExamForm({
  exam,
  onSubmit,
  isSubmitting,
}: ExamFormProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(exam.timeLimit * 60);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion: ExamQuestion = exam.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;

  // Timer countdown
  useEffect(() => {
    if (submitted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleAnswerChange = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const calculateScore = (): number => {
    let score = 0;
    let totalPoints = 0;

    exam.questions.forEach((question) => {
      totalPoints += question.points;
      const selectedOption = answers[question.id];
      if (selectedOption === question.correctOption) {
        score += question.points;
      }
    });

    return Math.round((score / totalPoints) * 100);
  };

  const handleSubmit = async () => {
    if (answeredCount < exam.questions.length) {
      if (!window.confirm('Not all questions answered. Submit anyway?')) {
        return;
      }
    }

    try {
      const score = calculateScore();
      setSubmitted(true);
      await onSubmit(answers, score);
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitted(false);
    }
  };

  if (submitted) {
    const score = calculateScore();
    const passed = score >= exam.passingScore;

    return (
      <div className="max-w-2xl mx-auto">
        <div className={`bg-white rounded-lg shadow-lg p-8 text-center ${
          passed ? 'border-t-4 border-success-500' : 'border-t-4 border-error-500'
        }`}>
          <h2 className="text-3xl font-bold mb-4">
            {passed ? 'Congratulations!' : 'Keep Practicing'}
          </h2>
          <p className={`text-5xl font-bold mb-2 ${
            passed ? 'text-success-600' : 'text-error-600'
          }`}>
            {score}%
          </p>
          <p className="text-gray-600 mb-4">
            {passed
              ? `You passed with a score of ${score}%`
              : `You scored ${score}%. Passing score is ${exam.passingScore}%`}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Questions Answered:</strong> {answeredCount} / {exam.questions.length}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Passing Score:</strong> {exam.passingScore}%
            </p>
          </div>

          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Question {currentQuestionIndex + 1} of {exam.questions.length}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Answered: {answeredCount} / {exam.questions.length}
            </p>
          </div>
          <div className={`text-center ${
            timeRemaining < 300 ? 'text-error-600' : 'text-gray-600'
          }`}>
            <p className="text-sm font-medium">Time Remaining</p>
            <p className="text-2xl font-bold font-mono">
              {minutes.toString().padStart(2, '0')}:
              {seconds.toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{
              width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {currentQuestion.questionText}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                answers[currentQuestion.id] === index
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value={index}
                checked={answers[currentQuestion.id] === index}
                onChange={() => handleAnswerChange(index)}
                className="mt-1 mr-4 cursor-pointer"
              />
              <span className="text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isSubmitting}
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        {currentQuestionIndex === exam.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Send size={20} />
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Question Navigation Grid */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <p className="text-sm font-medium text-gray-700 mb-4">Quick Navigation</p>
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
          {exam.questions.map((question, index) => (
            <button
              key={question.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-full aspect-square rounded-lg font-medium text-sm transition ${
                index === currentQuestionIndex
                  ? 'bg-primary-600 text-white'
                  : answers[question.id] !== undefined
                    ? 'bg-success-100 text-success-700 hover:bg-success-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExamForm;
