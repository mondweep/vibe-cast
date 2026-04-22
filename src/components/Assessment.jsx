import { useState, useEffect } from 'react';

export default function Assessment({ moduleNumber, moduleName }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        // Pad module number to 2 digits
        const paddedNum = String(moduleNumber).padStart(2, '0');
        const modulePath = `module-${paddedNum}`;

        // Try to dynamically import the assessment JSON
        const response = await fetch(`/assessments/${modulePath}-assessment.json`);
        if (!response.ok) {
          throw new Error(`Could not load assessment for ${modulePath}`);
        }
        const data = await response.json();
        setQuestions(data.questions || []);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [moduleNumber]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = () => {
    if (questions.length === 0) return 0;

    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      totalPoints += q.points || 10;
      const userAnswer = answers[q.id];

      if (q.type === 'multiple-choice') {
        if (userAnswer === q.correctAnswer) {
          earnedPoints += q.points || 10;
        }
      } else if (q.type === 'free-response') {
        // For free response, give partial credit if answer exists
        // In a real system, this would be manually graded
        if (userAnswer && userAnswer.trim().length > 0) {
          earnedPoints += (q.points || 10) * 0.5; // 50% auto-credit for attempting
        }
      }
    });

    return Math.round((earnedPoints / totalPoints) * 100);
  };

  const handleSubmit = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  if (loading) {
    return (
      <div className="assessment-container">
        <div className="assessment-loading">
          <p>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assessment-container">
        <div className="assessment-error">
          <p>Assessment not available yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  const passingScore = 70;
  const isPassing = score >= passingScore;

  return (
    <div className="assessment-container">
      <style>{`
        .assessment-container {
          margin: 30px 0;
          padding: 20px;
          background: #f5f7fa;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .assessment-header {
          margin-bottom: 20px;
        }

        .assessment-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #333;
        }

        .assessment-header p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }

        .assessment-question {
          background: white;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 6px;
          border-left: 4px solid #0066cc;
        }

        .assessment-question h4 {
          margin: 0 0 12px 0;
          font-size: 15px;
          color: #333;
        }

        .question-text {
          font-weight: 500;
          margin-bottom: 12px;
          color: #333;
        }

        .question-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .option-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .option-label:hover {
          background-color: #f0f5ff;
        }

        .option-label input[type="radio"],
        .option-label input[type="checkbox"] {
          margin-right: 10px;
          cursor: pointer;
        }

        .free-response textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          resize: vertical;
          min-height: 100px;
        }

        .free-response textarea:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 4px rgba(0, 102, 204, 0.2);
        }

        .assessment-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .assessment-button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .assessment-submit {
          background-color: #0066cc;
          color: white;
        }

        .assessment-submit:hover {
          background-color: #0052a3;
        }

        .assessment-submit:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .assessment-reset {
          background-color: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
        }

        .assessment-reset:hover {
          background-color: #e0e0e0;
        }

        .assessment-results {
          margin-top: 30px;
          padding: 20px;
          background: white;
          border-radius: 6px;
          border: 2px solid #ddd;
        }

        .assessment-results.passing {
          border-color: #28a745;
          background-color: #f0fff4;
        }

        .assessment-results.failing {
          border-color: #dc3545;
          background-color: #fff5f5;
        }

        .results-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .results-score {
          font-size: 48px;
          font-weight: bold;
          margin: 10px 0;
        }

        .results-score.passing {
          color: #28a745;
        }

        .results-score.failing {
          color: #dc3545;
        }

        .results-message {
          font-size: 16px;
          margin-bottom: 20px;
          text-align: center;
        }

        .results-breakdown {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }

        .results-breakdown h4 {
          margin: 0 0 15px 0;
          font-size: 14px;
          color: #333;
        }

        .assessment-loading,
        .assessment-error {
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .question-points {
          font-size: 12px;
          color: #999;
          margin-left: 8px;
        }
      `}</style>

      {!submitted ? (
        <>
          <div className="assessment-header">
            <h3>📝 Module Assessment</h3>
            <p>Test your understanding of the concepts covered in this module.</p>
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#999' }}>
              Passing score: {passingScore}% | Total points: {questions.reduce((sum, q) => sum + (q.points || 10), 0)}
            </p>
          </div>

          {questions.map((question, index) => (
            <div key={question.id} className="assessment-question">
              <h4>
                Question {index + 1}
                <span className="question-points">({question.points || 10} points)</span>
              </h4>
              <div className="question-text">{question.text}</div>

              {question.type === 'multiple-choice' && (
                <div className="question-options">
                  {question.options.map((option, optIndex) => (
                    <label key={optIndex} className="option-label">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'free-response' && (
                <div className="free-response">
                  <textarea
                    placeholder="Type your answer here..."
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    Free response questions receive partial auto-credit for attempts.
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="assessment-actions">
            <button className="assessment-button assessment-submit" onClick={handleSubmit}>
              Submit Assessment
            </button>
          </div>
        </>
      ) : (
        <div className={`assessment-results ${isPassing ? 'passing' : 'failing'}`}>
          <div className="results-header">
            <div className={`results-score ${isPassing ? 'passing' : 'failing'}`}>
              {score}%
            </div>
            <div className="results-message">
              {isPassing ? (
                <>
                  <strong>🎉 Excellent work!</strong>
                  <p>You've demonstrated solid understanding of this module. Move on to the next one when ready.</p>
                </>
              ) : (
                <>
                  <strong>⚠️ Keep learning</strong>
                  <p>Score below {passingScore}%. Review the module content and try again.</p>
                </>
              )}
            </div>
          </div>

          <div className="results-breakdown">
            <h4>Answer Breakdown</h4>
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = q.type === 'multiple-choice' && userAnswer === q.correctAnswer;
              return (
                <div key={q.id} style={{ marginBottom: '12px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                  <strong>Question {idx + 1}:</strong> {isCorrect ? '✓ Correct' : q.type === 'free-response' ? '📝 Submitted' : '✗ Incorrect'}
                  {q.type === 'multiple-choice' && !isCorrect && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                      Your answer: {userAnswer || '(not answered)'}<br />
                      Correct answer: {q.correctAnswer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="assessment-actions">
            <button className="assessment-button assessment-reset" onClick={handleReset}>
              Retake Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
