import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import * as eventsApi from '../api/events';

import * as seatsApi from '../api/seats';

import * as waitlistApi from '../api/waitlist';

import { useAuth } from '../context/AuthContext';

import { useToast } from '../context/ToastContext';

import LoadingSpinner from '../components/LoadingSpinner';

import SeatMap from '../components/SeatMap';

import SeatLegend from '../components/SeatLegend';

export default function EventDetails() {
  const { id } = useParams();

  const { user } = useAuth();

  const toast = useToast();

  const navigate = useNavigate();

  const [event, setEvent] = useState(null);

  const [seatMap, setSeatMap] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showSeatMap, setShowSeatMap] = useState(false);

  const [selectedSeats, setSelectedSeats] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [holding, setHolding] = useState(false);

  const [joiningCategory, setJoiningCategory] = useState(null);

  const load = () => {
    Promise.all([
      eventsApi.getEvent(id),
      eventsApi.getSeatMap(id)
    ])
      .then(([ev, seats]) => {
        setEvent(ev);
        setSeatMap(seats);

        // Automatically select the first category that has seats available
        const firstAvailableCategory = ev.prices?.find((p) => {
          const avail = ev.availability?.find(
            (a) => Number(a.category_id) === Number(p.category_id)
          );

          return !avail || Number(avail.available_count) > 0;
        });

        if (firstAvailableCategory) {
          setSelectedCategoryId(Number(firstAvailableCategory.category_id));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <LoadingSpinner label="Loading event..." />;
  }

  if (!event) {
    return (
      <p className="text-center py-16 text-muted">
        Event not found.
      </p>
    );
  }

  const selectedCategory = event.prices?.find(
    (p) => Number(p.category_id) === Number(selectedCategoryId)
  );

  const toggleCategory = (categoryId, soldOut) => {
    if (soldOut) return;

    const normalizedId = Number(categoryId);

    setSelectedCategoryId(normalizedId);

    // Clear seats selected from the previous category
    setSelectedSeats([]);
  };

  const toggleSeat = (seat) => {
    // Do not allow seats from another category
    if (
      Number(seat.category_id) !== Number(selectedCategoryId)
    ) {
      return;
    }

    setSelectedSeats((prev) =>
      prev.includes(seat.seat_code)
        ? prev.filter((c) => c !== seat.seat_code)
        : [...prev, seat.seat_code]
    );
  };

  const selectedTotal = selectedSeats.reduce((sum, code) => {
    const seat = seatMap.find(
      (s) => s.seat_code === code
    );

    return sum + (seat ? Number(seat.price || 0) : 0);
  }, 0);

  const goToBook = () => {
    if (!user) {
      return navigate('/login', {
        state: { from: `/events/${id}` }
      });
    }

    if (user.role !== 'customer') {
      return toast.error(
        'Only customer accounts can book tickets.'
      );
    }

    if (!selectedCategoryId) {
      return toast.error(
        'Please select a seat category first.'
      );
    }

    setSelectedSeats([]);
    setShowSeatMap(true);
  };

  const proceedToCheckout = async () => {
    if (selectedSeats.length === 0) {
      return toast.error(
        'Select at least one seat first.'
      );
    }

    setHolding(true);

    try {
      const hold = await seatsApi.holdSeats(
        event.id,
        selectedSeats
      );

      navigate('/checkout', {
        state: {
          eventId: event.id,
          hold
        }
      });
    } catch (err) {
      toast.error(err.message);

      load();

      setSelectedSeats([]);
    } finally {
      setHolding(false);
    }
  };

  const joinWaitlist = async (categoryId) => {
    if (!user) {
      return navigate('/login', {
        state: { from: `/events/${id}` }
      });
    }

    if (user.role !== 'customer') {
      return toast.error(
        'Only customer accounts can join a waitlist.'
      );
    }

    setJoiningCategory(categoryId);

    try {
      const result = await waitlistApi.joinWaitlist(
        event.id,
        categoryId
      );

      toast.success(
        `You're #${result.position} in the waitlist queue. We'll email you when a seat opens up.`
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoiningCategory(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

      {/* EVENT INFORMATION */}
      <div className="grid md:grid-cols-[280px_1fr] gap-8 mb-10">

        <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-surface2 flex items-center justify-center text-6xl">

          {event.poster_url ? (
            <img
              src={event.poster_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            event.event_type === 'movie'
              ? '🎬'
              : '🎤'
          )}

        </div>

        <div>

          <span className="text-marquee uppercase text-xs tracking-wider font-semibold">
            {event.event_type}
          </span>

          <h1 className="font-display text-4xl tracking-wide mt-1 mb-3">
            {event.title}
          </h1>

          <p className="text-muted mb-6 max-w-2xl">
            {event.description || 'No description provided.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 text-sm">

            <InfoItem
              label="Venue"
              value={event.venue_name}
            />

            <InfoItem
              label="Location"
              value={event.venue_location}
            />

            <InfoItem
              label="Date"
              value={new Date(
                `${event.event_date}T00:00:00`
              ).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            />

            <InfoItem
              label="Time"
              value={event.event_time?.slice(0, 5)}
            />

          </div>

          {/* CATEGORY SELECTION */}
          <div className="flex flex-wrap gap-3 mb-6">

            {event.prices?.map((p) => {

              const avail = event.availability?.find(
                (a) =>
                  Number(a.category_id) ===
                  Number(p.category_id)
              );

              const soldOut =
                avail &&
                Number(avail.available_count) === 0;

              const isSelected =
                Number(selectedCategoryId) ===
                Number(p.category_id);

              return (
                <div
                  key={p.category_id}
                  onClick={() =>
                    toggleCategory(
                      p.category_id,
                      soldOut
                    )
                  }
                  className={`card px-4 py-3 min-w-[160px] cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-marquee ring-2 ring-marquee/40 bg-marquee/10 scale-[1.02]'
                      : 'hover:border-marquee/50'
                  } ${
                    soldOut
                      ? 'opacity-60 cursor-not-allowed'
                      : ''
                  }`}
                >

                  <div className="flex items-center gap-2 mb-1">

                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          p.color_code
                      }}
                    />

                    <span className="font-semibold text-sm">
                      {p.category_name}
                    </span>

                    {isSelected && !soldOut && (
                      <span className="text-[10px] text-marquee font-bold ml-auto">
                        SELECTED
                      </span>
                    )}

                  </div>

                  <p className="text-marquee font-semibold">
                    ₹{Number(p.price).toFixed(0)}
                  </p>

                  {soldOut ? (

                    <div className="mt-2">

                      <p className="text-crimson text-xs font-semibold mb-1.5">
                        Sold Out
                      </p>

                      <button
                        className="btn-secondary text-xs py-1.5 px-3 w-full"
                        disabled={
                          joiningCategory ===
                          p.category_id
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          joinWaitlist(
                            p.category_id
                          );
                        }}
                      >
                        {joiningCategory ===
                        p.category_id
                          ? 'Joining...'
                          : 'Join Waitlist'}
                      </button>

                    </div>

                  ) : (

                    <p className="text-xs text-muted mt-1">
                      {avail?.available_count ?? '-'} seats left
                    </p>

                  )}

                </div>
              );
            })}

          </div>

          {!showSeatMap && (
            <button
              className="btn-primary px-8 py-3"
              onClick={goToBook}
            >
              Book Now
            </button>
          )}

        </div>
      </div>

      {/* SEAT MAP */}
      {showSeatMap && (

        <div className="card p-6">

          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">

            <div>
              <h2 className="font-display text-2xl tracking-wide">
                Select Your Seats
              </h2>

              {selectedCategory && (
                <p className="text-sm text-marquee mt-1">
                  Booking category:{' '}
                  <span className="font-semibold">
                    {selectedCategory.category_name}
                  </span>
                  {' · '}
                  ₹{Number(
                    selectedCategory.price
                  ).toFixed(0)} per seat
                </p>
              )}
            </div>

            <SeatLegend categories={event.prices} />

          </div>

          <SeatMap
            seats={seatMap}
            selectedSeats={selectedSeats}
            selectedCategoryId={selectedCategoryId}
            onToggleSeat={toggleSeat}
          />

          {selectedSeats.length > 0 && (

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">

              <div className="text-sm">

                <p className="text-muted">
                  Selected: {selectedSeats.join(', ')}
                </p>

                <p className="text-marquee font-semibold text-lg mt-1">
                  Total: ₹{selectedTotal.toFixed(0)}
                </p>

              </div>

              <button
                className="btn-primary px-8 py-3"
                disabled={holding}
                onClick={proceedToCheckout}
              >
                {holding
                  ? 'Reserving seats...'
                  : `Proceed to Checkout (${selectedSeats.length})`}
              </button>

            </div>

          )}

        </div>

      )}

    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-muted text-xs uppercase tracking-wider mb-0.5">
        {label}
      </p>

      <p className="font-medium">
        {value}
      </p>
    </div>
  );
}