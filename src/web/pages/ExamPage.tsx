import React from 'react';
import { useParams } from 'react-router-dom';
import { useEnrollment } from '@/hooks/useLearnerProfile';
import { useSubmitExam } from '@/hooks/useEnrollment';
import { ExamForm } from '@/components/forms/ExamForm';
import { AlertCircle, Loader } from 'lucide-react';
import { Exam } from '@/types';

export function ExamPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { data: enrollment, isLoading, error } = useEnrollment(enrollmentId);
  const submitExamMutation = useSubmitExam();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin text-primary-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-error-500">
          <div className="flex items-start space-x-4">
            <AlertCircle className="text-error-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Unable to Load Exam
              </h2>
              <p className="text-gray-700 mb-4">
                {error instanceof Error ? error.message : 'Failed to load exam'}
              </p>
              <a
                href="/enrollment"
                className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Back to Enrollments
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-600">Enrollment not found</p>
        <a
          href="/enrollment"
          className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          Back to Enrollments
        </a>
      </div>
    );
  }

  // Mock exam data - in a real app this would come from the API
  const mockExam: Exam = {
    id: 'exam-1',
    enrollmentId: enrollment.id,
    certificationId: enrollment.certificationId,
    totalQuestions: 5,
    timeLimit: 30, // 30 minutes
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        questionText: 'What is the capital of France?',
        questionType: 'multiple_choice',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctOption: 2,
        points: 20,
      },
      {
        id: 'q2',
        questionText: 'What is 2 + 2?',
        questionType: 'multiple_choice',
        options: ['3', '4', '5', '6'],
        correctOption: 1,
        points: 20,
      },
      {
        id: 'q3',
        questionText: 'React is a JavaScript library',
        questionType: 'true_false',
        options: ['True', 'False'],
        correctOption: 0,
        points: 20,
      },
      {
        id: 'q4',
        questionText: 'Which planet is closest to the sun?',
        questionType: 'multiple_choice',
        options: ['Venus', 'Mercury', 'Earth', 'Mars'],
        correctOption: 1,
        points: 20,
      },
      {
        id: 'q5',
        questionText: 'TypeScript is a superset of JavaScript',
        questionType: 'true_false',
        options: ['True', 'False'],
        correctOption: 0,
        points: 20,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="py-6">
      <ExamForm
        exam={mockExam}
        onSubmit={(answers, score) =>
          submitExamMutation
            .mutateAsync({
              enrollmentId: enrollment.id,
              examId: mockExam.id,
              answers,
              score,
            })
            .then(() => undefined)
        }
        isSubmitting={submitExamMutation.isPending}
      />
    </div>
  );
}

export default ExamPage;
