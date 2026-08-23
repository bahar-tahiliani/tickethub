import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import LoadingSpinner from '../components/LoadingSpinner';

export default function BookingConfirmation() {
  const location = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [qrDataUrl, setQrDataUrl] = useState(location.state?.booking?.qrDataUrl || null);
  const [loading, setLoading] = useState(!location.state?.booking);

  useEffect(() => {
    if (booking) return;
    if (!id) {
      navigate('/events', { replace: true });
      return;
    }
    bookingsApi
      .getBooking(id)
      .then(setBooking)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading your ticket..." />;
  if (!booking) return <p className="text-center py-16 text-muted">Booking not found.</p>;

  // If we don't have a freshly-generated QR data URL (e.g. viewing an older
  // booking from the dashboard), fall back to a public QR rendering service
  // encoding just the booking reference - the same value the backend embeds.
  const qrSrc = qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(booking.booking_reference)}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="font-display text-4xl tracking-wide text-marquee">Booking Confirmed</h1>
        <p className="text-muted mt-1">A copy of this ticket has been emailed to you.</p>
      </div>

      <div className="ticket-stub p-6">
        <div className="text-center mb-4">
          <p className="text-xs uppercase tracking-widest text-ink/60">TicketHub · {booking.status === 'cancelled' ? 'Cancelled' : 'E-Ticket'}</p>
          <h2 className="font-display text-2xl tracking-wide">{booking.event_title}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <Detail label="Venue" value={booking.venue_name} />
          <Detail label="Date" value={new Date(`${booking.event_date}T00:00:00`).toLocaleDateString()} />
          <Detail label="Time" value={booking.event_time?.slice(0, 5)} />
          <Detail label="Seats" value={booking.seats?.map((s) => s.seat_code).join(', ')} />
          <Detail label="Amount Paid" value={`₹${Number(booking.total_amount).toFixed(0)}`} />
          <Detail label="Status" value={booking.status} />
        </div>

        <div className="ticket-perforation my-4" />

        <div className="flex flex-col items-center gap-2">
          <img src={qrSrc} alt="Booking QR code" className="w-40 h-40" />
          <p className="font-mono text-sm tracking-wider">{booking.booking_reference}</p>
          <p className="text-xs text-ink/60">Present this QR code at the venue entrance</p>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink/50">{label}</p>
      <p className="font-semibold">{value || '-'}</p>
    </div>
  );
}
