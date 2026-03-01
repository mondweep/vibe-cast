import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ShortlistEntry, type ScrapeStatus, type Listing, type UserConfig } from '../api';

export default function Dashboard() {
  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([]);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, st, l, c] = await Promise.all([
        api.getShortlist().catch(() => []),
        api.getScrapeStatus().catch(() => null),
        api.getListings().catch(() => []),
        api.getConfig().catch(() => null),
      ]);
      setShortlist(s);
      setScrapeStatus(st);
      setListings(l);
      setConfig(c);
    } finally {
      setLoading(false);
    }
  }

  const activeListings = listings.filter(l => l.is_active);
  const platformCounts: Record<string, number> = {};
  for (const l of activeListings) {
    platformCounts[l.platform] = (platformCounts[l.platform] || 0) + 1;
  }

  const avgPrice = activeListings.length
    ? Math.round(activeListings.reduce((s, l) => s + l.price, 0) / activeListings.length / 100)
    : 0;

  const lowestPrice = activeListings.length
    ? Math.round(Math.min(...activeListings.map(l => l.price)) / 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Listings" value={activeListings.length} />
        <StatCard label="Platforms" value={Object.keys(platformCounts).length} />
        <StatCard label="Avg Price" value={`£${avgPrice.toLocaleString()}`} />
        <StatCard label="Lowest Price" value={`£${lowestPrice.toLocaleString()}`} />
      </div>

      {/* Scrape Status + Config */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold mb-3">Scrape Status</h2>
          {scrapeStatus?.last_run ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <StatusBadge status={scrapeStatus.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Run</span>
                <span>{formatDate(scrapeStatus.last_run.started_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Found</span>
                <span>{scrapeStatus.last_run.listings_found} listings</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New</span>
                <span className="text-fiat-green">{scrapeStatus.last_run.listings_new}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Price Drops</span>
                <span className="text-fiat-yellow">{scrapeStatus.last_run.price_drops}</span>
              </div>
              {scrapeStatus.last_run.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-900/30 rounded text-red-300 text-xs">
                  {scrapeStatus.last_run.errors.length} error(s)
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No scrape runs yet</p>
          )}
        </div>

        <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold mb-3">Platform Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(platformCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([platform, count]) => (
                <div key={platform} className="flex items-center gap-3">
                  <span className="text-sm font-medium capitalize w-32">{platform}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-fiat-blue h-full rounded-full transition-all"
                      style={{ width: `${(count / activeListings.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400 w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
          {config && (
            <div className="mt-4 pt-4 border-t border-slate-700 text-sm text-slate-400">
              Budget: £{(config.budget_min / 100).toLocaleString()} – £{(config.budget_max / 100).toLocaleString()}
              &nbsp;|&nbsp; Radius: {config.search_radius_miles}mi from {config.postcode}
            </div>
          )}
        </div>
      </div>

      {/* Shortlist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top Picks</h2>
          <Link to="/listings" className="text-fiat-blue hover:text-blue-400 text-sm font-medium">
            View all listings →
          </Link>
        </div>
        {shortlist.length === 0 ? (
          <div className="bg-fiat-navy rounded-xl p-8 border border-slate-700 text-center text-slate-400">
            No shortlisted cars yet. Run a scrape to find listings.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortlist.slice(0, 6).map((entry) => (
              <ShortlistCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-fiat-navy rounded-xl p-4 border border-slate-700">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-900/50 text-fiat-green',
    running: 'bg-blue-900/50 text-fiat-blue',
    failed: 'bg-red-900/50 text-fiat-accent',
    idle: 'bg-slate-700 text-slate-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.idle}`}>
      {status}
    </span>
  );
}

function ShortlistCard({ entry }: { entry: ShortlistEntry }) {
  const imgUrl = entry.image_urls?.[0];
  return (
    <Link
      to={`/listings/${entry.id}`}
      className="bg-fiat-navy rounded-xl border border-slate-700 overflow-hidden hover:border-fiat-blue transition-colors group"
    >
      <div className="h-40 bg-slate-800 relative overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-slate-600">🚗</div>
        )}
        <div className="absolute top-2 left-2 bg-fiat-accent text-white text-xs font-bold px-2 py-1 rounded">
          #{entry.rank}
        </div>
        {entry.composite_score != null && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
            Score: {entry.composite_score}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate">{entry.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-fiat-green">
            £{(entry.price / 100).toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">
            {entry.mileage.toLocaleString()} mi
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <span>{entry.year}</span>
          <span>·</span>
          <span>{entry.engine_size}L</span>
          <span>·</span>
          <span className="capitalize">{entry.platform}</span>
        </div>
        {entry.distance_miles != null && (
          <div className="text-xs text-slate-500 mt-1">{entry.distance_miles} miles away</div>
        )}
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
