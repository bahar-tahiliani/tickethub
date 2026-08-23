import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function EventCard({ event }) {
  const [imageError, setImageError] = useState(false);

  const dateLabel = new Date(`${event.event_date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const showPoster = event.poster_url && !imageError;

  return (
    <Link
      to={`/events/${event.id}`}
      className="card overflow-hidden group hover:border-marquee/50 transition flex flex-col"
    >
      <div className="aspect-[3/4] bg-surface2 overflow-hidden relative">
        {showPoster ? (
          <img
            src={event.poster_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <div className="text-6xl mb-3">
              {event.event_type === 'movie' ? '🎬' : '🎤'}
            </div>

            <p className="text-sm font-semibold text-white">
              {event.title}
            </p>

            <p className="text-xs text-muted mt-1">
              {event.event_type === 'movie' ? 'Movie' : 'Live Concert'}
            </p>
          </div>
        )}

        <span className="absolute top-2 left-2 bg-ink/80 text-marquee text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded">
          {event.event_type}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-white leading-snug line-clamp-2">
          {event.title}
        </h3>

        <p className="text-sm text-muted">
          {event.venue_name}
        </p>

        <p className="text-sm text-muted">
          {dateLabel} · {event.event_time?.slice(0, 5)}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-marquee font-semibold">
            {event.starting_price
              ? `From ₹${Number(event.starting_price).toFixed(0)}`
              : 'See prices'}
          </span>

          <span className="text-xs text-muted group-hover:text-marquee transition">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}