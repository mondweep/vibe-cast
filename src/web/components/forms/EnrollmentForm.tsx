import React, { useState } from 'react';
import { Certification } from '@/types';
import { AlertCircle } from 'lucide-react';

interface EnrollmentFormProps {
  certifications: Certification[];
  isLoading?: boolean;
  onSubmit: (certificationId: string) => Promise<void>;
  onCancel?: () => void;
}

export function EnrollmentForm({
  certifications,
  isLoading,
  onSubmit,
  onCancel,
}: EnrollmentFormProps) {
  const [selectedCertificationId, setSelectedCertificationId] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCert = certifications.find(
    (c) => c.id === selectedCertificationId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCertificationId) {
      setError('Please select a certification');
      return;
    }

    if (!agreed) {
      setError('Please agree to the terms');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(selectedCertificationId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create enrollment',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Certification Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Certification *
        </label>
        <select
          value={selectedCertificationId}
          onChange={(e) => setSelectedCertificationId(e.target.value)}
          disabled={isLoading || submitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
        >
          <option value="">Choose a certification...</option>
          {certifications.map((cert) => (
            <option key={cert.id} value={cert.id}>
              {cert.name} ({cert.difficulty})
            </option>
          ))}
        </select>
      </div>

      {/* Certification Details */}
      {selectedCert && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            {selectedCert.name}
          </h3>
          <p className="text-sm text-gray-700 mb-3">{selectedCert.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Duration</p>
              <p className="font-semibold text-gray-900">
                {selectedCert.duration} hours
              </p>
            </div>
            <div>
              <p className="text-gray-600">Domain</p>
              <p className="font-semibold text-gray-900 capitalize">
                {selectedCert.domain}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Difficulty</p>
              <p className="font-semibold text-gray-900 capitalize">
                {selectedCert.difficulty}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Exams</p>
              <p className="font-semibold text-gray-900">
                {selectedCert.examCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms Agreement */}
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          id="agree"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={isLoading || submitting}
          className="mt-1 w-4 h-4 rounded border-gray-300 cursor-pointer"
        />
        <label htmlFor="agree" className="text-sm text-gray-700 flex-1">
          I agree to the certification terms and understand this enrollment
          cannot be transferred or refunded.
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || submitting || !selectedCertificationId || !agreed}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {submitting ? 'Enrolling...' : 'Enroll Now'}
        </button>
      </div>
    </form>
  );
}

export default EnrollmentForm;
