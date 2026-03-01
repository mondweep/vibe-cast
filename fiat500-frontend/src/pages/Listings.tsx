import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Listing } from '../api';

type SortKey = 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'score_desc' | 'newest';

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [sort, setSort] = useState<SortKey>('score_desc');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    api.getListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const platforms = [...new Set(listings.map(l => l.platform))].sort();

  let filtered = listings.filter(l => showInactive || l.is_active);

  if (platform !== 'all') {
    filtered = filtered.filter(l => l.platform === platform);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.colour?.toLowerCase().includes(q) ||
      l.engine_size.includes(q) ||
      l.fuel_type.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    switch (sort) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'year_desc': return b.year - a.year;
      case 'mileage_asc': return a.mileage - b.mileage;
      case 'score_desc': return (b.composite_score ?? -1) - (a.composite_score ?? -1);
      case 'newest': return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
      default: return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-lg">Loading listings...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-fiat-navy rounded-xl p-4 border border-slate-700 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-fiat-blue flex-1 min-w-[200px]"
          />
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fiat-blue"
          >
            <option value="all">All Platforms</option>
            {platforms.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fiat-blue"
          >
            <option value="score_desc">Best Score</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="year_desc">Newest Year</option>
            <option value="mileage_asc">Lowest Mileage</option>
            <option value="newest">Recently Added</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {filtered.length} of {listings.length} listings
        </div>
      </div>

      {/* Listings Grid */}
      {filtered.length === 0 ? (
        <div className="bg-fiat-navy rounded-xl p-8 border border-slate-700 text-center text-slate-400">
          No listings found matching your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const imgUrl = listing.image_urls?.[0];
  return (
    <Link
      to={`/listings/${listing.id}`}
      className={`bg-fiat-navy rounded-xl border overflow-hidden hover:border-fiat-blue transition-colors group ${
        listing.is_active ? 'border-slate-700' : 'border-slate-800 opacity-60'
      }`}
    >
      <div className="h-36 bg-slate-800 relative overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex items-center justify-center h-full text-3xl text-slate-600">🚗</div>
        )}
        {listing.composite_score != null && (
          <div className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded ${
            listing.composite_score >= 70 ? 'bg-green-600' :
            listing.composite_score >= 50 ? 'bg-yellow-600' : 'bg-red-600'
          }`}>
            {listing.composite_score}
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded capitalize">
          {listing.platform}
        </div>
        {!listing.is_active && (
          <div className="absolute top-2 left-2 bg-red-900 text-red-300 text-xs font-bold px-2 py-1 rounded">
            Inactive
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" title={listing.title}>{listing.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-fiat-green">
            £{(listing.price / 100).toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">
            {listing.mileage.toLocaleString()} mi
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-400">
          <span>{listing.year}</span>
          <span>·</span>
          <span>{listing.engine_size}L</span>
          <span>·</span>
          <span className="capitalize">{listing.fuel_type}</span>
          <span>·</span>
          <span className="capitalize">{listing.transmission}</span>
        </div>
        {listing.colour && (
          <div className="text-xs text-slate-500 mt-1 capitalize">{listing.colour}</div>
        )}
        {listing.distance_miles != null && (
          <div className="text-xs text-slate-500 mt-0.5">{listing.distance_miles} mi away</div>
        )}
        {listing.insurance_estimate != null && (
          <div className="text-xs text-fiat-blue mt-1">
            Insurance est: £{(listing.insurance_estimate / 100).toLocaleString()}/yr
          </div>
        )}
      </div>
    </Link>
  );
}
