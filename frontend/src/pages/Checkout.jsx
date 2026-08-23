import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as eventsApi from '../api/events';
import * as seatsApi from '../api/seats';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CountdownTimer from '../components/CountdownTimer';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const { eventId, hold } = location.state || {};

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const expiredHandled = useRef(false);

  useEffect(() => {
    if (!eventId || !hold) {
      navigate('/events', { replace: true });
      return;
    }

    eventsApi
      .getEvent(eventId)
      .then(setEvent)
      .finally(() => setLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!eventId || !hold) return null;

  if (loading) {
    return <LoadingSpinner label="Loading checkout..." />;
  }

  const priceByCategory = new Map(
    (event?.prices || []).map((p) => [
      p.category_id,
      Number(p.price)
    ])
  );

  const total = hold.seats.reduce(
    (sum, s) => sum + (priceByCategory.get(s.categoryId) || 0),
    0
  );

  const handleExpire = () => {
    if (expiredHandled.current) return;

    expiredHandled.current = true;

    toast.error(
      'Your seat hold expired. Please select your seats again.'
    );

    navigate(`/events/${eventId}`, { replace: true });
  };

  const proceedToPayment = () => {
    navigate('/payment', {
      state: {
        eventId,
        hold,
        total
      }
    });
  };

  const cancelCheckout = async () => {
    setCancelling(true);

    try {
      await seatsApi.releaseSeats(hold.holdToken);
    } catch {
      // Scheduler will clean it up if release fails.
    } finally {
      navigate(`/events/${eventId}`, { replace: true });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      <h1 className="font-display text-4xl tracking-wide mb-6">
        Checkout
      </h1>

      <CountdownTimer
        expiresAt={hold.expiresAt}
        onExpire={handleExpire}
      />

      <div className="card p-6 mt-6 flex flex-col gap-4">

        <Row
          label="Customer"
          value={`${user?.name} (${user?.email})`}
        />

        <Row
          label="Event"
          value={event?.title}
        />

        <Row
          label="Venue"
          value={event?.venue_name}
        />

        <Row
          label="Date"
          value={new Date(
            `${event?.event_date}T00:00:00`
          ).toLocaleDateString()}
        />

        <Row
          label="Time"
          value={event?.event_time?.slice(0, 5)}
        />

        <div className="border-t border-white/10 pt-4">

          <p className="label mb-2">
            Selected Seats
          </p>

          <div className="flex flex-wrap gap-2">

            {hold.seats.map((s) => (
              <span
                key={s.seatCode}
                className="bg-marquee/10 border border-marquee/40 text-marquee text-sm px-2.5 py-1 rounded-md"
              >
                {s.seatCode}
              </span>
            ))}

          </div>

        </div>

        <div className="border-t border-white/10 pt-4 flex items-center justify-between">

          <span className="text-muted">
            Total Amount
          </span>

          <span className="text-marquee font-display text-2xl tracking-wide">
            ₹{total.toFixed(0)}
          </span>

        </div>

      </div>

      <div className="flex gap-4 mt-6">

        <button
          className="btn-secondary flex-1"
          disabled={cancelling}
          onClick={cancelCheckout}
        >
          {cancelling ? 'Cancelling...' : 'Cancel'}
        </button>

        <button
          className="btn-primary flex-1"
          onClick={proceedToPayment}
        >
          Proceed to Payment
        </button>

      </div>

      <p className="text-xs text-muted text-center mt-4">
        Your selected seats are temporarily held while you complete payment.
      </p>

    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>
    </div>
  );
}