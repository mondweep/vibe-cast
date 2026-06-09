import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, RefreshCw, Search, Tag } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { couponApi, AdminCoupon, CreateCouponBody } from '@/api/coupons';
import { CouponsTable, getStatus, CopyButton } from './AdminCouponsTable';

// ── path options ──────────────────────────────────────────────────────────────

const PATH_OPTIONS = [
  { label: 'Intermediate', value: ['INTERMEDIATE'], color: 'yellow', desc: 'Unlocks Intermediate learning path', icon: '🔓' },
  { label: 'Advanced', value: ['ADVANCED'], color: 'purple', desc: 'Unlocks Advanced learning path', icon: '🔐' },
  { label: 'Full Premium', value: ['INTERMEDIATE', 'ADVANCED'], color: 'blue', desc: 'Unlocks both paths', icon: '💎' },
];

// ── CreateCouponCard ──────────────────────────────────────────────────────────

interface CreateCardProps { onCreated: (code: string) => void; }

function CreateCouponCard({ onCreated }: CreateCardProps) {
  const [selectedPath, setSelectedPath] = useState<number>(0);
  const [assignedEmail, setAssignedEmail] = useState('');
  const [assignedName, setAssignedName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (body: CreateCouponBody) => couponApi.createCoupon(body),
    onSuccess: (data) => {
      onCreated(data.code);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: () => setError('Failed to create coupon. Please try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutate({
      tierAccess: PATH_OPTIONS[selectedPath].value,
      expiresInDays,
      maxUses,
      notes: notes.trim() || undefined,
      assignedToEmail: assignedEmail.trim() || undefined,
      assignedToName: assignedName.trim() || undefined,
    });
  };

  const cardBorder = (color: string, selected: boolean) => {
    if (!selected) return 'border-gray-200 hover:border-gray-300';
    const map: Record<string, string> = {
      yellow: 'border-yellow-400 ring-1 ring-yellow-400',
      purple: 'border-purple-400 ring-1 ring-purple-400',
      blue: 'border-blue-400 ring-1 ring-blue-400',
    };
    return map[color] ?? 'border-primary-400 ring-1 ring-primary-400';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-primary-600" /> Generate Coupon
      </h2>

      {/* Path selector */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {PATH_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setSelectedPath(i)}
            className={`flex flex-col items-start p-3 border-2 rounded-lg transition cursor-pointer text-left ${cardBorder(opt.color, selectedPath === i)}`}
          >
            <span className="text-2xl mb-1">{opt.icon}</span>
            <span className="font-semibold text-sm text-gray-900">{opt.label}</span>
            <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Row 1: Assignee Email — full width */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee Email</label>
          <input
            type="email" value={assignedEmail} onChange={(e) => setAssignedEmail(e.target.value)}
            placeholder="learner@example.com (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Row 2: Name | Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee Name</label>
          <input
            type="text" value={assignedName} onChange={(e) => setAssignedName(e.target.value)}
            placeholder="Jane Smith (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
          <input
            type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Row 3: Max Uses | Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
          <input
            type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input
            type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Batch 2026-Q3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit" disabled={isPending}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition text-sm font-medium"
          >
            {isPending ? 'Generating…' : 'Generate Coupon →'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── NewCodeBanner ─────────────────────────────────────────────────────────────

function NewCodeBanner({ code, onDismiss }: { code: string; onDismiss: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 30_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-800 mb-1">Generated code:</p>
        <code className="text-xl font-mono font-bold text-yellow-900 tracking-widest">{code}</code>
        <p className="text-xs text-yellow-700 mt-1">Share this code with the learner. It will appear in the table below.</p>
      </div>
      <div className="flex items-center gap-2">
        <CopyButton text={code} />
        <button onClick={onDismiss} className="text-yellow-600 hover:text-yellow-800 text-xs">✕</button>
      </div>
    </div>
  );
}

// ── AdminCouponsPage ──────────────────────────────────────────────────────────

export function AdminCouponsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [pathFilter, setPathFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newCode, setNewCode] = useState<string | null>(null);

  const isAdmin = !!user && user.app_metadata?.role === 'admin';

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponApi.listCoupons(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filtered = (coupons ?? []).filter((c: AdminCoupon) => {
    if (
      search &&
      !c.code.includes(search.toUpperCase()) &&
      !(c.assigned_to_email ?? '').includes(search.toLowerCase())
    ) return false;
    if (pathFilter !== 'all') {
      if (pathFilter === 'intermediate' && !c.tier_access.includes('INTERMEDIATE')) return false;
      if (pathFilter === 'advanced' && !c.tier_access.includes('ADVANCED')) return false;
      if (pathFilter === 'full' && !(c.tier_access.includes('INTERMEDIATE') && c.tier_access.includes('ADVANCED'))) return false;
    }
    const status = getStatus(c);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    return true;
  });

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded font-medium transition ${active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <Tag className="text-primary-600" /> Coupon Management
      </h1>

      <CreateCouponCard onCreated={(code) => setNewCode(code)} />

      {newCode && <NewCodeBanner code={newCode} onDismiss={() => setNewCode(null)} />}

      <div className="bg-white rounded-lg shadow p-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or email…"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-1">
            {[{ label: 'All', value: 'all' }, { label: 'Intermediate', value: 'intermediate' }, { label: 'Advanced', value: 'advanced' }, { label: 'Full Premium', value: 'full' }].map((opt) => (
              <button key={opt.value} onClick={() => setPathFilter(opt.value)} className={filterBtn(pathFilter === opt.value)}>{opt.label}</button>
            ))}
          </div>

          <div className="flex gap-1">
            {[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Expired', value: 'expired' }, { label: 'Inactive', value: 'inactive' }].map((opt) => (
              <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={filterBtn(statusFilter === opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="animate-spin text-primary-600 h-6 w-6" />
          </div>
        ) : (
          <CouponsTable coupons={filtered} />
        )}
      </div>
    </div>
  );
}

export default AdminCouponsPage;
