import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as eventsApi from '../api/events';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi
      .listEvents({ sort: 'newest' })
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const featured = events.slice(0, 4);
  const upcoming = [...events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)).slice(0, 8);
  const popular = events.slice(0, 8).reverse();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="text-marquee uppercase tracking-[0.35em] text-xs font-semibold mb-4">
            Movies · Concerts · Live Shows
          </p>
          <h1 className="font-display text-5xl sm:text-7xl leading-none tracking-wide mb-5">
            Your seat, <span className="text-marquee">reserved.</span>
          </h1>
          <p className="text-muted max-w-xl mx-auto mb-8">
            Pick your show, pick your seat on a real-time seat map, and get a QR ticket in your inbox
            in seconds. No queues, no guesswork.
          </p>
          <Link to="/events" className="btn-primary text-base px-8 py-3 inline-block">
            Book Your Ticket
          </Link>
        </div>
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-marquee/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-crimson/10 rounded-full blur-3xl" />
      </section>

      {loading ? (
        <LoadingSpinner label="Loading events..." />
      ) : (
        <>
          <EventSection title="Featured Events" events={featured} />
          <EventSection title="Upcoming Events" events={upcoming} />
          <EventSection title="Popular Right Now" events={popular} />
        </>
      )}
    </div>
  );
}

function EventSection({ title, events }) {
  if (events.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl tracking-wide">{title}</h2>
        <Link to="/events" className="text-sm text-muted hover:text-marquee transition">See all →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {events.map((e) => (
          <EventCard key={`${title}-${e.id}`} event={e} />
        ))}
      </div>
    </section>
  );
}
