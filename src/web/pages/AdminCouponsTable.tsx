import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Calendar, Ban } from 'lucide-react';
import { couponApi, AdminCoupon } from '@/api/coupons';

// ── helpers ───────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isExpired(iso: string): boolean {
  return new Date(iso) < new Date();
}

export const pathLabel = (tiers: string[]): string => {
  if (tiers.includes('INTERMEDIATE') && tiers.includes('ADVANCED')) return 'Full Premium';
  if (tiers.includes('INTERMEDIATE')) return 'Intermediate';
  if (tiers.includes('ADVANCED')) return 'Advanced';
  return tiers.join(', ');
};

export const getStatus = (coupon: AdminCoupon): 'active' | 'expired' | 'inactive' => {
  if (!coupon.is_active) return 'inactive';
  if (isExpired(coupon.expires_at)) return 'expired';
  return 'active';
};

// ── CopyButton ────────────────────────────────────────────────────────────────

export function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 ${className}`}
      title="Copy code"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ── PathBadge ─────────────────────────────────────────────────────────────────

export function PathBadge({ tiers }: { tiers: string[] }) {
  const label = pathLabel(tiers);
  const colorMap: Record<string, string> = {
    'Full Premium': 'bg-blue-100 text-blue-800',
    'Advanced': 'bg-purple-100 text-purple-800',
    'Intermediate': 'bg-yellow-100 text-yellow-800',
  };
  const cls = colorMap[label] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: 'active' | 'expired' | 'inactive' }) {
  const map = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

// ── CouponsTable ──────────────────────────────────────────────────────────────

interface TableProps { coupons: AdminCoupon[]; }

export function CouponsTable({ coupons }: TableProps) {
  const queryClient = useQueryClient();
  const [extending, setExtending] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [confirmInvalidate, setConfirmInvalidate] = useState<string | null>(null);

  const renewMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => couponApi.renewCoupon(id, days),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setExtending(null); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => couponApi.deactivateCoupon(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setConfirmInvalidate(null); },
  });

  if (coupons.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No coupons match the current filter.</p>;
  }

  const invalidateTarget = coupons.find((x) => x.id === confirmInvalidate);

  return (
    <>
      {confirmInvalidate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-gray-900 font-medium mb-2">Invalidate coupon?</p>
            <p className="text-sm text-gray-600 mb-4">
              Invalidate <span className="font-mono font-bold">{invalidateTarget?.code}</span>? The holder will lose access immediately.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmInvalidate(null)} className="px-3 py-1.5 text-sm text-gray-600 border rounded hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deactivateMutation.mutate(confirmInvalidate)}
                disabled={deactivateMutation.isPending}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
              >
                {deactivateMutation.isPending ? '…' : 'Invalidate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="pb-3 pr-4 font-medium">Code</th>
              <th className="pb-3 pr-4 font-medium">Path</th>
              <th className="pb-3 pr-4 font-medium">Assignee</th>
              <th className="pb-3 pr-4 font-medium">Expires</th>
              <th className="pb-3 pr-4 font-medium">Redeemed</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.map((c) => (
              <React.Fragment key={c.id}>
                <tr className="align-top">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-medium text-gray-900 text-xs">{c.code}</span>
                      <CopyButton text={c.code} />
                    </div>
                    {c.notes && <p className="text-xs text-gray-400 mt-0.5">{c.notes}</p>}
                  </td>
                  <td className="py-3 pr-4"><PathBadge tiers={c.tier_access} /></td>
                  <td className="py-3 pr-4">
                    {c.assigned_to_email ? (
                      <>
                        <p className="text-gray-800 text-xs">{c.assigned_to_email}</p>
                        {c.assigned_to_name && <p className="text-gray-400 text-xs">{c.assigned_to_name}</p>}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {isExpired(c.expires_at)
                      ? <span className="text-red-600 text-xs">Expired</span>
                      : <span className="text-gray-700 text-xs">{formatDate(c.expires_at)}</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {c.redeemed_at
                      ? <span className="text-green-700 text-xs" title={c.redeemed_by_user_id ?? ''}>✓ {formatDate(c.redeemed_at)}</span>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={getStatus(c)} /></td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <CopyButton text={c.code} />
                      <button
                        onClick={() => { setExtending(extending === c.id ? null : c.id); setExtendDays(7); }}
                        className="p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-blue-600"
                        title="Extend"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmInvalidate(c.id)}
                        className="p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-red-600"
                        title="Invalidate"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {extending === c.id && (
                  <tr>
                    <td colSpan={7} className="pb-2">
                      <div className="px-4 py-2 bg-blue-50 rounded flex items-center gap-3 text-sm">
                        <span className="text-gray-700">Extend by</span>
                        <input
                          type="number" min={1} max={365} value={extendDays}
                          onChange={(e) => setExtendDays(Number(e.target.value))}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">days</span>
                        <button
                          onClick={() => renewMutation.mutate({ id: c.id, days: extendDays })}
                          disabled={renewMutation.isPending}
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-60"
                        >
                          {renewMutation.isPending ? '…' : 'Confirm'}
                        </button>
                        <button onClick={() => setExtending(null)} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
