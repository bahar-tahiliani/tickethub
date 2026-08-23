import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import { useToast } from '../context/ToastContext';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const { eventId, hold, event, total } = location.state || {};

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);

  if (!eventId || !hold) {
    navigate('/events', { replace: true });
    return null;
  }

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Simulated payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Payment successful → create the actual booking
      const booking = await bookingsApi.createBooking(
        eventId,
        hold.holdToken
      );

      toast.success('Payment successful! Booking confirmed.');

      navigate('/booking-confirmation', {
        state: { booking },
        replace: true
      });
    } catch (err) {
      toast.error(err.message || 'Payment failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      <h1 className="font-display text-4xl tracking-wide mb-2">
        Payment
      </h1>

      <p className="text-muted mb-6">
        Complete your payment to confirm your booking.
      </p>

      {/* Order Summary */}
      <div className="card p-6 mb-6">

        <h2 className="font-display text-2xl mb-4">
          Order Summary
        </h2>

        <div className="flex flex-col gap-3 text-sm">

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
            value={
              event?.event_date
                ? new Date(
                    `${event.event_date}T00:00:00`
                  ).toLocaleDateString()
                : '-'
            }
          />

          <Row
            label="Time"
            value={event?.event_time?.slice(0, 5)}
          />

          <div className="border-t border-white/10 pt-3">

            <p className="text-muted text-xs mb-2">
              Selected Seats
            </p>

            <div className="flex flex-wrap gap-2">

              {hold.seats.map((seat) => (
                <span
                  key={seat.seatCode}
                  className="bg-marquee/10 border border-marquee/40 text-marquee text-sm px-2.5 py-1 rounded-md"
                >
                  {seat.seatCode}
                </span>
              ))}

            </div>

          </div>

          <div className="border-t border-white/10 pt-4 flex justify-between items-center">

            <span className="text-muted">
              Total Amount
            </span>

            <span className="text-marquee font-display text-3xl">
              ₹{Number(total).toFixed(0)}
            </span>

          </div>

        </div>
      </div>

      {/* Payment Methods */}
      <div className="card p-6">

        <h2 className="font-display text-2xl mb-4">
          Select Payment Method
        </h2>

        <div className="flex flex-col gap-3">

          <PaymentOption
            value="upi"
            selected={paymentMethod === 'upi'}
            onChange={setPaymentMethod}
            title="UPI"
            description="Google Pay, PhonePe, Paytm"
          />

          <PaymentOption
            value="card"
            selected={paymentMethod === 'card'}
            onChange={setPaymentMethod}
            title="Credit / Debit Card"
            description="Visa, Mastercard, RuPay"
          />

          <PaymentOption
            value="netbanking"
            selected={paymentMethod === 'netbanking'}
            onChange={setPaymentMethod}
            title="Net Banking"
            description="All major banks supported"
          />

        </div>

        <button
          className="btn-primary w-full mt-6"
          disabled={processing}
          onClick={handlePayment}
        >
          {processing
            ? 'Processing Payment...'
            : `Pay ₹${Number(total).toFixed(0)}`}
        </button>

        <p className="text-xs text-muted text-center mt-4">
          This is a simulated payment for the project.
          No real money will be charged.
        </p>

      </div>

    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">
        {label}
      </span>

      <span className="font-medium text-right">
        {value || '-'}
      </span>
    </div>
  );
}

function PaymentOption({
  value,
  selected,
  onChange,
  title,
  description
}) {
  return (
    <label
      className={`border rounded-lg p-4 cursor-pointer transition ${
        selected
          ? 'border-marquee bg-marquee/10'
          : 'border-white/10'
      }`}
    >

      <div className="flex items-center gap-3">

        <input
          type="radio"
          name="paymentMethod"
          value={value}
          checked={selected}
          onChange={() => onChange(value)}
        />

        <div>
          <p className="font-semibold">
            {title}
          </p>

          <p className="text-xs text-muted">
            {description}
          </p>
        </div>

      </div>

    </label>
  );
}