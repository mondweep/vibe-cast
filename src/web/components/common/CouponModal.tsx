import React, { useState } from 'react';
import { X, Ticket, CheckCircle, Loader } from 'lucide-react';
import { couponApi } from '@/api/coupons';
import { useMyAccess } from '@/hooks/useMyAccess';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tier?: string;
}

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
  const status = e?.response?.status;
  const apiCode = e?.response?.data?.code ?? '';
  if (status === 404 || apiCode === 'NOT_FOUND') return "This coupon code doesn't exist";
  if (status === 410 || apiCode === 'COUPON_EXPIRED') return 'This coupon has expired';
  if (status === 409 || apiCode === 'ALREADY_REDEEMED') return "You've already redeemed this coupon";
  if (status === 422 || apiCode === 'MAX_USES_REACHED') return 'This coupon has reached its usage limit';
  return e?.response?.data?.message || 'Invalid code, please try again';
}

/**
 * CouponModal — lets a learner enter a coupon code to unlock a premium path.
 *
 * Used by the enrolment flow when the backend returns 402 PREMIUM_REQUIRED
 * (ADR-018). Resets all local state on close so re-opening is clean.
 */
export function CouponModal({ isOpen, onClose, onSuccess, tier }: CouponModalProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successExpiry, setSuccessExpiry] = useState<string | null>(null);
  const { refetch } = useMyAccess();

  if (!isOpen) return null;

  const handleClose = () => {
    setCode('');
    setError(null);
    setSuccessExpiry(null);
    setSubmitting(false);
    onClose();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a coupon code.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await couponApi.redeem({ code: trimmed });
      await refetch();
      setSuccessExpiry(result.accessExpiresAt ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-yellow-600" />
            <h2 id="coupon-modal-title" className="text-lg font-semibold text-gray-900">
              Enter coupon code
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {successExpiry ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <p className="font-semibold text-gray-900">Access unlocked!</p>
                <p className="text-sm text-gray-600 mt-1">
                  Valid until{' '}
                  <span className="font-medium">{formatDate(successExpiry)}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  handleClose();
                  onSuccess();
                }}
                className="mt-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
              >
                Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {tier && (
                <p className="text-sm text-gray-600">
                  The{' '}
                  <span className="font-semibold capitalize">{tier.toLowerCase()}</span>{' '}
                  path requires a premium coupon. Enter your code below to unlock access.
                </p>
              )}

              <div>
                <label
                  htmlFor="coupon-code-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Coupon code
                </label>
                <input
                  id="coupon-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="RUFLO-XXXX-XXXX"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono tracking-wider uppercase"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-gray-300 text-gray-700 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 text-white py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Redeeming…
                    </>
                  ) : (
                    'Unlock Access'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CouponModal;
