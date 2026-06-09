import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, RefreshCw, Trash2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { couponApi, AdminCoupon } from '@/api/coupons';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpired(iso: string): boolean {
  return new Date(iso) < new Date();
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ coupon }: { coupon: AdminCoupon }) {
  if (isExpired(coupon.expiresAt)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Expired
      </span>
    );
  }
  if (!coupon.isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
      title="Copy code"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ── CreateCouponForm ──────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreate: (code: string) => void;
}

function CreateCouponForm({ onCreate }: CreateFormProps) {
  const [open, setOpen] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [tiers, setTiers] = useState<Record<string, boolean>>({ INTERMEDIATE: true, ADVANCED: true });
  const [notes, setNotes] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      couponApi.createCoupon({
        expiresInDays,
        maxUses,
        tierAccess: Object.entries(tiers)
          .filter(([, v]) => v)
          .map(([k]) => k),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: () => setError('Failed to create coupon. Please try again.'),
  });

  const toggleTier = (tier: string) =>
    setTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedCode(null);
    const selectedTiers = Object.entries(tiers).filter(([, v]) => v);
    if (selectedTiers.length === 0) {
      setError('Select at least one tier.');
      return;
    }
    mutate();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary-600" />
          Generate Coupon
        </h2>
        {open ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid for (days)
              </label>
              <input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max uses
              </label>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier access
              </label>
              <div className="flex gap-4">
                {['INTERMEDIATE', 'ADVANCED'].map((tier) => (
                  <label key={tier} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tiers[tier]}
                      onChange={() => toggleTier(tier)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{tier.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Batch 2026-Q3 cohort"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {error && (
              <p className="sm:col-span-2 text-sm text-red-600">{error}</p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition text-sm font-medium"
              >
                {isPending ? 'Generating…' : 'Generate Coupon'}
              </button>
            </div>
          </form>

          {generatedCode && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-2">Generated code:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold text-yellow-900 tracking-widest">
                  {generatedCode}
                </code>
                <CopyButton text={generatedCode} />
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Share this code with the learner. It will appear in the table below.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── CouponsTable ──────────────────────────────────────────────────────────────

function CouponsTable({ coupons }: { coupons: AdminCoupon[] }) {
  const queryClient = useQueryClient();
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewDays, setRenewDays] = useState<Record<string, number>>({});

  const renewMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      couponApi.renewCoupon(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setRenewingId(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => couponApi.deactivateCoupon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  if (coupons.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No coupons yet. Generate one above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-3 pr-4 font-medium">Code</th>
            <th className="pb-3 pr-4 font-medium">Tiers</th>
            <th className="pb-3 pr-4 font-medium">Expires</th>
            <th className="pb-3 pr-4 font-medium">Uses</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {coupons.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-1">
                  <span className="font-mono font-medium text-gray-900">{c.code}</span>
                  <CopyButton text={c.code} />
                </div>
                {c.notes && <p className="text-xs text-gray-400 mt-0.5">{c.notes}</p>}
              </td>
              <td className="py-3 pr-4 text-gray-700">
                {(c.tierAccess ?? []).map((t) => (
                  <span key={t} className="mr-1 capitalize">{t.toLowerCase()}</span>
                ))}
              </td>
              <td className="py-3 pr-4 text-gray-700">
                {isExpired(c.expiresAt) ? (
                  <span className="text-red-600">Expired</span>
                ) : (
                  formatDate(c.expiresAt)
                )}
              </td>
              <td className="py-3 pr-4 text-gray-700">
                {c.useCount} / {c.maxUses}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge coupon={c} />
              </td>
              <td className="py-3">
                <div className="flex flex-col gap-2">
                  {renewingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={renewDays[c.id] ?? 7}
                        onChange={(e) =>
                          setRenewDays((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                        }
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="days"
                      />
                      <span className="text-xs text-gray-500">days</span>
                      <button
                        onClick={() =>
                          renewMutation.mutate({ id: c.id, days: renewDays[c.id] ?? 7 })
                        }
                        disabled={renewMutation.isPending}
                        className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-60 transition"
                      >
                        {renewMutation.isPending ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setRenewingId(null)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRenewDays((prev) => ({ ...prev, [c.id]: 7 }));
                        setRenewingId(c.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Renew
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Deactivate this coupon?')) {
                        deactivateMutation.mutate(c.id);
                      }
                    }}
                    disabled={deactivateMutation.isPending}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Deactivate
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── AdminCouponsPage ──────────────────────────────────────────────────────────

export function AdminCouponsPage() {
  const { user } = useAuth();

  if (!user || user.app_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: couponApi.listCoupons,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <Tag className="text-primary-600" /> Coupon Management
      </h1>

      <CreateCouponForm onCreate={() => {}} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Coupons</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="animate-spin text-primary-600 h-6 w-6" />
          </div>
        ) : (
          <CouponsTable coupons={coupons} />
        )}
      </div>
    </div>
  );
}

export default AdminCouponsPage;
