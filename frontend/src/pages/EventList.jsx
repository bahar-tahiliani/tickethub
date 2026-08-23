import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as eventsApi from '../api/events';
import * as venuesApi from '../api/venues';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function EventList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = {
    type: searchParams.get('type') || '',
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    venueId: searchParams.get('venueId') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || ''
  };

  useEffect(() => {
    venuesApi.listVenues().then(setVenues).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    eventsApi
      .listEvents(params)
      .then(setEvents)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl tracking-wide mb-6">Browse Events</h1>

      <div className="card p-4 mb-8 flex flex-wrap gap-3 items-end">
        <FilterField label="Type">
          <select className="input" value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
            <option value="">All</option>
            <option value="movie">Movies</option>
            <option value="concert">Concerts</option>
          </select>
        </FilterField>
        <FilterField label="Venue">
          <select className="input" value={filters.venueId} onChange={(e) => updateFilter('venueId', e.target.value)}>
            <option value="">All venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From date">
          <input type="date" className="input" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} />
        </FilterField>
        <FilterField label="Max price">
          <input type="number" min="0" placeholder="Any" className="input w-28" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} />
        </FilterField>
        <FilterField label="Sort">
          <select className="input" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
            <option value="">Date</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest</option>
          </select>
        </FilterField>
        {(filters.type || filters.venueId || filters.dateFrom || filters.maxPrice || filters.sort || filters.search) && (
          <button className="btn-secondary text-sm py-2" onClick={() => setSearchParams({})}>Clear filters</button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Finding events..." />
      ) : events.length === 0 ? (
        <p className="text-muted text-center py-16">No events match your filters. Try widening your search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
