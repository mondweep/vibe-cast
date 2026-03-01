import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type ListingDetail as ListingDetailType } from '../api';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImg, setSelectedImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.getListing(id)
      .then(setListing)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-lg">Loading listing...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bg-fiat-navy rounded-xl p-8 border border-slate-700 text-center">
        <p className="text-fiat-accent mb-4">{error || 'Listing not found'}</p>
        <Link to="/listings" className="text-fiat-blue hover:text-blue-400">← Back to listings</Link>
      </div>
    );
  }

  const priceHistory = listing.price_history || [];
  const hasPriceChange = priceHistory.length > 1;
  const priceChange = hasPriceChange
    ? priceHistory[priceHistory.length - 1].price - priceHistory[0].price
    : 0;

  return (
    <div>
      <Link to="/listings" className="text-fiat-blue hover:text-blue-400 text-sm mb-4 inline-block">
        ← Back to listings
      </Link>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Images */}
        <div className="lg:col-span-3">
          <div className="bg-fiat-navy rounded-xl border border-slate-700 overflow-hidden">
            <div className="h-64 md:h-96 bg-slate-800">
              {listing.image_urls.length > 0 ? (
                <img
                  src={listing.image_urls[selectedImg] || listing.image_urls[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-6xl text-slate-600">🚗</div>
              )}
            </div>
            {listing.image_urls.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {listing.image_urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`w-16 h-12 rounded overflow-hidden border-2 flex-shrink-0 ${
                      i === selectedImg ? 'border-fiat-blue' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700 mt-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {/* Price History */}
          {priceHistory.length > 0 && (
            <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700 mt-4">
              <h3 className="font-semibold mb-3">Price History</h3>
              <div className="space-y-2">
                {priceHistory.map((ph, i) => (
                  <div key={ph.id || i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {new Date(ph.recorded_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <span className={`font-medium ${
                      i > 0 && ph.price < priceHistory[i - 1].price
                        ? 'text-fiat-green'
                        : i > 0 && ph.price > priceHistory[i - 1].price
                        ? 'text-fiat-accent'
                        : 'text-white'
                    }`}>
                      £{(ph.price / 100).toLocaleString()}
                      {i > 0 && ph.price !== priceHistory[i - 1].price && (
                        <span className="text-xs ml-1">
                          ({ph.price < priceHistory[i - 1].price ? '↓' : '↑'}£{Math.abs((ph.price - priceHistory[i - 1].price) / 100).toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title + Price */}
          <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{listing.title}</h2>
                <span className="text-xs text-slate-400 capitalize">{listing.platform}</span>
              </div>
              {!listing.is_active && (
                <span className="bg-red-900 text-red-300 text-xs font-bold px-2 py-1 rounded">Inactive</span>
              )}
            </div>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-3xl font-bold text-fiat-green">
                £{(listing.price / 100).toLocaleString()}
              </span>
              {hasPriceChange && priceChange !== 0 && (
                <span className={`text-sm font-medium ${priceChange < 0 ? 'text-fiat-green' : 'text-fiat-accent'}`}>
                  {priceChange < 0 ? '↓' : '↑'} £{Math.abs(priceChange / 100).toLocaleString()}
                </span>
              )}
            </div>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-center bg-fiat-blue hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              View on {listing.platform} →
            </a>
          </div>

          {/* Score */}
          {listing.composite_score != null && (
            <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Composite Score</h3>
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold ${
                  listing.composite_score >= 70 ? 'text-fiat-green' :
                  listing.composite_score >= 50 ? 'text-fiat-yellow' : 'text-fiat-accent'
                }`}>
                  {listing.composite_score}
                </div>
                <div className="flex-1">
                  <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        listing.composite_score >= 70 ? 'bg-fiat-green' :
                        listing.composite_score >= 50 ? 'bg-fiat-yellow' : 'bg-fiat-accent'
                      }`}
                      style={{ width: `${listing.composite_score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specs */}
          <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
            <h3 className="font-semibold mb-3">Specifications</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Year" value={String(listing.year)} />
              <Detail label="Mileage" value={`${listing.mileage.toLocaleString()} mi`} />
              <Detail label="Engine" value={`${listing.engine_size}L`} />
              <Detail label="Fuel" value={listing.fuel_type} />
              <Detail label="Transmission" value={listing.transmission} />
              {listing.colour && <Detail label="Colour" value={listing.colour} />}
              {listing.mot_expiry && <Detail label="MOT" value={new Date(listing.mot_expiry).toLocaleDateString('en-GB')} />}
            </div>
          </div>

          {/* Seller */}
          <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
            <h3 className="font-semibold mb-3">Seller</h3>
            <div className="space-y-2 text-sm">
              {listing.seller_name && <Detail label="Name" value={listing.seller_name} />}
              <Detail label="Type" value={listing.seller_type} />
              {listing.seller_rating != null && <Detail label="Rating" value={`${listing.seller_rating}/100`} />}
              {listing.location_postcode && <Detail label="Location" value={listing.location_postcode} />}
              {listing.distance_miles != null && <Detail label="Distance" value={`${listing.distance_miles} miles`} />}
            </div>
          </div>

          {/* Insurance */}
          {listing.insurance_estimate != null && (
            <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
              <h3 className="font-semibold mb-2">Insurance Estimate</h3>
              <div className="text-2xl font-bold text-fiat-blue">
                £{(listing.insurance_estimate / 100).toLocaleString()}/yr
              </div>
              <p className="text-xs text-slate-500 mt-1">Estimated based on your profile</p>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-slate-500 space-y-1 px-1">
            <div>First seen: {new Date(listing.first_seen_at).toLocaleString('en-GB')}</div>
            <div>Last seen: {new Date(listing.last_seen_at).toLocaleString('en-GB')}</div>
            <div>ID: {listing.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400">{label}</span>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}
