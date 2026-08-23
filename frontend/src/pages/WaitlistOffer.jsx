import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as waitlistApi from '../api/waitlist';
import * as eventsApi from '../api/events';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import CountdownTimer from '../components/CountdownTimer';

export default function WaitlistOffer() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [offer, setOffer] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    waitlistApi
      .getWaitlistOffer(token)
      .then(async (o) => {
        setOffer(o);
        const ev = await eventsApi.getEvent(o.eventId);
        setEvent(ev);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) return <LoadingSpinner label="Checking your offer..." />;

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="font-display text-3xl tracking-wide mb-2">Offer Unavailable</h1>
        <p className="text-muted mb-6">{error}</p>
        <button className="btn-primary" onClick={() => navigate('/events')}>Browse Events</button>
      </div>
    );
  }

  const goToCheckout = async () => {
    const seatMap = await eventsApi.getSeatMap(offer.eventId);
    const seat = seatMap.find((s) => s.seat_code === offer.seatCode);
    navigate('/checkout', {
      state: {
        eventId: offer.eventId,
        hold: {
          holdToken: offer.holdToken,
          expiresAt: offer.expiresAt,
          seats: [{ seatCode: offer.seatCode, categoryId: seat?.category_id }]
        }
      }
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="font-display text-3xl tracking-wide mb-2">A seat opened up for you!</h1>
      <p className="text-muted mb-6">
        Seat <strong className="text-marquee">{offer.seatCode}</strong> for <strong>{event?.title}</strong> is reserved for you.
        Complete your booking before the timer runs out.
      </p>
      <div className="mb-6 flex justify-center">
        <CountdownTimer expiresAt={offer.expiresAt} onExpire={() => setError('This offer has expired.')} label="This offer expires in" />
      </div>
      <button className="btn-primary px-8 py-3" onClick={goToCheckout}>Complete Booking</button>
    </div>
  );
}
